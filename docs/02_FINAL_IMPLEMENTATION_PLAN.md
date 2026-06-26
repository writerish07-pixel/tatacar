# 02 — Final Implementation Plan

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-PHASE0-PLAN-001 |
| **Phase** | 0 — Planning (no production code) |
| **Status** | Draft for review |
| **Date** | 2026-06-26 |
| **Depends on** | `01_IMPLEMENTATION_ANALYSIS.md` |
| **Authoritative source** | `AKAR_DOS_REPLIT_AI_MASTER_BUILD.md` v3.0.0 |

> This plan turns the analysis into an executable, milestone-gated build. It does **not** contain production code. Code begins only after `03_ARCHITECTURE_REVIEW.md` is complete and business-rule gaps (01 §4) are confirmed.

---

## 1. Repository Structure

The monorepo is built **alongside** the existing reference material. Reference artifacts (`Controller/`, `models/`, `Routes/`, `smartdeal-crm/`, `index.js`) are retained read-only during the build for business-rule mining and removed (or archived under `/_legacy_reference/`) once superseded.

```
tatacar/                              ← monorepo root
├── docs/                             ← Phase 0 + living docs
│   ├── 01_IMPLEMENTATION_ANALYSIS.md
│   ├── 02_FINAL_IMPLEMENTATION_PLAN.md
│   ├── 03_ARCHITECTURE_REVIEW.md
│   ├── IMPLEMENTATION_STATUS.md      ← created at M1, updated every milestone
│   ├── TECHNICAL_DEBT.md
│   └── OPEN_TASKS.md
├── docker-compose.yml                ← postgres:16 (5433), redis:7 (6379)
├── README.md                         ← run instructions
├── akar-dos-api/                     ← NestJS 11 + Prisma 7
│   ├── package.json
│   ├── .env.example                  ← committed; .env gitignored
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── fixtures/sheets/              ← dev sheet-sync JSON
│   │   ├── User_Master.json
│   │   ├── Inventory_Final.json
│   │   ├── Vehicle_Data.json
│   │   └── Accessory_Detail.json
│   ├── test/                         ← e2e + integration
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── prisma/                   ← PrismaModule (pg adapter)
│       ├── config/
│       ├── common/                   ← envelope, filters, guards, decorators, action-policy.ts
│       ├── auth/
│       ├── leads/
│       ├── tasks/
│       ├── notifications/            ← persist + Socket.IO gateway
│       ├── master/
│       ├── engines/
│       │   ├── quotation.engine.ts
│       │   └── inventory.engine.ts
│       ├── workflow/
│       │   └── workflow.service.ts   ← POST /actions router
│       ├── rules/                    ← shadow-mode POC
│       ├── bookings/                 ← bookings, payments, inventory, analytics
│       ├── admin/                    ← sync.service.ts
│       ├── audit/
│       ├── events/
│       └── health/
└── akar-dos-web/                     ← React 19 + Vite PWA
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── api.ts                    ← typed fetch wrapper, JWT
        ├── components/               ← state primitives (Empty/Loading/Error)
        ├── screens/                  ← Login, MyWork, Leads, NewLead, Bookings, Inventory, Analytics
        └── App.css
```

**Naming/standards** (spec §28): Nest modules `kebab-case.type.ts`; classes `PascalCase`; functions `camelCase`; env `SCREAMING_SNAKE`. **No Prisma in controllers.** **No `any`** in workflow/quotation engines. `import type` for decorated param types. TS strict mode on both apps.

---

## 2. Database Implementation Order

Single `schema.prisma`, one initial migration, then incremental migrations per milestone if needed. Order reflects FK dependencies.

1. **Enums** (all from spec §7): UserRole, UserStatus, VehicleType, LeadStage, LeadSource, LeadPriority, InventoryStatus, TaskStatus/Priority, Notification*, Sync*, QuotationStatus, BookingStatus, PurchaseMode, PaymentStatus, ApprovalStatus, NocDepartment, RuleFamily.
2. **Org/identity:** `organizations → branches → departments → users → user_sessions → permissions`.
3. **Config/platform:** `config_settings`, `domain_events`, `audit_logs`, `tasks`, `notifications`, `sheet_sync_log`, `error_queue`.
4. **Master data:** `vehicle_data` (with `data_json`), `accessory_catalog`, `inventory_units`.
5. **Sales/quotation:** `leads`, `test_drives`, `follow_ups`, `quotations`, `approval_requests`.
6. **Booking/fulfilment:** `bookings`, `allocation_waiting_list`, `payments`, `finance_cases`, `accessory_orders`, `accessory_order_items`, `pdi_inspections`, `department_nocs`, `gate_passes`, `integrity_alerts`, `bulk_upload_batches`.
7. **Rules POC:** `rule_definitions`, `rule_evaluation_log`.

