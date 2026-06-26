# 10 — Monitoring & Observability

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-10 |
| **Owner** | DevOps Lead (custodian) · PMO (governance) |
| **Status** | Approved (V1 baseline; PH-06 hardening adds tooling) |
| **Version** | 1.0.0 |
| **Related** | `06_PERFORMANCE_TARGETS.md`; `11_DISASTER_RECOVERY_PLAN.md`; Spec §19/§35 (PH-06) |

> **Purpose.** Define what we observe, how we know the system is healthy, and how problems are detected and surfaced before users feel them. V1 ships core health/metrics/logs; full APM/error-tracking (Sentry, dashboards) is PH-06.

### Version History
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-06-26 | DevOps | Initial observability plan. |

---

## 1. Pillars
- **Health checks** — liveness/readiness.
- **Metrics** — technical + business (RED/USE).
- **Logs** — structured, correlated.
- **Tracing** — request correlation across layers (V1 minimal; distributed tracing V2).

## 2. Health Checks
| Check | Endpoint/Signal | Healthy = |
|-------|-----------------|-----------|
| Liveness | process up | responds |
| Readiness | `GET /api/v1/health` | `{ status: "ok", database: "connected" }` |
| DB | pool ping | connect < 100 ms |
| Redis | `PING` | `PONG` |
| Socket.IO | gateway up | accepts connections |
Health is the uptime probe (Doc 06 §7) and the post-deploy smoke gate.

## 3. Metrics

### 3.1 Technical (RED/USE)
| Metric | Type | Source |
|--------|------|--------|
| Request rate / errors / duration (per route) | RED | request middleware |
| 5xx error rate | counter | exception filter |
| DB query latency, pool utilization, slow queries | USE | `pg_stat_statements` |
| Event-loop lag, memory RSS, CPU | USE | Node perf hooks / host |
| Redis memory, queue depth | USE | Redis `INFO`, BullMQ |
| Socket.IO connected clients, emit latency | gauge | gateway |

### 3.2 Business
| Metric | Why |
|--------|-----|
| Leads created / contacted within 30-min SLA | SLA compliance |
| Quotations created / approval-pending | sales funnel |
| Bookings by state; VIN allocated vs waitlisted | fulfilment health |
| Payments verified; accessory cleared | finance flow |
| PDI pass rate; NOC approvals pending per dept | delivery bottlenecks |
| Deliveries completed/day | throughput |
| Sheet sync success/failures; error_queue depth | integration health |

## 4. Logging
- **Structured JSON** logs (PH-06) with: `timestamp, level, requestId, actorId, route, actionType, entityType, entityId, latencyMs, outcome`.
- **Correlation:** `requestId` (from response `meta`) threads request→service→event.
- **Levels:** error/warn/info/debug; debug off in prod.
- **Redaction:** never log secrets, tokens, passwordHash, or full PII (mask phone/email).
- **Retention:** application logs 90 days; audit/events per Doc 04/Spec §32 (audit 7y, rule log 2y).
- **Audit vs logs:** `audit_logs`/`domain_events` are the durable business record (DB), not ephemeral app logs.

## 5. Tracing
- V1: `requestId` propagation + timing marks across controller→service→engine→DB.
- V2: OpenTelemetry spans; distributed tracing if services split.

## 6. Alert Rules
| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Service down | `/health` failing > 2 min | S1 | Page on-call; incident (Doc 11) |
| Error spike | 5xx > 2% over 5 min | S1/S2 | Investigate; consider rollback |
| DB saturation | pool > 95% or latency Critical | S2 | Scale/optimize |
| Notification SLA breach | event→notify > 15 s sustained | S2 | Check Socket.IO/queue |
| Queue backlog | BullMQ depth rising 15 min | S2/S3 | Scale worker (PH-02) |
| Sheet sync failures | any failed run | S3 | error_queue + GM notification |
| Backup failed | backup job error | S2 | Re-run; verify (Doc 11) |
| Rules shadow mismatch | mismatch rate rising | S3 | Review rule vs legacy (PH-07) |
| Disk/memory pressure | Critical threshold | S2 | Capacity action |

## 7. Dashboards
| Dashboard | Audience | Panels |
|-----------|----------|--------|
| **System Health** | DevOps | uptime, error rate, latency p50/p95/p99, CPU/mem, pool |
| **Business Operations** | GM | leads/SLA, funnel, bookings by state, VIN waitlist, deliveries |
| **Delivery Bottlenecks** | Managers | PDI pass rate, NOC pending per dept, gate passes |
| **Integration** | DevOps | sheet sync runs, error_queue depth, job status |
| **Audit/Security** | Security | auth failures, 403 rate, rate-limit hits, audit volume |

## 8. Error & Audit Monitoring
- Unhandled errors → exception filter → metric + structured log + (PH-06) Sentry event.
- System/job errors → `error_queue` + GM notification (Spec §19).
- Audit monitoring: alert on unexpected gaps (mutation without audit row) and on privileged actions (DELIVERY_CONFIRM, sync, rule changes).

## 9. Queue, Database & Infra Monitoring
- **Queue:** BullMQ job success/fail/retry, backlog depth, processing time (Doc 06 sync/bulk targets).
- **Database:** connections, slow queries (>200 ms), index hit ratio, table growth, deadlocks, replication lag (V2).
- **Infra:** CPU, memory, disk, network; container restarts.

## 10. Capacity Planning
- Track growth vs Doc 06 §6 envelope monthly.
- Triggers and actions per Doc 06 §8 (vertical scale, read replica, Redis socket adapter, table partitioning).
- Review capacity each release; record decisions in Doc 05.
