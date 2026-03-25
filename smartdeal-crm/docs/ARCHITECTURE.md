# SmartDeal CRM – System Architecture

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Microservices Breakdown](#microservices-breakdown)
3. [Communication Patterns](#communication-patterns)
4. [Data Flow: Customer Journey](#data-flow-customer-journey)
5. [Integration Points](#integration-points)
6. [Security Architecture](#security-architecture)
7. [AI/ML Features Architecture](#aiml-features-architecture)
8. [Legacy System Integration](#legacy-system-integration)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SMARTDEAL CRM PLATFORM                             │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐                  │
│  │  Web Portal  │  │  Tablet App  │  │ Customer Portal  │                  │
│  │  (Next.js)   │  │(React Native)│  │   (Next.js SSR)  │                  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘                  │
│         │                 │                    │                            │
│         └─────────────────┴────────────────────┘                           │
│                           │                                                 │
│                    ┌──────▼──────┐                                          │
│                    │ API GATEWAY │  ← Rate limiting, Auth validation,       │
│                    │  (Port 8080)│    Request routing, CORS, Logging        │
│                    └──────┬──────┘                                          │
│                           │                                                 │
│         ┌─────────────────┼─────────────────────────────┐                  │
│         │                 │                              │                  │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌──────────────────▼─────┐            │
│  │Auth Service │  │ Lead Service │  │  Quotation Service      │            │
│  │  :3001      │  │   :3002      │  │  :3003 (extends index.js│            │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘            │
│                                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐           │
│  │   Booking   │  │   Finance    │  │      Insurance            │           │
│  │   Service   │  │   Service    │  │       Service             │           │
│  │   :3004     │  │    :3005     │  │        :3006              │           │
│  └─────────────┘  └──────────────┘  └──────────────────────────┘           │
│                                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐           │
│  │   Billing   │  │    Stock     │  │         PDI               │           │
│  │   Service   │  │   Service    │  │        Service            │           │
│  │   :3007     │  │    :3008     │  │         :3009             │           │
│  └─────────────┘  └──────────────┘  └──────────────────────────┘           │
│                                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐           │
│  │  Delivery   │  │Notification  │  │       Analytics           │           │
│  │   Service   │  │   Service    │  │        Service            │           │
│  │   :3010     │  │    :3011     │  │         :3012             │           │
│  └─────────────┘  └──────────────┘  └──────────────────────────┘           │
│                           │                                                 │
│         ┌─────────────────┼──────────────────┐                             │
│         │                 │                  │                              │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐                      │
│  │ PostgreSQL  │  │    Redis     │  │   AWS S3     │                       │
│  │  Primary DB │  │ Cache+PubSub │  │  File Store  │                       │
│  └─────────────┘  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘

                    EXTERNAL INTEGRATIONS
┌──────────────┐ ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐
│  WhatsApp    │ │  Razorpay/  │ │  RTO Portal  │ │  Bank APIs      │
│Business API  │ │    PayU     │ │  (Vahan)     │ │ (HDFC,SBI,ICICI)│
└──────────────┘ └─────────────┘ └──────────────┘ └─────────────────┘
┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│  Insurance   │ │   UIDAI     │ │ Income Tax   │
│  APIs(IRDAI) │ │  (Aadhaar)  │ │ (PAN Valid.) │
└──────────────┘ └─────────────┘ └──────────────┘
```

---

## Microservices Breakdown

### 1. API Gateway (`src/api-gateway/`)

**Responsibilities:**
- Incoming request routing to downstream services
- JWT token validation (delegates issuance to auth-service)
- Rate limiting: 100 req/min per IP, 1000 req/min per authenticated user
- Request/response logging with correlation IDs
- CORS enforcement for allowed origins
- SSL termination
- Health check aggregation (`GET /health`)

**Technology:** Node.js + Express + `http-proxy-middleware`

**Routing Table:**
```
/api/v1/auth/*          → auth-service:3001
/api/v1/leads/*         → lead-service:3002
/api/v1/quotations/*    → quotation-service:3003
/api/v1/bookings/*      → booking-service:3004
/api/v1/finance/*       → finance-service:3005
/api/v1/insurance/*     → insurance-service:3006
/api/v1/billing/*       → billing-service:3007
/api/v1/stock/*         → stock-service:3008
/api/v1/pdi/*           → pdi-service:3009
/api/v1/delivery/*      → delivery-service:3010
/api/v1/notifications/* → notification-service:3011
/api/v1/analytics/*     → analytics-service:3012
```

---

### 2. Auth Service (`src/services/auth-service/`)

**Responsibilities:**
- User registration and login
- JWT access token (15min TTL) + refresh token (7 days TTL) issuance
- Token rotation and revocation (stored in Redis)
- Role-Based Access Control (RBAC) with 8 roles
- Multi-branch access control
- Session management with device fingerprinting
- Audit logging of all auth events
- OTP-based login for field staff (WhatsApp OTP)

**Technology:** NestJS + Passport.js + bcrypt + jsonwebtoken

---

### 3. Lead Service (`src/services/lead-service/`)

**Responsibilities:**
- Lead creation from QR scan, walk-in, phone, web, referral
- Auto-assignment to sales consultant (round-robin or load-based)
- Lead status lifecycle: `new → contacted → interested → demo → negotiation → won/lost`
- Requirement discovery data capture
- Follow-up scheduling and reminder triggers
- Lead source analytics

**Technology:** NestJS + PostgreSQL + Redis (for real-time assignment)

---

### 4. Quotation Service (`src/services/quotation-service/`)

**Responsibilities:**
- Extends existing `akar-quotation-server` (`index.js`) logic
- Vehicle pricing: ex-showroom + state-wise RTO + insurance + accessories
- GST computation (CGST/SGST for intra-state, IGST for inter-state)
- TCS calculation (1% for vehicles > ₹10 Lakh)
- Discount approval workflow (sales → manager → GM)
- Quotation PDF generation
- WhatsApp sharing of quotation
- Version history of quotations per lead

**Technology:** NestJS + PostgreSQL + Puppeteer (PDF)

---

### 5. Booking Service (`src/services/booking-service/`)

**Responsibilities:**
- Booking form with document upload (PAN, Aadhaar, address proof)
- Booking amount payment via Razorpay/PayU
- Vehicle VIN allocation to booking
- Document verification workflow
- Booking cancellation with refund initiation
- Booking status: `pending_documents → documents_verified → payment_done → confirmed`

**Technology:** NestJS + PostgreSQL + AWS S3 (document storage)

---

### 6. Finance Service (`src/services/finance-service/`)

**Responsibilities:**
- Multi-bank loan product comparison (HDFC, SBI, Tata Capital, Kotak, Axis)
- EMI calculator (flat rate vs reducing balance)
- Loan application submission via bank APIs
- Document upload for loan processing
- Loan status tracking: `applied → under_review → approved → disbursed`
- Subvention scheme management (manufacturer interest subsidies)

**Technology:** NestJS + PostgreSQL + Bank REST APIs

---

### 7. Insurance Service (`src/services/insurance-service/`)

**Responsibilities:**
- IRDAI-compliant multi-insurer quote comparison
- Comprehensive + Third-party options
- Add-on management: zero dep, RSA, engine protect, consumables, tyre protect
- NCB (No Claim Bonus) application
- Policy issuance API calls to insurers
- Policy document storage

**Technology:** NestJS + PostgreSQL + Insurer APIs

---

### 8. Billing Service (`src/services/billing-service/`)

**Responsibilities:**
- Proforma invoice generation
- Final GST invoice (CGST/SGST/IGST based on buyer state)
- HSN code mapping for vehicles (87.03) and accessories
- TCS entry (Section 206C)
- Payment reconciliation (booking advance, loan disbursement, balance)
- e-Invoice generation (GST portal integration)
- PDF invoice with digital signature

**Technology:** NestJS + PostgreSQL + GST Portal API

---

### 9. Stock Service (`src/services/stock-service/`)

**Responsibilities:**
- VIN-level vehicle tracking
- Yard location management (bay/row/column)
- Transit vehicle tracking (in-transit from OEM)
- Stock aging reports
- Allocation management (reserved, blocked, available)
- Real-time stock availability for quotation
- OEM allocation order management
- Syncs with existing Google Sheets stock data during migration

**Technology:** NestJS + PostgreSQL + Redis (real-time availability)

---

### 10. PDI Service (`src/services/pdi-service/`)

**Responsibilities:**
- Configurable PDI checklist templates (by model variant)
- Tablet-based technician workflow
- Photo evidence capture and upload per checklist item
- Pass/Fail/Rework status per item
- PDI certificate generation on full pass
- Integration with delivery service (PDI completion unlocks delivery scheduling)

**Technology:** NestJS + PostgreSQL + AWS S3

---

### 11. Delivery Service (`src/services/delivery-service/`)

**Responsibilities:**
- Delivery slot calendar management
- Bay assignment for handover
- Customer confirmation (WhatsApp reminder 24h and 1h before)
- Digital handover checklist
- Accessory verification against invoice
- Digital signature capture (customer + sales consultant)
- Delivery photo upload (360° vehicle, key handover)
- Monroney sticker printing

**Technology:** NestJS + PostgreSQL + AWS S3 + Signature pad integration

---

### 12. Notification Service (`src/services/notification-service/`)

**Responsibilities:**
- WhatsApp Business API message dispatch
- Email notifications (AWS SES)
- SMS fallback (Twilio/MSG91)
- In-app push notifications
- Template management for all notification types
- Delivery tracking and retry logic
- Subscribes to events from all services via Redis pub/sub

**Technology:** NestJS + Redis (subscriber) + WhatsApp Cloud API + AWS SES

---

### 13. Analytics Service (`src/services/analytics-service/`)

**Responsibilities:**
- Real-time sales dashboard (leads, bookings, deliveries, revenue)
- Funnel analysis (lead → booking conversion rates)
- Stock aging and turns analysis
- Finance penetration rates
- Insurance penetration rates
- Sales consultant performance dashboards
- Manager and GM-level reports
- GraphQL API for flexible dashboard queries

**Technology:** NestJS + PostgreSQL + Elasticsearch + GraphQL

---

## Communication Patterns

### Synchronous (REST)
Used for: User-facing API calls requiring immediate response

```
Client → API Gateway → Service → Database
                              ↑
                         Response
```

### Synchronous (GraphQL)
Used for: Analytics dashboard queries requiring flexible field selection

```
Client → API Gateway → Analytics Service → PostgreSQL/Elasticsearch
```

### Asynchronous (Redis Pub/Sub)
Used for: Cross-service events that don't require immediate response

**Event Topics:**
```
lead.created          → notification-service (WhatsApp to consultant)
lead.assigned         → notification-service (WhatsApp to customer)
quotation.shared      → notification-service (WhatsApp PDF to customer)
booking.confirmed     → stock-service (VIN lock), notification-service
booking.documents_uploaded → auth-service (trigger KYC)
finance.approved      → notification-service, billing-service
pdi.completed         → delivery-service (unlock scheduling)
delivery.scheduled    → notification-service (customer reminders)
delivery.completed    → analytics-service, notification-service (survey)
payment.received      → billing-service (reconciliation)
```

### Service-to-Service (Internal REST)
Services call each other directly on internal network for synchronous cross-service data needs:

```
quotation-service → stock-service   (check availability)
booking-service   → quotation-service (fetch quotation details)
billing-service   → booking-service   (fetch booking for invoice)
delivery-service  → pdi-service       (verify PDI completion)
```

---

## Data Flow: Customer Journey

```
[QR Scan at Showroom Gate]
         │
         ▼
[Lead Service] ──────────────► [Notification Service]
 Creates lead record              Sends WhatsApp to
 Auto-assigns consultant          consultant & customer
         │
         ▼
[Requirement Discovery]
 Lead service updates
 requirement_discovery table
         │
         ▼
[Quotation Service] ◄────────── [Stock Service]
 Builds itemised quote            Returns real-time
 with GST breakup                 availability + price
         │
         ▼
[Test Drive Service]
 Schedule slot, verify DL,
 post-drive feedback
         │
         ▼
[Exchange Service] (if applicable)
 Photo upload, condition
 assessment, valuations
         │
         ▼
[Booking Service]
 Document upload (PAN/Aadhaar)
 Booking payment via Razorpay ◄── [Razorpay/PayU]
 VIN allocation                ◄── [Stock Service]
         │
         ▼
[Finance Service]
 Multi-bank comparison ◄────────── [Bank APIs]
 Loan application submission
 Document upload
         │
         ▼
[Insurance Service]
 Multi-insurer comparison ◄──────── [Insurer APIs]
 Policy issuance
         │
         ▼
[Billing Service]
 GST invoice generation ◄──────────[GST Portal API]
 TCS entry
 e-Invoice
         │
         ▼
[PDI Service]
 Technician checklist on tablet
 Photo evidence upload ──────────► [AWS S3]
 PDI certificate generation
         │
         ▼
[RTO Documents]
 Form 20, 21, 22 auto-fill ─────► [RTO Portal]
 Hypothecation form
         │
         ▼
[Delivery Service]
 Slot scheduling ────────────────► [Notification Service]
 Digital handover checklist         WhatsApp reminders
 Customer digital signature ──────► [AWS S3]
 Delivery photos
         │
         ▼
[Post-Sale CRM]
 Follow-up scheduling
 Service reminders ──────────────► [Notification Service]
 Satisfaction survey
```

---

## Integration Points

### WhatsApp Business API (Meta Cloud API)
- **Message Templates:** Pre-approved templates for each customer touchpoint
- **Webhook:** Inbound message handling for customer replies
- **Media Messages:** PDF quotation, invoice sharing
- **Interactive Messages:** Delivery slot selection buttons
- **Endpoint:** `https://graph.facebook.com/v18.0/{phone_id}/messages`

### Razorpay / PayU (Payment Gateway)
- **Booking Advance:** Collect ₹10,000 – ₹50,000 booking amount
- **UPI QR:** Real-time QR generation for walk-in payments
- **Payment Link:** WhatsApp-shared payment links for remote customers
- **Webhook:** Payment confirmation to update booking status
- **Refund API:** Booking cancellation refund initiation

### RTO Portal (Vahan)
- **API Base:** State-wise RTO portal APIs (MORTH Vahan system)
- **Form Submission:** Digital submission of Form 20, 21, 22
- **Status Tracking:** Registration number assignment status polling
- **Temporary Registration:** RC generation workflow

### Bank APIs (Loan Processing)
| Bank | Integration Type |
|------|-----------------|
| HDFC Bank | REST API (DSA channel) |
| SBI | REST API (dealer portal) |
| Tata Capital | REST API (preferred channel) |
| Kotak Mahindra Bank | REST API |
| Axis Bank | REST API |

### Insurance APIs (IRDAI)
| Insurer | Integration |
|---------|------------|
| Tata AIG | REST API |
| Bajaj Allianz | REST API |
| ICICI Lombard | REST API |
| New India Assurance | SOAP/REST |

### UIDAI (Aadhaar)
- Aadhaar OTP verification for KYC during booking
- Aadhaar offline XML (UIDAI QR scan) for document verification
- Masked Aadhaar storage (AES-256 encrypted)

### Income Tax Portal (PAN Validation)
- Real-time PAN validation via NSDL API
- PAN-Aadhaar link verification
- Form 60 fallback for non-PAN customers

---

## Security Architecture

### Encryption
- **At Rest:** AES-256 for PAN, Aadhaar, bank account numbers in PostgreSQL
- **In Transit:** TLS 1.3 for all API communication
- **File Storage:** AWS S3 server-side encryption (SSE-S3) for all uploaded documents
- **Secrets Management:** AWS Secrets Manager / HashiCorp Vault

### Authentication & Authorisation
- JWT (RS256 signed) with 15-minute access token TTL
- Refresh token rotation (7-day TTL, single-use, stored in Redis)
- RBAC with 8 roles and granular resource-level permissions
- Multi-branch access scoping (user sees only their branch data)
- Device fingerprinting for refresh token binding

### Audit Logging
All state-changing operations are written to `audit_logs`:
```sql
INSERT INTO audit_logs (user_id, action, resource_type, resource_id,
                        old_value, new_value, ip_address, user_agent, branch_id)
```
Audit logs are append-only (no UPDATE/DELETE permitted at database level).

### API Security
- OWASP Top 10 mitigations (input validation, parameterised queries, CORS)
- `helmet.js` security headers
- Rate limiting per IP and per user (Redis-backed)
- SQL injection prevention via ORM parameterised queries
- XSS prevention via DOMPurify on frontend

---

## AI/ML Features Architecture

### Vehicle Recommendation Engine
```
Input Features:
  - family_size (1-7+)
  - usage_type (city / highway / mixed)
  - monthly_budget (EMI range)
  - fuel_preference (petrol / diesel / CNG / EV)
  - transmission (manual / automatic)
  - existing_vehicle (for exchange shortlisting)
  - features_priority (safety / comfort / performance / economy)

Model: Collaborative Filtering + Content-Based Hybrid
       (scikit-learn / TensorFlow Lite for on-device inference)

Output: Ranked list of vehicle variants with match percentage
```

### Lead Conversion Prediction
```
Features:
  - lead_source (QR / walk-in / phone / web / referral)
  - time_to_first_contact (minutes)
  - number_of_visits
  - quotation_viewed (bool)
  - test_drive_done (bool)
  - exchange_evaluated (bool)
  - days_in_pipeline

Model: XGBoost binary classifier
Output: Conversion probability (0-1) → prioritise high-probability leads
```

### Follow-up Timing Optimization
```
Input: Last interaction timestamp, lead stage, day of week, time of day
Output: Optimal next follow-up datetime

Training data: Historical lead interactions + outcomes
Model: Gradient boosted trees (LightGBM)
```

---

## Legacy System Integration

The existing `akar-quotation-server` (`index.js`) provides:
1. Vehicle pricing data (from Google Sheets)
2. Scheme/offer data (from Google Sheets)
3. Basic quotation calculation

**Migration Strategy:**
1. **Phase 1 (Parallel Run):** SmartDeal quotation-service proxies to `index.js` for pricing data
2. **Phase 2 (Data Migration):** Export Google Sheets data to PostgreSQL `vehicle_pricing` table
3. **Phase 3 (Cutover):** Quotation-service uses PostgreSQL directly; `index.js` retired

**Proxy Configuration (API Gateway):**
```javascript
// During Phase 1, requests to /api/v1/quotations/legacy/*
// are forwarded to the existing index.js server on port 3000
proxy({ target: 'http://localhost:3000', changeOrigin: true })
```
