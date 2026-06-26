# Open Tasks & Action Items

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-OPENTASKS |
| **Owner** | PMO |
| **Status** | Living |
| **Last Updated** | 2026-06-26 |

> Outstanding items across the program. Business-rule confirmations gate the
> milestones that depend on them (docs/04 §15).

## Blocking before dependent milestones (dealer decisions)
| ID | Task | Blocks | Owner |
|----|------|--------|-------|
| CONFIRM-1 | Confirm exact discount caps per role | M3 quotation approval, M5 rules seed | Dealer / GM |
| CONFIRM-2 | Confirm TCS threshold (₹10,00,000) & 1% vs current law | M3 quotation engine | Dealer / Finance |
| CONFIRM-3 | KYC capture/verification in V1? | M6 booking scope | Dealer |
| CONFIRM-4 | Exchange/trade-in valuation in V1? | M3/M6 scope | Dealer |
| CONFIRM-5 | PDI: single PASS/FAIL vs detailed checklist | PDI module scope | Dealer |
| CONFIRM-6 | OWNER = superset of GM? | RBAC finalization | Dealer |
| CONFIRM-7 | Finance/loan case required fields for V1 | M6 finance | Dealer |

> Note: none of these block M1 (foundation), which is complete.

## Next milestone (M2 — Leads & Master data) — ready to start
- [ ] Add domain tables (leads, inventory_units, vehicle_data, accessory_catalog) via migration
- [ ] Master data endpoints (models, fuels, salespersons, variants/colors, accessories)
- [ ] Leads CRUD with validation (phone 10-digit, duplicate-active, model/fuel exists, salesperson active)
- [ ] Lead RBAC row-level filters (EV/PV/TL/SALES scopes)
- [ ] Auto-create task + notification on lead assignment (30-min SLA)
- [ ] Bulk lead upload
- [ ] Unit + integration + e2e tests; update status/debt docs

## Engineering follow-ups (non-blocking)
- [ ] Wire `PermissionEngine.invalidate()` to permission writes (TD-04)
- [ ] Lock Socket.IO + CORS origins before go-live (TD-06)
- [ ] Add OpenAPI/Swagger generation for the API surface
- [ ] Frontend: add notifications panel + real-time Socket.IO subscription
- [ ] CI pipeline (lint + types + unit + integration on push)
