# 01 — Implementation Analysis

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-PHASE0-ANALYSIS-001 |
| **Phase** | 0 — Analysis (no production code) |
| **Status** | Draft for review |
| **Author** | AKAR Engineering Organization |
| **Date** | 2026-06-26 |
| **Authoritative source** | `AKAR_DOS_REPLIT_AI_MASTER_BUILD.md` v3.0.0 |
| **Reference (do not copy)** | Existing Express/Mongo prototype (repo root); `smartdeal-crm/` design docs |

> **Reading rule.** All uploaded material is **business knowledge**, not implementation. We preserve **business behaviour**; we are free to improve architecture, database, API, and UX. This document records what we understand, what is missing, what conflicts, and how we propose to build.

---

## 1. Current Understanding

### 1.1 What is being built
AKAR DOS is a **Dealer Operating System** for AKAR Motors (Tata dealership, Jaipur). It runs the dealership from first walk-in to vehicle delivery. It is explicitly **not** a CRM menu app — it is a **task-driven, work-centric orchestration platform**: every user lands on **My Work** and the system tells them what to do next. Every state change produces tasks, notifications, audit entries, and domain events.

The canonical end-to-end journey is:

```
RECEPTION lead → SALES test drive → quotation → booking
  → CASHIER/ACCOUNTS payment verify → FIFO VIN allocation
  → ACCESSORIES → PDI pass → 6-department NOC → gate pass → GM delivery
```

### 1.2 What already exists in this repository

| Asset | What it is | Role going forward |
|-------|-----------|--------------------|
| Root Express app (`index.js`, `Controller/`, `models/`, `Routes/`) | A working **Express 4 + MongoDB/Mongoose** prototype: auth (JWT), leads, test drives, vehicles, quotations, bookings, PDF, WhatsApp. | **Reference only.** Captures real business fields (pricing breakdown, lead sources, vehicle status). Not reused as code. |
| `smartdeal-crm/docs/*` | A **microservices** architecture design (12 services), PostgreSQL schema (~1,250 lines), 8-role RBAC matrix, customer journey, AI features, integrations. | **Reference only.** Richest business-rule source (discount tiers, KYC, finance, insurance, billing, exchange evaluation). Architecture is rejected (see §3 conflicts). |
| `smartdeal-crm/samples/*` | ~3,000 lines of illustrative service code (quotation engine, PDI checklist, delivery workflow, lead capture, recommendation). | **Reference only.** Encodes detailed business algorithms worth mining. |
| Master Build Spec v3.0.0 | The single authoritative build instruction. | **Authoritative target.** Everything we build conforms to it. |

### 1.3 Target technology (authoritative — from spec §3)

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, TypeScript, class-validator |
| ORM | Prisma 7 + `@prisma/adapter-pg` + `pg` |
| Database | PostgreSQL 16 (port **5433** locally) |
| Cache/Queue | Redis 7 + BullMQ (stubs acceptable in V1) |
| Real-time | Socket.IO (`@nestjs/platform-socket.io`) |
| Auth | JWT access (15m) + refresh (7d), bcrypt cost 12 |
| Frontend | React 19 + Vite + TypeScript, PWA-capable |
| Sheets | `googleapis`, with JSON-fixture fallback |
| PDF | Puppeteer HTML→PDF (phase 2; stub URL in V1) |

The target stack is a **clean break** from both reference implementations: it is neither the Express/Mongo prototype nor the microservices design. It is a **NestJS modular monolith on PostgreSQL/Prisma**.

---

## 2. Business Understanding

These are the **business rules we must preserve** regardless of how we implement them. They are extracted from the spec and corroborated by the prototype/SmartDeal references.

### 2.1 Organization & people
- Single dealer org (**AKAR Motors**), one branch (**Jaipur Main**) in V1; schema must allow multiple branches.
- Sales hierarchy: `GM → {EV_MANAGER, PV_MANAGER} → TL → SALES`. Independent roles: RECEPTION, TD_COORDINATOR, FINANCE_MANAGER, CASHIER_MANAGER, ACCOUNTS_MANAGER, ACCESSORIES_MANAGER, PDI_MANAGER.
- **13 roles** total (spec §7 enum). Login identity is `salesTeamId` (e.g. `GM_01`), **not** email.
- Row-level lead visibility: GM/OWNER all; EV_MANAGER → EV; PV_MANAGER → PV/ICE; TL → team; SALES → own; others department-scoped.

