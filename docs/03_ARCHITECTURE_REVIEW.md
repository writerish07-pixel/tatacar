# 03 — Architecture Review

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-PHASE0-ARCHREVIEW-001 |
| **Phase** | 0 — Review (no production code) |
| **Status** | Draft for review |
| **Date** | 2026-06-26 |
| **Depends on** | `01_IMPLEMENTATION_ANALYSIS.md`, `02_FINAL_IMPLEMENTATION_PLAN.md` |

> **Purpose.** Compare every reference document, find contradictions, duplicates, outdated/weak items, and catalogue what is missing across validation, permissions, workflows, APIs, screens, audit, testing, and security. Each finding states the **authoritative resolution** so implementation can proceed without re-litigating.

## Sources compared
- **S = Master Build Spec v3.0.0** (`AKAR_DOS_REPLIT_AI_MASTER_BUILD.md`) — **authoritative**.
- **P = Express/Mongo prototype** (`index.js`, `Controller/`, `models/`, `middleware/`, `services/`).
- **D = SmartDeal CRM design docs** (`smartdeal-crm/docs/*`, `smartdeal-crm/samples/*`).

Legend for resolution: **S-wins** = follow the spec; **adopt** = take from reference into the build; **reject** = exclude from V1.

---

## 1. Contradictions

| # | Topic | S (spec) | P (prototype) | D (SmartDeal) | Resolution |
|---|-------|----------|---------------|---------------|-----------|
| X-1 | Backend stack | NestJS 11 + Prisma 7 | Express 4 + Mongoose | 12 microservices | **S-wins**: NestJS modular monolith. |
| X-2 | Database | PostgreSQL 16 | MongoDB | PostgreSQL | **S-wins**: PostgreSQL only (spec §25 "no SQLite/Mongo"). |
| X-3 | Architecture | Modular monolith (CQRS=V2) | Monolith | Microservices + API gateway | **S-wins**: modular monolith. |
| X-4 | Auth mechanism | **JWT** access(15m)+refresh(7d) | **Opaque random tokens** in DB, middleware misnamed `authenticateJWT` (no JWT at all) | JWT (implied) | **S-wins**: real JWT, bcrypt 12. P's scheme is a security/design defect (see §6). |
| X-5 | Access token TTL | 15 min | **24 hours** (`ACCESS_TOKEN_EXPIRY = 1 day`) | n/a | **S-wins**: 15 min access / 7 day refresh. |
| X-6 | Password hashing cost | bcrypt **12** | bcrypt **10** (`genSalt(10)`) | bcrypt (unspecified) | **S-wins**: cost 12. |
| X-7 | Login rate limit | 10 / IP / 15 min | 20 / 5 min (auth), 100/min api | gateway-level | **S-wins**: 10/IP/15m for `/auth/login`; 120/user/min for `/actions`. |
| X-8 | Roles | **13** (GM…TD_COORDINATOR) | **3** (admin, sales, teamLead) | **8** (+ Customer) | **S-wins**: 13 roles. P/D are subsets/variants. |
| X-9 | Customer login | No customer login in V1 | none | Customer self-service portal | **S-wins**: no customer role in V1; customer-facing is V2. |
| X-10 | Notifications | Staff **in-app + Socket.IO only** | `sendWhatsApp.js` present | WhatsApp Business API for customers | **S-wins** (ADR-002): no WhatsApp/Telegram for staff; customer WhatsApp V2. |
| X-11 | Lead status enum | `NEW…DELIVERED/LOST/CANCELLED` (UPPER) | `new…won/lost` (lower, different set) | journey-stage names | **S-wins**: spec `LeadStage`. |
| X-12 | Booking status | Detailed 13-state machine | 4 states (`pending/confirmed/cancelled/delivered`) | journey states | **S-wins**: spec `BookingStatus`. |
| X-13 | VIN allocation | **FIFO** on `stock_entry_date` | ad-hoc `allocatedTo` ref, no FIFO | "Allocate Vehicle (VIN)" manual | **S-wins**: deterministic FIFO. |
| X-14 | Source of truth | **PostgreSQL**; Sheets = mirror | Mongo + Google Sheets routes | PostgreSQL | **S-wins**: PG only; Sheets import/export only. |
| X-15 | Discount authority | Role caps + rules threshold (₹50k) | none | Fixed tiers ₹5k/₹20k/₹50k | **S-wins** model; **adopt** D tiers as seed defaults (confirm M-1). |
| X-16 | Frontend | React 19 + Vite PWA | (none in repo) | Next.js + React Native | **S-wins**: React+Vite SPA. |
| X-17 | Ports | API 3000, DB 5433 | API 8080, Mongo | gateway 8080, services 3001–3012 | **S-wins**: API 3000, DB 5433. |
| X-18 | Workflow engine | `WorkflowService` + `POST /actions`; no n8n | per-controller logic | per-service | **S-wins**: single action router (ADR-001/006). |
| X-19 | File storage | none in V1 (PDF stub) | local PDF | AWS S3 | **S-wins**: no S3 in V1; `pdf_url` stub. |

