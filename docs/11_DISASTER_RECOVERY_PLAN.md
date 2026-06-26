# 11 — Disaster Recovery Plan

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-11 |
| **Owner** | DevOps Lead + CTO (custodians) · GM/Owner (business continuity) |
| **Status** | Approved (targets per ADR-012; full automation = prod ops) |
| **Version** | 1.0.0 |
| **Related** | `06_PERFORMANCE_TARGETS.md` §7; `08_RELEASE_MANAGEMENT_PLAN.md` §7; `10_MONITORING_AND_OBSERVABILITY.md`; Spec ADR-012 |

> **Purpose.** Ensure AKAR DOS data and service can be recovered quickly and completely after any failure. Defines backups, restore, objectives, failover, and incident response per failure class. **PostgreSQL is the only source of truth** — its protection is paramount.

### Version History
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-06-26 | DevOps | Initial DR plan. |

---

## 1. Objectives
| Objective | Target | Basis |
|-----------|--------|-------|
| **RPO** (max data loss) | ≤ 15 minutes | ADR-012 |
| **RTO** (max downtime) | ≤ 4 hours | ADR-012 |
| Backup success rate | 100% | Doc 06 §7 |
| Restore test cadence | Quarterly | §8 |

## 2. Backup Policy
| Asset | Method | Frequency | Retention | Location |
|-------|--------|-----------|-----------|----------|
| PostgreSQL (full) | `pg_dump`/managed snapshot | Daily | 30 days | Off-host/managed |
| PostgreSQL (incremental/WAL) | WAL archiving / PITR | Continuous (≤15 min) | 7 days | Off-host |
| Audit/events (7y) | Included in DB backup; periodic cold export | Daily + monthly cold | 7 years | Off-host/cold |
| Config & secrets | Secret manager / sealed; **never in git** | On change | n/a | Secret store |
| Google Sheets masters | Source system + version history | Native | Native | Google |
| Code | Git remote (multiple) | On push | Full history | GitHub |

- Backups encrypted at rest; access restricted.
- Point-in-time recovery (PITR) enabled to meet RPO ≤15 min.
- Google Sheets are **mirrors**, not a recovery source for transactions; they help re-seed master data only.

## 3. Restore Process
1. Declare incident (§7) and identify target recovery point.
2. Provision a clean Postgres instance.
3. Restore latest full backup, then replay WAL to the chosen point (PITR).
4. Run schema/version check (Prisma migration state matches build).
5. Validate integrity (§6 checks): row counts, referential integrity, recent transactions, audit continuity.
6. Re-point application via `DATABASE_URL`; deploy last-known-good app tag.
7. Smoke test (Spec §23 abridged) + `/health` green.
8. Resume traffic; monitor (Doc 10).
9. Post-incident review + Doc 05 entry.

## 4. Recovery Objectives by Scenario (summary)
| Scenario | RPO | RTO | Primary action |
|----------|-----|-----|----------------|
| DB corruption | ≤15 min | ≤4 h | PITR restore (§5.1) |
| Server/app failure | 0 (DB intact) | ≤1 h | Redeploy app, reconnect DB (§5.2) |
| Redis failure | 0 (cache/queue) | ≤30 min | Restart/replace; rehydrate (§5.3) |
| Google Sheets failure | n/a (mirror) | n/a | Defer sync; queue (§5.4) |
| Deployment failure | 0 | ≤30 min | Rollback to prior tag (§5.5) |
| Security incident | varies | varies | Contain + IR (§5.6) |

## 5. Failure Playbooks

### 5.1 Database Corruption
- Stop writes; isolate instance. Restore via PITR to last consistent point before corruption. Validate (§6). If corruption source is a bug, fix forward before resuming. Communicate per Doc 08 §8.

### 5.2 Server / Application Failure
- DB is intact (separate). Redeploy last-known-good app tag on new host; set env/secrets; reconnect `DATABASE_URL`; verify `/health` and smoke. No data loss expected.

### 5.3 Redis Failure
- Redis holds cache + BullMQ jobs only (not source of truth). Restart/replace. In-flight jobs: rely on BullMQ retry/idempotency; re-enqueue scheduled jobs (sheet sync, VIN retry, SLA). Verify idempotent payment handling prevents duplicates.

### 5.4 Google Sheets Integration Failure
- Sheets are mirrors. On import failure: skip and retry next cycle; log to `sheet_sync_log`; error → `error_queue` + GM alert. On export failure: queue and retry; DB remains authoritative. No transaction impact.

### 5.5 Deployment Failure
- Detect via failed smoke/health post-deploy. Roll back to previous tag (Doc 08 §7). If a migration shipped, apply reverse or restore pre-deploy backup. Root-cause before re-attempt.

### 5.6 Security Incident
- Contain (revoke sessions, rotate JWT secrets, isolate). Preserve audit/event logs (do not delete — append-only). Assess blast radius via `audit_logs`. Patch; force credential reset if needed. Report per policy; follow PH-08 security gate. Full post-incident review.

## 6. Integrity Validation Checks (post-restore)
- Migration/version match; expected table list present.
- Referential integrity (no orphan bookings/NOCs/payments).
- Recent-transaction spot check vs last known activity.
- Audit/event continuity (no unexplained gaps).
- Unique constraints intact (one active lead/phone; one NOC per booking+dept).

## 7. Incident Response Process
1. **Detect** (alerts, Doc 10) → 2. **Declare** severity (Doc 09 matrix) + assign incident lead → 3. **Contain** → 4. **Recover** (playbook) → 5. **Verify** (§6 + smoke) → 6. **Communicate** (Doc 08 §8) → 7. **Review** (blameless post-mortem, Doc 05 entry, action items in `OPEN_TASKS.md`).

| Severity | Examples | Response time | Comms |
|----------|----------|---------------|-------|
| S1 | Data loss, outage, breach | Immediate | GM + staff |
| S2 | Major degradation | < 1 h | GM + eng |
| S3 | Partial/integration issue | Same day | Eng |

## 8. Disaster Testing Schedule
| Test | Frequency | Pass criterion |
|------|-----------|----------------|
| Backup restore drill | Quarterly | Restore within RTO; integrity OK |
| PITR to arbitrary point | Quarterly | RPO ≤15 min achieved |
| App redeploy/rollback drill | Each release rehearsal (staging) | Smoke green |
| Redis loss simulation | Semi-annually | No data loss, jobs resume |
| Security tabletop | Annually | IR steps validated |

Drill results recorded; failures raise S2 action items and a Doc 05 entry.
