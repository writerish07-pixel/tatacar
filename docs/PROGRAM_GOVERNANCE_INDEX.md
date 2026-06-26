# AKAR DOS — Program Governance Index

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-INDEX |
| **Owner** | Program Management Office (PMO) |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Last Updated** | 2026-06-26 |

> **Purpose.** Single entry point to all AKAR DOS governance documentation. Explains what each document is, who owns it, and **when in the software lifecycle it is used**. Built to let any engineering team execute and operate this product consistently for 10+ years.

---

## 1. Document Register

### Phase 0 — Architecture, Analysis & Planning (authoritative; do not duplicate)
| # | Document | Owner | Status | Purpose |
|---|----------|-------|--------|---------|
| — | `AKAR_DOS_REPLIT_AI_MASTER_BUILD.md` (uploaded spec v3.0.0) | CTO | Canonical | The build specification — business + technical source of truth |
| 01 | `01_IMPLEMENTATION_ANALYSIS.md` | Architect | Complete | Understanding, missing info, conflicts, risks, effort |
| 02 | `02_FINAL_IMPLEMENTATION_PLAN.md` | Architect | Complete | Structure, milestones, DB/API/FE order, deploy/rollback, DoD |
| 03 | `03_ARCHITECTURE_REVIEW.md` | Architect | Complete | Contradictions, gaps, missing validations/permissions/etc. |

### Phase 0.5 — Program Governance (this set)
| # | Document | Owner | Status | Purpose |
|---|----------|-------|--------|---------|
| 04 | `04_BUSINESS_RULE_CONFIRMATION.md` | PMO + GM/Owner | **Draft — awaiting sign-off** | Freeze business behaviour; the legal business reference |
| 05 | `05_IMPLEMENTATION_DECISION_LOG.md` | Architect | Living (append-only) | Record every engineering decision + rationale |
| 06 | `06_PERFORMANCE_TARGETS.md` | Backend + DevOps | Approved | Measurable SLOs (target/warning/critical) |
| 07 | `07_AI_DEVELOPMENT_GUIDELINES.md` | AI Eng + CTO | Approved | How AI/engineers must work — mandatory per session |
| 08 | `08_RELEASE_MANAGEMENT_PLAN.md` | DevOps + PMO | Approved | Versioning, environments, approvals, rollback |
| 09 | `09_TEST_STRATEGY.md` | QA | Approved | Test levels, coverage, severity, exit criteria |
| 10 | `10_MONITORING_AND_OBSERVABILITY.md` | DevOps | Approved | Health, metrics, logs, alerts, dashboards |
| 11 | `11_DISASTER_RECOVERY_PLAN.md` | DevOps + CTO | Approved | Backups, restore, RPO/RTO, incident playbooks |
| 12 | `12_GO_LIVE_CHECKLIST.md` | PMO + GM/Owner | Template | The production launch gate |

### Living operational docs (created/maintained from Milestone M1)
| Document | Owner | Purpose |
|----------|-------|---------|
| `IMPLEMENTATION_STATUS.md` | Architect | What is built vs pending, per milestone |
| `TECHNICAL_DEBT.md` | Architect | Known debt + payoff plan |
| `OPEN_TASKS.md` | PMO | Outstanding tasks & action items |
| `README.md` | Eng | Run/operate instructions |
| `CHANGELOG.md` | DevOps | Per-release changes (from first release) |

---

## 2. When Each Document Is Used (lifecycle map)

| Lifecycle stage | Primary documents | Activity |
|-----------------|--------------------|----------|
| **Initiation** | Master Spec, 01, 02, 03 | Understand scope, plan, review architecture |
| **Business freeze** | **04** | Dealer confirms rules; behaviour frozen before code |
| **Every coding session** | **07**, 02 (current milestone), 04 (freeze state), 05 | Follow rules; build one milestone; log decisions |
| **During design choices** | **05** | Append decisions with rationale/consequences |
| **Testing each milestone** | **09**, 06 | Meet coverage + SLO gates; exit criteria |
| **Release preparation** | **08**, 09, 06 | Version, checklist, approvals |
| **Pre-production** | **12**, 11, 10 | Go-live gate, DR readiness, monitoring on |
| **Go-live** | **12** | Final sign-off (PMO + GM/Owner) |
| **Operations** | **10**, **11**, 06 | Monitor, alert, capacity, recover |
| **Incidents** | **11**, 09 (severity), 05 | Respond, recover, post-mortem |
| **Change requests** | **08**, 04 (if business), 05 | Controlled change with approvals |

---

## 3. Ownership & RACI (summary)

| Activity | Responsible | Accountable | Consulted | Informed |
|----------|-------------|-------------|-----------|----------|
| Business freeze (04) | PMO | GM/Owner | Sales/Finance leads | Engineering |
| Architecture decisions (05) | Architect | CTO | Principals | Team |
| Performance/SLOs (06) | Backend/DevOps | CTO | QA | PMO |
| Coding standards (07) | AI Eng | CTO | All eng | — |
| Releases (08) | DevOps | PMO | Architect/QA | GM/Owner |
| Testing (09) | QA | PMO | Engineering | GM/Owner |
| Monitoring (10) | DevOps | CTO | Security | PMO |
| DR (11) | DevOps | CTO/GM | Security | GM/Owner |
| Go-live (12) | PMO | GM/Owner | All leads | Staff |

---

## 4. Governance Principles (cross-document, non-negotiable)
1. **Business behaviour is frozen** (04); architecture/implementation may improve, outcomes may not change.
2. **Spec is authoritative**; prototype and SmartDeal docs are reference only.
3. **Never invent business rules; stop and ask** (07 §16).
4. **Audit + domain events on every mutation; RBAC on every endpoint** (07 §17 forbidden actions).
5. **One milestone at a time**, fully tested and documented before the next (02, 09).
6. **PostgreSQL is the only source of truth**; Google Sheets are mirrors (04 §11).
7. **No document goes stale**; behaviour change ⇒ doc change in the same PR (07 §8).

---

## 5. Consistency & Maintenance
- All governance docs carry: ID, owner, status, version, version history, related links.
- Cross-references use document numbers (e.g. "Doc 06 §1") — no copy-pasted content.
- This index is updated whenever a governance document is added, retired, or changes status.
- Conflicts between documents are resolved in favour of: **Spec → 04 (business) → relevant governance doc**; resolution recorded in Doc 05.

---

## 6. Current Program State (as of 2026-06-26)
- **Phase 0:** complete (01, 02, 03).
- **Phase 0.5:** governance set complete (04–12 + this index).
- **Blocking before code (Milestone M1):** Doc 04 sign-off + resolution of `CONFIRM-1…7`.
- **Next:** on business freeze, begin **M1 Foundation** per Doc 02 — one milestone at a time.

**No production code is written until Doc 04 is frozen and the open business questions are answered.**
