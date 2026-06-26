# Quickstart Validation Guide: Orders & Products Board

This guide describes how to verify the feature works end-to-end after implementation.
It does not contain implementation code — see [tasks.md](tasks.md) for that.

## Prerequisites

- Node.js 22+ installed
- Repository cloned and dependencies installed (`npm install`)
- No existing `data/avify.db` file, OR the file contains the new `products` table
  (running the app once with the updated `db.js` creates it automatically)

## Starting the App

```bash
npm run dev
```

Open `http://localhost:3000` in a modern desktop browser (Chrome 120+ recommended).

---

## Scenario 1: Orders List Loads (US1)

**Goal**: Confirm the main screen shows orders correctly.

1. Open `http://localhost:3000`.
2. **Expected**: A list of orders is displayed. Each row shows the order name, a status badge
   ("În progres" or "Finalizată"), and a product count (e.g., "3 / 5 gata").
3. If no orders exist: **Expected**: An empty state message in Romanian is visible
   (e.g., "Nu există comenzi").

---

## Scenario 2: Add an Order (US5 — first half)

**Goal**: Confirm a new order can be created from the UI.

1. Click the "Adaugă comandă" button.
2. Type a name: `Nuntă Test`.
3. Confirm / press Enter.
4. **Expected**: The new order appears in the list with status "În progres" and "0 / 0 gata".
5. Reload the page.
6. **Expected**: `Nuntă Test` is still in the list (data is persisted).

---

## Scenario 3: Expand Order and View Mini-Board (US2)

**Goal**: Confirm click-to-expand reveals the mini Kanban board.

1. Click on the `Nuntă Test` order row.
2. **Expected**: The row expands inline and displays 6 columns in order:
   De făcut | În Design | Validare Client | Printare | Asamblare | Gata.
3. All columns are empty.
4. Click the same row again.
5. **Expected**: The board collapses. The list returns to compact view.

---

## Scenario 4: Add Products (US5 — second half)

**Goal**: Confirm products can be added to an order.

1. Expand `Nuntă Test`.
2. Click "Adaugă produs".
3. Type: `Invitații`. Confirm.
4. **Expected**: `Invitații` appears in the "De făcut" column.
5. Repeat for `Meniu`.
6. **Expected**: Both products appear in "De făcut". Order summary updates to "0 / 2 gata".
7. Reload the page, expand the order.
8. **Expected**: Both products are still in "De făcut".

---

## Scenario 5: Drag-and-Drop Product Between Columns (US3)

**Goal**: Confirm drag-and-drop moves a product and persists the change.

1. Expand `Nuntă Test`.
2. Drag `Invitații` from "De făcut" to "Printare".
3. **Expected**: `Invitații` appears in "Printare"; "De făcut" is empty for that card.
4. The order summary updates to "0 / 2 gata".
5. Reload the page, expand the order.
6. **Expected**: `Invitații` is still in "Printare".

---

## Scenario 6: Auto-Complete Order (US4)

**Goal**: Confirm the order becomes "Finalizată" when all products reach "Gata".

1. With `Nuntă Test` expanded (has `Invitații` in "Printare" and `Meniu` in "De făcut"):
2. Drag `Meniu` from "De făcut" to "Gata".
3. **Expected**: Order summary is now "1 / 2 gata". Order status badge is still "În progres".
4. Drag `Invitații` from "Printare" to "Gata".
5. **Expected**:
   - Order summary becomes "2 / 2 gata".
   - Order status badge changes to "Finalizată" **immediately** (no page reload).
6. Collapse the order. Confirm the "Finalizată" badge is visible in the compact list row.
7. Reload the page. Confirm the order is still "Finalizată".

---

## Scenario 7: Auto-Revert Order Status (US4 — SC3)

**Goal**: Confirm moving a product out of "Gata" reverts the order to "În progres".

1. With `Nuntă Test` in "Finalizată" state (all products in "Gata"):
2. Drag `Invitații` from "Gata" back to "Asamblare".
3. **Expected**: Order status badge reverts to "În progres" immediately.

---

## Scenario 8: Accordion — Only One Order Expanded at a Time (US2 — SC3)

**Goal**: Confirm only one order's board is visible at any time.

1. Create a second order: `Botez Test`.
2. Expand `Nuntă Test`. Confirm its mini-board is visible.
3. Click `Botez Test`.
4. **Expected**: `Nuntă Test` collapses and `Botez Test` expands. Only one board is visible.

---

## Scenario 9: Validation — Empty Names Rejected (US5 — SC3)

**Goal**: Confirm empty names are blocked.

1. Click "Adaugă comandă". Submit without typing a name.
2. **Expected**: Form is not submitted. A Romanian error message appears.
3. Expand any order. Click "Adaugă produs". Submit without a name.
4. **Expected**: Same — form blocked with a Romanian error message.

---

## API Smoke Tests (optional)

Run these `curl` commands to verify the API contract independently of the UI:

```bash
# List orders
curl http://localhost:3000/api/orders

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test"}'

# List products for order (replace ORDER_ID)
curl "http://localhost:3000/api/products?orderId=ORDER_ID"

# Create product (replace ORDER_ID)
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORDER_ID","name":"Invitații"}'

# Move product to Gata (replace PRODUCT_ID)
curl -X PATCH http://localhost:3000/api/products/PRODUCT_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"gata"}'
```

See [contracts/api.md](contracts/api.md) for full request/response shapes.

---

## Running Automated Tests

```bash
# Unit + integration tests
npm test

# E2E tests (requires dev server running on port 3000)
npm run test:e2e
```

All tests must pass before the feature is considered complete (see Constitution § II).
