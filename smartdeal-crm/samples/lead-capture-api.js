/**
 * SmartDeal CRM — Lead Capture API
 * samples/lead-capture-api.js
 *
 * Express route for lead capture from QR code scan at showroom entry.
 * Handles: validation, auto-assignment to sales consultant, WhatsApp notification.
 *
 * Integrates with:
 *   - PostgreSQL (via pg) for lead storage
 *   - Redis for round-robin assignment state
 *   - WhatsApp Business API (Meta Cloud API) for instant notifications
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { Pool } = require('pg');
const Redis = require('ioredis');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ─── Rate Limiters ────────────────────────────────────────────────────────────

/** Lead creation: 10 per 5 minutes per IP (prevents QR-scan abuse) */
const leadCreateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many lead submissions. Please wait before trying again.' } },
});

/** Read endpoints: 60 per minute per IP */
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please slow down.' } },
});

// ─── Database & Cache Connections ────────────────────────────────────────────

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'smartdeal_dev',
  user: process.env.DB_USER || 'smartdeal_app',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'smartdeal:',
});

// ─── Validation Schema ────────────────────────────────────────────────────────

const LEAD_SOURCES = [
  'qr_walk_in', 'walk_in_direct', 'phone_call', 'website',
  'whatsapp', 'referral', 'digital_campaign', 'tata_motors_portal',
  'exchange_lead', 'service_upsell',
];

const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'electric', 'hybrid'];
const PURCHASE_TIMELINES = ['immediate', '1_month', '3_months', '6_months', 'exploring'];

const createLeadSchema = Joi.object({
  // Personal info
  firstName: Joi.string().min(2).max(100).trim().required()
    .messages({ 'string.empty': 'First name is required' }),
  lastName: Joi.string().min(2).max(100).trim().required(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({ 'string.pattern.base': 'Please enter a valid 10-digit Indian mobile number' }),
  email: Joi.string().email().lowercase().optional().allow(''),
  city: Joi.string().max(100).trim().optional().allow(''),
  state: Joi.string().max(100).trim().optional().allow(''),
  pincode: Joi.string().pattern(/^[1-9][0-9]{5}$/).optional().allow(''),

  // Lead metadata
  source: Joi.string().valid(...LEAD_SOURCES).required(),
  branchId: Joi.string().uuid().required(),
  qrSessionId: Joi.string().max(100).optional().allow(''),

  // Interest
  interestedModel: Joi.string().max(100).trim().optional().allow(''),
  interestedVariant: Joi.string().max(100).trim().optional().allow(''),
  fuelPreference: Joi.string().valid(...FUEL_TYPES).optional(),
  budgetMax: Joi.number().min(100000).max(10000000).optional(),
  purchaseTimeline: Joi.string().valid(...PURCHASE_TIMELINES).optional(),
  hasExchange: Joi.boolean().default(false),
  exchangeVehicle: Joi.string().max(200).trim().optional().allow(''),

  // UTM tracking
  utmSource: Joi.string().max(100).optional().allow(''),
  utmMedium: Joi.string().max(100).optional().allow(''),
  utmCampaign: Joi.string().max(100).optional().allow(''),

  notes: Joi.string().max(1000).trim().optional().allow(''),
});

// ─── Helper: Generate Lead Number ────────────────────────────────────────────

async function generateLeadNumber() {
  const year = new Date().getFullYear();
  const key = `lead:sequence:${year}`;
  const seq = await redis.incr(key);
  // Set expiry if this is the first lead of the year
  if (seq === 1) {
    await redis.expireat(key, Math.floor(new Date(`${year + 1}-01-01`).getTime() / 1000));
  }
  return `LDN-${year}-${String(seq).padStart(5, '0')}`;
}

// ─── Helper: Auto-assign Consultant (Round-Robin) ────────────────────────────

/**
 * Assigns the next available sales consultant in round-robin order.
 * Uses Redis to maintain the current position in the rotation.
 *
 * @param {string} branchId
 * @param {object} db - PostgreSQL pool
 * @returns {object|null} - Assigned consultant or null if none available
 */
async function autoAssignConsultant(branchId, dbPool) {
  // Fetch active sales consultants for this branch
  const { rows: consultants } = await dbPool.query(
    `SELECT id, first_name, last_name, phone
     FROM users
     WHERE branch_id = $1
       AND role = 'sales_consultant'
       AND is_active = true
     ORDER BY first_name, id`,
    [branchId]
  );

  if (!consultants.length) return null;

  // Round-robin: use Redis to track current position
  const rrKey = `assignment:rr:${branchId}`;
  const currentIndex = await redis.incr(rrKey);
  // Reset to avoid unbounded growth
  if (currentIndex >= 10000) await redis.set(rrKey, 1);

  const assignedConsultant = consultants[(currentIndex - 1) % consultants.length];
  return assignedConsultant;
}

// ─── Helper: Send WhatsApp Notification ──────────────────────────────────────

/**
 * Sends a WhatsApp template message via Meta Cloud API.
 *
 * @param {string} to - Phone number in E.164 format (e.g., 919876543210)
 * @param {string} templateName - Pre-approved WhatsApp template name
 * @param {string[]} variables - Template variable values
 */
async function sendWhatsApp(to, templateName, variables) {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneId || !token) {
    console.warn('[WhatsApp] Credentials not configured — skipping notification');
    return;
  }

  // Ensure phone is in E.164 format (add 91 prefix for Indian numbers)
  const e164Phone = to.startsWith('91') ? to : `91${to}`;

  const payload = {
    messaging_product: 'whatsapp',
    to: e164Phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en_IN' },
      components: [
        {
          type: 'body',
          parameters: variables.map(v => ({ type: 'text', text: String(v) })),
        },
      ],
    },
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    // Non-fatal: log error but don't fail the lead creation
    console.error('[WhatsApp] Failed to send notification:', {
      to: e164Phone,
      template: templateName,
      error: error.response?.data || error.message,
    });
    return null;
  }
}

