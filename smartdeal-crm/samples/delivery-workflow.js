/**
 * SmartDeal CRM — Delivery Workflow
 * samples/delivery-workflow.js
 *
 * Handles delivery scheduling, pre-delivery confirmation, digital customer
 * sign-off, photo capture, accessory kit verification, and post-delivery
 * notification for a Tata Motors dealership.
 *
 * Covers:
 *  - Delivery slot booking (with muhurat date support)
 *  - Delivery checklist verification
 *  - Digital signature capture (base64)
 *  - Photo evidence upload to AWS S3
 *  - RTO document hand-off confirmation
 *  - WhatsApp congratulations message
 *  - Post-delivery CRM trigger (service reminder, NPS survey scheduling)
 *
 * Indian Specifics:
 *  - Muhurat (auspicious date/time) slot selection
 *  - High Security Number Plate (HSNP) status check
 *  - Temporary Registration Certificate (TRC) expiry guard
 *  - GST invoice linkage
 *  - Aadhaar-masked customer identity on delivery confirmation
 */

'use strict';

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { body, param, validationResult } = require('express-validator');
const AWS = require('aws-sdk');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const router = express.Router();

// ─── AWS S3 Configuration ────────────────────────────────────────────────────

const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET = process.env.S3_BUCKET || 'smartdeal-crm-documents';

// ─── Multer (in-memory, max 10 MB per file) ──────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Upload a Buffer to S3 and return the public URL.
 * @param {Buffer} buffer
 * @param {string} key   - S3 object key, e.g. "deliveries/uuid/photo.jpg"
 * @param {string} mime  - MIME type
 * @returns {Promise<string>} HTTPS URL
 */
async function uploadToS3(buffer, key, mime) {
  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mime,
    ServerSideEncryption: 'AES256',
  };
  const result = await s3.upload(params).promise();
  return result.Location;
}

/**
 * Mask PAN for logging/response (show first 2 + last 2 chars).
 * e.g. "ABCDE1234F" → "AB****34F"
 */
function maskPan(pan = '') {
  if (pan.length < 6) return '****';
  return pan.slice(0, 2) + '****' + pan.slice(-3);
}

/**
 * Validate an Indian mobile number (10 digits, starts with 6-9).
 */
function isValidMobile(mobile) {
  return /^[6-9]\d{9}$/.test(mobile);
}

/**
 * Compute Temporary Registration Certificate expiry status.
 * TRC is valid for 30 days from issue.
 */
function trcExpiryStatus(issueDate) {
  const expiry = dayjs(issueDate).tz('Asia/Kolkata').add(30, 'day');
  const now = dayjs().tz('Asia/Kolkata');
  const daysLeft = expiry.diff(now, 'day');
  return { expiry: expiry.toISOString(), daysLeft, expired: daysLeft < 0 };
}

// ─── Indian Muhurat Date Validator ───────────────────────────────────────────

/**
 * A simplified muhurat guard. In production, integrate with a Panchang API.
 * Here we block Sundays and a set of known inauspicious days for demo purposes.
 *
 * @param {string} dateStr - ISO date string
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateMuhurat(dateStr) {
  const d = dayjs(dateStr).tz('Asia/Kolkata');
  const dayOfWeek = d.day(); // 0 = Sunday

  // Dealership closed on Sunday
  if (dayOfWeek === 0) {
    return { valid: false, reason: 'Dealership closed on Sundays. Please select another date.' };
  }

  // Demo: block specific dates (replace with live Panchang API in production)
  const blockedDates = ['2024-01-15', '2024-03-08', '2024-07-17']; // Makar Sankranti, Holi, etc.
  if (blockedDates.includes(d.format('YYYY-MM-DD'))) {
    return { valid: false, reason: 'This date is marked as inauspicious in the Panchang. Please choose another.' };
  }

  return { valid: true };
}

// ─── WhatsApp Notification ───────────────────────────────────────────────────

/**
 * Send WhatsApp congratulations message via WhatsApp Business API.
 * Template: `delivery_congratulations` (pre-approved with Meta)
 *
 * @param {Object} params
 * @param {string} params.mobile       - 10-digit Indian mobile
 * @param {string} params.customerName
 * @param {string} params.vehicleModel
 * @param {string} params.registrationNumber
 * @param {string} params.deliveryDate - Human-readable
 */