### 2.2 Lead lifecycle
- Reception creates a lead with **strict validated dropdowns** (model → fuel cascade → salesperson).
- Phone must be exactly 10 digits (Indian mobile). No duplicate **active** lead for the same phone (active = not LOST/DELIVERED/CANCELLED).
- Lead must reference a `model + fuel` that exists in inventory.
- SLA: first contact on a new lead within **30 minutes**.
- Stage machine: `NEW → CONTACTED → TD_REQUESTED → TD_DONE → QUOTED → BOOKED → (IN_FINANCE | PAYMENT_PENDING) → ACCESSORIES → PDI → NOC_PENDING → READY → DELIVERED`, with `LOST`/`CANCELLED` reachable from any state.

### 2.3 Quotation pricing (must remain numerically identical — spec §12)
The quotation engine is the single most behaviour-sensitive component. Preserved rules:
- Discounts are summed from named columns in the vehicle pricing row (`CONSUMER`, `EXCHANGE`, `CORPORATE OFFER`, etc.).
- `CORPORATE OFFER` is excluded from the "discount-without-corp" subtotal and added separately.
- Additional discount is **capped** at the variant's additional-discount limit when provided.
- `espAfterDisc = ESP − totalDisc`.
- **TCS = 1% of espAfterDisc, only when espAfterDisc > ₹10,00,000**, rounded to 2 decimals; else 0.
- `grandTotal = espAfterDisc + RTO + TCS + insurance + EW + accessories + VAS + FastTag + TRC + COD`.
- `needsApproval = (roleCap != null && totalDisc > roleCap)`.
- The prototype `Quotation` model confirms the same pricing fields (exShowroom, totalDiscount, rtoType/Amount, insuranceTotal, fasttag, tcs, ewType/Amount, accessoryTotal, vasType/Amount, grandTotal) — strong corroboration that these fields are real and stable.

### 2.4 Booking, payment & FIFO VIN
- Booking state machine: `OPEN → PAYMENT_UNDER_VERIFICATION → (VIN_ALLOCATED | VIN_WAITLISTED) → PAYMENT_COMPLETE → ACCESSORY_PENDING → ACCESSORY_CLEARED → PDI → NOC_PENDING → READY → DELIVERED`, plus `CANCELLED` (releases VIN).
- Payment requires **dual verification** (cashier + accounts) before VIN allocation.
- **FIFO VIN allocation**: among AVAILABLE units matching model+variant+color, pick the **oldest `stock_entry_date`**. Verified by the seed test: `SEEDVIN…0001` before `…0002`.
- No matching stock → add to `allocation_waiting_list`; retry every 15 minutes.
- Cancellation releases the VIN back to AVAILABLE and clears `booking_id`/`allocated_at`.

### 2.5 Fulfilment: accessories → PDI → NOC → delivery
- Accessories: selection submitted by ACCESSORIES_MANAGER → payment cleared by cashier.
- PDI pass creates **6 department NOC records** (SALES, FINANCE, CASHIER, ACCOUNTS, ACCESSORIES, PDI), all initially unapproved.
- **All 6 NOCs** must be approved before a gate pass is issued and booking becomes READY.
- GM/OWNER confirms delivery → booking and lead become DELIVERED; inventory unit DELIVERED.

### 2.6 Discount authority (business rule needing reconciliation)
- Spec model: per-user `discountCap`, plus variant fields `AddDiscLim`, `CA_Cap` (consultant cap), `TL_Cap` (team-lead cap); quotation needing approval routes to EV/PV manager or GM. Rules-engine seed adds a discount threshold (> ₹50,000 → require approval).
- SmartDeal model: fixed tiers — Level 1 ≤ ₹5k (consultant), Level 2 ≤ ₹20k (manager), Level 3 ≤ ₹50k (admin).
- These are **two encodings of the same intent** (graduated discount authority). The spec's role-cap + rules model is authoritative; the SmartDeal tiers are useful default seed values. See §5 conflict C-7.

### 2.7 System-of-record & integration policy
- **PostgreSQL is the only source of truth** for live transactions.
- **Google Sheets are import/export mirrors only** — never run dealership workflow logic inside Sheets. Import tabs: User_Master, Inventory_Final, Vehicle_Data, Accessory_Detail (sheet wins). Export tabs: Leads, Bookings, Quotation_Master, etc. (DB wins). Sync must be reliable, idempotent, retryable, versioned, auditable; dev fallback = JSON fixtures.
- **Staff notifications: in-app + Socket.IO only.** Never WhatsApp/Telegram for staff. Customer WhatsApp is future/optional (ADR-002).
- **No n8n at runtime** (ADR-001). The legacy single `/akar/action` webhook is replaced by `POST /api/v1/actions` routed through `WorkflowService`.

