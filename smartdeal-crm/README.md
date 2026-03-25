# SmartDeal – Digital Dealership CRM

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)
![Platform](https://img.shields.io/badge/platform-Tata%20Motors%20Dealership-navy)
![GST Compliant](https://img.shields.io/badge/GST-Compliant-orange)

> **SmartDeal** is a unified digital platform engineered for completely **paperless Tata Motors dealership operations** in India. From QR-code showroom entry to digital delivery confirmation and post-sale CRM, every touchpoint of the customer journey is captured, tracked, and optimised in one integrated system.

---

## 🏢 Core Objective

Replace fragmented spreadsheets, WhatsApp groups, and manual processes with a **single source of truth** that:

- Eliminates all paper from the dealership floor
- Provides real-time visibility into leads, stock, financials, and operations
- Enforces compliance with Indian regulations (GST, RTO, DPDP Act 2023)
- Scales to **10,000+ customers**, **multi-branch operations**, and **real-time analytics**
- Integrates natively with WhatsApp Business, Razorpay/PayU, Bank APIs, Insurance APIs, and RTO portals

This system **extends the existing `akar-quotation-server` (`index.js`)** — the current quotation and stock management system — into a full enterprise CRM. The existing quotation API becomes the foundation for the Quotation Service microservice.

---

## 📦 Modules

| # | Module | Description |
|---|--------|-------------|
| 1 | **Showroom Entry** | QR code scan at gate, instant lead creation, sales consultant auto-assignment |
| 2 | **Requirement Discovery** | Guided wizard capturing family size, usage pattern, budget, fuel preference, and existing vehicle |
| 3 | **Product Presentation** | Digital vehicle catalogue with 360° view, feature comparison, and live stock availability |
| 4 | **Quotation Engine** | Itemised quote: ex-showroom, RTO (state-wise), insurance, accessories, EW, handling, GST breakup |
| 5 | **Test Drive Management** | Slot booking, DL verification, route tracking, digital feedback collection |
| 6 | **Exchange Evaluation** | Multi-photo upload, condition assessment, estimated value, third-party vendor integration |
| 7 | **Booking Module** | Digital booking form, PAN/Aadhaar/address proof upload, payment gateway (UPI/card/netbanking) |
| 8 | **Finance Module** | Multi-bank loan comparison, EMI calculator, document upload, bank API integration |
| 9 | **Insurance Selection** | IRDAI-compliant multi-insurer comparison, add-ons, zero-dep, RSA, engine protect |
| 10 | **Billing Module** | GST invoice generation (CGST/SGST/IGST), TCS collection, proforma, final invoice |
| 11 | **Stock Management** | VIN-level tracking, yard location, transit vehicles, OEM allocation management |
| 12 | **PDI (Pre-Delivery Inspection)** | Tablet-based checklist for technicians, photo evidence, pass/fail workflow |
| 13 | **RTO Document Generation** | Auto-fill Form 20, Form 21, Form 22, hypothecation forms, temporary registration |
| 14 | **Delivery Scheduling** | Calendar-based slot booking, bay assignment, customer confirmation via WhatsApp |
| 15 | **Delivery Experience** | Digital handover checklist, accessory verification, Monroney sticker, digital signature |
| 16 | **Post-Sale CRM** | Follow-up scheduling, service reminders, customer satisfaction surveys, loyalty tracking |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Web** | React 18 / Next.js 14 | Sales consultant & manager dashboards |
| **Tablet App** | React Native / Expo | PDI technician & delivery checklists |
| **Customer Portal** | Next.js (SSR) | Booking tracking, document upload |
| **API Gateway** | Node.js / Express | Request routing, auth, rate limiting |
| **Auth Service** | NestJS + Passport.js | JWT, RBAC, session management |
| **Business Services** | NestJS (per microservice) | Domain logic per module |
| **Primary Database** | PostgreSQL 15 | Transactional data, audit logs |
| **Cache / Pub-Sub** | Redis 7 | Session cache, event streaming |
| **File Storage** | AWS S3 + CloudFront | Documents (PAN, Aadhaar, PDI photos) |
| **Notifications** | WhatsApp Business API | Customer and staff communication |
| **Payments** | Razorpay / PayU | UPI, card, netbanking, EMI |
| **Search** | Elasticsearch | Vehicle & customer search |
| **Monitoring** | Prometheus + Grafana | Metrics and alerting |
| **Logging** | ELK Stack | Centralised log management |
| **CI/CD** | GitHub Actions | Build, test, deploy pipelines |
| **Containers** | Docker + Kubernetes | Orchestration and scaling |
| **CDN** | AWS CloudFront | Static assets and document delivery |

---

## 🇮🇳 Indian Compliance & Specifics

- **GST**: CGST + SGST (intra-state) / IGST (inter-state) with HSN codes for vehicles and accessories
- **TCS**: Tax Collected at Source on vehicles above ₹10 Lakh (Section 206C)
- **RTO**: Form 20 (registration), Form 21 (sale certificate), Form 22 (roadworthiness), hypothecation
- **KYC**: PAN validation via Income Tax API, Aadhaar OTP verification via UIDAI
- **UPI**: QR code generation for booking amounts and accessories
- **DPDP Act 2023**: Data principal rights, consent management, data localisation
- **IRDAI**: Insurance quote compliance and motor vehicle insurance regulations
- **State RTO rates**: Dynamic RTO charges based on customer's registration state

---

## 🚀 Quick Start

### Prerequisites

```bash
node >= 18.x
postgresql >= 15.x
redis >= 7.x
docker >= 24.x
```

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/smartdeal-crm.git
cd smartdeal-crm

# Install dependencies for all services
npm run bootstrap

# Copy environment configuration
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run db:migrate

# Seed reference data (vehicle models, states, RTO rates)
npm run db:seed

# Start all services in development mode
docker-compose -f src/deployment/docker/docker-compose.yml.example up -d
```

### Existing Quotation Server Integration

The existing `akar-quotation-server` (`../index.js`) runs on port 3000. SmartDeal proxies requests to it during migration:

```bash
# Start the legacy quotation server
node ../index.js

# SmartDeal API gateway will proxy /v1/quotations/legacy/* to port 3000
```

### Access Points

| Service | URL |
|---------|-----|
| Sales Dashboard | http://localhost:4000 |
| API Gateway | http://localhost:8080 |
| API Docs (Swagger) | http://localhost:8080/api/docs |
| Grafana | http://localhost:3001 |
| Kibana | http://localhost:5601 |

---

## 📁 Project Structure

```
smartdeal-crm/
├── docs/                        # All documentation
│   ├── ARCHITECTURE.md          # System architecture & diagrams
│   ├── DATABASE_SCHEMA.md       # Full PostgreSQL schema
│   ├── API_DESIGN.md            # REST + GraphQL API specification
│   ├── UI_WIREFRAMES.md         # ASCII wireframes for all screens
│   ├── DEPLOYMENT.md            # Docker, K8s, CI/CD guides
│   ├── USER_ROLES.md            # 8 roles + permissions matrix
│   ├── CUSTOMER_JOURNEY.md      # 16-step journey documentation
│   ├── INTEGRATIONS.md          # External API integrations
│   ├── AI_FEATURES.md           # AI/ML feature documentation
│   └── SECURITY.md              # Security architecture & compliance
├── src/
│   ├── api-gateway/             # Central API gateway
│   ├── services/
│   │   ├── auth-service/        # Authentication & authorisation
│   │   ├── lead-service/        # Lead management
│   │   ├── quotation-service/   # Quotation engine (extends index.js)
│   │   ├── booking-service/     # Booking workflow
│   │   ├── finance-service/     # Loan & finance management
│   │   ├── insurance-service/   # Insurance quotes & management
│   │   ├── billing-service/     # GST invoicing & payments
│   │   ├── stock-service/       # Vehicle inventory
│   │   ├── pdi-service/         # Pre-delivery inspection
│   │   ├── delivery-service/    # Delivery scheduling & handover
│   │   ├── notification-service/# WhatsApp & email notifications
│   │   └── analytics-service/  # Dashboards & reporting
│   ├── frontend/
│   │   ├── web/                 # Next.js sales & manager portal
│   │   └── tablet-app/          # React Native PDI/delivery app
│   ├── shared/                  # Shared utilities, DTOs, constants
│   ├── database/
│   │   ├── migrations/          # Database migration scripts
│   │   └── seeds/               # Reference data seeds
│   └── deployment/
│       ├── docker/              # Docker configurations
│       └── kubernetes/          # K8s manifests
└── samples/                     # Sample/example code files
    ├── lead-capture-api.js
    ├── quotation-engine.js
    ├── vehicle-recommendation.js
    ├── pdi-checklist.js
    └── delivery-workflow.js
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Microservices architecture, data flow, integration points |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Complete PostgreSQL schema with all tables |
| [API_DESIGN.md](docs/API_DESIGN.md) | Full REST & GraphQL API specification |
| [UI_WIREFRAMES.md](docs/UI_WIREFRAMES.md) | Screen wireframes for all modules |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, Kubernetes, CI/CD, monitoring |
| [USER_ROLES.md](docs/USER_ROLES.md) | Role definitions & permissions matrix |
| [CUSTOMER_JOURNEY.md](docs/CUSTOMER_JOURNEY.md) | 16-step digital customer journey |
| [INTEGRATIONS.md](docs/INTEGRATIONS.md) | External API integration guides |
| [AI_FEATURES.md](docs/AI_FEATURES.md) | AI/ML recommendation & prediction features |
| [SECURITY.md](docs/SECURITY.md) | Security architecture & DPDP compliance |

---

## 📊 Performance Targets

| Metric | Target |
|--------|--------|
| Concurrent users | 500+ |
| Customers in system | 10,000+ |
| API response time (p95) | < 200ms |
| Database query time (p95) | < 50ms |
| Daily transactions | 1,000+ |
| Uptime SLA | 99.9% |
| Document upload size | Up to 10MB per file |
| Branches supported | Multi-branch (unlimited) |
| Real-time dashboard refresh | < 5 seconds |
| WhatsApp notification delivery | < 3 seconds |

---

## 🤝 Contributing

This is a proprietary system for Akar Motors (Tata Motors dealership). Development is managed by the engineering team. Refer to the individual service READMEs under `src/services/` for development guidelines.

---

## 📄 License

Proprietary — Akar Motors Pvt. Ltd. All rights reserved.
