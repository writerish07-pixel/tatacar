# SmartDeal CRM – Security Architecture

## Table of Contents
1. [Document & Data Encryption](#1-document--data-encryption)
2. [RBAC Detailed Design](#2-rbac-detailed-design)
3. [Audit Logging Specification](#3-audit-logging-specification)
4. [API Security](#4-api-security)
5. [DPDP Act 2023 Compliance](#5-dpdp-act-2023-compliance)
6. [JWT Token Strategy](#6-jwt-token-strategy)
7. [Infrastructure Security](#7-infrastructure-security)

---

## 1. Document & Data Encryption

### Sensitive Data Classification

| Data | Classification | Storage Method |
|------|---------------|---------------|
| PAN Number | Highly Sensitive | AES-256-GCM encrypted in DB |
| Aadhaar Number | Highly Sensitive | Never stored; only last 4 digits + masked |
| Bank Account Numbers | Highly Sensitive | AES-256-GCM encrypted |
| Loan Application Data | Sensitive | AES-256-GCM encrypted |
| KYC Documents (files) | Sensitive | AWS S3 with SSE-S3 + pre-signed URLs |
| Customer Phone/Email | Moderate | Stored plaintext; access controlled by RBAC |
| Quotation Amounts | Internal | Stored plaintext; RBAC controlled |

### Encryption at Rest (Database)

**Algorithm:** AES-256-GCM (authenticated encryption)

```javascript
// src/shared/encryption.js

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32-byte key
const IV_LENGTH = 16;

/**
 * Encrypts sensitive data (PAN, Aadhaar, bank account numbers)
 * Returns: base64(iv:authTag:ciphertext)
 */
function encrypt(plaintext) {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv(16 bytes) + authTag(16 bytes) + ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * Decrypts sensitive data
 */
function decrypt(encryptedBase64) {
  if (!encryptedBase64) return null;
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.slice(0, IV_LENGTH);
  const authTag = data.slice(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = data.slice(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * Creates a searchable hash (for PAN lookup without decrypting all records)
 * Uses HMAC-SHA256 with a separate HMAC key
 */
function hashForSearch(plaintext) {
  return crypto.createHmac('sha256', process.env.HMAC_KEY)
               .update(String(plaintext).toUpperCase())
               .digest('hex');
}

module.exports = { encrypt, decrypt, hashForSearch };
```

### PAN Storage Pattern
```sql
-- booking_documents table
document_number        VARCHAR(100),  -- AES-256-GCM encrypted PAN
document_number_hash   VARCHAR(64),   -- HMAC-SHA256 hash for lookups

-- Stored as: encrypt("ABCDE1234F") = "base64_ciphertext"
-- Hash:      HMAC-SHA256("ABCDE1234F") = "hexhash" (for WHERE clause queries)
```

### Aadhaar Handling
```
RULE: Never store full 12-digit Aadhaar number
- Display in UI: XXXX-XXXX-1234 (only last 4 visible)
- DB storage: Only last 4 digits in aadhaar_last4 (VARCHAR(4))
- For KYC: Aadhaar offline XML verification (OTP-based) — Aadhaar OTP confirmed/denied, no number stored
- Document files: Aadhaar card scan stored encrypted in S3 (SSE-S3) under customer's scoped S3 prefix
```

### Encryption at Rest (AWS S3)
```
All KYC documents, PDI photos, delivery signatures stored in S3:
  - Server-Side Encryption: SSE-S3 (AES-256, AWS managed keys)
  - Bucket policy: Block all public access
  - Object access: Pre-signed URLs (15-minute TTL)
  - Bucket versioning: Enabled (for accidental deletion recovery)
  - S3 Object Lock: For compliance documents (7-year retention)
```

### Encryption in Transit
```
- All API endpoints: TLS 1.3 (TLS 1.2 minimum)
- Internal service-to-service: mTLS in Kubernetes (Istio service mesh)
- Database connections: SSL/TLS (require_ssl=on in PostgreSQL)
- Redis connections: TLS (redis:// → rediss://)
- Webhook endpoints: HTTPS only
```

### Key Management
```
Production:
  - Encryption keys stored in AWS Secrets Manager
  - Key rotation: Every 90 days (automated)
  - Access: IAM role-based (least privilege)
  - No encryption keys in environment variables or code

Development:
  - Keys stored in .env (not committed to git)
  - .env.example has placeholder values only
  - Pre-commit hook prevents committing .env files
```

---

## 2. RBAC Detailed Design

### Implementation

```javascript
// src/shared/rbac.js

const PERMISSIONS = {
  // Format: 'resource:action'
  LEADS_CREATE: 'leads:create',
  LEADS_READ_OWN: 'leads:read:own',
  LEADS_READ_BRANCH: 'leads:read:branch',
  LEADS_READ_ALL: 'leads:read:all',
  LEADS_UPDATE: 'leads:update',
  LEADS_DELETE: 'leads:delete',
  LEADS_ASSIGN: 'leads:assign',

  DISCOUNT_APPROVE_L1: 'discount:approve:l1',  // up to ₹5,000
  DISCOUNT_APPROVE_L2: 'discount:approve:l2',  // up to ₹20,000
  DISCOUNT_APPROVE_L3: 'discount:approve:l3',  // up to ₹50,000
  DISCOUNT_APPROVE_L4: 'discount:approve:l4',  // unlimited

  DOCUMENTS_VERIFY: 'documents:verify',
  INVOICES_GENERATE: 'invoices:generate',
  // ... all permissions
};

const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),  // All permissions

  sales_consultant: [
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_READ_OWN,
    PERMISSIONS.LEADS_UPDATE,
    PERMISSIONS.DISCOUNT_APPROVE_L1,
    // ...
  ],

  sales_manager: [
    PERMISSIONS.LEADS_READ_BRANCH,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.DISCOUNT_APPROVE_L2,
    PERMISSIONS.DOCUMENTS_VERIFY,
    // ...
  ],

  // ... other roles
};

// Middleware
function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Role '${userRole}' cannot perform '${permission}'`
        }
      });
    }

    // Branch-scope check
    if (permission.includes(':branch') && req.query.branchId !== req.user.branchId) {
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: { code: 'BRANCH_ACCESS_DENIED' }
        });
      }
    }

    next();
  };
}
```

### JWT Claims for RBAC
```json
{
  "sub": "user-uuid",
  "role": "sales_consultant",
  "branchId": "branch-uuid",
  "branchIds": ["branch-uuid"],       // For managers with multi-branch access
  "dealershipId": "dealership-uuid",
  "permissions": ["leads:create", "leads:read:own", ...],
  "iat": 1705301400,
  "exp": 1705302300
}
```

---

## 3. Audit Logging Specification

### What Gets Logged
Every state-changing operation writes to `audit_logs`. Read-only operations are NOT logged (to keep volume manageable; database query logs cover those).

### Events Logged

```
AUTH EVENTS:
  auth.login.success        auth.login.failed        auth.logout
  auth.otp.sent             auth.otp.verified        auth.token.refreshed
  auth.account.locked

