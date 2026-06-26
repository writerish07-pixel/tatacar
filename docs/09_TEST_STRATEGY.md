# 09 — Test Strategy

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-09 |
| **Owner** | Principal QA Engineer (custodian) · PMO (governance) |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Related** | `02_FINAL_IMPLEMENTATION_PLAN.md` §6; `06_PERFORMANCE_TARGETS.md`; `07_AI_DEVELOPMENT_GUIDELINES.md`; Spec §23/§28 |

> **Purpose.** Define how AKAR DOS is tested at every level, the coverage goals, automation approach, bug severity handling, and the exit criteria that gate each milestone and release.

### Version History
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-06-26 | QA | Initial strategy. |

---

## 1. Test Pyramid & Scope

```
        E2E (few, high-value journeys)        ← Spec §23 full delivery flow
     Integration / API (RBAC, transactions)
   Unit (engines, services, validators) — most
```

Bias toward fast unit tests; reserve E2E for the canonical journey and critical regressions.

## 2. Test Levels

### 2.1 Unit Testing (Jest)
- **Quotation engine:** ≥10 scenarios — base case, TCS boundary exactly at/above/below ₹10,00,000, corporate-offer exclusion, additional-discount cap, multiple discounts, insurance sum, accessories/VAS/FastTag/TRC/COD composition, zero/empty inputs, `needsApproval` true/false.
- **FIFO engine:** oldest-first selection, tie-break determinism, no-stock → null, case-insensitive match.
- **Rules engine:** ≥5 — condition match/no-match, shadow mismatch logging, priority ordering, disabled rule skipped, mode `off/shadow`.
- **Validators/DTOs:** phone 10-digit, duplicate-active-lead, model/fuel existence, salesperson active+SALES.

### 2.2 Integration Testing
- RBAC deny: SALES cannot read another consultant's leads; EV/PV manager vehicleType filter; department scoping.
- Transactions: payment dual-verify → single VIN allocation (no double allocation under concurrent calls).
- NOC gate: gate pass only after all 6 approvals; unique `(booking_id, department)`.
- Idempotency: replayed payment with same key returns cached result, no second allocation.
- Audit/events: every mutation writes `audit_logs` + `domain_events`.

### 2.3 API Testing
- Envelope conformance `{success,data,meta}` / error `{success,error,meta}`.
- Error codes/HTTP mapping per Spec §11 (400/401/403/404/409/429/500).
- Pagination (`page`,`pageSize≤100`), sorting params.
- Auth flows: login, refresh rotation, logout invalidates session, `me`.

### 2.4 UI Testing
- Component/state tests: Empty/Loading/Error/401/403 on every data view.
- Cascading New Lead dropdowns (model→fuel→salesperson); phone validation.
- Role-based action buttons render per role (Spec §15).
- Booking detail NOC board reflects 6-department state.

### 2.5 Regression Testing
- Automated suite re-run on every push; the §23 E2E journey is the master regression.
- Any production bug adds a regression test before the fix is accepted.

### 2.6 Performance Testing
- Load test (k6/autocannon) against SLOs in Doc 06 §1–§4 before any go-live.
- Engine micro-benchmarks (quotation ≤100 ms; allocation ≤300 ms).

### 2.7 Security Testing
- Static: secret scan, dependency audit (`npm audit`), lint security rules.
- Dynamic (pre-prod, PH-08): OWASP ZAP baseline; horizontal privilege tests; JWT tampering/expiry; rate-limit verification.
- Negative tests: unauthorized actions → 403; invalid/expired token → 401.

### 2.8 Accessibility Testing
- Automated axe/Lighthouse a11y checks on each screen; target WCAG 2.1 AA.
- Manual: keyboard navigation, focus order, screen-reader labels on icon buttons, 4.5:1 contrast.

### 2.9 User Acceptance Testing (UAT)
- Dealer staff validate the frozen journey (Doc 04 §2) on staging with representative data.
- Sign-off recorded against Doc 12 go-live checklist.

### 2.10 Smoke Testing
- Post-deploy smoke = Spec §23 happy path abridged: login → create lead → My Work shows task → `/health` green. Must pass before declaring a deploy successful.

## 3. Test Coverage Goals

| Area | Line/branch target | Notes |
|------|--------------------|-------|
| Quotation + FIFO engines | **100% lines, ≥95% branch** | Highest business risk |
| Rules engine | ≥90% | Shadow-mode safety |
| Services (workflow, leads, bookings, payments) | ≥85% | Core logic |
| Controllers/DTOs | ≥80% | Validation paths |
| Overall backend | **≥80%** | CI gate |
| Frontend critical screens | ≥70% | My Work, New Lead, Booking detail |

Coverage is a floor, not a target to game; meaningful assertions over line-count chasing.

## 4. Automation Strategy
- **CI on every push:** lint → type-check → unit → integration. Fails block merge.
- **On milestone completion / release candidate:** add E2E + performance + a11y + security scans.
- **Hermetic:** Google Sheets in fixture mode; deterministic seed; fixed clock where time matters (FIFO dates, SLA).
- **Frameworks:** Jest (unit/integration), Supertest (API), Playwright (E2E/UI), k6 (load), axe (a11y).
- Flaky tests are quarantined and fixed within one milestone — never ignored long-term.

## 5. Bug Severity Matrix

| Severity | Definition | Examples | Response | Blocks release? |
|----------|-----------|----------|----------|-----------------|
| **S1 Critical** | Data loss, security breach, wrong money, journey broken | Wrong quotation total; VIN double-allocated; RBAC bypass; delivery without NOC | Immediate; hotfix | **Yes** |
| **S2 High** | Major feature broken, no safe workaround | Booking can't be created; payment verify fails | Same release / fast-follow | **Yes** |
| **S3 Medium** | Feature impaired, workaround exists | List filter wrong; non-blocking validation gap | Next milestone | No |
| **S4 Low** | Cosmetic/minor | UI alignment, copy | Backlog | No |

All S1/S2 require a regression test before closure.

## 6. Exit Criteria

### Per-milestone exit
- [ ] All milestone unit + integration tests pass; coverage floors met.
- [ ] 0 open S1/S2 bugs in scope.
- [ ] Lint + types clean.
- [ ] Docs updated.

### Release exit (to production)
- [ ] Full suite green incl. E2E §23 to `DELIVERED`.
- [ ] Performance within Warning or better (Doc 06).
- [ ] Security scans clean; 0 open S1/S2.
- [ ] UAT sign-off recorded.
- [ ] Smoke test passes on staging.

## 7. Roles & Responsibilities
| Role | Responsibility |
|------|----------------|
| Engineer (AI/human) | Write unit + integration tests with the code |
| QA | Own E2E, regression, UAT coordination, severity triage |
| Security | Security testing gate (PH-08) |
| PMO | Enforce exit criteria at milestone/release gates |
