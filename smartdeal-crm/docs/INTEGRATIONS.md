# SmartDeal CRM – External Integrations

## Table of Contents
1. [WhatsApp Business API](#1-whatsapp-business-api)
2. [Payment Gateway (Razorpay/PayU)](#2-payment-gateway-razorpayu)
3. [RTO Portal (Vahan)](#3-rto-portal-vahan)
4. [Bank APIs (Loan Processing)](#4-bank-apis-loan-processing)
5. [Insurance APIs (IRDAI)](#5-insurance-apis-irdai)
6. [Google Sheets Migration](#6-google-sheets-migration-path)
7. [UIDAI (Aadhaar Verification)](#7-uidai-aadhaar-verification)
8. [Income Tax / PAN Validation](#8-income-tax--pan-validation)
9. [GST Portal (e-Invoice)](#9-gst-portal-e-invoice)

---

## 1. WhatsApp Business API

**Provider:** Meta Cloud API (WhatsApp Business Platform)
**Service Used:** notification-service

### Setup Requirements
- WhatsApp Business Account (WABA) verified by Meta
- Business phone number registered and verified
- Meta App with `WhatsApp Business` product added
- Permanent System User Access Token (never expires)
- Message templates pre-approved by Meta (24-48 hours approval)

### Architecture
```
SmartDeal Event (Redis pub/sub)
         │
         ▼
notification-service (subscriber)
         │
         ▼
WhatsApp Cloud API (graph.facebook.com/v18.0)
         │
         ▼
Customer / Staff WhatsApp
```

### Approved Message Templates

#### 1. Walk-in Welcome (to Customer)
```
Template Name: smartdeal_walkin_welcome
Category: UTILITY
Language: en_IN

Hello {{1}}, welcome to Akar Motors! 🚗
Your sales consultant {{2}} will meet you at the showroom in a few minutes.

Need immediate help? Call us: {{3}}
```

#### 2. Quotation Shared (to Customer)
```
Template Name: smartdeal_quotation_shared
Category: UTILITY

Hello {{1}},

Your quotation for *{{2}}* is ready!

📋 Quotation No: {{3}}
💰 On-Road Price: ₹{{4}}
📅 Valid Until: {{5}}

[View & Download PDF] {{6}}

Questions? Reply to this message or call {{7}}.
```

#### 3. Booking Confirmed (to Customer)
```
Template Name: smartdeal_booking_confirmed
Category: UTILITY

🎉 Booking Confirmed!

Hello {{1}}, your booking is confirmed.

🚗 Vehicle: {{2}}
📋 Booking No: {{3}}
💰 Amount Paid: ₹{{4}}
📅 Expected Delivery: {{5}}

Track your booking: {{6}}

Your consultant: {{7}} | {{8}}
```

#### 4. Document Upload Reminder (to Customer)
```
Template Name: smartdeal_doc_reminder
Category: UTILITY

Hello {{1}},

Your booking documents are pending. Please upload:
{{2}}

Upload here: {{3}}

Deadline: {{4}} (Required for delivery processing)
```

#### 5. Finance Approved (to Customer)
```
Template Name: smartdeal_finance_approved
Category: UTILITY

✅ Loan Approved!

Hello {{1}},

Great news! Your vehicle loan has been approved.

🏦 Bank: {{2}}
💰 Loan Amount: ₹{{3}}
📅 Tenure: {{4}} months
💳 EMI: ₹{{5}}/month

Our finance team will contact you for next steps.
```

#### 6. Delivery Scheduled (to Customer)
```
Template Name: smartdeal_delivery_scheduled
Category: UTILITY

🚗 Delivery Scheduled!

Hello {{1}}, your vehicle delivery is confirmed.

📅 Date: {{2}}
⏰ Time: {{3}}
📍 Location: {{4}}

[Get Directions] {{5}}

Your delivery manager: {{6}} | {{7}}

See you soon! 🎊
```

#### 7. Delivery Reminder 24h (to Customer)
```
Template Name: smartdeal_delivery_reminder_24h
Category: UTILITY

Hello {{1}},

Your Tata {{2}} delivery is *tomorrow*! 🚗

📅 {{3}} at {{4}}
📍 {{5}}

Please bring: Government ID + ₹{{6}} balance (if applicable)

Questions? Call: {{7}}
```

#### 8. Service Reminder (to Customer)
```
Template Name: smartdeal_service_reminder
Category: UTILITY

Hello {{1}},

Your *{{2}}* ({{3}}) is due for service!

🔧 Service Type: {{4}}
📅 Due Date: {{5}}
🚗 KM Due: {{6}} km

Book your service slot: {{7}}

Akar Motors Service | {{8}}
```

### Webhook (Inbound Messages)

```javascript
// Notification service handles Meta webhooks
// POST /api/v1/webhooks/whatsapp

// Verify webhook (GET request from Meta during setup)
if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
  return res.send(challenge);
}

// Handle inbound message
// - Customer replies routed to lead activity log
// - Out-of-hours replies trigger auto-response template
// - Specific keywords ('STOP') trigger unsubscribe
```

### Rate Limits
- Business Initiated Messages: 250,000/day (scales with quality rating)
- Template messages: No limit (within Meta policies)
- Conversation windows: 24 hours for customer-initiated

---

## 2. Payment Gateway (Razorpay/PayU)

**Primary:** Razorpay (preferred for UPI + webhook reliability)
**Fallback:** PayU

### Razorpay Integration Points

#### Booking Amount Collection
```javascript
// Create Razorpay Order
POST https://api.razorpay.com/v1/orders
{
  "amount": 2500000,          // Amount in paise (₹25,000 = 2500000 paise)
  "currency": "INR",
  "receipt": "BKN-2024-00089",
  "notes": {
    "booking_id": "uuid",
    "customer_name": "Amit Sharma",
    "vehicle": "Nexon XZ+ Petrol"
  }
}

// Response
{
  "id": "order_MxYzAbc123",
  "amount": 2500000,
  "currency": "INR",
  "status": "created"
}
```

#### Payment Methods Supported
- **UPI:** GPay, PhonePe, Paytm, BHIM (real-time settlement)
- **UPI QR:** QR generated for in-showroom payments
- **Net Banking:** All major Indian banks (50+ banks)
- **Credit/Debit Cards:** Visa, Mastercard, Rupay, Amex
- **EMI:** No-cost EMI on eligible credit cards
- **Payment Link:** WhatsApp-shareable link for remote customers

#### Webhook Events (Razorpay → SmartDeal)
```javascript
// POST /api/v1/webhooks/razorpay
// Razorpay signs webhook with X-Razorpay-Signature header (HMAC-SHA256)

// Payment Captured
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_MxYzAbc456",
        "order_id": "order_MxYzAbc123",
        "amount": 2500000,
        "currency": "INR",
        "status": "captured",
        "method": "upi",
        "vpa": "amit@gpay"
      }
    }
  }
}

// SmartDeal action:
// 1. Verify signature
// 2. Mark booking payment as done
// 3. Generate booking receipt
// 4. Send WhatsApp confirmation
```

#### Refund (Booking Cancellation)
```javascript
POST https://api.razorpay.com/v1/payments/{payment_id}/refund
{
  "amount": 2500000,    // Full or partial refund
  "notes": { "reason": "Customer cancelled booking" }
}
```

#### UPI QR Generation (In-Showroom)
```javascript
POST https://api.razorpay.com/v1/payments/qr_codes
{
  "type": "upi_qr",
  "name": "Akar Motors – Booking Payment",
  "usage": "single_use",
  "fixed_amount": true,
  "payment_amount": 2500000,
  "description": "Booking: BKN-2024-00089",
  "close_by": 1705400000
}
```

---

## 3. RTO Portal (Vahan)

**Government Portal:** Vahan (Ministry of Road Transport & Highways)
**API Access:** State-wise MORTH Vahan APIs (varies by state readiness)

### Supported Operations

#### Vehicle Registration Application
```
POST https://vahan.parivahan.gov.in/api/v1/registration/apply
```
Submits Form 20 data for new vehicle registration. Returns application reference number.

#### Check Registration Status
```
GET https://vahan.parivahan.gov.in/api/v1/registration/status/{application_id}
```

#### Verify Driving Licence
```
GET https://vahan.parivahan.gov.in/api/v1/dl/verify/{dl_number}
```
Used during test drive DL verification.

### Form Auto-Fill Mapping

#### Form 20 – Application for Registration
| Vahan Field | SmartDeal Source |
|-------------|-----------------|
| Chassis Number | `vehicles.chassis_number` |
| Engine Number | `vehicles.engine_number` |
| Vehicle Class | Derived from variant (e.g., LMV – Motor Car) |
| Fuel Type | `vehicle_variants.fuel_type` |
| Seating Capacity | `vehicle_variants.seating_capacity` |
| Manufacturer | "Tata Motors Limited" |
| Model Name | `vehicle_models.model_name` |
| Owner Name | `bookings.customer_name` |
| Owner Address | `bookings.customer_address` |
| Hypothecation | `rto_applications.is_hypothecation` |
| Bank Name | `rto_applications.hypothecation_bank` |

#### Form 21 – Sale Certificate
Auto-filled from dealer details (dealerships table) and vehicle/buyer details.

### State-Wise RTO Charge Reference
SmartDeal maintains the `rto_charges` table with all state rates. Sample:

| State | Vehicle Category | Road Tax | Notes |
|-------|-----------------|----------|-------|
| Maharashtra | Car (petrol up to ₹10L) | 11% | Per new MV Tax 2023 |
| Karnataka | Car | 13% | Based on cost |
| Tamil Nadu | Car (above ₹10L) | 15% | |
| Delhi | CNG/Hybrid | 0% | Tax exemption |
| Gujarat | EV | 0% | EV incentive |

---

## 4. Bank APIs (Loan Processing)

### Supported Bank Partners

#### Tata Capital (Preferred — Direct OEM tie-up)
```
Base URL: https://api.tatacapital.com/v2/auto-loans
Auth: OAuth 2.0 (Client Credentials)
Dealer Code: Configured in ENV: TATA_CAPITAL_DEALER_CODE
```

**Key Endpoints:**
```
POST /loan-enquiry          → Get indicative eligibility
POST /applications          → Submit loan application
GET  /applications/{id}     → Check application status
POST /applications/{id}/docs → Upload documents
POST /disbursements         → Request disbursement on approval
```

#### HDFC Bank (DSA Channel)
```
Base URL: https://api.hdfc.com/dsa/auto-loans/v1
Auth: API Key + DSA Code
```

#### SBI Auto Loan (Dealer Portal API)
```
Base URL: https://api.sbi.co.in/dealer-portal/auto/v1
Auth: OAuth 2.0
```

### Standard Loan Application Payload
```json
{
  "dealerCode": "AKAR-PUNE-001",
  "vehicleDetails": {
    "vin": "MA3FJBB1S00123456",
    "model": "Nexon XZ+ Petrol MT",
    "onRoadPrice": 1080600,
    "exShowroomPrice": 850000
  },
  "applicant": {
    "firstName": "Amit",
    "lastName": "Sharma",
    "pan": "ABCDE1234F",
    "dob": "1985-03-15",
    "phone": "9988776655",
    "email": "amit@example.com",
    "employmentType": "salaried",
    "employer": "Infosys Limited",
    "monthlyIncome": 85000,
    "existingEMI": 8000,
    "address": {
      "line1": "42 Shivaji Nagar",
      "city": "Pune",
      "state": "Maharashtra",
      "pincode": "411001"
    }
  },
  "loanDetails": {
    "loanAmount": 800000,
    "tenure": 60,
    "downPayment": 280600
  }
}
```

### Loan Status Mapping
| Bank Status | SmartDeal Status |
|-------------|-----------------|
| RECEIVED | applied |
| UNDER_VERIFICATION | under_review |
| CREDIT_CHECK | under_review |
| CONDITIONALLY_APPROVED | under_review |
| APPROVED | approved |
| SANCTIONED | sanctioned |
| DISBURSED | disbursed |
| REJECTED | rejected |

---

## 5. Insurance APIs (IRDAI)

**Regulatory Framework:** IRDAI (Insurance Regulatory and Development Authority of India)
All insurers must comply with IRDAI motor vehicle insurance guidelines.

### Supported Insurers

| Insurer | Integration Type | API Version |
|---------|-----------------|-------------|
| Tata AIG | REST JSON | v3 |
| Bajaj Allianz | REST JSON | v2 |
| ICICI Lombard | REST JSON | v4 |
| New India Assurance | REST JSON | v1 |

### Quote Request (Standard)
```json
POST https://api.tataaig.com/motor/v3/quote
{
  "vehicleDetails": {
    "make": "Tata Motors",
    "model": "Nexon",
    "variant": "XZ+ Petrol MT",
    "fuelType": "PETROL",
    "registrationYear": 2024,
    "engineCC": 1199,
    "seatingCapacity": 5,
    "idv": 850000,
    "isNewVehicle": true
  },
  "coverageDetails": {
    "policyType": "COMPREHENSIVE",
    "coverPeriod": 1,
    "addOns": ["ZERO_DEP", "RSA", "ENGINE_PROTECT"]
  },
  "customerDetails": {
    "state": "MH",
    "city": "Pune",
    "ncbPercentage": 0
  }
}
```

### Quote Response
```json
{
  "quoteId": "TATAIG-QUOTE-2024-12345",
  "insurer": "Tata AIG",
  "ownDamagePremium": 12800,
  "thirdPartyPremium": 8200,
  "addOnsPremium": 6500,
  "ncbDiscount": 0,
  "gst": 4950,
  "totalPremium": 32450,
  "idv": 850000,
  "coverDetails": {...},
  "validUntil": "2024-02-14T23:59:59"
}
```

### Policy Issuance
```json
POST https://api.tataaig.com/motor/v3/issue-policy
{
  "quoteId": "TATAIG-QUOTE-2024-12345",
  "vehicleRegistrationNumber": "MH-12-XX-5678",
  "vin": "MA3FJBB1S00123456",
  "customerDetails": {
    "name": "Amit Sharma",
    "pan": "ABCDE1234F",
    "dob": "1985-03-15",
    "address": {...}
  },
  "paymentDetails": {
    "amount": 32450,
    "transactionId": "pay_MxYzAbc789"
  }
}
```

---

## 6. Google Sheets Migration Path

**Context:** The existing `akar-quotation-server` (`index.js`) uses Google Sheets as its data source for:
- Vehicle stock inventory
- Scheme/offer data
- Pricing data

**Migration Goal:** Move this data into PostgreSQL while maintaining backward compatibility during transition.

### Phase 1: Read-Through Proxy (Week 1-2)
```javascript
// quotation-service reads from Google Sheets via existing index.js
// SmartDeal API gateway proxies /api/v1/quotations/legacy/* → index.js:3000
```

### Phase 2: Data Extraction (Week 3)
```javascript
// src/database/migrations/google-sheets-migrator.js

const { google } = require('googleapis');

async function migrateVehicleData() {
  const sheets = google.sheets({ version: 'v4', auth });

  // Read stock sheet
  const stockResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.STOCK_SHEET_ID,
    range: 'Stock!A:Z',
  });

  // Transform to PostgreSQL format
  const vehicles = stockResponse.data.values.map(row => ({
    vin: row[0],
    model: row[1],
    variant: row[2],
    colour: row[3],
    // ... field mapping
  }));

  // Insert into PostgreSQL
  await db.batchInsert('vehicles', vehicles);
}

async function migrateSchemeData() {
  const schemeResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SCHEME_SHEET_ID,
    range: 'Schemes!A:Z',
  });
  // Transform and insert into vehicle_pricing / loan_products tables
}
```

### Phase 3: Dual-Write (Week 4)
- SmartDeal writes to PostgreSQL
- A sync adapter also updates Google Sheets (for backward compat with any other tools using the sheet)
- Validate data consistency between systems

### Phase 4: Cutover (Week 5)
- `index.js` quotation API reads from PostgreSQL via SmartDeal internal API
- Google Sheets becomes read-only archive
- Phase out Google Sheets dependency

### Field Mapping (Google Sheets → PostgreSQL)
| Sheet Column | PostgreSQL Table | Column |
|-------------|-----------------|--------|
| VIN | vehicles | vin |
| Model | vehicle_models | model_name |
| Variant | vehicle_variants | variant_name |
| Ex-Showroom | vehicle_variants | ex_showroom_price |
| Status | vehicles | status |
| Colour | vehicle_colours | colour_name |
| Yard Location | vehicles | yard_location |

---

## 7. UIDAI (Aadhaar Verification)

**Use Case:** KYC verification during booking document upload

### Aadhaar OTP Verification Flow
```
Customer enters Aadhaar number → SmartDeal → UIDAI API → OTP to customer's registered mobile
Customer enters OTP → SmartDeal → UIDAI API → Verified ✅
```

### Aadhaar Offline XML (QR Scan)
```javascript
// Customer downloads Aadhaar offline XML (UIDAI portal)
// Dealer scans Aadhaar QR
// SmartDeal verifies XML signature and extracts masked details

// Only allowed to store:
// - Aadhaar last 4 digits (masked: XXXX-XXXX-1234)
// - Name, address, date of birth (from offline XML, with consent)
// Full Aadhaar number MUST NOT be stored (UIDAI regulations)
```

### Compliance Note
- Per UIDAI guidelines and Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016:
  - VIDs (Virtual IDs) preferred over actual Aadhaar numbers
  - AUA/ASA licence required from UIDAI for authentication
  - Aadhaar numbers must be encrypted (AES-256) if temporarily stored
  - Deletion of Aadhaar data after verification purpose is served

---

## 8. Income Tax / PAN Validation

**Use Case:** PAN validation during booking (mandatory for vehicle purchases)

### PAN Verification (NSDL API)
```javascript
// Verify PAN structure and existence
GET https://api.nsdl.com/pan-verification/v1/{pan_number}

// Response
{
  "panNumber": "ABCDE1234F",
  "name": "AMIT SHARMA",
  "status": "ACTIVE",
  "panType": "INDIVIDUAL",
  "lastUpdated": "2023-01-15"
}
```

### PAN-Aadhaar Link Status
```javascript
// Check if PAN is linked to Aadhaar (mandatory from July 2023)
GET https://api.income-tax.gov.in/pan-aadhaar-status/{pan_number}
```

### Storage Compliance
- PAN numbers stored encrypted (AES-256-GCM) in `booking_documents.document_number`
- Only decrypted when generating GST invoice or submitting to regulatory bodies
- PAN masking in UI: `ABCDE****F` (first 5 + last 1 visible)

---

## 9. GST Portal (e-Invoice)

**Use Case:** IRN (Invoice Reference Number) generation for B2C and B2B invoices above ₹5 Crore threshold (applicable to dealerships with >₹5Cr turnover)

### e-Invoice Generation Flow
```
SmartDeal Invoice (JSON) → GST IRP (Invoice Registration Portal)
                                    │
                                    ▼
                            IRN Generated (unique hash)
                            + Signed QR Code (JWT)
                                    │
                                    ▼
                      SmartDeal stores IRN + embeds QR in PDF
```

### Invoice Payload to IRP
```json
{
  "Version": "1.1",
  "TranDtls": {
    "TaxSch": "GST",
    "SupTyp": "B2C"
  },
  "DocDtls": {
    "Typ": "INV",
    "No": "INV/2024-25/00089",
    "Dt": "15/01/2024"
  },
  "SellerDtls": {
    "Gstin": "27AABCA1234B1Z5",
    "LglNm": "Akar Motors Pvt Ltd",
    "Addr1": "Plot 42, Baner Road",
    "Loc": "Pune",
    "Pin": 411045,
    "Stcd": "27"
  },
  "BuyerDtls": {
    "Gstin": "URP",
    "LglNm": "Amit Sharma",
    "Pos": "27",
    "Addr1": "42 Shivaji Nagar",
    "Loc": "Pune",
    "Pin": 411001,
    "Stcd": "27"
  },
  "ItemList": [
    {
      "SlNo": "1",
      "PrdDesc": "Tata Nexon XZ+ Petrol MT",
      "IsServc": "N",
      "HsnCd": "8703",
      "Qty": 1,
      "UnitPrice": 850000,
      "TotAmt": 850000,
      "CgstAmt": 119000,
      "SgstAmt": 119000,
      "CesAmt": 0,
      "TotItemVal": 1088000
    }
  ],
  "ValDtls": {
    "AssVal": 850000,
    "CgstVal": 119000,
    "SgstVal": 119000,
    "TcsVal": 8500,
    "TotInvVal": 1153910
  }
}
```

### TCS (Tax Collected at Source)
- Applicable under Section 206C(1F) of Income Tax Act
- 1% TCS on sale of motor vehicles exceeding ₹10 Lakh
- TCS certificate (Form 27D) issued to customer
- Filed quarterly in Form 27EQ
- SmartDeal auto-calculates and records TCS in billing_service