LEAD EVENTS:
  lead.created              lead.status_changed       lead.assigned
  lead.discount_requested   lead.discount_approved    lead.discount_rejected

QUOTATION EVENTS:
  quotation.created         quotation.shared          quotation.approved
  quotation.expired         quotation.converted

BOOKING EVENTS:
  booking.created           booking.document_uploaded booking.document_verified
  booking.payment_received  booking.confirmed         booking.vin_allocated
  booking.cancelled         booking.refund_initiated

FINANCE EVENTS:
  finance.application_created  finance.submitted_to_bank
  finance.approved              finance.disbursed          finance.rejected

BILLING EVENTS:
  invoice.proforma_created      invoice.final_created      invoice.einvoice_generated
  invoice.payment_recorded      invoice.cancelled

PDI EVENTS:
  pdi.started               pdi.item_updated          pdi.completed
  pdi.failed                pdi.rework_initiated

DELIVERY EVENTS:
  delivery.scheduled        delivery.confirmed        delivery.started
  delivery.completed        delivery.rescheduled

SECURITY EVENTS:
  security.permission_denied      security.rate_limit_exceeded
  security.suspicious_activity    security.data_export
```

### Audit Log Schema
```sql
CREATE TABLE audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  correlation_id  VARCHAR(50),              -- Request ID for tracing
  user_id         UUID REFERENCES users(id),
  user_role       VARCHAR(50),              -- Snapshot of role at time of action
  branch_id       UUID REFERENCES branches(id),
  action          VARCHAR(100) NOT NULL,    -- e.g. 'lead.status_changed'
  resource_type   VARCHAR(100) NOT NULL,    -- e.g. 'lead'
  resource_id     UUID,
  old_value       JSONB,                    -- State BEFORE change
  new_value       JSONB,                    -- State AFTER change
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: database rules prevent UPDATE and DELETE
-- Partition by month after 3 months
-- Retain for 7 years (for regulatory compliance)
```

### Audit Log Viewer (Admin)
- Searchable by user, action, resource_id, date range, IP address
- Export to CSV for compliance reporting
- Immutable — no edit or delete capability in UI

---

## 4. API Security

### Security Headers (Helmet.js)
```javascript
// api-gateway/middleware/security.js
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://graph.facebook.com"],
      imgSrc: ["'self'", "data:", "https://cdn.smartdeal.akar-motors.in"],
    },
  },
  hsts: {
    maxAge: 31536000,       // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### Rate Limiting (Redis-backed)
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Global rate limit
app.use(rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  max: 100,                 // 100 requests per IP (unauthenticated)
  standardHeaders: true,
  store: new RedisStore({ client: redisClient, prefix: 'rl:global:' }),
}));