---

## 2. Duplicate / Overlapping Requirements

| # | Duplication | Resolution |
|---|-------------|-----------|
| DUP-1 | Quotation pricing defined in **S §12 engine**, **P `Quotation` model**, and **D `quotation-engine.js` sample** | Single source: implement **S §12** verbatim; P/D corroborate fields only. One engine (`quotation.engine.ts`). |
| DUP-2 | Customer journey described in **S §10**, **D `CUSTOMER_JOURNEY.md`**, **D `delivery-workflow.js`** | Canonical = **S §10**; D provides extra step detail for backlog (KYC, exchange). |
| DUP-3 | RBAC matrix in **S §9** vs **D `USER_ROLES.md`** | Canonical = **S §9** (`ACTION_ROLES`); D matrix mined for permission gaps (§4). |
| DUP-4 | Rate limiting in **P middleware**, **S §32**, **D gateway** | One implementation via `@nestjs/throttler` per **S §32**. |
| DUP-5 | Pagination in **P `pagination.js`**, **S §11** | One convention: **S §11** (`page`,`pageSize≤100`, envelope `meta`). |
| DUP-6 | PDF generation in **P `pdfGenerater.js`**, **S §20** | One engine, deferred (PH-01); stub URL in V1. |
| DUP-7 | Notification concept across **S §17**, **D notification-service**, **P WhatsApp** | One in-app Notifications module + Socket.IO (S §17). |

---

## 3. Outdated / Superseded Requirements

| # | Item | Why outdated | Action |
|---|------|--------------|--------|
| O-1 | MongoDB/Mongoose models (P) | Superseded by PostgreSQL/Prisma | Mine for fields; **do not port**. |
| O-2 | Opaque-token auth (P `middleware/auth.js`) | Superseded by JWT lifecycle | Replace entirely. |
| O-3 | Google Sheets as live data store (legacy routes `schemeSheet.js`, `stockSheets.js`) | Superseded by PG-as-truth | Sheets become import/export only. |
| O-4 | n8n `/akar/action` webhook | Replaced by `WorkflowService` | Not rebuilt (ADR-001). |
| O-5 | Microservice port map & API gateway (D) | Superseded by monolith | Reject for V1. |
| O-6 | WhatsApp-for-staff (`sendWhatsApp.js`) | Violates ADR-002 | Remove from staff paths; customer WhatsApp V2. |
| O-7 | `expresss` + duplicate `bcrypt`/`bcryptjs` deps (P `package.json`) | Typo'd/duplicate dependencies (dependency hygiene defect) | New `package.json`; single bcrypt. |
| O-8 | External integrations (Razorpay, Vahan, bank/UIDAI/IRDAI APIs in D) | Out of V1 scope | Backlog/V2. |

---

## 4. Weak Architecture / Design Smells (and fixes)