---

## 3. Architecture Understanding

### 3.1 Chosen pattern
**Event-driven modular monolith** (spec §2): one NestJS app, engine/domain modules inside, every material state change emits a `domain_events` row and writes `audit_logs`. CQRS, multi-tenant RLS, command bus, workflow designer, OEM plugin sandbox, and offline conflict resolution are **explicitly V2** (ADR-004/007/008/009/010).

### 3.2 Layering
```
Platform services:  Identity · Tasks · Notifications · Approvals · Audit · Events · Sheet Sync · Rules · Config
Domain contexts:    Leads · Quotation · Inventory/FIFO · Sales(TestDrive) · Finance(Payments) · Delivery(Booking/NOC/PDI/GatePass/Accessories)
```
Cross-context changes flow **only** through `WorkflowService` + domain events — never direct cross-context FK writes. Lead `stage` is mutated by `WorkflowService` only.

### 3.3 Authorization stack (spec §32)
```
JwtAuthGuard → RolesGuard → row-level filter → Rules Engine (shadow) → action-policy.ts fallback
```
RBAC enforced at the action router via `ACTION_ROLES` (spec §9); unauthorized → HTTP 403.

### 3.4 The central abstraction: the Action Router
`POST /api/v1/actions { actionType, leadId?, bookingId?, quotationId?, ...payload }` is the heart of the system. All 12 workflow commands (TESTDRIVE_REQUEST, QUOTATION_CREATE/APPROVE, BOOKING_INITIATED/PAYMENT_APPROVED/CANCELLED, ACCESSORY_SELECTION_SUBMITTED/PAYMENT_CLEARED, PDI_PASS, NOC_APPROVAL, DELIVERY_CONFIRM) live in `WorkflowService.executeAction()`. This is what makes the system task-driven rather than module-driven.

### 3.5 Rules Engine (POC, shadow mode)
A JSON-Logic-style configurable rules engine (`rule_definitions` + `rule_evaluation_log`) ships in **shadow mode**: legacy `action-policy.ts` decides, rules are evaluated and logged, mismatches warn. 13 seed rules (11 AUTHORIZATION + 2 DISCOUNT). Modes: `off | shadow | primary`. Promotion to `primary` is a production-hardening gate (PH-07).

---

## 4. Missing / Under-specified Information

Items the spec leaves ambiguous. Per the "AI must never invent business rules" directive, **business-rule gaps will be raised for clarification before implementation**; engineering gaps we resolve with documented defaults.

| # | Gap | Type | Proposed default (to confirm) |
|---|-----|------|-------------------------------|
| M-1 | Exact discount-authority numbers per role (CA_Cap/TL_Cap vs SmartDeal tiers) | **Business** | Use variant `CA_Cap`/`TL_Cap` from Vehicle_Data; seed rule threshold ₹50k. **Confirm with dealer.** |
| M-2 | TCS threshold currency/figure: spec code uses `> 1_000_000` (₹10L) but prose elsewhere implies different. | **Business/tax** | Follow spec code exactly: TCS 1% when espAfterDisc > ₹10,00,000. **Confirm against current TCS law.** |
| M-3 | Finance (loan) case fields & approval flow detail | Business | Minimal `finance_cases` record on FINANCE booking; full bank-API flow is V2. |
| M-4 | KYC document capture/verification (rich in SmartDeal, absent in spec) | Business | Out of V1 scope; note as backlog. **Confirm not required for V1.** |
| M-5 | Exchange/trade-in valuation flow | Business | Out of V1 scope; `EXCHANGE` exists only as a discount column. **Confirm.** |
| M-6 | Insurance product selection vs single insurance amount | Business | V1 uses insurance amount(s) from Vehicle_Data only. |
| M-7 | Notification escalation timing beyond 30-min lead SLA | Engineering | `config_settings` SLA thresholds; escalate overdue via `sla-monitor` job. |
| M-8 | OWNER role responsibilities (in enum, absent from RBAC tables) | Engineering | Treat OWNER ⊇ GM permissions. |
| M-9 | Idempotency-key storage/TTL | Engineering | Persist key→result for payments/bookings; 24h TTL. |
| M-10 | Pagination/sort defaults already given; max pageSize 100 | Resolved | Follow spec §11. |
| M-11 | Variant/color master source | Engineering | Derive DISTINCT from `inventory_units` (spec §11.4). |
| M-12 | PDI checklist contents (SmartDeal has 668-line sample) | Business | V1: single PASS/FAIL inspection record; detailed checklist is post-V1. **Confirm.** |

