# 07 — AI Development Guidelines

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-07 |
| **Owner** | Principal AI Engineer + CTO (custodians) · PMO (governance) |
| **Status** | Approved — mandatory for every coding session |
| **Version** | 1.0.0 |
| **Related** | `04_BUSINESS_RULE_CONFIRMATION.md`; `05_IMPLEMENTATION_DECISION_LOG.md`; `09_TEST_STRATEGY.md`; Spec §28 |

> **Purpose.** Define how AI engineers (and humans) must work on AKAR DOS so the system stays consistent, auditable, and safe across years and teams. **Every coding session must follow this document.** Where this conflicts with a quick shortcut, this document wins.

### Version History
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-06-26 | AI Eng | Initial guidelines. |

---

## 1. General Rules
1. Build to the **frozen business behaviour** (Doc 04). Never invent business rules.
2. Reference, do not duplicate, existing documents.
3. One milestone at a time: implement → review → fix → test → document → commit (Spec implementation rule).
4. Optimize for maintainability/readability over cleverness; code lives 10–15 years.
5. When uncertain about **business** intent → **stop and ask** (§16). When uncertain about **engineering** detail → choose a sensible default, document it (Doc 05), proceed.

## 2. Coding Rules
1. TypeScript **strict** mode; **no `any`** in workflow or quotation/inventory engines.
2. Match surrounding code style, naming, and comment density.
3. Pure functions for engines (quotation, FIFO) — no side effects.
4. No dead code, no commented-out blocks, no TODO without an `OPEN_TASKS.md` entry.
5. Small, cohesive functions; explicit return types on exported functions.

## 3. Architecture Rules
1. Modular monolith; respect Platform vs Domain context boundaries (Doc 01 §3).
2. Cross-context changes flow through **WorkflowService + domain events** — never direct cross-context FK writes.
3. Lead `stage` and booking `status` are mutated **only** by `WorkflowService`.
4. No new runtime dependency on n8n, WhatsApp-for-staff, or Google Sheets as a data store.

## 4. Database Rules
1. All schema changes via Prisma migrations — committed, reversible, never hand-edited post-apply.
2. DB columns `snake_case` (`@map`), Prisma fields `camelCase`, enums `UPPER_SNAKE`.
3. Index every foreign key and every documented query path (Spec §7 indexes).
4. Multi-table writes use `prisma.$transaction`.
5. `audit_logs` and `domain_events` are **append-only** — no update/delete service methods.
6. Money as `Decimal`, never float.

## 5. API Rules
1. Every endpoint: DTO validation, RBAC guard, audit + domain event on mutation, unified envelope (Spec §11).
2. No Prisma in controllers; service layer only.
3. Commands via `POST /actions`; REST nouns for reads.
4. Idempotency key on payments/bookings.
5. Never expose `passwordHash` or internal models; use response DTOs.
6. Correct HTTP + error codes per Spec §11 table.

## 6. Frontend Rules
1. My Work is home; task-driven, not menu-driven.
2. Every data view implements Empty/Loading/Error/401/403 states.
3. 44px tap targets; WCAG 2.1 AA (contrast, focus ring, aria-labels, numeric inputmode for phone).
4. Button hierarchy per Spec §15; destructive actions require confirm modal.
5. No secrets/business logic in the client; tokens in localStorage keys `akar_access_token`/`akar_user`.

## 7. Testing Rules
1. No feature is "done" without tests (Doc 09).
2. Quotation engine ≥10 unit scenarios; FIFO determinism tests; rules ≥5; RBAC deny integration test; E2E §23.
3. Tests run in CI on every push; fixture-mode keeps them hermetic.
4. Never delete/skip a failing test to go green — fix the cause or file a bug (Doc 09 severity matrix).

## 8. Documentation Rules
1. Update living docs every milestone: `IMPLEMENTATION_STATUS.md`, `TECHNICAL_DEBT.md`, `OPEN_TASKS.md`, plus README/API/DB as affected.
2. No document may go stale; if behaviour changes, the doc changes in the same PR.
3. New engineering decisions → append to Doc 05.

## 9. Security Rules
1. Never bypass RBAC; default-deny.
2. Never weaken JWT lifecycle (15m/7d) or bcrypt cost (12).
3. No secrets in code or git; `.env` gitignored; `.env.example` only.
4. Validate and sanitize all input; never trust `req.body`.
5. Never log secrets, tokens, or full PII; redact.

## 10. Performance Rules
1. Respect SLOs in Doc 06; don't ship code that breaches a Critical threshold.
2. Avoid N+1 queries; batch/`include` deliberately.
3. Paginate all list endpoints (max pageSize 100).

## 11–14. Git / Commit / Branch / Refactoring Rules
- **Branch:** develop on the assigned feature branch; never push to `main` without explicit permission; branch per milestone where practical.
- **Commit:** small, focused, descriptive; one logical change per commit; never commit secrets, `node_modules`, or build artifacts.
- **Git hygiene:** rebase/merge cleanly; no force-push to shared branches.
- **Refactoring:** allowed to improve engineering **only if business behaviour is unchanged and tests still pass**; refactors are separate commits from behaviour changes.

## 15. Review Rules
1. Every change passes the PR checklist (Spec §28 / Doc 09).
2. Reviewer verifies: DTO validation, RBAC, audit+event, envelope, migration, tests, docs.
3. Business-affecting changes require Doc 04 reference and, if rules change, dealer sign-off.

## 16. Prompt & Stop Conditions

### When AI **must ask** (stop-and-ask)
- Any business rule is ambiguous, missing, or conflicts (Doc 04 §15 CONFIRM items).
- A change would alter quotation math, approval matrix, NOC/FIFO/payment behaviour.
- A decision has irreversible or financial impact and intent is unclear.
- Scope appears to drift into V2 (CQRS, multi-tenant RLS, workflow designer, OEM plugins).

### When AI **may decide** (and document)
- Naming, file structure, indexing, internal abstractions.
- Engineering defaults explicitly listed in Doc 01 §4.
- Test design, refactors that preserve behaviour.

## 17. Forbidden Actions (hard stops)
1. **Never invent business rules.**
2. **Never remove or bypass audit/domain events.**
3. **Never bypass or weaken RBAC.**
4. **Never skip tests** or delete tests to pass CI.
5. **Never ignore documentation** updates.
6. Never commit secrets; never use Mongo/SQLite; never send staff notifications via WhatsApp/Telegram; never run business logic in Google Sheets; never depend on n8n at runtime.
7. Never set rules engine to `primary` in V1.
8. Never expose `passwordHash` or internal models.

## 18. Session Protocol (every coding session)
1. Read the current milestone scope (Doc 02) and Doc 04 freeze state.
2. Confirm no blocking `CONFIRM-n` business gaps for the work at hand.
3. Implement within one milestone; keep changes cohesive.
4. Run lint + types + tests locally.
5. Update living docs.
6. Commit with a clear message; push to the feature branch.
7. If blocked by a business gap → stop, document the question, request clarification.