| # | Smell in reference | Fix in build |
|---|--------------------|--------------|
| W-1 | **No validation** on lead create (P `createLead` saves `...req.body` raw) | DTO + `class-validator`; enforce S §24 (phone 10 digits, model/fuel exists, salesperson ACTIVE+SALES, no duplicate active lead). |
| W-2 | **No audit / no domain events** anywhere in P | Audit + `domain_events` on every material mutation (S §16/§18) from M1. |
| W-3 | **No tasks/notifications** → not task-driven | Tasks + My Work + Socket.IO notifications are core, not optional (S §11.2/§17). |
| W-4 | **Coarse RBAC** (only `sales` filtered; teamLead/admin see all; no EV/PV vehicleType filter) | Row-level filters per S §9; default-deny; integration test for horizontal escalation. |
| W-5 | **Inconsistent response shapes** (`{message,data}`, `{data,pagination}`) | Unified envelope `{success,data,meta}` + global exception filter (S §11). |
| W-6 | **Business logic in controllers** (P) | Service-layer only; no Prisma in controllers; commands via `WorkflowService` (S §28). |
| W-7 | **Cross-entity writes without transactions** (P) | `prisma.$transaction` for allocation, NOC gate, payment (S §28). |
| W-8 | **Microservice sprawl** (D: 12 services for a single-branch dealer) | Modular monolith; contexts as modules, not network boundaries. |
| W-9 | **Embedded activity log in Lead doc** (P `activities[]`) | First-class `audit_logs` + `domain_events`; lead activities derivable. |
| W-10 | **No idempotency** on money paths | `X-Idempotency-Key` for payments/bookings (S §11). |
| W-11 | **Lead `stage` mutated directly** by status endpoint (P) | Stage changes only via `WorkflowService` (S §33 rule). |

---

## 5. Poor / Inconsistent Naming (normalize to spec)

| Concept | P / D naming | Canonical (S) |
|---------|--------------|---------------|
| Customer phone | `customerMobile` (P) | `phone` |
| Colour | `colour` (P), `color` (S) | `color` |
| Fuel value casing | `petrol/electric` (P enums) | `PETROL`, `ELECTRIC`, … (UPPER) |
| Vehicle stock entity | `Vehicle` / `vehicleId` (P) | `inventory_units` (FIFO on `stock_entry_date`) |
| Allocation link | `allocatedTo` (P) | `booking_id` + `allocated_at` |
| Login identity | `username`/`userId` (P) | `sales_team_id` |
| Manager roles | "Sales Manager" (D, single) | `EV_MANAGER` / `PV_MANAGER` (vehicle-line split) |
| Quotation field | `HPN` (P, undocumented) | use S §12 named columns; clarify `HPN` provenance (backlog) |
| Token entity | `Token` (opaque) (P) | `user_sessions` (refresh hash) |

Rule going forward: **DB columns `snake_case`, Prisma fields `camelCase` with `@map`, enums UPPER_SNAKE** (per spec schema style).

---

## 6. Missing — by category

### 6.1 Missing validations (vs S §24/§11)
- Phone exactly 10 digits (Indian mobile) — **absent in P**.
- Duplicate active-lead-per-phone rejection — **absent**.
- `model+fuel` existence check against inventory — **absent**.
- Salesperson must be ACTIVE with role SALES — **absent**.
- Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) — **absent** (P trusts `req.body`).
- Never expose `passwordHash` — must enforce via response serialization.

### 6.2 Missing permissions (vs S §9)
- EV/PV manager `vehicleType` row filters — **absent in P**.
- TL team-scope filter (`teamLeaderId`/team members) — **absent**.
- Department-scoped visibility for FINANCE/CASHIER/ACCOUNTS/ACCESSORIES/PDI — **absent**.
- Action-level authorization (`ACTION_ROLES`) for the 12 workflow actions — **absent**.
- OWNER role semantics (in enum, missing from RBAC tables) — define **OWNER ⊇ GM** (gap M-8).

### 6.3 Missing workflows (vs S §10/§11.5)
Absent in both references and required: **FIFO VIN allocation**, **waitlist + 15-min retry**, **dual payment verification**, **accessories order → payment cleared**, **PDI pass → create 6 NOCs**, **6-department NOC gate → gate pass**, **delivery confirm**, **booking cancellation releases VIN**, **quotation approval routing on cap breach**.

### 6.4 Missing APIs (vs S §11)
`GET /tasks/my-work`, `POST /actions` (router), `/master/*` cascade endpoints, `/notifications` + Socket.IO `/notifications`, `/bookings/:id` (with nocs/payments/orders), `/payments` (idempotent), `/inventory` (FIFO sorted), `/analytics/dashboard`, `/admin/sync/sheets` + logs, `/integrity/check-booking-claim`, `/rules` + `/rules/mode` + `/rules/:id/test`, `/health`. **None exist in P.**

### 6.5 Missing screens (vs S §15)
My Work (home), New Lead (cascading dropdowns), Leads list + action panel, Bookings list, Booking detail + **NOC board**, Inventory, Analytics — plus mandatory **Empty/Loading/Error/401/403** states and a11y. **No frontend exists in repo.**