---

## 5. Conflicting Requirements (summary — detailed in 03_ARCHITECTURE_REVIEW.md)

| # | Conflict | Resolution |
|---|----------|-----------|
| C-1 | Stack: Express/Mongo (prototype) vs Microservices/PG (SmartDeal) vs NestJS-monolith/PG (spec) | **Spec wins** — NestJS modular monolith on Prisma/PostgreSQL. |
| C-2 | Architecture: microservices vs modular monolith | **Modular monolith** (ADR-004 CQRS is V2). |
| C-3 | Roles: 3 (prototype) vs 8 (SmartDeal) vs 13 (spec) | **13 roles** per spec enum. |
| C-4 | Notifications: WhatsApp present (prototype/SmartDeal) vs in-app only (spec) | **Staff in-app + Socket.IO only**; customer WhatsApp V2. |
| C-5 | Lead/booking status enums differ across sources | **Spec enums** are canonical. |
| C-6 | VIN allocation: ad-hoc `allocatedTo` (prototype) vs FIFO by stock date (spec) | **FIFO on `stock_entry_date`**. |
| C-7 | Discount authority: role-cap+rules (spec) vs fixed tiers (SmartDeal) | **Spec role-cap + rules**; SmartDeal tiers as seed defaults (confirm M-1). |
| C-8 | Source of truth: Google Sheets-centric (legacy) vs PostgreSQL-only (spec) | **PostgreSQL only**; Sheets are mirrors. |
| C-9 | API port: 8080 (prototype/SmartDeal gateway) vs 3000 (spec) | **API 3000, DB 5433** per spec. |

---