async function sendDeliveryWhatsApp({ mobile, customerName, vehicleModel, registrationNumber, deliveryDate }) {
  const payload = {
    messaging_product: 'whatsapp',
    to: `91${mobile}`,
    type: 'template',
    template: {
      name: 'delivery_congratulations',
      language: { code: 'en_IN' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customerName },
            { type: 'text', text: vehicleModel },
            { type: 'text', text: registrationNumber || 'Pending Registration' },
            { type: 'text', text: deliveryDate },
          ],
        },
      ],
    },
  };

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    console.error('[WhatsApp] Delivery message failed:', err);
    throw new Error('WhatsApp notification failed');
  }

  return res.json();
}

// ─── POST /deliveries/schedule ────────────────────────────────────────────────

/**
 * Book a delivery slot for a confirmed booking.
 *
 * Body:
 *  bookingId       string  UUID of the booking
 *  customerId      string  UUID of the customer
 *  deliveryDate    string  ISO date (YYYY-MM-DD)
 *  deliveryTime    string  "10:00" – "18:00" in 30-min slots
 *  muhuratRequested boolean  Flag from customer if muhurat date was chosen
 *  branchId        string  UUID of the delivery branch
 *  assignedStaffId string  UUID of delivery manager
 *  notes           string  Optional notes (e.g. "Customer bringing family")
 */
