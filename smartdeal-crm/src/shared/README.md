# Shared Library

Common utilities, types, constants, and middleware shared across all SmartDeal CRM microservices.

## Contents

### Utilities
- `encryption.js` — AES-256-GCM encrypt/decrypt for PAN, Aadhaar, bank account numbers
- `pagination.js` — Standard pagination helper (page, limit, total, totalPages)
- `response.js` — Standardised API response envelope (success, data, pagination, meta)
- `validators.js` — Indian-specific validators (PAN format, Aadhaar format, GSTIN, Indian mobile number, pincode)
- `date.js` — IST date/time helpers, fiscal year calculation, date formatting

### Constants
- `roles.js` — 8 role definitions and RBAC permission lists
- `leadStatus.js` — Lead status enum and valid state transitions
- `vehicleStatus.js` — Vehicle stock status enum
- `bookingStatus.js` — Booking status state machine
- `gstRates.js` — GST rate constants for vehicles (28%) and accessories
- `indianStates.js` — All 29 states + 8 UTs with state codes
- `hsnCodes.js` — HSN code mapping for vehicles and accessories

### DTOs (Data Transfer Objects)
TypeScript/JS class definitions for request/response bodies, shared across services.

### Middleware
- `correlationId.js` — Injects X-Correlation-ID into all requests for distributed tracing
- `logger.js` — Winston-based structured JSON logger (used by all services)
- `auditLogger.js` — Helper to write to audit_logs table

## Indian Validators

```javascript
// validators.js
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

function isValidPAN(pan) { return PAN_REGEX.test(pan?.toUpperCase()); }
function isValidGSTIN(gstin) { return GSTIN_REGEX.test(gstin?.toUpperCase()); }
function isValidMobile(mobile) { return INDIAN_MOBILE_REGEX.test(mobile); }
function isValidPincode(pin) { return PINCODE_REGEX.test(pin); }
```

## Usage
```javascript
const { encrypt, decrypt } = require('@smartdeal/shared/encryption');
const { isValidPAN } = require('@smartdeal/shared/validators');
const { successResponse } = require('@smartdeal/shared/response');
```
