# Quickstart: Materials Stock & Recipe-Based Consumption Validation

**Feature**: 008-materials-stock
**Date**: 2026-06-29

---

## Prerequisites

- Node.js ≥ 22 installed
- `npm install` complete
- Dev server running: `npm run dev` (http://localhost:3000)

---

## Scenario 1: Manage Materials (US1)

1. Open http://localhost:3000 and click **Stoc Materiale** in the top navigation.
2. Add a material: name "Carton", current stock 100, minimum stock 20, unit "foi". Save.
3. **Expected**: "Carton" appears in the list with all values.
4. Reload the page → "Carton" persists with the same values.
5. Edit Carton's current stock to 80 and save → new value shown and persisted after reload.
6. Add a second material "Satin" (stock 50, min 10, unit "m"), then delete it → it disappears and does not return after reload.
7. Try adding a material with an empty name → rejected with a validation message.

---

## Scenario 2: Define a Product Recipe (US2)

1. Ensure materials "Carton" and "Satin" exist (Scenario 1).
2. Go to **Catalog Produse**, open the recipe editor for a product (e.g. "Invitație").
3. Add a recipe line: Carton, 1 per piece. Add a second: Satin, 0.2 per piece. Save.
4. **Expected**: both lines are shown; reopening the product shows them exactly as entered.
5. Change Satin's per-piece quantity to 0.3, save, reopen → 0.3 persists.
6. Try adding Carton a second time → it cannot be added twice (blocked / not offered).
7. Try a per-piece quantity of 0 or negative → rejected with a validation message.

---

## Scenario 3: Low-Stock Alert (US3)

1. On **Stoc Materiale**, set Carton's current stock to 10 (minimum 20). Save.
2. **Expected**: a persistent alert appears naming "Carton" as below minimum.
3. Set another material below its minimum → the alert lists both.
4. Raise Carton's current stock to 20 (equal to minimum) → Carton is NOT in the alert (strict below only).
5. Raise it above 20 and ensure no alert for it. With all materials at/above minimum, no alert is shown.

---

## Scenario 4: Automatic Consumption on Completion (US4)

1. Set Carton current stock to 100; ensure "Invitație" recipe consumes 1 Carton/piece.
2. Create an order, add 30 × Invitație.
3. Move every product in the order to stage **Gata** (complete the order).
4. **Expected**: on **Stoc Materiale**, Carton current stock is now 70 (100 − 30×1).
5. With a 0.2 satin/piece recipe and an order of 10 → satin reduced by 2.
6. **Idempotency**: move a product out of Gata and back to Gata (re-complete) → Carton stays 70 (no second deduction).
7. **No recipe**: complete an order whose products have no recipe → completion succeeds, no stock change.
8. **Below zero**: complete an order whose consumption exceeds stock → stock goes below minimum/zero and the low-stock alert reflects it; completion still succeeds.
9. **Delete after completion**: delete the completed order → Carton stock stays 70 (NOT restored).

---

## Automated Test Commands

```bash
# Unit tests (materials CRUD, recipes, consumption math + idempotency)
npm test -- --testPathPattern="materials|recipes|stock"

# Integration tests (API endpoints)
npm test -- --testPathPattern="api"

# E2E acceptance scenarios
npm run test:e2e -- --grep "materials-stock"

# Full suite with coverage
npm test -- --coverage
```

**Expected outcomes**:
- Unit + integration tests pass; `src/lib/` line coverage ≥ 80% (including `materials.js`, `recipes.js`, `stock.js`).
- All US1–US4 E2E scenarios pass.
