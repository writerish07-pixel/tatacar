# 05 — Implementation Decision Log (ADR-style)

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-05 |
| **Owner** | Principal Software Architect (custodian) · PMO (governance) |
| **Status** | Living document — append-only |
| **Version** | 1.0.0 |
| **Related** | Master Build Spec §2 (ADRs); `01`–`03`; `06`–`12` |

> **Purpose.** Record every material engineering decision with rationale and consequences so future teams understand *why*, not just *what*. **Append-only:** decisions are superseded, never deleted. Each entry uses the schema below. IDs are `DEC-NNN`. This complements (does not replace) the spec's ADR index (ADR-001…ADR-012).

**Entry schema:** Decision ID · Date · Category · Problem · Alternatives · Chosen Solution · Reason · Consequences · Future Review Needed · Version · Status.

**Status values:** `Accepted` · `Superseded by DEC-x` · `Proposed` · `Deprecated`.
**Categories:** Architecture · Backend · Database · Frontend · Security · DevOps · Process · Integration · AI.

### Version History
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-06-26 | Architect | Seeded with foundational decisions DEC-001…DEC-020. |

---

## DEC-001 — Backend framework: NestJS 11
- **Date:** 2026-06-26 · **Category:** Architecture/Backend · **Version:** 1 · **Status:** Accepted (ADR aligned)
- **Problem:** Need a maintainable, testable backend for a long-lived (10–15y) system with clear module boundaries.
- **Alternatives:** Express (prototype), Fastify, microservices (SmartDeal design), Spring Boot.
- **Chosen:** NestJS 11 modular monolith.
- **Reason:** First-class DI, module encapsulation, guards/interceptors for cross-cutting concerns (RBAC, audit), strong TypeScript story, large ecosystem — right altitude for one team without microservice ops overhead.
- **Consequences:** Team must know Nest patterns; opinionated structure; easy migration path to CQRS modules later (V2).
- **Future Review:** Revisit if multi-team/multi-tenant scale forces service extraction (V2).

## DEC-002 — Database: PostgreSQL 16
- **Date:** 2026-06-26 · **Category:** Database · **Version:** 1 · **Status:** Accepted
- **Problem:** Need ACID transactions (payment, allocation, NOC gate), relational integrity, JSON flexibility.
- **Alternatives:** MongoDB (prototype), MySQL, SQLite.
- **Chosen:** PostgreSQL 16 (port 5433 locally to avoid 5432 conflicts).
- **Reason:** Transactions for money/allocation, FK constraints, partial unique indexes (one active lead/phone), JSON columns for `data_json`/rules.
- **Consequences:** Requires migrations discipline; no Mongo flexibility (acceptable).
- **Future Review:** Partitioning/read-replicas at scale (V2).

## DEC-003 — Architecture: Modular Monolith (not microservices)
- **Date:** 2026-06-26 · **Category:** Architecture · **Version:** 1 · **Status:** Accepted (ADR-004 CQRS=V2)
- **Problem:** SmartDeal reference proposed 12 microservices for a single-branch dealer.
- **Alternatives:** Microservices now; serverless.
- **Chosen:** Single NestJS app with internal Platform + Domain modules.
- **Reason:** Operational simplicity, single transaction boundary, faster delivery; premature distribution adds failure modes without benefit at this scale.
- **Consequences:** Must keep module boundaries clean to enable future extraction.
- **Future Review:** V2 if load/tenancy demands.

## DEC-004 — ORM: Prisma 7 with pg driver adapter
- **Date:** 2026-06-26 · **Category:** Database/Backend · **Version:** 1 · **Status:** Accepted
- **Problem:** Type-safe data access with migrations.
- **Alternatives:** TypeORM, Drizzle, raw pg.
- **Chosen:** Prisma 7 + `@prisma/adapter-pg` + `pg` Pool.
- **Reason:** Strong typing, migration tooling, declarative schema; adapter mandatory in P7.
- **Consequences:** Adapter config risk (mitigated by early smoke test, R-3); some complex queries need raw SQL.
- **Future Review:** Evaluate query performance hotspots.

## DEC-005 — Google Sheets redesigned as import/export mirror only
- **Date:** 2026-06-26 · **Category:** Integration · **Version:** 1 · **Status:** Accepted
- **Problem:** Legacy used Sheets as a live data store and ran logic in them.
- **Alternatives:** Keep Sheets authoritative; drop Sheets entirely.
- **Chosen:** PostgreSQL is sole source of truth; Sheets are idempotent import (sheet wins) / export (DB wins) mirrors; new normalized sheet structure with validation and version history.
- **Reason:** Business users need spreadsheet master maintenance/bulk ops; live logic in Sheets is unauditable/unreliable.
- **Consequences:** Sync engine must be idempotent/retryable/versioned; dev uses JSON fixtures.
- **Future Review:** Replace with admin UI for master data (V2).

