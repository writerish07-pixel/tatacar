# 04 — Business Rule Confirmation (Business Freeze)

| Field | Value |
|-------|-------|
| **Document ID** | AKAR-DOS-GOV-04 |
| **Owner** | Program Management Office (PMO) · Business Sign-off: AKAR Motors GM/Owner |
| **Status** | **Draft — awaiting dealer sign-off** (freeze pending) |
| **Version** | 0.1.0 |
| **Phase** | 0.5 — Governance (no code) |
| **Related** | Master Build Spec v3.0.0; `01_IMPLEMENTATION_ANALYSIS.md`; `03_ARCHITECTURE_REVIEW.md` (§7 gaps) |

> **Purpose.** Freeze the **business behaviour** of AKAR DOS so engineering can build against a stable target. This document does not define implementation — it defines *what the business does*. Once signed, it is the **legal business reference**; changes require a formal change request (see `08_RELEASE_MANAGEMENT_PLAN.md`).

### Version History
| Version | Date | Author | Change |
|---------|------|--------|--------|
| 0.1.0 | 2026-06-26 | PMO | Initial freeze draft consolidating spec §1–§31 business rules; open items flagged for dealer. |

---

## 1. Business Rules Summary

AKAR DOS runs a single Tata dealership (AKAR Motors, Jaipur) from walk-in to delivery. It is **work-centric**: every action creates tasks, notifications, audit entries, and domain events. The authoritative numeric and procedural rules below are drawn from the Master Build Spec; **bracketed [CONFIRM-n]** items require dealer approval before dependent code is written.

| Area | Rule | Source |
|------|------|--------|
| System of record | PostgreSQL only; Google Sheets are import/export mirrors | Spec §1, §14 |
| Identity | Login by `salesTeamId` (e.g. `GM_01`), not email | Spec §7 |
| Roles | 13 roles; no customer login in V1 | Spec §7, §9 |
| Lead first-contact SLA | 30 minutes | Spec §11.2 |
| TCS | 1% of post-discount ESP, **only when > ₹10,00,000** [CONFIRM-2] | Spec §12 |
| VIN allocation | FIFO on oldest `stock_entry_date` | Spec §13 |
| Payment | Dual verification (cashier + accounts) before VIN | Spec §11.5 |
| NOC | All **6** departments approve before gate pass | Spec §11.5 |
| Delivery confirm | GM/OWNER only | Spec §9 |
| Staff notifications | In-app + Socket.IO only | ADR-002 |

---

## 2. Workflow Confirmation

The end-to-end journey is **frozen** as below (Spec §10). Each transition is executed only via `WorkflowService` / `POST /actions`.

```
RECEPTION lead → SALES test drive → TD_COORDINATOR schedule → SALES quotation
  → SALES booking → CASHIER+ACCOUNTS payment verify → FIFO VIN
  → (FINANCE loan case if FINANCE) → ACCESSORIES submit → CASHIER accessory payment cleared
  → PDI pass → 6-dept NOC → gate pass → GM delivery confirm → DELIVERED
```

**Lead stages (frozen):** `NEW → CONTACTED → TD_REQUESTED → TD_DONE → QUOTED → BOOKED → (IN_FINANCE | PAYMENT_PENDING) → ACCESSORIES → PDI → NOC_PENDING → READY → DELIVERED`; `LOST`/`CANCELLED` from any state.

**Booking states (frozen):** `OPEN → PAYMENT_UNDER_VERIFICATION → (VIN_ALLOCATED | VIN_WAITLISTED) → PAYMENT_COMPLETE → ACCESSORY_PENDING → ACCESSORY_CLEARED → PDI → NOC_PENDING → READY → DELIVERED`; `CANCELLED` releases VIN.

---

## 3. Approval Matrix

Action authorization is frozen per Spec §9 `ACTION_ROLES`. Unauthorized actions → HTTP 403.

| Action | Authorized roles |
|--------|------------------|
| TESTDRIVE_REQUEST | SALES, TL, GM, OWNER |
| QUOTATION_CREATE | SALES, TL, GM, OWNER |
| QUOTATION_APPROVE | EV_MANAGER, PV_MANAGER, GM, OWNER |
| BOOKING_INITIATED | SALES, TL, GM, OWNER |
| BOOKING_PAYMENT_APPROVED | CASHIER_MANAGER, ACCOUNTS_MANAGER, GM, OWNER |
| BOOKING_CANCELLED | SALES, TL, GM, OWNER, ACCOUNTS_MANAGER |
| ACCESSORY_SELECTION_SUBMITTED | ACCESSORIES_MANAGER, GM, OWNER |
| ACCESSORY_PAYMENT_CLEARED | CASHIER_MANAGER, ACCOUNTS_MANAGER, GM, OWNER |
| NOC_APPROVAL | SALES, FINANCE_MANAGER, CASHIER_MANAGER, ACCOUNTS_MANAGER, ACCESSORIES_MANAGER, PDI_MANAGER, GM, OWNER |
| PDI_PASS | PDI_MANAGER, GM, OWNER |
| DELIVERY_CONFIRM | GM, OWNER |

