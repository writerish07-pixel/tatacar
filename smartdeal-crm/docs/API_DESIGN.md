# SmartDeal CRM – API Design Specification

## Table of Contents
1. [Conventions](#conventions)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Auth Module](#auth-module)
5. [Leads Module](#leads-module)
6. [Vehicles & Stock Module](#vehicles--stock-module)
7. [Quotations Module](#quotations-module)
8. [Test Drives Module](#test-drives-module)
9. [Exchange Module](#exchange-module)
10. [Bookings Module](#bookings-module)
11. [Finance Module](#finance-module)
12. [Insurance Module](#insurance-module)
13. [Billing Module](#billing-module)
14. [PDI Module](#pdi-module)
15. [RTO Module](#rto-module)
16. [Delivery Module](#delivery-module)
17. [Feedback & Service Module](#feedback--service-module)
18. [Analytics & GraphQL](#analytics--graphql)

---

## Conventions

### Base URL
```
Production:   https://api.smartdeal.akar-motors.in/api/v1
Staging:      https://staging-api.smartdeal.akar-motors.in/api/v1
Development:  http://localhost:8080/api/v1
```

### Versioning
- URL-based versioning: `/api/v1/`, `/api/v2/`
- Version is maintained until breaking changes are introduced
- Deprecation notices sent via `Deprecation` and `Sunset` response headers

### Authentication Headers
```http
Authorization: Bearer <access_token>
X-Branch-ID: <branch_uuid>           (required for multi-branch operations)
X-Correlation-ID: <uuid>             (optional, for request tracing)
Content-Type: application/json
Accept: application/json
Accept-Language: en-IN
```

### Pagination
```json
// Request query params
?page=1&limit=20&sort=created_at&order=desc

// Response envelope
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 234,
    "totalPages": 12,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "requestId": "req_01HXYZ",
    "timestamp": "2024-01-15T10:30:00+05:30"
  }
}
```

### Filtering & Sorting
```
GET /leads?status=new,contacted&source=qr_walk_in&sort=created_at&order=desc
GET /vehicles?status=in_yard&fuel_type=petrol&model=NEXON
GET /bookings?from=2024-01-01&to=2024-01-31&branch_id=<uuid>
```

### Date Format
All dates in ISO 8601 with IST offset: `2024-01-15T10:30:00+05:30`

### Amount Format
All amounts in INR (Indian Rupees), returned as numbers (not strings):
```json
{ "ex_showroom_price": 850000.00, "gst_amount": 238000.00 }
```

### Rate Limiting
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1705301400
Retry-After: 60   (on 429 response)
```
- Unauthenticated: 100 requests/minute per IP
- Authenticated: 1000 requests/minute per user
- Bulk endpoints: 10 requests/minute per user

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "LEAD_NOT_FOUND",
    "message": "Lead not found",
    "messageHi": "लीड नहीं मिली",
    "details": [
      {
        "field": "lead_id",
        "message": "The specified lead ID does not exist"
      }
    ],
    "requestId": "req_01HXYZ",
    "timestamp": "2024-01-15T10:30:00+05:30",
    "path": "/api/v1/leads/invalid-uuid"
  }
}
```

### HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorised (token missing/invalid) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, state mismatch) |
| 422 | Unprocessable Entity (business logic error) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Common Error Codes
```
AUTH_TOKEN_MISSING, AUTH_TOKEN_EXPIRED, AUTH_TOKEN_INVALID
INSUFFICIENT_PERMISSIONS, BRANCH_ACCESS_DENIED
LEAD_NOT_FOUND, QUOTATION_EXPIRED, BOOKING_ALREADY_EXISTS
VIN_ALREADY_ALLOCATED, VEHICLE_NOT_AVAILABLE
DOCUMENT_UPLOAD_FAILED, INVALID_PAN, INVALID_AADHAAR
PAYMENT_FAILED, PAYMENT_GATEWAY_ERROR
GST_CALCULATION_ERROR, RTO_CHARGE_NOT_FOUND
PDI_NOT_COMPLETED, DELIVERY_SLOT_UNAVAILABLE
VALIDATION_ERROR (with field-level details)
```

---

## Auth Module

### POST /auth/login
Login with phone + OTP or email + password.
```http
POST /auth/login
Content-Type: application/json

{
  "loginType": "otp",            // "otp" | "password"
  "phone": "9876543210",
  "otp": "123456"
}
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "firstName": "Rajesh",
      "lastName": "Kumar",
      "role": "sales_consultant",
      "branchId": "uuid",
      "branchName": "Akar Motors – Pune Main"
    }
  }
}
```

### POST /auth/otp/send
```http
POST /auth/otp/send
{ "phone": "9876543210" }
```
**Response 200:** `{ "success": true, "data": { "otpSentAt": "...", "expiresIn": 300 } }`

### POST /auth/refresh
```http
POST /auth/refresh
{ "refreshToken": "eyJhbGc..." }
```

### POST /auth/logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### GET /auth/me
Returns current authenticated user's profile.

### PATCH /auth/me/password
Change password (for email/password login users).

---

## Leads Module

### POST /leads
Create a new lead (from QR scan, walk-in, phone, web).
```http
POST /leads
Authorization: Bearer <access_token>

{
  "source": "qr_walk_in",
  "firstName": "Amit",
  "lastName": "Sharma",
  "phone": "9988776655",
  "email": "amit.sharma@gmail.com",
  "city": "Pune",
  "state": "Maharashtra",
  "interestedModel": "NEXON",
  "fuelPreference": "petrol",
  "budgetMax": 1200000,
  "qrSessionId": "qr_abc123",
  "notes": "Came via showroom QR at gate"
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "leadNumber": "LDN-2024-00123",
    "status": "new",
    "assignedTo": {
      "id": "uuid",
      "name": "Priya Singh",
      "phone": "9876543210"
    },
    "createdAt": "2024-01-15T10:30:00+05:30"
  }
}
```

### GET /leads
List leads with filters.
```
GET /leads?status=new,contacted&source=qr_walk_in&assignedTo=<uuid>&page=1&limit=20
```

### GET /leads/:id
Get full lead details including activities, quotations, test drives.

### PATCH /leads/:id
Update lead status, assign consultant, update details.
```json
{
  "status": "interested",
  "assignedTo": "uuid",
  "notes": "Customer very interested in NEXON EV"
}
```

### POST /leads/:id/activities
Log a call, visit, or WhatsApp interaction.
```json
{
  "activityType": "call",
  "direction": "outbound",
  "outcome": "answered",
  "durationMinutes": 8,
  "notes": "Customer wants brochure and price",
  "nextFollowupAt": "2024-01-16T11:00:00+05:30"
}
```

### POST /leads/:id/requirement-discovery
Save requirement discovery wizard data.

### GET /leads/:id/timeline
Returns full timeline of all activities, quotations, test drives, and status changes for a lead.

### GET /leads/my
Returns leads assigned to the authenticated sales consultant.

### GET /leads/follow-ups/today
Returns all leads with follow-ups due today (for authenticated consultant).

---

## Vehicles & Stock Module

### GET /vehicles
List vehicles with filters.
```
GET /vehicles?status=in_yard&variantId=<uuid>&branchId=<uuid>
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "vin": "MA3FJBB1S00123456",
      "engineNumber": "1.2RAN123456",
      "variant": {
        "name": "Tata Nexon XZ+ Petrol",
        "fuelType": "petrol",
        "transmission": "manual"
      },
      "colour": "Cosmic Gold",
      "yardLocation": "BAY-A-12",
      "status": "in_yard",
      "manufactureMonth": 11,
      "manufactureYear": 2024,
      "daysInYard": 15
    }
  ]
}
```

### GET /vehicles/models
Returns all active Tata Motors vehicle models.

### GET /vehicles/variants
Returns variants for a given model with pricing.
```
GET /vehicles/variants?modelCode=NEXON&fuelType=petrol
```

### GET /vehicles/availability
Check real-time availability for a specific variant.
```
GET /vehicles/availability?variantId=<uuid>&colourId=<uuid>&branchId=<uuid>
```
**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "count": 3,
    "waitingPeriod": null,
    "vehicles": [
      { "id": "uuid", "vin": "MA3...", "colour": "Cosmic Gold", "location": "BAY-A-12" }
    ]
  }
}
```

### POST /vehicles
Add a new vehicle to stock (admin/stock manager).
```json
{
  "variantId": "uuid",
  "colourId": "uuid",
  "vin": "MA3FJBB1S00123456",
  "engineNumber": "1.2RAN123456",
  "chassisNumber": "MA3...",
  "manufactureMonth": 11,
  "manufactureYear": 2024,
  "invoiceNumber": "TATA/INV/12345",
  "invoiceDate": "2024-11-15",
  "invoicePrice": 750000
}
```

### PATCH /vehicles/:id
Update vehicle status, yard location.

### GET /vehicles/stock-report
Ageing report: in-transit, in-yard by model/variant/colour.

---

## Quotations Module

### POST /quotations
Create a new quotation.
```http
POST /quotations
Authorization: Bearer <access_token>

{
  "leadId": "uuid",
  "variantId": "uuid",
  "colourId": "uuid",
  "rtoState": "Maharashtra",
  "accessories": [
    { "accessoryId": "uuid", "quantity": 1 },
    { "accessoryId": "uuid", "quantity": 2 }
  ],
  "extendedWarrantyAmount": 15000,
  "insuranceAmount": 45000,
  "insuranceProvider": "Tata AIG",
  "dealerDiscount": 20000,
  "exchangeBonus": 0,
  "financeRequired": true,
  "loanAmount": 800000,
  "loanTenureMonths": 60,
  "interestRate": 8.9
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "quotationNumber": "QTN-2024-00456",
    "breakdown": {
      "exShowroomPrice": 850000,
      "rtoRegistrationFee": 600,
      "rtoRoadTax": 119000,
      "insuranceAmount": 45000,
      "accessoriesAmount": 35000,
      "extendedWarrantyAmount": 15000,
      "handlingCharges": 5000,
      "gstBreakup": {
        "cgstRate": 14,
        "cgstAmount": 119000,
        "sgstRate": 14,
        "sgstAmount": 119000,
        "cessRate": 0,
        "cessAmount": 0,
        "totalGst": 238000
      },
      "tcsRate": 1,
      "tcsAmount": 8500,
      "totalDiscounts": 20000,
      "onRoadPrice": 1057100
    },
    "emiBreakup": {
      "loanAmount": 800000,
      "tenureMonths": 60,
      "interestRate": 8.9,
      "emiAmount": 16577
    },
    "validUntil": "2024-02-14"
  }
}
```

### GET /quotations/:id
Get full quotation details.

### GET /quotations/:id/pdf
Generate and return PDF quotation URL.
```json
{ "success": true, "data": { "pdfUrl": "https://cdn.../quotations/QTN-2024-00456.pdf" } }
```

### POST /quotations/:id/share
Share quotation via WhatsApp.
```json
{ "phone": "9988776655", "channel": "whatsapp" }
```

### POST /quotations/:id/approve
Manager approves discount above threshold.
```json
{ "approvalNote": "Approved competitor match discount" }
```

### GET /leads/:leadId/quotations
All quotations for a specific lead.

---

## Test Drives Module

### POST /test-drives
Schedule a test drive.
```json
{
  "leadId": "uuid",
  "variantId": "uuid",
  "scheduledAt": "2024-01-20T11:00:00+05:30",
  "drivingLicense": {
    "dlNumber": "MH12 20100012345",
    "dlExpiryDate": "2030-05-15",
    "dlClass": "LMV"
  }
}
```

### GET /test-drives
List test drives. Supports filters: `status`, `date`, `branchId`.

### PATCH /test-drives/:id/start
Mark test drive as started (record odometer).
```json
{ "odometerStart": 12450 }
```

### PATCH /test-drives/:id/complete
Mark test drive as completed with feedback.
```json
{
  "odometerEnd": 12478,
  "customerRating": 5,
  "customerFeedback": "Very smooth ride, loved the infotainment",
  "wouldBuy": true
}
```

### GET /test-drives/slots
Available test drive slots for a given date and branch.
```
GET /test-drives/slots?date=2024-01-20&branchId=<uuid>
```

---

## Exchange Module

### POST /exchange
Create exchange evaluation request.
```json
{
  "leadId": "uuid",
  "make": "Maruti Suzuki",
  "model": "Swift",
  "variant": "ZXi",
  "year": 2019,
  "fuelType": "petrol",
  "registrationNumber": "MH12AB1234",
  "registrationState": "Maharashtra",
  "odometerKm": 45000,
  "serviceHistory": "full_oem",
  "accidentsCount": 0
}
```

### POST /exchange/:id/photos
Upload exchange vehicle photos (multipart/form-data).
```
POST /exchange/:id/photos
Content-Type: multipart/form-data

photos[0]: <file> (type: front)
photos[1]: <file> (type: rear)
```

### PATCH /exchange/:id/valuation
Submit valuation after inspection.
```json
{
  "marketValue": 450000,
  "dealerOffer": 380000,
  "condition": "good",
  "notes": "Minor scratches on rear bumper"
}
```

### PATCH /exchange/:id/accept-offer
Customer accepts/rejects dealer offer.
```json
{ "accepted": true, "finalExchangeValue": 395000 }
```

---

## Bookings Module

### POST /bookings
Create booking.
```json
{
  "leadId": "uuid",
  "quotationId": "uuid",
  "bookingAmount": 25000,
  "paymentMethod": "upi",
  "colourPreference1": "uuid",
  "colourPreference2": "uuid",
  "exchangeEvaluationId": "uuid"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bookingNumber": "BKN-2024-00089",
    "status": "pending_documents",
    "paymentLink": "https://rzp.io/l/smartdeal-bkn-89",
    "documentsRequired": ["pan_card", "aadhaar_card", "address_proof"]
  }
}
```

### POST /bookings/:id/documents
Upload KYC documents.
```
POST /bookings/:id/documents
Content-Type: multipart/form-data

documentType: pan_card
documentNumber: ABCDE1234F
file: <file>
```

### GET /bookings/:id
Get full booking details.

### GET /bookings/:id/track
Customer-facing booking tracking (no auth required, uses booking number + phone OTP).

### PATCH /bookings/:id/allocate-vehicle
Allocate a specific VIN to the booking.
```json
{ "vehicleId": "uuid" }
```

### PATCH /bookings/:id/cancel
Cancel a booking with reason.
```json
{ "reason": "Customer bought from competitor", "refundAmount": 25000 }
```

---

## Finance Module

### GET /finance/banks
List all active bank partners.

### GET /finance/products
Loan products available for a vehicle price.
```
GET /finance/products?vehiclePrice=1100000&loanAmount=900000&tenure=60
```
**Response:**
```json
{
  "data": [
    {
      "bank": "HDFC Bank",
      "product": "Auto Smart",
      "interestRate": 8.5,
      "emiAmount": 18534,
      "processingFee": 4999,
      "tenure": 60,
      "maxLtv": 85
    },
    {
      "bank": "Tata Capital",
      "product": "Tata Motors Finance",
      "interestRate": 7.99,
      "emiAmount": 18243,
      "processingFee": 0,
      "isSubvention": true,
      "tenure": 60
    }
  ]
}
```

### POST /finance/applications
Submit loan application.

### GET /finance/applications/:id
Get loan application status.

### POST /finance/applications/:id/documents
Upload loan documents.

---

## Insurance Module

### GET /insurance/quotes
Get insurance quotes for a vehicle.
```
GET /insurance/quotes?bookingId=<uuid>&policyType=comprehensive
```

### POST /insurance/quotes/:id/select
Select an insurance quote to proceed.

### GET /insurance/addons
List all available insurance add-ons.

### POST /insurance/issue
Issue the selected insurance policy.
```json
{ "quoteId": "uuid", "bookingId": "uuid" }
```

---

## Billing Module

### POST /billing/invoices
Generate a proforma or final GST invoice.
```json
{
  "bookingId": "uuid",
  "invoiceType": "proforma",
  "invoiceDate": "2024-01-15"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "invoiceNumber": "PRF/2024-25/00123",
    "totalAmount": 1057100,
    "breakdown": {
      "exShowroomPrice": 850000,
      "cgstAmount": 119000,
      "sgstAmount": 119000,
      "igstAmount": 0,
      "cessAmount": 0,
      "tcsAmount": 8500,
      "accessoriesAmount": 35000,
      "accessoriesGst": 9800,
      "insuranceAmount": 45000,
      "rtoAmount": 119600,
      "handlingCharges": 5000,
      "totalDiscount": 20000
    },
    "pdfUrl": "https://cdn.../invoices/PRF-2024-25-00123.pdf"
  }
}
```

### POST /billing/invoices/:id/payments
Record a payment against an invoice.
```json
{
  "paymentMode": "neft",
  "amount": 257100,
  "paymentDate": "2024-01-20",
  "referenceNumber": "UTR1234567890",
  "paymentFor": "balance"
}
```

### POST /billing/invoices/:id/e-invoice
Generate e-Invoice from GST portal (IRN generation).

### GET /billing/invoices/:id/pdf
Get invoice PDF URL.

---

## PDI Module

### POST /pdi/checklists
Create a new PDI checklist for a vehicle.
```json
{
  "vehicleId": "uuid",
  "bookingId": "uuid",
  "technicianId": "uuid"
}
```

### GET /pdi/checklists/:id
Get full PDI checklist with all items.

### PATCH /pdi/items/:id
Update a PDI checklist item result.
```json
{
  "result": "pass",
  "technicianNotes": "All good"
}
```

### POST /pdi/items/:id/photos
Upload photo evidence for a PDI item.
```
POST /pdi/items/:id/photos
Content-Type: multipart/form-data
photo: <file>
caption: "Rear bumper scratch found"
```

### POST /pdi/checklists/:id/complete
Mark PDI as completed (triggers delivery unlock).

### GET /pdi/templates
Get PDI checklist templates by model.

---

## RTO Module

### POST /rto/applications
Create RTO application for a booking.
```json
{
  "bookingId": "uuid",
  "vehicleId": "uuid",
  "registrationState": "Maharashtra",
  "registrationDistrict": "Pune",
  "rtoOffice": "Pune West - PNQ",
  "isHypothecation": true,
  "hypothecationBank": "HDFC Bank"
}
```

### POST /rto/applications/:id/generate-forms
Auto-generate Form 20, 21, 22 (and 34 if hypothecation).
```json
{ "forms": ["form_20", "form_21", "form_22", "form_34"] }
```

### POST /rto/applications/:id/submit
Submit documents to RTO portal (Vahan system).

### GET /rto/applications/:id/status
Poll registration status from Vahan.

### GET /rto/charges
Get RTO charges for a state and vehicle price.
```
GET /rto/charges?state=Maharashtra&vehiclePrice=1100000&vehicleCategory=suv
```

---

## Delivery Module

### POST /delivery/schedules
Schedule vehicle delivery.
```json
{
  "bookingId": "uuid",
  "scheduledDate": "2024-01-25",
  "scheduledTimeSlot": "11:00-12:00",
  "deliveryBay": "BAY-D-01"
}
```

### GET /delivery/slots
Available delivery slots for a date.
```
GET /delivery/slots?date=2024-01-25&branchId=<uuid>
```

### PATCH /delivery/schedules/:id/confirm
Confirm delivery schedule (customer or staff).

### PATCH /delivery/schedules/:id/checklist
Update delivery checklist completion.
```json
{
  "exteriorChecked": true,
  "interiorChecked": true,
  "accessoriesVerified": true,
  "invoiceCopyGiven": true,
  "insurancePolicyGiven": true,
  "tempRcGiven": false,
  "keysCount": 2,
  "keysGiven": 2,
  "fuelLevel": "full",
  "vehicleFeaturesExplained": true,
  "infotainmentDemoDone": true
}
```

### POST /delivery/schedules/:id/signature
Upload digital signatures (customer + sales consultant).
```
POST /delivery/schedules/:id/signature
Content-Type: multipart/form-data
customerSignature: <file>
salesSignature: <file>
customerNameSigned: "Amit Sharma"
```

### POST /delivery/schedules/:id/photos
Upload delivery photos.

### POST /delivery/schedules/:id/complete
Mark delivery as complete (triggers post-sale CRM).

---

## Feedback & Service Module

### POST /feedback
Submit customer feedback.
```json
{
  "bookingId": "uuid",
  "feedbackType": "post_delivery",
  "overallRating": 9,
  "salesRating": 5,
  "processRating": 4,
  "deliveryRating": 5,
  "vehicleRating": 5,
  "wouldRecommend": true,
  "feedbackText": "Excellent experience! Priya was very helpful."
}
```

### GET /service/reminders
Get upcoming service reminders (for service team).
```
GET /service/reminders?from=2024-02-01&to=2024-02-28&type=first_service
```

### POST /followups
Create a manual follow-up schedule.

### GET /followups/pending
Get all pending follow-ups for authenticated consultant.

---

## Analytics & GraphQL

### REST Endpoints

#### GET /analytics/dashboard
Real-time dashboard data.
```
GET /analytics/dashboard?branchId=<uuid>&period=this_month
```
```json
{
  "data": {
    "leads": {
      "total": 234,
      "new": 45,
      "contacted": 67,
      "won": 23,
      "lost": 12,
      "conversionRate": 9.83
    },
    "bookings": { "total": 23, "confirmed": 20, "pending": 3 },
    "deliveries": { "total": 18, "scheduled": 5, "completed": 13 },
    "revenue": {
      "invoiced": 19800000,
      "collected": 17500000,
      "pending": 2300000
    },
    "stock": {
      "inYard": 45,
      "inTransit": 12,
      "allocated": 20
    },
    "penetration": {
      "financeRate": 78.5,
      "insuranceRate": 92.3,
      "accessoriesRate": 65.0
    }
  }
}
```

#### GET /analytics/funnel
Lead-to-delivery funnel analysis.

#### GET /analytics/consultant-performance
Sales consultant leaderboard.

#### GET /analytics/stock-ageing
Stock ageing analysis by model/variant.

### GraphQL Schema (Analytics Service)

```graphql
type Query {
  dashboard(branchId: ID, period: PeriodEnum): Dashboard
  leadFunnel(branchId: ID, from: DateTime, to: DateTime): LeadFunnel
  salesPerformance(branchId: ID, period: PeriodEnum): [ConsultantPerformance]
  stockSummary(branchId: ID): StockSummary
  revenueReport(branchId: ID, from: DateTime, to: DateTime): RevenueReport
}

enum PeriodEnum {
  TODAY
  THIS_WEEK
  THIS_MONTH
  LAST_MONTH
  THIS_QUARTER
  THIS_YEAR
  CUSTOM
}

type Dashboard {
  leads: LeadStats!
  bookings: BookingStats!
  deliveries: DeliveryStats!
  revenue: RevenueStats!
  stock: StockStats!
  penetration: PenetrationStats!
  topModels: [ModelSales!]!
  topConsultants: [ConsultantSales!]!
}

type LeadStats {
  total: Int!
  new: Int!
  contacted: Int!
  interested: Int!
  demoScheduled: Int!
  demoDone: Int!
  negotiation: Int!
  won: Int!
  lost: Int!
  conversionRate: Float!
  avgDaysToConvert: Float!
}

type RevenueStats {
  invoiced: Float!
  collected: Float!
  pending: Float!
  financeAmount: Float!
  insuranceRevenue: Float!
  accessoriesRevenue: Float!
}

type StockStats {
  inYard: Int!
  inTransit: Int!
  allocated: Int!
  demoVehicles: Int!
  avgAgingDays: Float!
  fastMovingModels: [String!]!
  slowMovingVins: [String!]!
}
```