// Authenticated user limit
const authenticatedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: new RedisStore({ client: redisClient, prefix: 'rl:user:' }),
});

// Strict limit for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,                   // 5 OTP requests per minute per phone
  keyGenerator: (req) => req.body.phone || req.ip,
  store: new RedisStore({ client: redisClient, prefix: 'rl:otp:' }),
});

app.post('/api/v1/auth/otp/send', strictLimiter);
app.post('/api/v1/billing/invoices/:id/e-invoice', authenticatedLimiter);
```

### Input Validation
```javascript
// Using Joi or class-validator (NestJS)

// Lead creation validation
const createLeadSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).trim().required(),
  lastName: Joi.string().min(2).max(100).trim().required(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),  // Indian mobile
  email: Joi.string().email().lowercase().optional(),
  source: Joi.string().valid(...Object.values(LeadSource)).required(),
  budgetMax: Joi.number().min(100000).max(10000000).optional(),
  // ... all fields validated
});
```

### SQL Injection Prevention
- All queries use TypeORM / Prisma ORM with parameterised queries
- No raw SQL with user input concatenation
- Input length limits enforced at validation layer
- Database user `smartdeal_app` has only DML permissions (no DDL)

### CORS Configuration
```javascript
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Branch-ID', 'X-Correlation-ID'],
  credentials: true,
  maxAge: 86400,
}));
```

### Webhook Signature Verification
```javascript
// Razorpay webhook
function verifyRazorpayWebhook(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// WhatsApp webhook
function verifyWhatsAppWebhook(payload, signature) {
  const expected = `sha256=${crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
    .update(payload).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

---

## 5. DPDP Act 2023 Compliance

The Digital Personal Data Protection Act, 2023 applies to SmartDeal as it processes personal data of Indian customers.

### Data Principal Rights Implementation

#### Right to Access (Section 11)
```
Customer portal feature: "My Data" section
- Customer can view all personal data stored about them
- Includes: contact details, booking history, KYC details (masked), interaction logs
- Response time: Within 48 hours of request
```

#### Right to Correction (Section 12)
```
Customer portal: "Edit My Profile" 
- Name, contact details updatable by customer
- Changes logged in audit_logs with old/new values
- KYC document updates require re-verification
```

#### Right to Erasure (Section 13)
```
"Delete My Account" feature in customer portal
- Soft delete: mark account inactive, anonymise PII
- Hard delete: After 6 months of inactivity post-soft-delete
- Exceptions: Documents required for GST/tax compliance retained (7 years)
            per Companies Act and Income Tax Act requirements
- Erasure requests logged in audit_logs
```

#### Right to Grievance Redressal (Section 13)
```
- Grievance officer: Designated DPO (Data Protection Officer)
- Contact: dpo@akar-motors.in
- Response SLA: 30 days
- Escalation: Data Protection Board of India
```

### Consent Management
```javascript
// Consent captured at QR entry and customer portal registration
const consentRecord = {
  userId: uuid,
  consentType: 'marketing_whatsapp',   // or 'data_processing', 'ai_personalisation'
  consentGiven: true,
  consentText: "I agree to receive vehicle offers and service reminders via WhatsApp",
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  consentAt: new Date().toISOString(),
};
// Stored in consent_logs table (append-only)
```

### Data Minimisation
- Only data necessary for the specific purpose is collected
- Exchange vehicle full details: only collected if customer has exchange
- Finance data: only collected if finance required
- Aadhaar: Only last 4 digits stored; full Aadhaar used only for OTP auth and discarded

### Data Localisation
- All data stored in AWS ap-south-1 (Mumbai) region
- No data replication to AWS regions outside India
- Third-party APIs: Only Indian entities or APIs that comply with Indian data localisation

### Privacy Notice
- Plain-language privacy notice displayed at QR entry
- Link to full privacy policy: `https://akar-motors.in/privacy`
- WhatsApp opt-out: Customer can reply "STOP" to unsubscribe from WhatsApp messages

---

## 6. JWT Token Strategy

### Token Architecture

```
Access Token (short-lived)
├── Algorithm: RS256 (RSA 2048-bit key pair)
├── TTL: 15 minutes
├── Stored: Client memory (NOT localStorage, NOT cookie)
└── Contains: user_id, role, branch_id, permissions

Refresh Token (long-lived)
├── Algorithm: RS256
├── TTL: 7 days
├── Stored: HttpOnly, Secure, SameSite=Strict cookie
├── Server-side: Hash stored in Redis with user_id mapping
└── Single-use: Invalidated on each use, new one issued (rotation)
```

### Token Rotation
```javascript
// When access token expires, client sends refresh token:
POST /api/v1/auth/refresh
Cookie: refresh_token=<token>

// auth-service validates:
// 1. Verify JWT signature with public key
// 2. Check token not expired
// 3. Compute hash of incoming refresh token
// 4. Lookup hash in Redis: must exist and not be revoked
// 5. Delete old refresh token hash from Redis
// 6. Issue new access token + new refresh token
// 7. Store new refresh token hash in Redis
// 8. Return new tokens

// If refresh token is already used (potential theft):
// - Invalidate ALL sessions for this user (assume compromised)
// - Force re-login
// - Log security event
```

### Token Revocation
```javascript
// Logout: revoke refresh token immediately
POST /api/v1/auth/logout

// Server: remove refresh_token_hash from Redis
// Client: clear tokens from memory and cookie

// Password change: revoke all sessions
// Admin forcing logout: revoke all sessions for user

// Redis key structure:
// Key: `smartdeal:sessions:{user_id}:{token_hash}`
// Value: { issuedAt, deviceFingerprint, expiresAt }
// TTL: Set to token expiry time
```

### Key Rotation
```
RSA key pair rotation schedule: Every 6 months
- New key pair generated and staged
- Both old and new public keys served during transition (JWKS endpoint)
- After 15 minutes (one access token lifetime), old key retired
- JWKS endpoint: GET /api/v1/auth/.well-known/jwks.json
```

---

## 7. Infrastructure Security

### Kubernetes Security
```yaml
# Pod Security Context
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

### Network Policies
```yaml
# Only api-gateway can receive external traffic
# Services only accept traffic from api-gateway
# Database only accepts traffic from services
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

### Secrets Management
- AWS Secrets Manager for all credentials
- No secrets in Kubernetes ConfigMaps (use Secrets with external-secrets operator)
- Secrets rotation automated for database passwords (every 30 days)

### Vulnerability Management
- `npm audit` runs in CI pipeline; blocks on HIGH/CRITICAL
- Snyk SAST scanning in CI
- Docker image scanning with Amazon ECR Image Scanning
- Dependency updates: Dependabot (weekly PRs)

### Security Monitoring & Incident Response
- AWS GuardDuty for threat detection
- Failed authentication attempts: Alert after 5 failures per user per hour
- Unusual data access patterns: Alert on bulk exports
- Incident Response Plan: Documented in internal wiki
- CSIRT contact: security@akar-motors.in
