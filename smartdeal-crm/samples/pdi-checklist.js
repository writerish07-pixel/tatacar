/**
 * SmartDeal CRM — PDI Checklist API
 * samples/pdi-checklist.js
 *
 * Pre-Delivery Inspection (PDI) checklist management with photo upload.
 * Powers the tablet-based technician workflow in the PDI bay.
 *
 * Features:
 *   - Create PDI checklist for a vehicle
 *   - Update checklist item results (Pass/Fail/Rework/NA)
 *   - Upload photo evidence for Fail/Rework items (AWS S3)
 *   - Mark PDI complete (triggers delivery scheduling unlock)
 *   - Redis event published on completion
 */

'use strict';

const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const router = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const PDI_ITEM_RESULTS = ['pass', 'fail', 'rework', 'na'];
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;  // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ─── Connections ──────────────────────────────────────────────────────────────

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'smartdeal_dev',
  user: process.env.DB_USER || 'smartdeal_app',
  password: process.env.DB_PASSWORD,
  max: 10,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'smartdeal:',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET = process.env.AWS_S3_BUCKET || 'smartdeal-documents-dev';

// ─── Multer Configuration (in-memory storage for S3 upload) ──────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_SIZE_BYTES,
    files: 5,  // Max 5 photos per request
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
    }
  },
});

// ─── Helper: Upload to S3 ─────────────────────────────────────────────────────

/**
 * Uploads a buffer to AWS S3 with SSE-S3 encryption.
 *
 * @param {Buffer} fileBuffer - File content
 * @param {string} mimeType - MIME type
 * @param {string} s3Key - S3 object key
 * @returns {object} { s3Key, s3Url }
 */
async function uploadToS3(fileBuffer, mimeType, s3Key) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256',  // SSE-S3 encryption
    Metadata: {
      uploadedBy: 'smartdeal-pdi-service',
      uploadedAt: new Date().toISOString(),
    },
  });

  await s3Client.send(command);

  const cloudFrontBase = process.env.AWS_CLOUDFRONT_URL || `https://${S3_BUCKET}.s3.ap-south-1.amazonaws.com`;
  return {
    s3Key,
    s3Url: `${cloudFrontBase}/${s3Key}`,
  };
}

// ─── Helper: Auth Check ───────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED' } });
  }
  if (!['admin', 'pdi_technician', 'sales_manager', 'delivery_manager'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: { code: 'INSUFFICIENT_PERMISSIONS' } });
  }
  next();
}

// ─── POST /pdi/checklists — Create PDI Checklist ─────────────────────────────

/**
 * @route   POST /api/v1/pdi/checklists
 * @desc    Create a new PDI checklist for a vehicle (loads template items)
 * @access  PDI Technician, Sales Manager, Admin
 */
