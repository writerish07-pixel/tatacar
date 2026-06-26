# 12 — Go-Live Checklist

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-12 |
| **Owner** | PMO (custodian) · GM/Owner (final approver) |
| **Status** | Template — executed at V1 launch |
| **Version** | 1.0.0 |
| **Related** | `04` (business freeze); `08` (release); `09` (test); `10` (monitoring); `11` (DR); Spec §30/§35 |

> **Purpose.** The single authoritative gate for putting AKAR DOS into production. Every item must be checked and signed before go-live. Unchecked **mandatory (M)** items block launch; **recommended (R)** items are risk-accepted in writing if deferred.

### Version History
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-06-26 | PMO | Initial checklist. |

---

## 1. Business Readiness
- [ ] (M) Business behaviour **frozen** and signed (Doc 04 §18).
- [ ] (M) All `CONFIRM-n` open questions resolved (Doc 04 §15).
- [ ] (M) Approval matrix & discount caps confirmed by dealer (Doc 04 §3/§4).
- [ ] (M) UAT signed off by dealership staff (Doc 09 §2.9).
- [ ] (R) Day-1 operational runbook for staff prepared.

## 2. Technical Readiness
- [ ] (M) All V1 milestones complete; acceptance criteria met (Doc 02 §10 / Spec §30).
- [ ] (M) `npm run build` green for api + web.
- [ ] (M) Full test suite green incl. E2E §23 to `DELIVERED` (Doc 09 §6).
- [ ] (M) FIFO allocates `SEEDVIN000000000001` before `…0002`.
- [ ] (M) 6-department NOC gate enforced before gate pass.
- [ ] (M) Action router handles all 12 action types.
- [ ] (R) Performance within Warning or better (Doc 06).

## 3. Infrastructure
- [ ] (M) Production Postgres 16 provisioned; `DATABASE_URL` set.
- [ ] (M) Redis provisioned; reachable.
- [ ] (M) App deployed from a tagged release build (Doc 08 §3).
- [ ] (M) `prisma migrate deploy` applied; schema/version verified.
- [ ] (M) Reference master data loaded via sanctioned sheet/fixture import.
- [ ] (R) "Always On"/auto-restart configured.

## 4. Security
- [ ] (M) JWT secrets ≥64 chars set via environment; **no secrets in git**.
- [ ] (M) bcrypt cost 12; JWT 15m/7d lifecycle active.
- [ ] (M) RBAC enforced on every endpoint; default-deny verified.
- [ ] (M) Rate limits active (login 10/15m; actions 120/min; sync 5/h).
- [ ] (M) CORS locked to known origins (not `*`).
- [ ] (R) TLS/HTTPS termination in place.
- [ ] (R) Security scan (OWASP ZAP baseline, secrets scan, `npm audit`) clean — PH-08.

## 5. Database
- [ ] (M) Backups scheduled (daily + WAL/PITR ≤15 min) — Doc 11 §2.
- [ ] (M) Restore drill passed within RTO ≤4 h — Doc 11 §8.
- [ ] (M) Indexes per Spec §7 present; key constraints (active-lead unique, NOC unique) verified.
- [ ] (R) Slow-query logging enabled (>200 ms).

## 6. Testing
- [ ] (M) 0 open S1/S2 bugs (Doc 09 §5).
- [ ] (M) Regression suite green; smoke test passes on staging.
- [ ] (R) Accessibility checks pass (WCAG 2.1 AA) on core screens.

## 7. Training
- [ ] (M) Reception, Sales, Cashier/Accounts, Accessories, PDI, Managers, GM trained on their My-Work flows.
- [ ] (R) Quick-reference guides distributed.
- [ ] (R) Support contact/escalation path communicated.

## 8. Documentation
- [ ] (M) README run instructions current.
- [ ] (M) Living docs current: `IMPLEMENTATION_STATUS.md`, `TECHNICAL_DEBT.md`, `OPEN_TASKS.md`.
- [ ] (M) API + DB docs reflect shipped V1.
- [ ] (R) Release notes / `CHANGELOG.md` for `1.0.0` published.

## 9. Rollback Ready
- [ ] (M) Previous known-good build identified and deployable (Doc 08 §7).
- [ ] (M) Pre-deploy backup taken.
- [ ] (M) Feature flags (`config_settings`, e.g. `rules_engine.mode=shadow`) confirmed safe defaults.
- [ ] (M) Emergency rollback steps rehearsed (Doc 11 §5.5).

## 10. Monitoring Ready
- [ ] (M) `/health` probe wired to uptime monitor.
- [ ] (M) Alerts active for service-down, error-spike, DB saturation, backup failure (Doc 10 §6).
- [ ] (M) `error_queue` → GM notification verified.
- [ ] (R) Dashboards (system health, business ops) available (PH-06).

## 11. Support Ready
- [ ] (M) On-call/incident lead assigned for launch window.
- [ ] (M) Incident response process understood (Doc 11 §7).
- [ ] (R) Maintenance window/comms plan published (Doc 08 §8/§10).

## 12. Production Approval & Final Sign-off

| Gate | Owner | Status | Signature | Date |
|------|-------|--------|-----------|------|
| Business readiness | GM/Owner | ☐ | | |
| Technical readiness | Architect | ☐ | | |
| Security | Security Eng | ☐ | | |
| Database & DR | DevOps | ☐ | | |
| Testing & QA | QA Lead | ☐ | | |
| Monitoring & Support | DevOps | ☐ | | |
| **Final Go-Live** | **PMO + GM/Owner** | ☐ | | |

> **Go-Live Decision:** Production launch proceeds **only** when all mandatory (M) items are checked and the Final Go-Live row is signed by PMO and GM/Owner. Any deferred (R) item must have a written risk acceptance referenced here.

**Go / No-Go:** ☐ GO ☐ NO-GO · Decided by: __________ · Date: __________
