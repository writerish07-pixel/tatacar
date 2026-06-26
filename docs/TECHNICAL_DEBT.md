# Technical Debt Register

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-TECHDEBT |
| **Owner** | Principal Software Architect |
| **Status** | Living |
| **Last Updated** | 2026-06-26 |

> Known, accepted shortcuts with a payoff plan. Nothing here compromises business
> behaviour, audit, or RBAC (docs/07 §17).

| ID | Item | Context | Risk | Payoff plan |
|----|------|---------|------|-------------|
| TD-01 | Prisma schema engine binary fetched/placed manually | The sandbox proxy resets large downloads from `binaries.prisma.sh`; binary was fetched via curl (resume) and pinned via `PRISMA_SCHEMA_ENGINE_BINARY`. | Low — runtime client is Rust-free and unaffected; only migrate/generate need it. | In CI/prod with open egress, normal `prisma generate` works; document the proxy workaround in README (done). |
| TD-02 | Dev/CI Postgres on port 5432, not 5433 | Docker daemon unavailable in sandbox; used the local PG cluster. `docker-compose.yml` and `.env.example` use the spec's 5433. | None — config-driven via `DATABASE_URL`. | No action; standard workflow already targets 5433. |
| TD-03 | bcryptjs instead of native bcrypt | Native bcrypt needs a build/prebuilt binary that the sandbox could not fetch. bcryptjs is pure-JS and hash-compatible; cost 12 preserved. | Low — slightly slower hashing; identical hashes. | Optionally swap to native bcrypt in environments where it builds; no data migration needed (hashes interoperate). |
| TD-04 | Permission Engine cache has no TTL/invalidation hook wired to writes | Matrix is seeded and static in V1; `invalidate()` exists but isn't auto-called. | Low — matrix changes are rare/seed-time. | Call `invalidate()` from any future permission-write path. |
| TD-05 | Redis/BullMQ not yet used | V1 foundation has no scheduled jobs; Redis is provisioned but idle. | None | Wire BullMQ jobs at the jobs milestone (PH-02). |
| TD-06 | Notifications Socket.IO uses CORS `*` | Foundation default. | Low (internal tool) | Lock to known origins at go-live (Doc 12 §4). |
| TD-07 | Throttler is in-memory | Single instance in V1. | Low | Redis-backed throttler when horizontally scaled (DEC-018 future review). |

## Resolved
_None yet._