router.post('/checklists', requireAuth, async (req, res) => {
  const { vehicleId, bookingId, technicianId } = req.body;

  if (!vehicleId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'vehicleId is required' },
    });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Verify vehicle exists and is in a state that requires PDI
    const { rows: vehicles } = await client.query(
      `SELECT v.id, v.vin, v.status, vv.model_id, vm.model_code
       FROM vehicles v
       JOIN vehicle_variants vv ON vv.id = v.variant_id
       JOIN vehicle_models vm ON vm.id = vv.model_id
       WHERE v.id = $1`,
      [vehicleId]
    );

    if (!vehicles.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'VEHICLE_NOT_FOUND' } });
    }

    const vehicle = vehicles[0];

    // Check if PDI already exists for this vehicle
    const { rows: existing } = await client.query(
      `SELECT id, status FROM pdi_checklists WHERE vehicle_id = $1 AND status NOT IN ('passed', 'failed')`,
      [vehicleId]
    );

    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: {
          code: 'PDI_ALREADY_EXISTS',
          message: 'An active PDI checklist already exists for this vehicle',
          data: { existingPdiId: existing[0].id, status: existing[0].status },
        },
      });
    }

    // Load PDI template (model-specific or generic)
    const { rows: templateRows } = await client.query(
      `SELECT t.id AS template_id, t.name AS template_name,
              ti.id AS item_id, ti.section, ti.item_code,
              ti.description, ti.requires_photo, ti.is_mandatory, ti.sort_order
       FROM pdi_checklist_templates t
       JOIN pdi_template_items ti ON ti.template_id = t.id
       WHERE t.is_active = true
         AND (t.model_id = $1 OR t.model_id IS NULL)
       ORDER BY t.model_id DESC NULLS LAST, ti.sort_order ASC
       LIMIT 50`,
      [vehicle.model_id]
    );

    if (!templateRows.length) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        error: { code: 'NO_PDI_TEMPLATE', message: 'No active PDI template found for this vehicle model' },
      });
    }

    const templateId = templateRows[0].template_id;
    const checklistId = uuidv4();
    const assignedTechnicianId = technicianId || req.user.id;

    // Create checklist record
    await client.query(
      `INSERT INTO pdi_checklists
         (id, vehicle_id, technician_id, booking_id, status, total_items, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), NOW())`,
      [checklistId, vehicleId, assignedTechnicianId, bookingId || null, templateRows.length]
    );

    // Create individual checklist items from template
    const itemValues = templateRows.map(ti => [
      uuidv4(), checklistId, ti.item_id, 'na',
    ]);

    for (const item of itemValues) {
      await client.query(
        `INSERT INTO pdi_items (id, checklist_id, template_item_id, result, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        item
      );
    }

    // Update vehicle status to pdi_in_progress
    await client.query(
      `UPDATE vehicles SET status = 'pdi_in_progress', updated_at = NOW() WHERE id = $1`,
      [vehicleId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: {
        id: checklistId,
        vehicleId,
        vin: vehicle.vin,
        status: 'pending',
        totalItems: templateRows.length,
        technician: { id: assignedTechnicianId },
        items: templateRows.map(ti => ({
          id: itemValues.find(v => true)?.[0],  // simplified
          templateItemId: ti.item_id,
          section: ti.section,
          itemCode: ti.item_code,
          description: ti.description,
          requiresPhoto: ti.requires_photo,
          isMandatory: ti.is_mandatory,
          result: 'na',
        })),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PDI] Error creating checklist:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  } finally {
    client.release();
  }
});

// ─── GET /pdi/checklists/:id — Get Checklist Details ─────────────────────────

/**
 * @route   GET /api/v1/pdi/checklists/:id
 * @desc    Get full PDI checklist with all items and photos
 * @access  PDI Technician (own), Manager, Admin
 */
router.get('/checklists/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: checklist } = await db.query(
      `SELECT
         c.id, c.vehicle_id, c.technician_id, c.booking_id, c.status,
         c.total_items, c.passed_items, c.failed_items, c.rework_items,
         c.started_at, c.completed_at, c.notes, c.certificate_url,
         v.vin, v.yard_location,
         vv.variant_name, vm.model_name
       FROM pdi_checklists c
       JOIN vehicles v ON v.id = c.vehicle_id
       JOIN vehicle_variants vv ON vv.id = v.variant_id
       JOIN vehicle_models vm ON vm.id = vv.model_id
       WHERE c.id = $1`,
      [id]
    );

    if (!checklist.length) {
      return res.status(404).json({ success: false, error: { code: 'PDI_NOT_FOUND' } });
    }

    // Get items with photos
    const { rows: items } = await db.query(
      `SELECT
         i.id, i.result, i.technician_notes, i.updated_at,
         ti.section, ti.item_code, ti.description, ti.requires_photo, ti.is_mandatory, ti.sort_order,
         COALESCE(
           json_agg(json_build_object('id', p.id, 'url', p.s3_url, 'caption', p.caption))
           FILTER (WHERE p.id IS NOT NULL), '[]'
         ) AS photos
       FROM pdi_items i
       JOIN pdi_template_items ti ON ti.id = i.template_item_id
       LEFT JOIN pdi_photos p ON p.pdi_item_id = i.id
       WHERE i.checklist_id = $1
       GROUP BY i.id, i.result, i.technician_notes, i.updated_at,
                ti.section, ti.item_code, ti.description, ti.requires_photo, ti.is_mandatory, ti.sort_order
       ORDER BY ti.sort_order ASC`,
      [id]
    );

    // Group items by section
    const sections = items.reduce((acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        ...checklist[0],
        sections,
        completionPercentage: checklist[0].total_items > 0
          ? Math.round((checklist[0].passed_items + checklist[0].failed_items + checklist[0].rework_items) /
                        checklist[0].total_items * 100)
          : 0,
      },
    });
  } catch (err) {
    console.error('[PDI] Error fetching checklist:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ─── PATCH /pdi/items/:id — Update Item Result ───────────────────────────────

/**
 * @route   PATCH /api/v1/pdi/items/:itemId
 * @desc    Update a PDI item result (Pass/Fail/Rework/NA) and notes
 * @access  PDI Technician, Manager, Admin
 */
router.patch('/items/:itemId', requireAuth, async (req, res) => {
  const { itemId } = req.params;
  const { result, technicianNotes } = req.body;

  if (!PDI_ITEM_RESULTS.includes(result)) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_RESULT',
        message: `Result must be one of: ${PDI_ITEM_RESULTS.join(', ')}`,
      },
    });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Verify item exists and checklist is not completed
    const { rows: items } = await client.query(
      `SELECT i.id, i.checklist_id, i.result AS old_result, c.status AS checklist_status
       FROM pdi_items i
       JOIN pdi_checklists c ON c.id = i.checklist_id
       WHERE i.id = $1`,
      [itemId]
    );

    if (!items.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'PDI_ITEM_NOT_FOUND' } });
    }

    const item = items[0];

    if (['passed', 'failed'].includes(item.checklist_status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: { code: 'PDI_COMPLETED', message: 'Cannot update items on a completed PDI checklist' },
      });
    }

    // Update item result
    await client.query(
      `UPDATE pdi_items
       SET result = $1, technician_notes = $2, updated_at = NOW()
       WHERE id = $3`,
      [result, technicianNotes || null, itemId]
    );

    // Recalculate counts on checklist
    const { rows: counts } = await client.query(
      `SELECT
         COUNT(*) FILTER (WHERE result = 'pass') AS passed,
         COUNT(*) FILTER (WHERE result = 'fail') AS failed,
         COUNT(*) FILTER (WHERE result = 'rework') AS rework
       FROM pdi_items WHERE checklist_id = $1`,
      [item.checklist_id]
    );

    const { passed, failed, rework } = counts[0];

    await client.query(
      `UPDATE pdi_checklists
       SET passed_items = $1, failed_items = $2, rework_items = $3,
           started_at = COALESCE(started_at, NOW()), updated_at = NOW()
       WHERE id = $4`,
      [parseInt(passed), parseInt(failed), parseInt(rework), item.checklist_id]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      data: {
        itemId,
        result,
        technicianNotes: technicianNotes || null,
        checklistCounts: { passed: parseInt(passed), failed: parseInt(failed), rework: parseInt(rework) },
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PDI] Error updating item:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  } finally {
    client.release();
  }
});

// ─── POST /pdi/items/:id/photos — Upload Photo Evidence ──────────────────────

/**
 * @route   POST /api/v1/pdi/items/:itemId/photos
 * @desc    Upload photo evidence for a PDI checklist item
 * @access  PDI Technician, Manager, Admin
 */
router.post('/items/:itemId/photos', requireAuth, upload.array('photos', 5), async (req, res) => {
  const { itemId } = req.params;
  const { caption } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'NO_FILES', message: 'At least one photo is required' },
    });
  }

  try {
    // Verify item exists
    const { rows: items } = await db.query(
      `SELECT i.id, i.checklist_id, c.vehicle_id
       FROM pdi_items i JOIN pdi_checklists c ON c.id = i.checklist_id
       WHERE i.id = $1`,
      [itemId]
    );

    if (!items.length) {
      return res.status(404).json({ success: false, error: { code: 'PDI_ITEM_NOT_FOUND' } });
    }

    const item = items[0];
    const uploadedPhotos = [];

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const photoId = uuidv4();
      const s3Key = `pdi/${item.vehicle_id}/${item.checklist_id}/${itemId}/${photoId}${ext}`;

      // Upload to S3
      const { s3Url } = await uploadToS3(file.buffer, file.mimetype, s3Key);

      // Save to database
      await db.query(
        `INSERT INTO pdi_photos (id, pdi_item_id, s3_url, s3_key, caption, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [photoId, itemId, s3Url, s3Key, caption || null]
      );

      uploadedPhotos.push({ id: photoId, s3Url, caption: caption || null });
    }

    return res.status(201).json({
      success: true,
      data: {
        itemId,
        uploadedCount: uploadedPhotos.length,
        photos: uploadedPhotos,
      },
    });
  } catch (err) {
    console.error('[PDI] Error uploading photos:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// ─── POST /pdi/checklists/:id/complete — Mark PDI Complete ───────────────────

/**
 * @route   POST /api/v1/pdi/checklists/:id/complete
 * @desc    Mark PDI as completed. Validates mandatory items, updates vehicle status,
 *          publishes Redis event to unlock delivery scheduling.
 * @access  PDI Technician, Manager, Admin
 */
router.post('/checklists/:id/complete', requireAuth, async (req, res) => {
  const { id } = req.params;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Get checklist with mandatory item validation
    const { rows: checklists } = await client.query(
      `SELECT c.id, c.vehicle_id, c.technician_id, c.status, c.total_items,
              c.passed_items, c.failed_items, c.rework_items,
              v.vin
       FROM pdi_checklists c
       JOIN vehicles v ON v.id = c.vehicle_id
       WHERE c.id = $1`,
      [id]
    );

    if (!checklists.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'PDI_NOT_FOUND' } });
    }

    const checklist = checklists[0];

    if (['passed', 'failed'].includes(checklist.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        error: { code: 'PDI_ALREADY_COMPLETED', message: 'PDI has already been completed' },
      });
    }

    // Check for mandatory items that are still 'na' (not inspected)
    const { rows: pendingMandatory } = await client.query(
      `SELECT COUNT(*) AS count
       FROM pdi_items i
       JOIN pdi_template_items ti ON ti.id = i.template_item_id
       WHERE i.checklist_id = $1 AND ti.is_mandatory = true AND i.result = 'na'`,
      [id]
    );

    if (parseInt(pendingMandatory[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        success: false,
        error: {
          code: 'MANDATORY_ITEMS_INCOMPLETE',
          message: `${pendingMandatory[0].count} mandatory checklist items have not been inspected`,
        },
      });
    }

    // Determine final PDI status
    const hasFailed = parseInt(checklist.failed_items) > 0;
    const hasRework = parseInt(checklist.rework_items) > 0;
    const finalStatus = hasFailed ? 'failed' : (hasRework ? 'rework_required' : 'passed');

    // Update checklist status
    await client.query(
      `UPDATE pdi_checklists
       SET status = $1, completed_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [finalStatus, id]
    );

    // Update vehicle status based on PDI result
    const newVehicleStatus = finalStatus === 'passed' ? 'pdi_done' : 'pdi_in_progress';
    await client.query(
      `UPDATE vehicles SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newVehicleStatus, checklist.vehicle_id]
    );

    await client.query('COMMIT');

    // Publish Redis event (async, non-blocking)
    if (finalStatus === 'passed') {
      // delivery-service subscribes to this event to unlock delivery scheduling
      redis.publish('smartdeal:events', JSON.stringify({
        event: 'pdi.completed',
        data: {
          pdiChecklistId: id,
          vehicleId: checklist.vehicle_id,
          vin: checklist.vin,
          status: 'passed',
          passedItems: checklist.passed_items,
          totalItems: checklist.total_items,
        },
        timestamp: new Date().toISOString(),
      })).catch(err => console.error('[PDI] Redis publish error:', err.message));
    } else {
      // Alert service manager about failure
      redis.publish('smartdeal:events', JSON.stringify({
        event: 'pdi.failed',
        data: {
          pdiChecklistId: id,
          vehicleId: checklist.vehicle_id,
          vin: checklist.vin,
          status: finalStatus,
          failedItems: checklist.failed_items,
          reworkItems: checklist.rework_items,
        },
        timestamp: new Date().toISOString(),
      })).catch(err => console.error('[PDI] Redis publish error:', err.message));
    }

    return res.json({
      success: true,
      data: {
        id,
        status: finalStatus,
        summary: {
          totalItems: checklist.total_items,
          passed: checklist.passed_items,
          failed: checklist.failed_items,
          rework: checklist.rework_items,
        },
        vehicleStatus: newVehicleStatus,
        deliveryUnlocked: finalStatus === 'passed',
        message: finalStatus === 'passed'
          ? 'PDI passed! Vehicle is cleared for delivery scheduling.'
          : finalStatus === 'rework_required'
          ? 'Rework required. Please fix issues and re-inspect.'
          : 'PDI failed. Please notify service manager.',
        completedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[PDI] Error completing checklist:', err.message);
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  } finally {
    client.release();
  }
});

module.exports = router;