## DEC-006 — Central WorkflowService + POST /actions router
- **Date:** 2026-06-26 · **Category:** Architecture · **Version:** 1 · **Status:** Accepted (ADR-001/006)
- **Problem:** Replace legacy n8n `/akar/action` webhook; avoid scattered command logic.
- **Alternatives:** Per-resource command endpoints; rebuild n8n.
- **Chosen:** Single `POST /api/v1/actions` dispatched by `WorkflowService.executeAction()`.
- **Reason:** One choke point for authorization, audit, events, task/notification creation; lead `stage` mutated only here.
- **Consequences:** WorkflowService must stay cohesive; risk of god-service mitigated by delegating to engines/services.
- **Future Review:** Split into command handlers under CQRS (V2).

## DEC-007 — Task-driven UI (My Work home)
- **Date:** 2026-06-26 · **Category:** Frontend · **Version:** 1 · **Status:** Accepted
- **Problem:** Avoid a module-menu CRM that forces staff to hunt for work.
- **Alternatives:** Traditional module navigation.
- **Chosen:** Every user lands on **My Work**; system tells them what to do next.
- **Reason:** Core product differentiator; reduces missed SLAs.
- **Consequences:** Task generation must be reliable on every state change.
- **Future Review:** Personalized prioritization (V2 AI).

## DEC-008 — Rules Engine in Shadow Mode (V1)
- **Date:** 2026-06-26 · **Category:** Backend/AI · **Version:** 1 · **Status:** Accepted (ADR-005)
- **Problem:** Need configurable policy without risking behaviour in V1.
- **Alternatives:** Hardcode all rules; ship rules as primary immediately.
- **Chosen:** `rule_definitions`/`rule_evaluation_log`; mode `shadow` (legacy decides, rules logged, mismatch warns); 13 seed rules.
- **Reason:** Safe externalization; builds confidence before `primary` cutover (PH-07).
- **Consequences:** Dual evaluation cost; mismatch monitoring required.
- **Future Review:** Promote to `primary` when 0 mismatches (PH-07).

## DEC-009 — Real-time via Socket.IO
- **Date:** 2026-06-26 · **Category:** Backend · **Version:** 1 · **Status:** Accepted
- **Problem:** Staff need sub-5s task/notification delivery.
- **Alternatives:** Polling, SSE, raw WebSocket.
- **Chosen:** Socket.IO via `@nestjs/platform-socket.io`; user rooms `user:{id}`.
- **Reason:** Reconnection, rooms, broad client support; persisted notifications back it.
- **Consequences:** Need sticky sessions/Redis adapter at scale (V2).
- **Future Review:** Redis Socket.IO adapter for horizontal scale.

## DEC-010 — No n8n at runtime
- **Date:** 2026-06-26 · **Category:** Architecture · **Version:** 1 · **Status:** Accepted (ADR-001)
- **Problem:** Legacy depended on n8n workflows.
- **Chosen:** Business logic lives in NestJS engines; no runtime n8n dependency.
- **Reason:** Auditability, testability, single deployable.
- **Consequences:** Must re-encode any needed legacy flow in `WorkflowService`.
- **Future Review:** None.

## DEC-011 — No WhatsApp/Telegram for staff
- **Date:** 2026-06-26 · **Category:** Integration · **Version:** 1 · **Status:** Accepted (ADR-002)
- **Problem:** Prototype/SmartDeal used WhatsApp.
- **Chosen:** Staff notifications in-app only; customer WhatsApp deferred to V2.
- **Reason:** Reliability, auditability, cost, focus.
- **Consequences:** Remove WhatsApp from staff paths.
- **Future Review:** Customer Integration Engine (V2).

## DEC-012 — JWT access/refresh lifecycle
- **Date:** 2026-06-26 · **Category:** Security · **Version:** 1 · **Status:** Accepted
- **Problem:** Prototype used opaque DB tokens misnamed as JWT, 24h access, bcrypt 10.
- **Chosen:** JWT access 15m + refresh 7d (hash stored in `user_sessions`), bcrypt cost 12.
- **Reason:** Short blast radius, standard, spec-mandated.
- **Consequences:** Refresh rotation + session table required.
- **Future Review:** Token revocation lists, key rotation (90d).