// ─── Helper: Write Audit Log ──────────────────────────────────────────────────

async function writeAuditLog(dbPool, { userId, branchId, action, resourceType, resourceId, newValue, ipAddress, userAgent }) {
  await dbPool.query(
    `INSERT INTO audit_logs
       (user_id, branch_id, action, resource_type, resource_id, new_value, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId, branchId, action, resourceType, resourceId, JSON.stringify(newValue), ipAddress, userAgent]
  );
}

// ─── POST /leads — Create Lead ───────────────────────────────────────────────

/**
 * @route   POST /api/v1/leads
 * @desc    Create a new lead (from QR scan, walk-in, phone, web inquiry)
 * @access  Public (QR scan) or Authenticated (manual entry by consultant)
 */
router.post('/', leadCreateLimiter, async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  // 1. Validate request body
  const { error, value } = createLeadSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
        requestId: correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // 2. Check for duplicate lead (same phone in same branch in last 30 days)
    const { rows: existing } = await client.query(
      `SELECT id, lead_number, status FROM leads
       WHERE phone = $1 AND branch_id = $2
         AND created_at > NOW() - INTERVAL '30 days'
         AND status NOT IN ('won', 'lost', 'dropped')
       LIMIT 1`,
      [value.phone, value.branchId]
    );

    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'LEAD_ALREADY_EXISTS',
          message: 'An active lead already exists for this phone number',
          data: { existingLeadNumber: existing[0].lead_number, status: existing[0].status },
          requestId: correlationId,
        },
      });
    }

    // 3. Verify branch exists and is active
    const { rows: branches } = await client.query(
      'SELECT id, name FROM branches WHERE id = $1 AND is_active = true',
      [value.branchId]
    );
    if (!branches.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found or inactive' },
      });
    }

    // 4. Auto-assign consultant (round-robin)
    const assignedConsultant = await autoAssignConsultant(value.branchId, client);

    // 5. Generate unique lead number
    const leadNumber = await generateLeadNumber();
    const leadId = uuidv4();

    // 6. Insert lead into database
    await client.query(
      `INSERT INTO leads (
         id, branch_id, assigned_to, lead_number, source, status,
         first_name, last_name, phone, email, city, state, pincode,
         interested_model, interested_variant, fuel_preference,
         budget_max, purchase_timeline, has_exchange, exchange_vehicle,
         utm_source, utm_medium, utm_campaign, qr_session_id, notes,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, 'new',
         $6, $7, $8, $9, $10, $11, $12,
         $13, $14, $15,
         $16, $17, $18, $19,
         $20, $21, $22, $23, $24,
         NOW(), NOW()
       )`,
      [
        leadId, value.branchId, assignedConsultant?.id || null, leadNumber, value.source,
        value.firstName, value.lastName, value.phone, value.email || null,
        value.city || null, value.state || null, value.pincode || null,
        value.interestedModel || null, value.interestedVariant || null, value.fuelPreference || null,
        value.budgetMax || null, value.purchaseTimeline || null,
        value.hasExchange, value.exchangeVehicle || null,
        value.utmSource || null, value.utmMedium || null, value.utmCampaign || null,
        value.qrSessionId || null, value.notes || null,
      ]
    );

    // 7. Log initial activity
    await client.query(
      `INSERT INTO lead_activities (id, lead_id, user_id, activity_type, direction, notes, created_at)
       VALUES ($1, $2, $3, 'lead_created', 'inbound', $4, NOW())`,
      [uuidv4(), leadId, assignedConsultant?.id || null, `Lead created via ${value.source}`]
    );

    // 8. Write audit log
    await writeAuditLog(client, {
      userId: req.user?.id || null,
      branchId: value.branchId,
      action: 'lead.created',
      resourceType: 'lead',
      resourceId: leadId,
      newValue: { leadNumber, source: value.source, phone: value.phone },
      ipAddress,
      userAgent,
    });

    await client.query('COMMIT');

    // 9. Send WhatsApp notifications (async, non-blocking)
    const customerName = `${value.firstName} ${value.lastName}`;
    const branchName = branches[0].name;
    const branchPhone = process.env.BRANCH_PHONE || '020-12345678';

    // Notify assigned consultant
    if (assignedConsultant) {
      sendWhatsApp(assignedConsultant.phone, 'smartdeal_new_lead_consultant', [
        `${assignedConsultant.first_name} ${assignedConsultant.last_name}`,
        customerName,
        value.phone,
        value.interestedModel || 'Not specified',
        value.source === 'qr_walk_in' ? 'showroom QR scan' : value.source,
      ]);
    }

    // Notify customer with welcome message
    sendWhatsApp(value.phone, 'smartdeal_walkin_welcome', [
      value.firstName,
      assignedConsultant
        ? `${assignedConsultant.first_name} ${assignedConsultant.last_name}`
        : 'our team',
      branchPhone,
    ]);

    // 10. Publish Redis event for other services (notification service, analytics)
    await redis.publish('smartdeal:events', JSON.stringify({
      event: 'lead.created',
      data: {
        leadId,
        leadNumber,
        branchId: value.branchId,
        phone: value.phone,
        source: value.source,
        assignedTo: assignedConsultant?.id || null,
      },
      timestamp: new Date().toISOString(),
      correlationId,
    }));

    // 11. Return success response
    return res.status(201).json({
      success: true,
      data: {
        id: leadId,
        leadNumber,
        status: 'new',
        assignedTo: assignedConsultant ? {
          id: assignedConsultant.id,
          name: `${assignedConsultant.first_name} ${assignedConsultant.last_name}`,
          phone: assignedConsultant.phone,
        } : null,
        branch: {
          id: value.branchId,
          name: branchName,
        },
        createdAt: new Date().toISOString(),
      },
      meta: {
        requestId: correlationId,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[LeadCapture] Error creating lead:', { correlationId, error: err.message });

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while creating the lead. Please try again.',
        requestId: correlationId,
        timestamp: new Date().toISOString(),
      },
    });
  } finally {
    client.release();
  }
});

// ─── GET /leads/follow-ups/today — Today's Follow-ups ────────────────────────

/**
 * @route   GET /api/v1/leads/follow-ups/today
 * @desc    Get all follow-ups due today for the authenticated consultant
 * @access  Authenticated (sales consultant, sales manager)
 */
router.get('/follow-ups/today', readLimiter, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED' } });
  }

  const userId = req.user.id;
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  try {
    const { rows } = await db.query(
      `SELECT
         fs.id AS follow_up_id,
         fs.follow_up_type,
         fs.subject,
         fs.scheduled_at,
         fs.notes AS follow_up_notes,
         l.id AS lead_id,
         l.lead_number,
         l.first_name || ' ' || l.last_name AS customer_name,
         l.phone,
         l.status AS lead_status,
         l.interested_model,
         l.budget_max
       FROM follow_up_schedules fs
       JOIN leads l ON l.id = fs.lead_id
       WHERE fs.assigned_to = $1
         AND fs.scheduled_at BETWEEN $2 AND $3
         AND fs.completed_at IS NULL
       ORDER BY fs.scheduled_at ASC`,
      [userId, startOfDay, endOfDay]
    );

    return res.json({
      success: true,
      data: rows,
      pagination: { total: rows.length },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[Leads] Error fetching today follow-ups:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

module.exports = router;
