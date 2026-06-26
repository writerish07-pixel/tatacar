# AKAR DOS — Dealer Operating System

Work-centric operating system for AKAR Motors (Tata dealership, Jaipur). Runs the
dealership from first walk-in to vehicle delivery. Every user lands on **My Work**
and the system tells them what to do next.

> **Status:** Milestone 1 (Foundation) complete. See `docs/IMPLEMENTATION_STATUS.md`.
> Architecture and business rules are frozen — see `docs/` (governance set).

## Repository layout

```
akar-dos-api/     NestJS 11 + Prisma 7 + PostgreSQL 16 backend
akar-dos-web/     React 19 + Vite PWA frontend
docker-compose.yml  PostgreSQL 16 (5433) + Redis 7
docs/             Specification, analysis, plan, and program governance
*  (repo root)    Legacy Express/Mongo prototype — reference only, not built
```

The legacy Express/MongoDB files at the repository root and the `smartdeal-crm/`
folder are **reference material only** (business knowledge). The live system is
built from scratch under `akar-dos-api/` and `akar-dos-web/`.

## Prerequisites
- Node.js 22+, npm 10+
- PostgreSQL 16 (via Docker or local). Redis 7 is optional in V1.

## Quick start (backend)

```bash
# 1. Start infrastructure (PostgreSQL on 5433, Redis on 6379)
docker compose up -d

# 2. Configure and install
cd akar-dos-api
cp .env.example .env            # adjust DATABASE_URL if needed
npm install

# 3. Migrate + seed (creates 11 staff users, RBAC matrix, config)
npm run db:generate
npm run db:deploy               # or: npm run db:migrate (dev)
npm run db:seed

# 4. Run the API (http://localhost:3000/api/v1)
npm run start:dev
```

> **Prisma 7 note:** the schema/migration engine binary is downloaded on first
> use. In restricted networks set `NODE_EXTRA_CA_CERTS` to your proxy CA, or
> pre-place the binary and point `PRISMA_SCHEMA_ENGINE_BINARY` at it. The runtime
> client is Rust-free (pg driver adapter) and needs no engine binary.

## Quick start (frontend)

```bash
cd akar-dos-web
cp .env.example .env            # VITE_API_URL=http://localhost:3000
npm install
npm run dev                     # http://localhost:5173
```

## Seed logins

| Login ID (salesTeamId) | Password | Role |
|------------------------|----------|------|
| GM_01 | Gm@12345 | GM |
| RECEPTION_01 | Rec@12345 | RECEPTION |
| SALES_01 | Sales@123 | SALES |
| CASHIER_MANAGER_01 | Cash@123 | CASHIER_MANAGER |
| PDI_MANAGER_01 | Pdi@1234 | PDI_MANAGER |
| …and 6 more (see `akar-dos-api/prisma/seed.ts`) | | |

## Quality gates

```bash
cd akar-dos-api
npm run lint        # ESLint (0 errors)
npm test            # unit tests (engines, RBAC, password)
npm run test:e2e    # end-to-end against the seeded database
npm run build       # nest build
```

## Milestone 1 — what's implemented
- PostgreSQL schema (identity, RBAC, permissions, audit, domain events, tasks,
  notifications, config) via Prisma 7 with the pg driver adapter.
- JWT auth (15m access / 7d refresh, rotating sessions), bcrypt cost 12.
- RBAC: role guard + resource-level Permission Engine + static action policy.
- User & role management, audit log, domain-event store.
- Tasks / **My Work** API and Notifications framework (Socket.IO, in-app only).
- Unified response envelope, global exception filter, rate limiting, health check.
- React frontend foundation: Login + My Work with loading/empty/error states.

## API surface (V1, `/api/v1`)
`POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me`
· `GET /users` · `GET /users/:id` · `POST /users` · `PATCH /users/:id`
· `GET /roles` · `GET /permissions` · `GET /tasks/my-work`
· `GET /notifications` · `POST /notifications/:id/read|action`
· `GET /health` · WS `/notifications`

## Documentation
- `docs/01–03` — analysis, plan, architecture review
- `docs/04–12` + `PROGRAM_GOVERNANCE_INDEX.md` — program governance
- `docs/IMPLEMENTATION_STATUS.md` — live build status
- `docs/TECHNICAL_DEBT.md`, `docs/OPEN_TASKS.md`

## License
UNLICENSED — proprietary to AKAR Technologies.