**Indexes (spec §7):** `users(sales_team_id)` unique, `users(role)`, `users(email)`; `leads(phone)`, `leads(assigned_to_id)`, `leads(stage)`; `tasks(assigned_to_id,status)`, `tasks(due_at)`; `notifications(target_user_id,status)`; `inventory_units(model,variant,color,status)`; `bookings(status)`, `bookings(lead_id)`; `department_nocs(booking_id,department)` **unique**.

**Constraints & integrity:** FK with sensible `onDelete`; `CHECK` where Prisma allows / via raw migration (e.g. non-negative money); partial unique index for "one active lead per phone"; append-only enforced by convention + no update/delete service methods on `audit_logs`/`domain_events`.

**Audit/migrations/seed/scalability:** every migration committed and reversible; `seed.ts` via `tsx` produces org+branch, 11 users (bcrypt cost 12), 1 vehicle_data row, 4 FIFO inventory units, 2 accessories, `config_settings.rules_engine.mode = shadow`, 13 seed rules. Multi-branch and multi-tenant columns (`tenant_id` default) present but single-valued in V1.

---

## 3. API Implementation Order

Base URL `/api/v1`; unified envelope and error codes (spec §11). Order:

1. **Health** — `GET /health` (DB connectivity) — first, as a build smoke signal.
2. **Auth** — `login`, `refresh`, `logout`, `me`; JWT access/refresh; bcrypt; login rate limit 10/IP/15m.
3. **Master** — models, fuels (by model), salespersons (by vehicleType), vehicle-data, accessories, variants/colors (DISTINCT from inventory).
4. **Leads** — list (RBAC + pagination), get, create (full validation), bulk-upload.
5. **Tasks** — `GET /tasks/my-work` (actionRequired/overdue/dueToday/completedToday); task auto-creation helpers.
6. **Notifications** — list, action; Socket.IO gateway emits `notification.created` to `user:{id}`.
7. **Actions (router)** — `POST /actions`, rate-limited 120/user/min; all 12 actionTypes (§4 below).
8. **Bookings/Payments/Inventory** — bookings list/detail (incl. nocs, payments, accessory orders); `POST /payments` with `X-Idempotency-Key`; inventory FIFO-sorted.
9. **Analytics** — dashboard KPIs.
10. **Rules** — `GET /rules`, `GET /rules/mode`, `POST /rules/:id/test` (GM).
11. **Admin** — `POST /admin/sync/sheets` (GM, 5/user/hour), `GET /admin/sync/logs`.
12. **Integrity** — `POST /integrity/check-booking-claim` (fuzzy name ≥85%).

Every endpoint: DTO validation (`whitelist`, `forbidNonWhitelisted`, `transform`), RBAC guard, audit + domain event on mutations, transactions for multi-table writes, error codes per envelope, OpenAPI annotations.

### 3.1 Action Router contract (the 12 actions)
`TESTDRIVE_REQUEST · QUOTATION_CREATE · QUOTATION_APPROVE · BOOKING_INITIATED · BOOKING_PAYMENT_APPROVED · BOOKING_CANCELLED · ACCESSORY_SELECTION_SUBMITTED · ACCESSORY_PAYMENT_CLEARED · PDI_PASS · NOC_APPROVAL · DELIVERY_CONFIRM` (+ `SYNC_SHEETS` surfaced via admin). Each: authorize (`ACTION_ROLES` → shadow rules) → validate payload → mutate in transaction → emit event(s) → write audit → create tasks/notifications → return envelope. Behaviour exactly per spec §11.5.

---

## 4. Frontend Implementation Order

My-Work-first SPA. Order:

1. **API client** (`src/api.ts`) — typed fetch, JWT from localStorage (`akar_access_token`, `akar_user`), 401→login redirect, envelope unwrap.
2. **Login** — userId + password → store tokens → My Work.
3. **My Work** (home) — task buckets, notifications, real-time updates.
4. **New Lead** (Reception) — cascading model→fuel→salesperson dropdowns, phone validation, success shows lead number.
5. **Leads list + detail/action panel** — RBAC-aware role action buttons.
6. **Bookings list + detail + NOC board** — 6-department approval board, payment verify, VIN display.
7. **Inventory** (FIFO order) and **Analytics** (GM KPIs).
8. **Cross-cutting UI states** on every data view: Empty, Loading (skeleton >300ms), Error (inline retry), 401 redirect, 403 message. Button hierarchy + 44px targets + WCAG 2.1 AA (contrast, focus ring, aria-labels, numeric inputmode for phone).

Role action buttons exactly per spec §15 (SALES / CASHIER_MANAGER / ACCOUNTS_MANAGER / FINANCE_MANAGER / ACCESSORIES_MANAGER / PDI_MANAGER / GM).

---

## 5. Milestones

Maps the spec build order (§22) onto gated milestones. **One milestone at a time**; each runs the full gate (§9) before the next starts.

| M | Name | Deliverable | Spec refs |
|---|------|-------------|-----------|
| **M1** | Foundation | docker-compose, full Prisma schema, migrate, seed, PrismaModule, ConfigModule, health | §6,§7,§8 |
| **M2** | Auth & RBAC | auth endpoints, JWT lifecycle, guards, roles decorator, login throttle | §11.1,§32 |
| **M3** | Platform services | Tasks/My-Work, Notifications+Socket.IO, Audit, Events | §11.2,§16,§17,§18 |
| **M4** | Leads & Master | Leads CRUD+validation+RLS, master dropdowns, bulk-upload | §11.3,§11.4,§24 |
| **M5** | Engines | quotation.engine + inventory FIFO engine + unit tests | §12,§13 |
| **M6** | Action Router | all 12 actions in WorkflowService, transactions, events/audit | §11.5 |
| **M7** | Rules POC | tables, 13 seed rules, shadow integration, tests | §14A |
| **M8** | Bookings/Payments/Analytics | read APIs, payment + idempotency, analytics KPIs | §11.6,§11.7 |
| **M9** | Frontend | all screens + UI states + role buttons | §15 |
| **M10** | Sheets Sync | googleapis + fixtures, logs, error_queue | §14 |
| **M11** | Integration & Polish | bulk upload, integrity, E2E smoke, README, job/PDF stubs | §11.11,§23,§19,§20 |

Dependencies: M1→M2→M3→M4; M5 parallel-safe after M1; M6 needs M4+M5; M7 needs M6; M8 needs M6; M9 needs M2–M8 APIs; M10/M11 after M8.

---

## 6. Testing Strategy