router.post(
  '/schedule',
  [
    body('bookingId').isUUID().withMessage('Valid booking ID required'),
    body('customerId').isUUID().withMessage('Valid customer ID required'),
    body('deliveryDate').isISO8601().withMessage('Valid delivery date required (YYYY-MM-DD)'),
    body('deliveryTime')
      .matches(/^([01]\d|2[0-3]):[03]0$/)
      .withMessage('Delivery time must be on the hour or half-hour (e.g. 10:00 or 10:30)'),
    body('branchId').isUUID().withMessage('Valid branch ID required'),
    body('assignedStaffId').isUUID().withMessage('Valid staff ID required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { bookingId, customerId, deliveryDate, deliveryTime, muhuratRequested, branchId, assignedStaffId, notes } =
      req.body;

    // Guard: delivery date must be today or in the future (IST)
    const today = dayjs().tz('Asia/Kolkata').startOf('day');
    const selected = dayjs(deliveryDate).tz('Asia/Kolkata').startOf('day');
    if (selected.isBefore(today)) {
      return res.status(400).json({ success: false, message: 'Delivery date cannot be in the past.' });
    }

    // Guard: muhurat validation
    if (muhuratRequested) {
      const muhurat = validateMuhurat(deliveryDate);
      if (!muhurat.valid) {
        return res.status(422).json({ success: false, message: muhurat.reason, code: 'INAUSPICIOUS_DATE' });
      }
    }

    // TODO: Check booking status = 'FINANCE_COMPLETED' | 'INSURANCE_COMPLETED' | 'BILLING_DONE'
    // TODO: Check PDI status = 'PASSED'
    // TODO: Check RTO documents status = 'READY' (Form 20, Form 21 generated)
    // TODO: Check slot availability in delivery_schedules table (no double-booking)

    const deliveryId = uuidv4();
    const deliveryRecord = {
      id: deliveryId,
      bookingId,
      customerId,
      branchId,
      assignedStaffId,
      deliveryDate,
      deliveryTime,
      muhuratRequested: muhuratRequested || false,
      status: 'SCHEDULED',
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    // TODO: db.query('INSERT INTO delivery_schedules ...', deliveryRecord)

    console.log(`[Delivery] Scheduled: ${deliveryId} for booking ${bookingId} on ${deliveryDate} at ${deliveryTime}`);

    return res.status(201).json({
      success: true,
      message: 'Delivery slot booked successfully.',
      data: {
        deliveryId,
        deliveryDate,
        deliveryTime,
        status: 'SCHEDULED',
        instructions: [
          'Please bring your original Aadhaar card and PAN card.',
          'Balance payment (if any) must be settled before delivery.',
          'Insurance policy must be active before key handover.',
          'RTO temporary registration will be affixed at delivery.',
        ],
      },
    });
  }
);

// ─── GET /deliveries/:deliveryId/checklist ────────────────────────────────────

/**
 * Fetch the delivery checklist for a given delivery.
 * The checklist is populated based on the vehicle model and accessories booked.
 *
 * Response includes all checklist items grouped by category.
 */
router.get(
  '/:deliveryId/checklist',
  [param('deliveryId').isUUID().withMessage('Valid delivery ID required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { deliveryId } = req.params;

    // TODO: Fetch from DB: delivery_schedules JOIN bookings JOIN vehicles
    // For demo, return a static checklist template

    const checklist = {
      deliveryId,
      vehicleChecks: [
        { id: 'VC001', item: 'Exterior – No scratches or dents', category: 'EXTERIOR', required: true, status: null },
        { id: 'VC002', item: 'All four tyres – correct pressure (32 PSI)', category: 'TYRES', required: true, status: null },
        { id: 'VC003', item: 'Spare tyre present and inflated', category: 'TYRES', required: true, status: null },
        { id: 'VC004', item: 'Fuel level – min 5 litres / EV charge min 80%', category: 'FUEL', required: true, status: null },
        { id: 'VC005', item: 'All windows and windshield – no cracks', category: 'GLASS', required: true, status: null },
        { id: 'VC006', item: 'Headlights, tail lights, indicators – functional', category: 'ELECTRICALS', required: true, status: null },
        { id: 'VC007', item: 'AC functioning – cold air output verified', category: 'HVAC', required: true, status: null },
        { id: 'VC008', item: 'Infotainment system – connected, no errors', category: 'TECH', required: true, status: null },
        { id: 'VC009', item: 'TPMS (Tyre Pressure Monitoring System) – active', category: 'TECH', required: false, status: null },
        { id: 'VC010', item: 'Reverse camera / parking sensors – functional', category: 'TECH', required: true, status: null },
      ],
      documentChecks: [
        { id: 'DC001', item: 'Retail Invoice (GST Invoice) – handed over', category: 'DOCUMENTS', required: true, status: null },
        { id: 'DC002', item: 'Temporary Registration Certificate (TRC) – affixed', category: 'DOCUMENTS', required: true, status: null },
        { id: 'DC003', item: 'Insurance Policy Document – original', category: 'DOCUMENTS', required: true, status: null },
        { id: 'DC004', item: 'Form 22 (Roadworthiness Certificate) – signed', category: 'DOCUMENTS', required: true, status: null },
        { id: 'DC005', item: 'Owner's Manual & Warranty Card – inside vehicle', category: 'DOCUMENTS', required: true, status: null },
        { id: 'DC006', item: 'Service Booklet – stamped with delivery date', category: 'DOCUMENTS', required: true, status: null },
        { id: 'DC007', item: 'Extended Warranty Certificate (if applicable)', category: 'DOCUMENTS', required: false, status: null },
      ],
      accessoryChecks: [
        { id: 'AC001', item: 'Tool Kit (jack, spanners, tyre inflator)', category: 'ACCESSORIES', required: true, status: null },
        { id: 'AC002', item: 'First Aid Kit', category: 'ACCESSORIES', required: true, status: null },
        { id: 'AC003', item: 'Reflective Triangle / Warning Triangles (2)', category: 'ACCESSORIES', required: true, status: null },
        { id: 'AC004', item: 'Booked accessories installed and verified', category: 'ACCESSORIES', required: true, status: null },
      ],
      keyHandover: [
        { id: 'KH001', item: 'Master Key – handed over', category: 'KEYS', required: true, status: null },
        { id: 'KH002', item: 'Spare Key – handed over', category: 'KEYS', required: true, status: null },
        { id: 'KH003', item: 'Valet Key (if applicable)', category: 'KEYS', required: false, status: null },
      ],
    };

    return res.json({ success: true, data: checklist });
  }
);

// ─── PATCH /deliveries/:deliveryId/checklist ──────────────────────────────────

/**
 * Submit completed delivery checklist with item statuses.
 *
 * Body:
 *  items: Array of { id, status: 'OK' | 'ISSUE', remarks? }
 *  staffId: UUID of delivery staff completing the checklist
 */
router.patch(
  '/:deliveryId/checklist',
  [
    param('deliveryId').isUUID().withMessage('Valid delivery ID required'),
    body('items').isArray({ min: 1 }).withMessage('Checklist items required'),
    body('items.*.id').notEmpty().withMessage('Item ID required'),
    body('items.*.status').isIn(['OK', 'ISSUE', 'NA']).withMessage('Status must be OK, ISSUE, or NA'),
    body('staffId').isUUID().withMessage('Valid staff ID required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { deliveryId } = req.params;
    const { items, staffId } = req.body;

    const issues = items.filter((i) => i.status === 'ISSUE');
    const criticalIssues = items.filter(
      (i) => i.status === 'ISSUE' && ['DC001', 'DC002', 'DC003', 'KH001', 'KH002'].includes(i.id)
    );

    if (criticalIssues.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Critical checklist items have issues. Delivery cannot proceed.',
        blockedItems: criticalIssues.map((i) => ({ id: i.id, remarks: i.remarks })),
        code: 'CRITICAL_CHECKLIST_ISSUE',
      });
    }

    // TODO: UPDATE delivery_checklist_items SET status, remarks, checked_by = staffId WHERE delivery_id = deliveryId

    const overallStatus = issues.length > 0 ? 'CHECKLIST_COMPLETED_WITH_ISSUES' : 'CHECKLIST_COMPLETED';

    return res.json({
      success: true,
      message: 'Delivery checklist saved.',
      data: {
        deliveryId,
        status: overallStatus,
        totalItems: items.length,
        okItems: items.filter((i) => i.status === 'OK').length,
        issueItems: issues.length,
        checkedBy: staffId,
        checkedAt: new Date().toISOString(),
        nextStep: 'PHOTO_CAPTURE',
      },
    });
  }
);

// ─── POST /deliveries/:deliveryId/photos ──────────────────────────────────────

/**
 * Upload delivery ceremony photos to S3.
 * Accepts up to 10 photos.
 *
 * Multipart form fields:
 *  photos      - files (JPEG/PNG/WebP)
 *  photoType   - e.g. FRONT_VIEW | SIDE_VIEW | KEY_HANDOVER | FAMILY_PHOTO | DASHBOARD | BADGE
 *  customerId  - UUID
 */
router.post(
  '/:deliveryId/photos',
  upload.array('photos', 10),
  [
    param('deliveryId').isUUID().withMessage('Valid delivery ID required'),
    body('customerId').isUUID().withMessage('Valid customer ID required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { deliveryId } = req.params;
    const { customerId } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one photo is required.' });
    }

    const uploadedPhotos = [];

    for (const file of req.files) {
      const ext = file.originalname.split('.').pop().toLowerCase() || 'jpg';
      const key = `deliveries/${deliveryId}/photos/${uuidv4()}.${ext}`;

      try {
        const url = await uploadToS3(file.buffer, key, file.mimetype);
        uploadedPhotos.push({
          s3Key: key,
          url,
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[Delivery Photos] Upload failed for file ${file.originalname}:`, err.message);
        return res.status(502).json({ success: false, message: 'Photo upload failed. Please retry.' });
      }
    }

    // TODO: INSERT INTO delivery_photos (delivery_id, customer_id, s3_key, url, ...)
    console.log(`[Delivery] ${uploadedPhotos.length} photos uploaded for delivery ${deliveryId}`);

    return res.status(201).json({
      success: true,
      message: `${uploadedPhotos.length} photo(s) uploaded successfully.`,
      data: { deliveryId, customerId, photos: uploadedPhotos },
    });
  }
);

// ─── POST /deliveries/:deliveryId/signature ───────────────────────────────────

/**
 * Capture digital customer signature and confirm delivery.
 *
 * The signature is a base64-encoded PNG from the canvas on the tablet app.
 * Once received, the signature is:
 *  1. Decoded and uploaded to S3 (customer-signature/<deliveryId>.png)
 *  2. Stored as a reference in delivery_confirmations
 *  3. Delivery status updated to DELIVERED
 *  4. WhatsApp congratulations sent
 *  5. Post-sale CRM workflow triggered (service reminder, NPS survey)
 *
 * Body:
 *  customerId         string  UUID
 *  signatureBase64    string  Base64 PNG ("data:image/png;base64,...")
 *  customerMobile     string  10-digit mobile
 *  customerName       string
 *  vehicleModel       string  e.g. "Tata Nexon XZ+ (Dark)"
 *  registrationNumber string  e.g. "MH02AB1234" (or blank if TRC only)
 *  staffId            string  UUID of delivery manager
 *  odometer           number  Odometer reading at delivery (km)
 *  fuelLevel          string  e.g. "5 litres" or "82% (EV)"
 */
router.post(
  '/:deliveryId/signature',
  [
    param('deliveryId').isUUID().withMessage('Valid delivery ID required'),
    body('customerId').isUUID().withMessage('Valid customer ID required'),
    body('signatureBase64')
      .notEmpty()
      .withMessage('Signature (base64) is required')
      .custom((val) => val.startsWith('data:image/png;base64,'))
      .withMessage('Signature must be a base64-encoded PNG'),
    body('customerMobile')
      .notEmpty()
      .withMessage('Customer mobile required')
      .custom(isValidMobile)
      .withMessage('Invalid Indian mobile number'),
    body('customerName').notEmpty().withMessage('Customer name required'),
    body('vehicleModel').notEmpty().withMessage('Vehicle model required'),
    body('staffId').isUUID().withMessage('Valid staff ID required'),
    body('odometer').isInt({ min: 0, max: 500 }).withMessage('Odometer must be 0–500 km for a new vehicle'),
    body('fuelLevel').notEmpty().withMessage('Fuel level required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { deliveryId } = req.params;
    const {
      customerId,
      signatureBase64,
      customerMobile,
      customerName,
      vehicleModel,
      registrationNumber,
      staffId,
      odometer,
      fuelLevel,
    } = req.body;

    // Decode base64 signature → Buffer
    const base64Data = signatureBase64.replace(/^data:image\/png;base64,/, '');
    const sigBuffer = Buffer.from(base64Data, 'base64');

    if (sigBuffer.length < 1000) {
      return res.status(422).json({
        success: false,
        message: 'Signature appears empty or too small. Please have the customer re-sign.',
        code: 'INVALID_SIGNATURE',
      });
    }

    // Upload signature to S3
    const sigKey = `deliveries/${deliveryId}/customer-signature.png`;
    let signatureUrl;
    try {
      signatureUrl = await uploadToS3(sigBuffer, sigKey, 'image/png');
    } catch (err) {
      console.error('[Delivery Signature] S3 upload failed:', err.message);
      return res.status(502).json({ success: false, message: 'Signature upload failed. Please retry.' });
    }

    const deliveredAt = new Date().toISOString();
    const deliveryDate = dayjs(deliveredAt).tz('Asia/Kolkata').format('DD MMM YYYY, hh:mm A');

    const confirmationRecord = {
      id: uuidv4(),
      deliveryId,
      customerId,
      signatureUrl,
      staffId,
      odometer,
      fuelLevel,
      registrationNumber: registrationNumber || null,
      deliveredAt,
      status: 'DELIVERED',
    };

    // TODO: INSERT INTO delivery_confirmations (...)
    // TODO: UPDATE delivery_schedules SET status = 'DELIVERED', delivered_at = NOW() WHERE id = deliveryId
    // TODO: UPDATE bookings SET status = 'DELIVERED' WHERE id = (SELECT booking_id FROM delivery_schedules WHERE id = deliveryId)

    console.log(`[Delivery] Confirmed: ${deliveryId} — Customer: ${customerName} — Vehicle: ${vehicleModel} — At: ${deliveryDate}`);

    // Send WhatsApp congratulations
    try {
      await sendDeliveryWhatsApp({
        mobile: customerMobile,
        customerName,
        vehicleModel,
        registrationNumber: registrationNumber || 'To be allotted',
        deliveryDate,
      });
      console.log(`[WhatsApp] Delivery congratulations sent to +91${customerMobile}`);
    } catch (err) {
      // Non-blocking: log the error but don't fail the delivery confirmation
      console.error('[WhatsApp] Failed to send delivery notification:', err.message);
    }

    // ── Trigger Post-Sale CRM Workflow ─────────────────────────────────────
    schedulePostSaleCRM({ customerId, deliveryId, customerMobile, vehicleModel, deliveredAt });

    return res.status(200).json({
      success: true,
      message: 'Vehicle delivered successfully. Congratulations! 🎉',
      data: {
        confirmationId: confirmationRecord.id,
        deliveryId,
        deliveredAt,
        signatureUrl,
        nextSteps: [
          'Permanent Registration (RC) will be processed within 30 days via RTO.',
          'High Security Number Plate (HSNP) will be affixed at the dealership within 7 days.',
          'First free service is due at 1,000 km or 6 months, whichever is earlier.',
          'You will receive an NPS survey in 7 days — your feedback is valued.',
        ],
      },
    });
  }
);

// ─── Post-Sale CRM Trigger ────────────────────────────────────────────────────

/**
 * Schedule post-sale follow-ups after delivery confirmation.
 *
 * Follow-up schedule:
 *  Day 1  — "Welcome to Tata family" WhatsApp message
 *  Day 3  — 3-day ownership experience call by Sales Consultant
 *  Day 7  — NPS survey link via WhatsApp
 *  Day 30 — First month check-in
 *  Day 180 — 6-month / 1,000 km first free service reminder
 *  Day 365 — 1-year ownership anniversary + insurance renewal reminder
 *
 * @param {Object} params
 * @param {string} params.customerId
 * @param {string} params.deliveryId
 * @param {string} params.customerMobile
 * @param {string} params.vehicleModel
 * @param {string} params.deliveredAt  - ISO timestamp
 */
function schedulePostSaleCRM({ customerId, deliveryId, customerMobile, vehicleModel, deliveredAt }) {
  const schedules = [
    { offsetDays: 1, type: 'WELCOME_MESSAGE', channel: 'WHATSAPP' },
    { offsetDays: 3, type: 'OWNERSHIP_EXPERIENCE_CALL', channel: 'PHONE' },
    { offsetDays: 7, type: 'NPS_SURVEY', channel: 'WHATSAPP' },
    { offsetDays: 30, type: 'MONTHLY_CHECKIN', channel: 'WHATSAPP' },
    { offsetDays: 180, type: 'FIRST_SERVICE_REMINDER', channel: 'WHATSAPP' },
    { offsetDays: 365, type: 'ANNIVERSARY_AND_INSURANCE_RENEWAL', channel: 'WHATSAPP' },
  ];

  const baseDate = dayjs(deliveredAt).tz('Asia/Kolkata');

  const followUpRecords = schedules.map((s) => ({
    id: uuidv4(),
    customerId,
    deliveryId,
    followUpType: s.type,
    channel: s.channel,
    scheduledFor: baseDate.add(s.offsetDays, 'day').toISOString(),
    status: 'PENDING',
    vehicleModel,
    customerMobile,
    createdAt: new Date().toISOString(),
  }));

  // TODO: INSERT INTO follow_up_schedules (id, customer_id, delivery_id, follow_up_type, channel, scheduled_for, status, ...)
  console.log(`[Post-Sale CRM] ${followUpRecords.length} follow-ups scheduled for customer ${customerId}`);

  // Service reminder at 1,000 km (time-based: 6 months proxy)
  // In production, integrate with vehicle telematics (ConnectNext) for odometer-triggered reminders
}

// ─── GET /deliveries/:deliveryId/summary ──────────────────────────────────────

/**
 * Return full delivery summary — used by the customer portal and manager dashboard.
 */
router.get(
  '/:deliveryId/summary',
  [param('deliveryId').isUUID().withMessage('Valid delivery ID required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { deliveryId } = req.params;

    // TODO: Fetch from DB — delivery_schedules JOIN delivery_confirmations JOIN bookings JOIN vehicles JOIN customers
    // Return a mock summary for demo
    const summary = {
      deliveryId,
      status: 'DELIVERED',
      customer: {
        name: 'Rajesh Kumar',
        mobile: '98765*****',
        pan: maskPan('ABCDE1234F'),
      },
      vehicle: {
        model: 'Tata Nexon XZ+ (Dark)',
        variant: 'XZ+ Dark',
        colour: 'Daytona Grey',
        vin: 'MAT607851NHK00001',
        engineNumber: 'REVTRON1234',
        registrationNumber: 'MH02AB1234',
        temporaryRegistration: {
          trcNumber: 'TRC/MH/2024/00123',
          issueDate: '2024-11-01',
          ...trcExpiryStatus('2024-11-01'),
        },
      },
      delivery: {
        deliveredAt: '2024-11-01T11:30:00+05:30',
        deliveredBy: 'Suresh Patil (Delivery Manager)',
        branch: 'Akar Motors – Pune Showroom',
        odometer: 12,
        fuelLevel: '5 litres',
      },
      documents: {
        invoice: 'https://s3.ap-south-1.amazonaws.com/smartdeal-crm-documents/invoices/abc123.pdf',
        insurance: 'https://s3.ap-south-1.amazonaws.com/smartdeal-crm-documents/insurance/abc123.pdf',
        customerSignature: 'https://s3.ap-south-1.amazonaws.com/smartdeal-crm-documents/deliveries/abc123/customer-signature.png',
      },
      postSaleCRM: {
        nextFollowUp: '3 days (Ownership Experience Call)',
        firstServiceDue: '1,000 km or 6 months (whichever is earlier)',
        insuranceRenewalDue: '2025-10-31',
      },
    };

    return res.json({ success: true, data: summary });
  }
);

// ─── GET /deliveries — List deliveries for a branch ──────────────────────────

/**
 * List all deliveries for a branch with pagination and status filter.
 *
 * Query params:
 *  branchId  - UUID (required)
 *  status    - SCHEDULED | CHECKLIST_COMPLETED | DELIVERED | CANCELLED
 *  date      - YYYY-MM-DD (filter by scheduled delivery date)
 *  page      - default 1
 *  limit     - default 20, max 100
 */
router.get('/', async (req, res) => {
  const { branchId, status, date, page = 1, limit = 20 } = req.query;

  if (!branchId) {
    return res.status(400).json({ success: false, message: 'branchId is required.' });
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  // TODO: SELECT * FROM delivery_schedules WHERE branch_id = $1 AND status = $2 AND delivery_date = $3 LIMIT $4 OFFSET $5
  // Return mock data
  const mockData = [
    {
      deliveryId: uuidv4(),
      customerName: 'Rajesh Kumar',
      vehicleModel: 'Tata Nexon XZ+ Dark',
      deliveryDate: date || dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD'),
      deliveryTime: '11:00',
      status: status || 'SCHEDULED',
      assignedStaff: 'Suresh Patil',
    },
  ];

  return res.json({
    success: true,
    data: mockData,
    pagination: { page: pageNum, limit: limitNum, offset, total: mockData.length },
  });
});

// ─── PATCH /deliveries/:deliveryId/reschedule ─────────────────────────────────

/**
 * Reschedule an existing delivery slot.
 * Allowed only if current status is 'SCHEDULED' (not already delivered or cancelled).
 */
router.patch(
  '/:deliveryId/reschedule',
  [
    param('deliveryId').isUUID().withMessage('Valid delivery ID required'),
    body('newDeliveryDate').isISO8601().withMessage('Valid new delivery date required'),
    body('newDeliveryTime')
      .matches(/^([01]\d|2[0-3]):[03]0$/)
      .withMessage('Time must be on the hour or half-hour'),
    body('reason').notEmpty().withMessage('Reason for rescheduling required'),
    body('requestedBy').isUUID().withMessage('Valid staff/customer ID required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { deliveryId } = req.params;
    const { newDeliveryDate, newDeliveryTime, reason, requestedBy } = req.body;

    // TODO: CHECK status = 'SCHEDULED' before allowing reschedule
    // TODO: UPDATE delivery_schedules SET delivery_date = $1, delivery_time = $2, reschedule_reason = $3, rescheduled_by = $4, updated_at = NOW() WHERE id = $5

    const muhurat = validateMuhurat(newDeliveryDate);

    return res.json({
      success: true,
      message: 'Delivery rescheduled successfully.',
      data: {
        deliveryId,
        newDeliveryDate,
        newDeliveryTime,
        muhuratValid: muhurat.valid,
        muhuratWarning: muhurat.valid ? null : muhurat.reason,
        reason,
        rescheduledBy: requestedBy,
        rescheduledAt: new Date().toISOString(),
      },
    });
  }
);

// ─── PATCH /deliveries/:deliveryId/cancel ─────────────────────────────────────

/**
 * Cancel a scheduled delivery.
 * Allowed only for SCHEDULED status. Requires manager authorization.
 */
router.patch(
  '/:deliveryId/cancel',
  [
    param('deliveryId').isUUID().withMessage('Valid delivery ID required'),
    body('reason').notEmpty().withMessage('Cancellation reason required'),
    body('cancelledBy').isUUID().withMessage('Valid staff ID required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { deliveryId } = req.params;
    const { reason, cancelledBy } = req.body;

    // TODO: UPDATE delivery_schedules SET status = 'CANCELLED', cancellation_reason = $1, cancelled_by = $2, updated_at = NOW() WHERE id = $3 AND status = 'SCHEDULED'

    return res.json({
      success: true,
      message: 'Delivery cancelled. A new slot can be scheduled when ready.',
      data: { deliveryId, status: 'CANCELLED', reason, cancelledBy, cancelledAt: new Date().toISOString() },
    });
  }
);

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = router;

/*
 * Usage (app.js / api-gateway):
 *
 *   const deliveryRouter = require('./samples/delivery-workflow');
 *   app.use('/api/v1/deliveries', authenticate, authorize(['DELIVERY_MANAGER', 'SALES_MANAGER', 'ADMIN']), deliveryRouter);
 *
 * Database tables used:
 *   delivery_schedules, delivery_checklists, delivery_checklist_items,
 *   delivery_photos, delivery_confirmations, follow_up_schedules
 *
 * See docs/DATABASE_SCHEMA.md for full DDL.
 * See docs/CUSTOMER_JOURNEY.md Step 14 & 15 for business context.
 */