### 6.6 Missing audit (vs S §16/§18)
- `audit_logs` (entityType, entityId, event, actorId, old/new, reason, ip, createdAt) — **absent**.
- `domain_events` for the 15 event types (lead.created … delivery.completed) — **absent**.
- Retention policy (audit 7y append-only; rule log 2y) — **absent**.

### 6.7 Missing testing (vs S §28)
- No tests in P (`"test": "exit 1"`).
- Required: quotation ≥10 unit scenarios, FIFO tests, rules ≥5, RBAC deny integration test, full E2E §23. **None exist.**

### 6.8 Missing security (vs S §32)
- JWT lifecycle + `user_sessions` refresh hashing — **P uses opaque tokens**.
- Per-endpoint throttling profile — **partial/incorrect in P**.
- Secrets handling: `.env` must be gitignored; no committed secrets; `JWT_SECRET`/`JWT_REFRESH_SECRET` ≥64 chars.
- Layered authz (`JwtAuthGuard → RolesGuard → row filter → rules shadow → action-policy`) — **absent**.
- GDPR/DPDP minimal data + erasure plan (V2 API) — **absent**.
- Go-live gate (OWASP ZAP, horizontal-priv tests, secrets scan, TLS, CSP) — PH-08, post-V1.

---

## 7. Cross-cutting Findings the Spec Itself Should Clarify

These are **business-rule ambiguities** (carry forward from 01 §4) — implementation must **stop and confirm**, not guess:

- **M-1 / X-15** Discount authority numbers: spec role-caps vs SmartDeal tiers (₹5k/₹20k/₹50k). Confirm exact caps per role.
- **M-2** TCS threshold: spec code uses `> ₹10,00,000`. Confirm against current TCS law and intended figure.
- **M-4 / M-5 / M-12** KYC verification, exchange/trade-in valuation, detailed PDI checklist: rich in D, absent/minimal in S. Confirm V1 scope (proposed: out-of-scope, single PASS/FAIL PDI).
- **M-8** OWNER permissions: confirm OWNER ⊇ GM.

No code touching these areas is written until confirmed.

---

## 8. Strengths Worth Carrying Forward (from references)

- **P** `Quotation` pricing fields validate the S §12 engine shape (high confidence the math is right).
- **P** lead `source` enum and activity-trail concept inform `LeadSource` + audit.
- **D** RBAC matrix is the most complete permission inventory — use it to sanity-check S §9 coverage (KYC verify, vehicle status update by PDI/Delivery roles).
- **D** quotation/PDI/delivery samples encode realistic step detail useful for backlog (KYC, exchange, checklist items).
- **D** integrations list defines a clean V2 roadmap (payment gateway, Vahan, bank/insurance APIs).

---

## 9. Review Decisions Summary

1. **Build target = Spec v3.0.0**; P and D are reference-only, retained read-only until superseded, then archived.
2. **Architecture = event-driven NestJS modular monolith on PostgreSQL/Prisma** (reject microservices and Mongo).
3. **13 roles, JWT lifecycle, bcrypt 12, staff in-app notifications only.**
4. **PostgreSQL is the only source of truth; Google Sheets are idempotent import/export mirrors.**
5. **All workflow commands go through `WorkflowService` / `POST /actions`; lead stage is mutated there only.**
6. **Every mutation emits a domain event and an audit log; multi-table writes are transactional.**
7. **Rules engine ships in shadow mode; `primary` is a post-V1 gate.**
8. **Business-rule gaps (M-1, M-2, M-4, M-5, M-8, M-12) are confirmed with the dealer before any dependent code.**

---

## 10. Phase 0 Completion

- [x] All sources read and compared (S authoritative; P, D reference).
- [x] Contradictions catalogued with resolutions (§1).
- [x] Duplicates, outdated items, weak architecture, naming issues identified (§2–§5).
- [x] Missing validations/permissions/workflows/APIs/screens/audit/testing/security catalogued (§6).
- [x] Business-rule ambiguities flagged for stakeholder confirmation (§7).

**Phase 0 deliverables (01, 02, 03) are complete. Implementation (Milestone M1) does not begin until these are reviewed and the §7 business-rule gaps are confirmed.**