| Level | Coverage (spec §28) | Gate |
|-------|---------------------|------|
| **Lint + types** | ESLint + `tsc` strict, both apps | Zero errors |
| **Unit** | Quotation engine **≥10 scenarios** (TCS boundary at ₹10L, corp-offer exclusion, add-disc cap, zero/empty inputs, grand-total composition); FIFO **≥** oldest-first + tie-break + no-stock; rules engine **≥5** | All pass |
| **Integration** | RBAC deny (SALES cannot see another's leads); duplicate-active-lead reject; invalid phone reject; NOC gate (gate pass only after all 6); idempotent payment replay | All pass |
| **E2E** | Spec §23 full journey: login→lead→TD→quotation→booking→payment→`SEEDVIN…0001`→accessories→PDI→6 NOC→delivery; final `GET /bookings` = DELIVERED | Pass |
| **API contract** | Envelope `{success,data,meta}`, error codes, pagination | Spot-checked per endpoint |
| **Security review** | Per-milestone checklist (§9) | No criticals |

CI runs lint+types+unit+integration on every push; E2E on milestone completion. Fixture-mode keeps tests hermetic (no live Google creds).

---

## 7. Deployment Strategy

- **Local/dev:** `docker compose up` (Postgres 5433, Redis 6379) → `prisma migrate dev` → `db:seed` → `start:dev` (API 3000) → web `vite` (5173).
- **Replit:** PostgreSQL resource → `DATABASE_URL`; `migrate deploy && db:seed && start:prod`; secrets `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`; web built static served from Nest or separate service; "Always On" for API.
- **Config:** all via env (spec §5); no secrets committed; `.env.example` only.
- **Build:** `nest build` (API), `tsc -b && vite build` (web). Health endpoint as readiness probe.
- **Production hardening (post-V1, §35):** PDF engine, BullMQ cron, PWA push, monitoring (Sentry/JSON logs), rules-primary cutover, security gate — tracked, not in V1.

---

## 8. Migration & Rollback Strategy

**Schema migrations**
- All changes via Prisma migrations, committed, never hand-edited after apply.
- Forward-only in shared environments; destructive changes use expand→migrate→contract (add nullable → backfill → enforce → drop) to stay reversible.
- Rollback: revert to previous migration + restore from backup (RPO 15m / RTO 4h is a V2/prod-ops target, ADR-012).

**Data migration from references**
- No automated data migration from Mongo prototype; **master data enters via Google Sheets import (or JSON fixtures)** which is the supported, idempotent path. Sheet wins on import conflicts; DB wins on export.
- Idempotent upserts by natural key (`sales_team_id`, `vin`, `accessory_id`, variant+year) so re-running import is safe.

**Application rollback**
- Each milestone is an independently revertible commit; `git revert` restores prior working state.
- Feature flags via `config_settings` (e.g. `rules_engine.mode`) allow disabling new behaviour without redeploy.

**Reference-code retirement**
- Legacy Express/Mongo prototype and `smartdeal-crm/` are **not** deleted until the corresponding capability is built, tested, and documented; then archived under `/_legacy_reference/` in a dedicated commit (no behaviour impact).

---

## 9. Definition of Done (per milestone)

A milestone is **Done** only when all hold:

- [ ] Feature matches spec business behaviour (no invented rules; gaps confirmed).
- [ ] `npm run lint` and `tsc` (strict) pass — zero errors, no `any` in engines/workflow.
- [ ] Unit + integration tests for the milestone pass; coverage targets met.
- [ ] All endpoints: DTO validation, RBAC guard, audit + domain event on mutations, envelope-compliant responses, transactions for multi-table writes.
- [ ] Migration committed (if schema changed) and re-runnable seed verified.
- [ ] Frontend views (if any) have Empty/Loading/Error/401/403 states and a11y basics.
- [ ] Living docs updated: `IMPLEMENTATION_STATUS.md`, `TECHNICAL_DEBT.md`, `OPEN_TASKS.md`, plus README/API/DB as affected — nothing left stale.
- [ ] PR checklist (spec §28) satisfied; no secrets in code.
- [ ] Committed with a clear message; pushed to the feature branch.

---

## 10. Acceptance Criteria (V1 release — spec §30/§23)

- [ ] `npm run build` succeeds in `akar-dos-api` and `akar-dos-web`.
- [ ] Seed creates 11 users + 4 inventory units; every seed user logs in.
- [ ] My Work shows tasks after lead creation (≤5s notification).
- [ ] Lead create rejects invalid phone and duplicate active lead.
- [ ] Action router handles all 12 action types.
- [ ] FIFO allocates `SEEDVIN000000000001` before `…0002`.
- [ ] All 6 NOC departments must approve before gate pass.
- [ ] GM Sheets sync works in fixture mode.
- [ ] Rules engine: 13 seed rules, shadow mode, `GET /api/v1/rules` returns data; rules unit tests pass.
- [ ] Responses use `{success,data,meta}`; all list screens have empty/loading/error states.
- [ ] Login rate limit (10/15m/IP); Socket.IO emits on lead create; audit row on lead create.
- [ ] Full E2E journey (§23) passes end-to-end to DELIVERED.
- [ ] README with start instructions present.

---

## 11. Plan Exit Criteria

- [x] Repository, DB, API, frontend, and test orders defined.
- [x] Milestones, dependencies, and per-milestone DoD defined.
- [x] Deployment, migration, and rollback strategies defined.
- [x] V1 acceptance criteria restated and traceable to the spec.
- [ ] `03_ARCHITECTURE_REVIEW.md` complete and business-rule gaps confirmed → **then** M1 begins.
