# Quickstart: Generează Listă Cumpărături — Validation Scenarios

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Contracts**: [contracts/api-contracts.md](contracts/api-contracts.md)

## Prerequisites

```bash
npm run dev        # start dev server on http://localhost:3000
npm run seed       # seed demo data (optional — scenarios below describe manual seed)
```

Jest integration tests: `npm test -- --testPathPattern=shopping-list`
Playwright E2E tests: `npx playwright test tests/e2e/shopping-list.spec.js`

---

## Scenario 1: Happy path — two orders, shared material, partial stock (US1)

**Purpose**: Verify aggregation, `toBuy = required − stock`, and correct display.

**Setup** (via Avify UI or direct DB insert):
1. Create material "Satin alb" — `current_stock = 200`, `unit = "ml"`
2. Create product template "Semn de carte" with recipe: Satin alb × 50 ml/piece
3. Create order A (`event_date = today + 10 days`), add product from "Semn de carte" template, quantity = 5
4. Create order B (`delivery_date = today + 20 days`), add product from "Semn de carte" template, quantity = 3

**Run**: Open "Stoc materiale" → click "Generează listă cumpărături"

**Expected**:
- Modal opens; loading indicator appears briefly
- One row in "to buy" list: **Satin alb** — necesar total: 400 ml — în stoc: 200 ml — **de cumpărat: 200 ml**
- No "excluded products" warning
- "Printează lista" button visible

**Why 400 ml**: (5 + 3) pieces × 50 ml = 400 ml required; 400 − 200 = 200 to buy.

---

## Scenario 2: All materials already stocked (US1 — SC-005)

**Purpose**: Verify the "all covered" empty state.

**Setup**:
1. Material "Pânză" — `current_stock = 1000`, `unit = "cm"`
2. Template "Covor" — recipe: Pânză × 100 cm/piece
3. Order (`event_date = today + 5 days`), product from "Covor", quantity = 3 (requires 300 cm < 1000 stock)

**Run**: Open "Stoc materiale" → click "Generează listă cumpărături"

**Expected**:
- Modal opens
- Message: **"Stocul existent acoperă toată producția planificată."**
- No rows in the "to buy" section
- "Printează lista" still visible (print confirms no purchase needed per US2 Scenario 3)

---

## Scenario 3: No qualifying orders (US1 — FR-010)

**Purpose**: Verify the "no orders" empty state.

**Setup**: Ensure all existing orders have `event_date` and `delivery_date` both NULL or both > today + 30 days.

**Run**: Open "Stoc materiale" → click "Generează listă cumpărături"

**Expected**:
- Modal opens
- Message: **"Nu există comenzi cu termen în următoarele 30 de zile."**

---

## Scenario 4: Excluded products warning (US1 — FR-012/FR-013)

**Purpose**: Verify the warning count for ad-hoc and no-recipe products.

**Setup**:
1. Order (`event_date = today + 7 days`)
2. Add an **ad-hoc product** to the order (product with `template_id = NULL`), quantity = 2
3. Create template "Template fără rețetă" (no recipe lines), add product from it to the same order, quantity = 1

**Run**: Open "Stoc materiale" → click "Generează listă cumpărături"

**Expected**:
- Modal opens
- Warning visible: **"3 produs(e) fără rețetă nu au putut fi calculate."** (2 ad-hoc units + 1 no-recipe unit = 3 products excluded; or 2 products if counting by product rows — implementation counts `COUNT(*)` product rows)
- No material rows (if no other products with recipes in range)

---

## Scenario 5: Multiple materials, mixed stock coverage (US1 — normal case)

**Purpose**: Verify split between "to buy" and "already covered" sections.

**Setup**:
1. Material A "Cerneală neagră" — stock 50 ml — Template X recipe: 20 ml/piece
2. Material B "Folie aurie" — stock 100 cm — Template X recipe: 30 cm/piece
3. Order (`event_date = today + 15 days`), product from Template X, quantity = 4
   - Cerneală neagră required: 4 × 20 = 80 ml; stock 50 → **to buy: 30 ml**
   - Folie aurie required: 4 × 30 = 120 cm; stock 100 → **to buy: 20 cm**
4. Add another material C "Bandă adezivă" — stock 500 → Template X recipe: 5 cm/piece
   - Required: 4 × 5 = 20 cm; stock 500 → **to buy: 0** (covered)

**Run**: Open "Stoc materiale" → click "Generează listă cumpărături"

**Expected**:
- "To buy" section shows: Cerneală neagră (30 ml) and Folie aurie (20 cm)
- "Already covered" section (secondary) shows: Bandă adezivă (0 de cumpărat)
- Materials sorted alphabetically within each section

---

## Scenario 6: Print output (US2)

**Purpose**: Verify browser print dialog opens with correct content.

**Setup**: Any scenario with at least one "to buy" row (e.g., Scenario 1).

**Run**: Open modal → click "Printează lista"

**Expected**:
- Browser print dialog opens
- Print preview shows: list header ("Listă cumpărături" + generation date), material rows (name + quantity to buy + unit)
- Print preview does NOT show: close button, "Printează lista" button, navigation bar, dark modal backdrop
- Verify via DevTools: `@media print` styles apply `display:none` to elements with `print:hidden`

---

## Scenario 7: Fresh recalculation on each open (US1 — FR-015)

**Purpose**: Verify no caching between modal opens.

**Run**:
1. Open modal, note the "to buy" quantities
2. Close modal
3. In another tab (or direct DB edit), update a material's `current_stock` to cover the full requirement
4. Re-open modal (click button again)

**Expected**:
- Second open shows updated quantities (the previously "to buy" material now shows 0 or appears in "covered" section)
- The `generatedAt` timestamp in the modal header updates to the new fetch time

---

## API Spot-check

```bash
curl http://localhost:3000/api/shopping-list
```

**Expected shape** (see [contracts/api-contracts.md](contracts/api-contracts.md) for full schema):
```json
{
  "rows": [...],
  "excludedCount": 0,
  "generatedAt": "2026-07-01T..."
}
```

Consecutive calls within seconds should return the same data (no race condition); calls after data changes should reflect the new state.
