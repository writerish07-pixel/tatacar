# 08 — Release Management Plan

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-08 |
| **Owner** | DevOps Lead + PMO (custodians) · GM/Owner (release approver) |
| **Status** | Approved |
| **Version** | 1.0.0 |
| **Related** | `09_TEST_STRATEGY.md`; `10_MONITORING_AND_OBSERVABILITY.md`; `11_DISASTER_RECOVERY_PLAN.md`; `12_GO_LIVE_CHECKLIST.md`; Spec §22/§26/§35 |

> **Purpose.** Govern how versions are numbered, promoted through environments, approved, released, and rolled back. Applies from V1 through the system's operating life.

### Version History
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-06-26 | DevOps | Initial release plan. |

---

## 1. Version Numbering (SemVer)
`MAJOR.MINOR.PATCH` (e.g. `1.4.2`).
- **MAJOR** — breaking API/schema or business-behaviour change (requires Doc 04 re-sign-off).
- **MINOR** — backward-compatible feature (e.g. a completed milestone).
- **PATCH** — backward-compatible fix.
- Pre-release tags: `-alpha`, `-beta`, `-rc.N`. V1 launch = `1.0.0`.
- API surface is versioned `/api/v1`; `/api/v2` only post-go-live (ADR-011).
- Each release is a git tag + entry in `CHANGELOG.md` (created at first release).

## 2. Release Lifecycle & Environments

| Stage | Purpose | Data | Promotes from | Gate |
|-------|---------|------|---------------|------|
| **Development** | Active build (per milestone) | Seed/fixtures | feature branch | Lint+types+unit pass |
| **QA** | Integration + system test | Seeded test DB | merged milestone | Doc 09 exit criteria |
| **Staging** | Production-like rehearsal | Anonymized/representative | release candidate | E2E + perf + security gate |
| **Production** | Live dealership use | Real data | approved RC | Go-live checklist (Doc 12) |
| **Hotfix** | Emergency prod fix | — | hotfix branch | Expedited approval (§9) |

Flow: `feature → QA → staging → production`. Promotion is by tagged build, never by ad-hoc copy.

## 3. Branching & Build
- `main` = always releasable; feature branches per milestone; `hotfix/*` from the production tag.
- CI builds `akar-dos-api` (`nest build`) and `akar-dos-web` (`tsc -b && vite build`) on every push.
- Migrations applied via `prisma migrate deploy` in QA/staging/prod (never `migrate dev`).
- Seed runs only in dev/QA; production seed limited to reference master data via sanctioned sync.

## 4. Release Checklist (every release)
- [ ] All milestone DoD met (Doc 02 §9).
- [ ] Version bumped + `CHANGELOG.md` updated.
- [ ] Migrations reviewed, reversible, tested on a staging copy.
- [ ] Lint + types + unit + integration + E2E green (Doc 09).
- [ ] Performance targets within Warning or better (Doc 06).
- [ ] Security checks pass (no secrets, RBAC intact, deps scanned).
- [ ] Living docs updated (status/debt/open-tasks/README/API/DB).
- [ ] Rollback plan confirmed (§7); backup taken pre-deploy.
- [ ] Release notes drafted; stakeholders notified (§8).

## 5. Go-Live Checklist (V1 production launch)
Governed by `12_GO_LIVE_CHECKLIST.md`. Summary gates: business sign-off (Doc 04 frozen), technical readiness, infra, security, DB backup verified, training done, monitoring live, rollback rehearsed, production approval signed.

## 6. Production Readiness Checklist
- [ ] Health endpoint green; DB/Redis connectivity verified.
- [ ] Monitoring + alerts active (Doc 10).
- [ ] Backups scheduled and a restore test passed (Doc 11).
- [ ] Secrets configured via environment (not committed); 64-char JWT secrets.
- [ ] Rate limits enabled; CORS locked to known origins (not `*` in prod).
- [ ] Error queue + GM alerting wired.
- [ ] Capacity within Doc 06 V1 envelope.

## 7. Rollback & Emergency Rollback
**Standard rollback**
1. Re-deploy the previous tagged build.
2. If a migration shipped, apply its reverse (expand→contract design keeps changes reversible) or restore from pre-deploy backup.
3. Toggle feature flags in `config_settings` (e.g. `rules_engine.mode`) to disable new behaviour without redeploy.
4. Verify `/health`, run smoke (§Doc 09), confirm KPIs normal.

**Emergency rollback (Sev-1/2 in production)**
1. Declare incident (Doc 11), assign incident lead.
2. Roll back app to last-known-good tag immediately.
3. If data corruption: restore from latest backup within RPO ≤15 min; RTO target ≤4 h.
4. Communicate per §8; post-incident review + Doc 05 entry.

## 8. Communication Plan
| Audience | Channel | When |
|----------|---------|------|
| Dealership staff | In-app notice + email | Before maintenance; after release |
| GM/Owner | Direct brief | Release approval; incidents |
| Engineering | Repo/PR + release notes | Every release |
| Support | Runbook update | Before go-live; on hotfix |

Maintenance windows: off-hours, ≤2 h/month planned (Doc 06 §7); announced ≥24 h ahead.

## 9. Release Approval Matrix

| Release type | Proposed by | Technical approval | Business approval | Final sign-off |
|--------------|-------------|--------------------|-------------------|----------------|
| PATCH (fix) | Engineer | Tech Lead | — | Tech Lead |
| MINOR (feature/milestone) | Tech Lead | Architect + QA | PMO | PMO |
| MAJOR (behaviour/schema) | Architect | Architect + QA + Security | GM/Owner (Doc 04) | GM/Owner |
| Hotfix (prod Sev-1/2) | Incident lead | Tech Lead (expedited) | GM/Owner (notify) | Tech Lead, ratified post-hoc by PMO |
| Go-live (V1) | PMO | Full eng gate | GM/Owner | GM/Owner (Doc 12) |

## 10. Maintenance Windows
- Planned: monthly off-hours slot, ≤2 h, announced 24 h ahead.
- Emergency: as required by Sev-1/2; minimal-notice acceptable with immediate comms.
- During windows: enable maintenance banner; take backup first; verify health after.