**Discount approval routing:** quotations breaching a role cap route to EV_MANAGER/PV_MANAGER/GM for approval (Spec §11.5).

---

## 4. Discount Rules

| Rule | Definition | Status |
|------|-----------|--------|
| Discount sources | Named columns of the Vehicle_Data row (CONSUMER, EXCHANGE, CORPORATE OFFER, ADDITIONAL EXCHANGE, etc.) | Frozen (Spec §12) |
| Corporate offer | Excluded from "discount-without-corp" subtotal; added separately | Frozen |
| Additional discount cap | Capped at variant `AddDiscLim` when provided | Frozen |
| Role caps | Per-user `discountCap`; variant `CA_Cap` (consultant), `TL_Cap` (team lead) | Frozen (structure) |
| Approval threshold | `needsApproval = totalDisc > roleCap`; rules-engine seed adds > ₹50,000 → require approval | Frozen (structure) |
| **Exact cap amounts per role** | Spec role-caps vs SmartDeal tiers (₹5k/₹20k/₹50k) | **[CONFIRM-1] — dealer** |

---

## 5. Quotation Rules (frozen — Spec §12)

1. `discountWithoutCorp = Σ(selected discount columns except CORPORATE OFFER)`.
2. `effectiveAddDisc = min(addDisc, AddDiscLim)` when limit provided, else `addDisc`.
3. `totalDisc = discountWithoutCorp + addExc + loyalty + corpOffer + effectiveAddDisc + sss`.
4. `espAfterDisc = ESP − totalDisc`.
5. `TCS = round(espAfterDisc × 1%, 2)` **iff** `espAfterDisc > 1,000,000`, else `0` **[CONFIRM-2]**.
6. `grandTotal = espAfterDisc + RTO + TCS + insuranceTotal + EW + accessories + VAS + FastTag + TRC + COD`.
7. `needsApproval = roleCap != null && totalDisc > roleCap`.

These formulas are **numerically frozen**. Any change is a business change request, not a code fix.

---

## 6. VIN Allocation Rules (frozen — Spec §13)

1. Candidate set = `inventory_units` with `status=AVAILABLE` matching booking `model + variant + color` (case-insensitive).
2. Sort ascending by `stock_entry_date`; select the **oldest** (FIFO).
3. On allocation: `inventory.status=ALLOCATED`, set `booking_id`, `allocated_at=now()`, booking → `VIN_ALLOCATED`.
4. No candidate → add to `allocation_waiting_list`, booking → `VIN_WAITLISTED`, retry every 15 minutes.
5. Cancellation releases VIN → `status=AVAILABLE`, clear `booking_id`/`allocated_at`.

---

## 7. Payment Rules (frozen — Spec §11.5/§11.6)

1. Booking created → `PAYMENT_UNDER_VERIFICATION`.
2. Payment requires **both** `cashierVerified` and `accountsVerified` before VIN allocation.
3. On dual verification → payment `VERIFIED`, run FIFO allocation, emit `payment.verified`.
4. Money endpoints require `X-Idempotency-Key`; replays return the cached result.
5. Accessory payment is a separate clearance step (`ACCESSORY_PAYMENT_CLEARED`).
6. Purchase modes: CASH | FINANCE. FINANCE creates a `finance_cases` record.

---

## 8. Inventory Rules (frozen)

1. Inventory is `inventory_units` keyed by `vin`; statuses per Spec §7 (`AVAILABLE, LOCKED, ALLOCATED, DELIVERED, DEMO, TRANSIT, RESERVED, BLOCKED`).
2. Master inventory enters via Google Sheets `Inventory_Final` import (sheet wins) or JSON fixtures in dev.
3. `stock_entry_date` is the FIFO key and must be populated for every unit.
4. A unit may be allocated to at most one active booking.

---

## 9. Delivery Rules (frozen)

1. Gate pass is issued **only** after all 6 NOCs are approved → booking `READY`.
2. `DELIVERY_CONFIRM` is restricted to GM/OWNER.
3. On delivery: booking and lead → `DELIVERED`; inventory unit → `DELIVERED`.

---

## 10. NOC Rules (frozen — Spec §11.5)

