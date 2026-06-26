# 06 — Performance Targets & SLOs

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-06 |
| **Owner** | Principal Backend Engineer + DevOps (custodians) · PMO (governance) |
| **Status** | Approved baseline (V1 single-branch) |
| **Version** | 1.0.0 |
| **Related** | `10_MONITORING_AND_OBSERVABILITY.md`; `11_DISASTER_RECOVERY_PLAN.md`; Spec §32/§35 |

> **Purpose.** Define measurable, testable engineering goals. Every target has **Target / Warning / Critical** thresholds and a **measurement method**. Targets are baselined for the **V1 single-branch** scale; revisit at multi-branch (V2). Latency figures are server-side p95 unless stated; "p99" noted where it matters.

### Version History
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0.0 | 2026-06-26 | Backend/DevOps | Initial SLO baseline. |

### Operating assumptions (V1)
| Parameter | Assumption |
|-----------|-----------|
| Concurrent active staff users | ~50 (peak ~80) |
| Total seeded staff | 11 (grows to ~60) |
| Leads/day | ~100–300 |
| Bookings/month | ~150–400 |
| DB size (year 1) | < 5 GB |
| Network | LAN/broadband; assume ≤100 ms client RTT |
| Deployment | Single app instance + Postgres + Redis (Replit/VM) |

---

## 1. API Performance

| Metric | Target (p95) | Warning | Critical | Measurement |
|--------|--------------|---------|----------|-------------|
| Read endpoints (GET) | ≤ 200 ms | 350 ms | 600 ms | APM/request timing middleware |
| Write endpoints (POST/PATCH) | ≤ 400 ms | 700 ms | 1200 ms | APM |
| `POST /actions` (workflow) | ≤ 500 ms | 900 ms | 1500 ms | APM per actionType |
| Auth `login` | ≤ 350 ms | 600 ms | 1000 ms | APM (bcrypt-bound) |
| Error rate (5xx) | < 0.5% | 1% | 2% | Error counter / total |
| Throughput sustained | ≥ 100 req/s | — | < 40 req/s | Load test (k6/autocannon) |

## 2. Database Performance

| Metric | Target | Warning | Critical | Measurement |
|--------|--------|---------|----------|-------------|
| Simple query (indexed) | ≤ 20 ms p95 | 50 ms | 100 ms | `pg_stat_statements` |
| Transactional write (allocation/NOC) | ≤ 80 ms p95 | 150 ms | 300 ms | `pg_stat_statements` |
| Connection pool utilization | < 70% | 85% | 95% | pg pool metrics |
| Slow query log threshold | > 200 ms flagged | — | — | `log_min_duration_statement=200` |
| Deadlocks | 0 | 1/day | >5/day | pg logs |
| Index hit ratio | > 99% | 97% | 95% | `pg_statio_user_indexes` |

## 3. Frontend Performance

| Metric | Target | Warning | Critical | Measurement |
|--------|--------|---------|----------|-------------|
| First Contentful Paint | ≤ 1.5 s | 2.5 s | 4 s | Lighthouse / Web Vitals |
| Largest Contentful Paint | ≤ 2.5 s | 4 s | 6 s | Web Vitals |
| Time to Interactive | ≤ 3 s | 5 s | 8 s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | 0.15 | 0.25 | Web Vitals |
| JS bundle (gzip, initial) | ≤ 300 KB | 450 KB | 700 KB | Vite build report |
| Route transition | ≤ 300 ms | 600 ms | 1000 ms | In-app perf marks |

## 4. Real-time, Notifications & Key Operations

| Operation | Target | Warning | Critical | Measurement |
|-----------|--------|---------|----------|-------------|
| Socket.IO message latency | ≤ 500 ms | 1 s | 2 s | Server emit → client ack timestamp |
| Notification delivery (event → in-app) | ≤ 5 s (spec SLA) | 8 s | 15 s | Event ts → notification ts |
| Quotation generation (engine compute) | ≤ 100 ms | 250 ms | 500 ms | Engine timing (pure fn) |
| Quotation API round-trip | ≤ 500 ms | 900 ms | 1500 ms | APM |
| VIN allocation (FIFO + tx) | ≤ 300 ms | 600 ms | 1000 ms | Action timing |
| Search/list response (paginated) | ≤ 250 ms p95 | 500 ms | 900 ms | APM |
| Dashboard (analytics) load | ≤ 1 s | 2 s | 4 s | APM + frontend mark |
| Google Sheet sync (per tab, ≤5k rows) | ≤ 30 s | 60 s | 120 s | Job duration in `sheet_sync_log` |
| Bulk lead upload (per 1k rows) | ≤ 20 s | 45 s | 90 s | Batch job timing |

## 5. Resource Limits

| Resource | Target | Warning | Critical | Measurement |
|----------|--------|---------|----------|-------------|
| API process memory (RSS) | ≤ 512 MB | 768 MB | 1 GB | container/host metrics |
| API CPU (sustained) | ≤ 50% of 1 vCPU | 75% | 90% | host metrics |
| Redis memory | ≤ 256 MB | 384 MB | 512 MB | `INFO memory` |
| Event-loop lag | ≤ 50 ms | 100 ms | 250 ms | Node perf hooks |
| GC pause | ≤ 50 ms | 100 ms | 250 ms | `--trace-gc` / APM |

## 6. Capacity, Scale & Growth

| Dimension | V1 Target | Warning | Critical | Notes |
|-----------|-----------|---------|----------|-------|
| Concurrent users | 80 | 120 | 150 | Vertical scale first; Redis adapter at V2 |
| Requests/day | ~150k | 300k | 500k | Single instance |
| DB growth/year | < 5 GB | 8 GB | 12 GB | Audit/events dominate; retention applies |
| Audit/events rows/year | < 5M | 8M | 12M | Indexed + partition at V2 |
| Inventory units | < 2k active | — | — | Single dealer |

## 7. Availability, Backup & Recovery

| Metric | Target | Warning | Critical | Measurement |
|--------|--------|---------|----------|-------------|
| Service availability (V1) | 99.0% (business hours) | 98% | 95% | Uptime monitor on `/health` |
| Planned maintenance window | ≤ 2 h/month off-hours | — | — | Change calendar |
| **RPO** (data loss tolerance) | ≤ 15 min | 30 min | 60 min | Backup cadence (ADR-012) |
| **RTO** (restore time) | ≤ 4 h | 6 h | 8 h | DR drill (see Doc 11) |
| Backup success rate | 100% | <100% | <95% | Backup job logs |
| Backup restore test | Quarterly pass | — | fail | DR drill log |

## 8. Scalability Targets (forward-looking)

| Stage | Trigger | Action |
|-------|---------|--------|
| Vertical | CPU/mem warning sustained 1 week | Increase instance size |
| Read scale | Read p95 > warning | Add Postgres read replica (V2) |
| Real-time scale | >120 concurrent sockets | Socket.IO Redis adapter (V2) |
| Job scale | Job backlog grows | Dedicated BullMQ worker (PH-02) |
| Partitioning | events/audit > 8M rows | Time-partition tables (V2) |

---

## 9. Measurement & Governance

- **Instrumentation:** request-timing middleware, `pg_stat_statements`, Node perf hooks; production adds Sentry + structured JSON logs (PH-06, see Doc 10).
- **Performance test gate:** load test before any go-live (Doc 09 §Performance Testing); targets in §1–§4 must pass at Warning or better.
- **Review cadence:** SLOs reviewed each release; breached Criticals trigger an incident (Doc 11) and a decision-log entry (Doc 05).
- **Out of scope (V1):** multi-region latency, CDN edge metrics — V2.
