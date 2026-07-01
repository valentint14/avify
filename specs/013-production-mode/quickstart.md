# Quickstart: Mod producție Validation Guide

## Prerequisites

- Dev server running: `npm run dev` (http://localhost:3000)
- At least one product template in the catalog (e.g., "Banner PVC")
- At least two orders created with products from that template, both products in `'de_realizat'` status

## Scenario 1 — Aggregated production queue (US1, FR-001–FR-005)

**Setup**: Create two orders:
- Order A: add "Banner PVC" × 3 units
- Order B: add "Banner PVC" × 5 units, and "Plic personalizat" (ad-hoc, no template) × 2 units

**Steps**:
1. Navigate to http://localhost:3000/mod-productie
2. Verify the page title is "Mod producție — Avify" in the browser tab
3. Verify "Mod producție" appears as an active link in the navbar

**Expected**:
- Group row "Banner PVC" shows total quantity **8** (top of list — highest quantity)
- Group row "Plic personalizat" shows total quantity **2** (second row)
- Groups are sorted highest-quantity first
- Page loads within 2 seconds

**API check**: `GET /api/mod-productie` returns `groups[0].totalQuantity = 8`, `groups[1].totalQuantity = 2`

---

## Scenario 2 — Drill-down: contributing orders (US2, FR-006)

**Steps** (continuing from Scenario 1):
1. Click the "Banner PVC" group row
2. Verify the row expands to show a sub-list of contributing orders
3. Verify the sub-list shows Order A with quantity 3 and Order B with quantity 5
4. Verify the sum (3 + 5 = 8) matches the group total displayed in the collapsed header
5. Click "Banner PVC" again — verify it collapses

---

## Scenario 3 — Empty state (US1 edge case, FR-007)

**Setup**: Change all product statuses to `'in_realizare'` or `'realizat'` (or use a fresh DB with no orders).

**Steps**:
1. Navigate to http://localhost:3000/mod-productie

**Expected**: Page shows empty state message — "Nicio comandă nu are produse de realizat." (no crash, no blank screen)

---

## Scenario 4 — Manual refresh (US3, FR-009, FR-010)

**Steps**:
1. Open http://localhost:3000/mod-productie in Tab A
2. In Tab B, create a new order with a new product template "Invitatii" × 6 units
3. In Tab A, click the refresh button (RefreshCw icon)
4. Verify "Invitatii" × 6 now appears in the production queue
5. Verify the "Actualizat la" timestamp updates to reflect the current time

---

## Scenario 5 — Ad-hoc product without template (Edge case, FR-003)

**Setup**: Create an order and add a product manually (no template selected), name "Carcasă personalizată", quantity 3.

**Steps**:
1. Navigate to http://localhost:3000/mod-productie

**Expected**: A group row labelled "Carcasă personalizată" appears with quantity 3. It is NOT in a "Fără categorie" bucket — the product name itself is the group label.

---

## Scenario 6 — Tablet viewport (SC-005)

**Steps**:
1. Open DevTools → set viewport to 768 × 1024
2. Navigate to http://localhost:3000/mod-productie

**Expected**: Page is usable — no horizontal scrollbar; group labels are not truncated (or truncate gracefully with ellipsis); navbar collapses to hamburger menu correctly.

---

## Integration test reference

See `tests/integration/mod-productie/productionQueue.test.js` for the Jest test covering:
- Empty DB → returns `[]`
- Single order, single template product → group with correct label and quantity
- Two orders with the same template → quantities summed into one group
- Two orders with different templates → two separate groups, sorted by quantity desc
- Ad-hoc product (null template_id) → grouped by product name
- Mixed: template + ad-hoc → both groups present, template-based first if higher quantity

## E2E test reference

See `tests/e2e/mod-productie.spec.js` for Playwright tests covering Scenarios 1–4 above.