1. `PDI_PASS` creates **6** `department_nocs` (SALES, FINANCE, CASHIER, ACCOUNTS, ACCESSORIES, PDI), all `approved=false`.
2. Each department manager approves its own NOC; uniqueness enforced per `(booking_id, department)`.
3. When **all 6** are approved → create gate pass, booking → `READY`, notify GM.
4. No partial-NOC delivery is permitted.

---

## 11. Google Sheet Rules (frozen — Spec §14)

1. Sheets are **reference/mirror only** — never execute dealership workflow logic inside Sheets.
2. Import tabs (sheet wins): `User_Master`, `Inventory_Final`, `Vehicle_Data`, `Accessory_Detail`.
3. Export tabs (DB wins): `Leads`, `Bookings`, `Quotation_Master`, `Payment_Log`, `NOC_Approvals`, `Gatepass_Log`, `TestDrive_Log`, `Error_Queue`.
4. Sync must be reliable, idempotent, retryable, versioned, auditable; every run logged in `sheet_sync_log`; errors → `error_queue` + GM notification.
5. Dev fallback: JSON fixtures when `GOOGLE_SHEET_ID` is empty.

---

## 12. Notification Rules (frozen — ADR-002, Spec §17)

1. Staff notifications are **in-app + Socket.IO only**.
2. **No WhatsApp/Telegram for staff** under any circumstance.
3. Customer WhatsApp is future/optional (V2) and out of V1 scope.
4. Notifications persist (`notifications` table) and emit `notification.created` to room `user:{id}`.

---

## 13. AI Rules (frozen — Spec "AI" directive)

1. AI must **never invent dealership business rules**.
2. On ambiguity: **stop, explain, propose options, wait** for clarification.
3. AI may make engineering decisions (naming, structure, indexes) but not business decisions.
4. See `07_AI_DEVELOPMENT_GUIDELINES.md` for full operating rules.

---

## 14. Business Assumptions

| # | Assumption | Basis |
|---|-----------|-------|
| A-1 | Single dealer, single branch (Jaipur Main) in V1; schema multi-branch ready | Spec §8 |
| A-2 | Models in V1 seed: NEXON, PUNCH | Spec §31 |
| A-3 | Currency INR; figures are rupees | Spec §12 |
| A-4 | KYC verification, exchange valuation, detailed PDI checklist are **out of V1 scope** | Proposed (03 §7) |
| A-5 | OWNER permissions ⊇ GM | Proposed (M-8) |
| A-6 | Customer-facing portal is V2 | Spec §1, ADR-002 |

---

## 15. Open Business Questions (require dealer answers)

| ID | Question | Blocks |
|----|----------|--------|
| CONFIRM-1 | Exact discount cap amounts per role (CA_Cap/TL_Cap values; tier thresholds) | Quotation approval, rules seed |
| CONFIRM-2 | TCS threshold/rate — confirm ₹10,00,000 boundary and 1% against current tax law | Quotation math |
| CONFIRM-3 | Is KYC document capture/verification required in V1? | Booking scope |
| CONFIRM-4 | Is exchange/trade-in valuation required in V1 (beyond EXCHANGE discount column)? | Quotation/booking scope |
| CONFIRM-5 | PDI: single PASS/FAIL vs detailed checklist in V1? | PDI module scope |
| CONFIRM-6 | Confirm OWNER = superset of GM | RBAC |
| CONFIRM-7 | Finance/loan case required fields and approval steps for V1 | Finance module |

---

## 16. Items Requiring Dealer Approval

- All `[CONFIRM-n]` items in §15.
- The frozen approval matrix (§3) reflects actual dealership authority.
- Discount rules (§4/§5) reflect actual commercial policy.
- The 6-department NOC list (§10) matches the dealership's real sign-off departments.

---

## 17. Business Sign-off Checklist

- [ ] Workflow (§2) matches real dealership operations.
- [ ] Approval matrix (§3) matches real authority levels.
- [ ] Discount & quotation rules (§4, §5) match commercial policy.
- [ ] VIN/payment/inventory/delivery/NOC rules (§6–§10) confirmed.
- [ ] Google Sheet & notification policy (§11, §12) accepted.
- [ ] All open questions (§15) answered.
- [ ] Assumptions (§14) validated or corrected.

---

## 18. Business Freeze Declaration

> Upon completion of the §17 checklist and resolution of all §15 questions, the business behaviour described herein is **FROZEN**. Subsequent changes follow the formal change-request process in `08_RELEASE_MANAGEMENT_PLAN.md`. Engineering builds strictly to this frozen behaviour; the architecture/implementation may evolve so long as business outcomes remain identical.

**Freeze status:** ☐ Not yet frozen (awaiting sign-off) · Signed by: __________ · Date: __________