## DEC-013 — Unified response envelope + global exception filter
- **Date:** 2026-06-26 · **Category:** Backend · **Version:** 1 · **Status:** Accepted
- **Problem:** Prototype had inconsistent response shapes.
- **Chosen:** `{ success, data, meta }` / `{ success, error, meta }` with fixed error codes (Spec §11).
- **Reason:** Predictable client handling, consistent errors.
- **Consequences:** All endpoints conform; interceptor + filter implement it.
- **Future Review:** None.

## DEC-014 — FIFO VIN allocation as a pure engine
- **Date:** 2026-06-26 · **Category:** Backend · **Version:** 1 · **Status:** Accepted
- **Problem:** Deterministic, testable oldest-stock-first allocation.
- **Chosen:** Pure `inventory.engine.ts` (sort by `stock_entry_date`), invoked in a DB transaction with row locking.
- **Reason:** Trivial to unit-test; deterministic; reused by waitlist retry.
- **Consequences:** Allocation must hold a transaction to avoid double-allocation (R-9).
- **Future Review:** Reservation/locking strategy under high concurrency.

## DEC-015 — Quotation engine ported verbatim from Spec §12
- **Date:** 2026-06-26 · **Category:** Backend · **Version:** 1 · **Status:** Accepted
- **Problem:** Pricing must remain numerically identical to business intent.
- **Chosen:** Implement Spec §12 formulas exactly as a pure function; ≥10 unit tests incl. TCS boundary and corp-offer exclusion.
- **Reason:** Highest behaviour-risk component (R-1).
- **Consequences:** Changes require business change request (see Doc 04).
- **Future Review:** Only via business change.

## DEC-016 — Idempotency keys on money paths
- **Date:** 2026-06-26 · **Category:** Backend/Security · **Version:** 1 · **Status:** Accepted
- **Problem:** Prevent double payment/allocation on retries.
- **Chosen:** `X-Idempotency-Key` on payments/bookings; persist key→result (24h TTL).
- **Reason:** Network retries must be safe.
- **Consequences:** Idempotency store + middleware.
- **Future Review:** TTL tuning.

## DEC-017 — Audit + domain events on every mutation
- **Date:** 2026-06-26 · **Category:** Architecture · **Version:** 1 · **Status:** Accepted (ADR-003)
- **Problem:** Prototype had no audit/events.
- **Chosen:** `audit_logs` (append-only, 7y) + `domain_events` on all material writes; cross-context coordination via events.
- **Reason:** Traceability, compliance, future event-sourcing path.
- **Consequences:** Slight write overhead; retention/index policy needed.
- **Future Review:** Event stream versioning (V2).

## DEC-018 — Rate limiting via @nestjs/throttler
- **Date:** 2026-06-26 · **Category:** Security · **Version:** 1 · **Status:** Accepted
- **Problem:** Brute-force/abuse protection.
- **Chosen:** Login 10/IP/15m; `/actions` 120/user/min; `/admin/sync/sheets` 5/user/hour.
- **Reason:** Spec §32 limits.
- **Consequences:** Distributed limiter (Redis) at scale.
- **Future Review:** Redis-backed throttler (V2).

## DEC-019 — Frontend: React 19 + Vite PWA (no Next.js/React Native)
- **Date:** 2026-06-26 · **Category:** Frontend · **Version:** 1 · **Status:** Accepted
- **Problem:** SmartDeal proposed Next.js + React Native.
- **Chosen:** React 19 + Vite SPA, PWA-capable, mobile-first.
- **Reason:** Simpler build, single codebase, offline-ready later; matches spec.
- **Consequences:** SSR not available (acceptable for internal tool).
- **Future Review:** PWA push + service worker (PH-03).

## DEC-020 — BullMQ jobs designed now, stubbed if time-constrained
- **Date:** 2026-06-26 · **Category:** DevOps · **Version:** 1 · **Status:** Accepted
- **Problem:** Scheduled work (sheet sync, VIN retry, SLA, follow-up) needed but not V1-blocking.
- **Chosen:** Define job interfaces; implement or stub in V1; full cron at PH-02.
- **Reason:** Keep V1 deliverable while preserving design.
- **Consequences:** Some jobs are stubs initially; documented as technical debt.
- **Future Review:** PH-02 production hardening.

---

## How to add a decision
1. Append a new `DEC-NNN` block using the schema; never edit a decided entry's substance.
2. To change a prior decision, add a new entry and set the old one to `Superseded by DEC-NNN`.
3. Reference related ADRs/docs; update `IMPLEMENTATION_STATUS.md` if scope changes.
