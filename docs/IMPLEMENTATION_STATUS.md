# Implementation Status

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-STATUS |
| **Owner** | Principal Software Architect |
| **Status** | Living — updated every milestone |
| **Last Updated** | 2026-06-26 |
| **Current Milestone** | **M1 — Foundation (COMPLETE)** |

> Tracks what is built vs pending against the plan in `02_FINAL_IMPLEMENTATION_PLAN.md`.

## Milestone progress

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M1** | Foundation: repo, DB, auth, RBAC, users/roles, permission engine, audit, events, My Work, notifications, frontend foundation | ✅ Complete |
| M2 | Leads & Master data | ⬜ Not started |
| M3 | Engines: quotation + FIFO | ⬜ Not started |
| M4 | Action Router (12 actions) | ⬜ Not started |
| M5 | Rules Engine POC (shadow) | ⬜ Not started |
| M6 | Bookings / Payments / Analytics | ⬜ Not started |
| M7 | Full frontend screens | ⬜ Not started |
| M8 | Google Sheets sync | ⬜ Not started |
| M9 | Integration & polish | ⬜ Not started |

(Milestone numbering here follows the build directive's combined M1; the finer
M1–M11 breakdown in Doc 02 maps onto these.)

## M1 — delivered components

### Backend (`akar-dos-api/`)
| Area | Status | Notes |
|------|--------|-------|
| Docker compose (pg 5433, redis) | ✅ | `docker-compose.yml` |
| Prisma 7 schema (foundation tables) | ✅ | 11 enums-subset + 11 models; pg driver adapter |
| Migration `m1_foundation` | ✅ | applied; reversible |
| Seed (org, branch, 7 depts, 11 users, 40 perms, 2 config) | ✅ | bcrypt cost 12; `rules_engine.mode=shadow` |
| Config + unified envelope + exception filter | ✅ | `{success,data,meta}` (Spec §11) |
| Auth: login/refresh/logout/me | ✅ | JWT 15m/7d, rotating `user_sessions` |
| Password service | ✅ | bcryptjs, cost 12 (DEC-012) |
| RBAC: JwtAuthGuard + RolesGuard | ✅ | default-deny |
| Permission Engine (resource scopes) | ✅ | DB matrix + cache + scope filters |
| Action policy (ACTION_ROLES) | ✅ | static policy for all 11 workflow actions |
| Users management (CRUD, RBAC-scoped) | ✅ | passwordHash never exposed |
| Roles / permissions introspection | ✅ | GM/OWNER only |
| Audit log (append-only) | ✅ | written on login/logout/user changes |
| Domain events (append-only) | ✅ | emitted on auth/user/task events |
| Tasks + My Work API | ✅ | 4 buckets |
| Notifications framework + Socket.IO gateway | ✅ | in-app only; user rooms |
| Health endpoint | ✅ | DB connectivity check |
| Rate limiting | ✅ | login 10/15m; global 120/min |

### Frontend (`akar-dos-web/`)
| Area | Status | Notes |
|------|--------|-------|
| Vite + React 19 + TS scaffold | ✅ | builds clean |
| Typed API client (envelope, JWT) | ✅ | `src/api.ts` |
| Auth context | ✅ | localStorage tokens |
| Login screen | ✅ | error/loading states |
| My Work screen | ✅ | loading/empty/error states + buckets |
| UI state primitives | ✅ | Loading/Empty/Error |

## Quality gate results (M1)
| Gate | Result |
|------|--------|
| Backend lint (ESLint) | ✅ 0 errors |
| Backend unit tests | ✅ 14 passed (action policy, permission engine, password) |
| Backend e2e tests | ✅ 10 passed (login all roles, envelope, RBAC deny, audit-on-login, My Work, refresh rotation, whitelist) |
| Backend build (`nest build`) | ✅ |
| Frontend build (`tsc && vite build`) | ✅ 63 KB gzip |

## Not in M1 (by design — later milestones)
Domain tables (leads, inventory, quotations, bookings, NOC, PDI, gate passes),
quotation/FIFO engines, action router, rules engine, Google Sheets sync, bulk
upload, analytics, PDF, BullMQ jobs. Tracked in `02_FINAL_IMPLEMENTATION_PLAN.md`.