## 6. Risk Analysis

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R-1 | Quotation math drift from legacy → wrong customer prices | Med | **High** | Port spec §12 verbatim; ≥10 unit tests incl. TCS boundary, corp-offer exclusion, add-disc cap. Golden-value tests vs reference samples. |
| R-2 | FIFO returns wrong VIN (sort/timezone bug) | Med | High | Deterministic sort on `stock_entry_date`; seed-based test asserts `…0001` first; store dates as DATE/UTC. |
| R-3 | Prisma 7 driver-adapter misconfig blocks all DB access | Med | High | Use mandated `PrismaPg` + `Pool` pattern; health endpoint verifies connectivity; pin versions. |
| R-4 | RBAC gap → horizontal privilege escalation (sales sees others' leads) | Med | High | Guard + row filter + integration test "sales cannot see other's leads"; default-deny. |
| R-5 | NOC gate bypass → vehicle delivered without all approvals | Low | High | Enforce "all 6 approved" in a single transaction before gate pass; unique `(booking_id, department)`. |
| R-6 | Inventing business rules where spec is silent (M-1..M-12) | Med | High | **Stop-and-ask** policy for business gaps; defaults documented and flagged. |
| R-7 | Google Sheets sync non-idempotent → duplicate/corrupt master data | Med | Med | Upsert by natural key, `sheet_sync_log`, fixture-mode dev, errors → `error_queue` + GM alert. |
| R-8 | Scope creep into V2 (CQRS, workflow designer, multi-tenant) | High | Med | Hard V1 boundary; V2 items tracked but not built. |
| R-9 | Idempotency missing on payments → double allocation | Med | High | `X-Idempotency-Key` cache for payments/bookings; allocation inside transaction with row lock. |
| R-10 | Secrets committed (JWT, service account) | Low | High | `.env` gitignored; secrets scan in PR checklist; placeholders only in repo. |
| R-11 | Event/audit volume growth | Low | Med | Indexes + retention policy (audit 7y append-only, rule log 2y). |

---

## 7. Implementation Strategy

1. **Phase 0 (this phase):** three analysis docs (01/02/03). No code.
2. **Strangler-by-rebuild, not port.** Build the NestJS/Prisma monolith from scratch in `akar-dos-api/` + `akar-dos-web/`; mine the references for business rules only.
3. **Milestone-gated.** One milestone at a time: implement → review → fix → test → document → commit → continue. Never combine milestones (spec implementation rule).
4. **Engine-first.** Quotation and FIFO engines are pure, fully unit-tested functions before they are wired into `WorkflowService`.
5. **Action-router-centric.** All workflow commands route through `POST /actions`; no business logic in controllers.
6. **Event + audit on every mutation.** Non-negotiable from milestone 1.
7. **Shadow-mode rules** from the start; never `primary` in V1.
8. **Stop-and-ask** on any business ambiguity (§4 M-items).

---

## 8. Technology Review

| Decision | Verdict | Notes |
|----------|---------|-------|
| NestJS 11 modular monolith | **Adopt** | Right altitude for one team; DI + modules give clean context boundaries without microservice ops overhead. |
| Prisma 7 + pg adapter | **Adopt with care** | Driver-adapter is mandatory in P7; pin and smoke-test early (R-3). |
| PostgreSQL 16 | **Adopt** | Transactions for multi-table writes (allocation, NOC gate); JSON columns for `data_json`/rules. |
| Socket.IO | **Adopt** | In-app real-time staff notifications; user rooms `user:{id}`. |
| Redis 7 + BullMQ | **Adopt, stub-first** | Jobs (sheet sync, VIN retry, SLA, follow-up) may start as stubs; design interfaces now. |
| React 19 + Vite PWA | **Adopt** | My-Work-first SPA; PWA/offline is future-ready, not V1-blocking. |
| `googleapis` + fixtures | **Adopt** | Fixture fallback keeps dev/CI hermetic. |
| Puppeteer PDF | **Defer (PH-01)** | Stub `pdf_url` in V1. |
| Reject: Mongo, microservices, WhatsApp-for-staff, Sheets-as-DB, n8n runtime | **Reject** | Per ADRs and spec §25 "What NOT to build". |

---

## 9. Improvement Opportunities (engineering only — no behaviour change)

1. **Typed unified response envelope** (`{ success, data, meta }`) + global exception filter mapping to spec §11 error codes — cleaner than the prototype's ad-hoc responses.
2. **Pure, side-effect-free engines** (quotation, FIFO) for trivial testing and reuse by the rules engine.
3. **Single action router** instead of scattered endpoints → one authorization/audit/event choke point.
4. **Normalized schema**: dedicated `inventory_units`, `department_nocs (unique booking+dept)`, `domain_events`, separating concerns the prototype crammed into embedded Mongo docs.
5. **Idempotency middleware** for money paths.
6. **Config-driven SLAs/thresholds** in `config_settings` rather than hardcoded.
7. **Shadow rules engine** gives a safe path to externalize policy without behaviour risk.
8. **Append-only audit + domain events** give full traceability the prototype lacked.

---

## 10. Estimated Implementation Effort

Indicative engineering effort for V1 (spec §1–§31), excluding production-hardening gate (§35):

| Milestone | Scope | Est. (eng-days) |
|-----------|-------|------------------|
| M1 Foundation | Docker, Prisma schema, migrate, seed, Prisma module, config, health | 2.0 |
| M2 Auth & RBAC | Login/refresh/logout/me, JWT, guards, roles, rate limit | 1.5 |
| M3 Platform | Tasks/My-Work, Notifications + Socket.IO, Audit, Events | 2.5 |
| M4 Leads & Master | Leads CRUD + validation + RLS, master dropdowns | 2.0 |
| M5 Engines | Quotation engine + FIFO engine + unit tests | 2.0 |
| M6 Action Router | All 12 actions in WorkflowService + transactions | 3.0 |
| M7 Rules POC | Tables, 13 seed rules, shadow integration, tests | 1.5 |
| M8 Bookings/Payments/Inventory/Analytics APIs | Read models, payment + idempotency | 2.0 |
| M9 Frontend | Login, My Work, New Lead, Leads, Bookings+NOC board, Inventory, Analytics, all UI states | 4.0 |
| M10 Sheets Sync | googleapis + fixtures, logs, error_queue | 1.5 |
| M11 Integration & Polish | Bulk upload, integrity check, E2E smoke, README | 2.0 |
| **Total V1** | | **~26 eng-days** |

Production hardening (PH-01…PH-08: PDF, BullMQ cron, PWA push, full test suite, monitoring, rules-primary cutover, security gate) is **additional and post-V1**.

---

## 11. Exit Criteria for Phase 0

- [x] Reference material read and classified (spec authoritative; prototype + SmartDeal = reference).
- [x] Business rules extracted and stated as behaviour to preserve (§2).
- [x] Architecture understood and chosen pattern recorded (§3).
- [x] Missing info and conflicts catalogued with proposed resolutions (§4, §5).
- [x] Risks and mitigations identified (§6).
- [ ] `02_FINAL_IMPLEMENTATION_PLAN.md` complete.
- [ ] `03_ARCHITECTURE_REVIEW.md` complete.
- [ ] Business-rule gaps (M-1, M-2, M-4, M-5, M-12) confirmed with stakeholder **before** implementing affected logic.

**No production code is written until 02 and 03 are complete and reviewed.**
