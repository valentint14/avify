# Quickstart Validation Guide: Order Product Details (Quantity & Notes)

## Prerequisites

- Node.js 22+ (required for `node:sqlite`)
- Dependencies installed: `npm install`
- Dev server running: `npm run dev` (http://localhost:3000)

For API-level validation, use `curl` or any HTTP client.

---

## Scenario 1: Add a product with quantity and notes (US1 — P1)

**Goal**: Verify quantity and notes are captured and persisted during catalog product addition.

1. Open http://localhost:3000
2. Create an order (or use an existing one) and expand it to show the board.
3. In the "Din catalog" tab of the AddProductForm, select a catalog product.
4. Confirm a quantity field (default value: 1) and an "Informații suplimentare" textarea appear per selected product.
5. Change quantity to `3`. Enter notes: `"Font Arial, culoare roșu"`.
6. Click "Adaugă produs".
7. Reload the page.

**Expected**: The product card in the board shows `3` (quantity). Long-pressing the card (2s) shows the modal with `"Font Arial, culoare roșu"`.

**API verification**:
```bash
curl http://localhost:3000/api/products?orderId=<id>
# Response: product with quantity:3 and additionalInfo:"Font Arial, culoare roșu"
```

---

## Scenario 2: Quantity validation (US1 — FR-008)

1. In the AddProductForm, set quantity to `0`.
2. Attempt to submit.

**Expected**: Submit is blocked. An error message appears: quantity must be a positive integer.

---

## Scenario 3: Long-press gradient + modal (US2 — P2)

**Goal**: Verify the gradient fill animation and modal reveal.

1. Open an order with a product that has `additionalInfo` set.
2. Press and hold the product card (mouse or touch).
3. Observe the gradient fill sweeping across the card from left to right over ~2 seconds.
4. After 2 seconds, confirm the modal appears with the product name and the full notes text.
5. Click outside the modal.

**Expected**: Modal dismisses smoothly. Card returns to its normal appearance.

**Abort test**:
1. Press and hold the card.
2. Release before 2 seconds.

**Expected**: Gradient resets immediately. No modal appears.

---

## Scenario 4: Long-press on card with no notes (US2 — FR-006a)

1. Add a product without filling in "Informații suplimentare".
2. Long-press that product card for 2+ seconds.

**Expected**: No gradient animation starts. No modal appears. Nothing happens.

---

## Scenario 5: Keyboard access to modal (US2 — WCAG 2.1 AA)

1. Tab through the page until a product card with notes is focused (visible focus ring).
2. Press Enter or Space.

**Expected**: Modal opens immediately (no 2-second hold required). Modal content matches the product's saved notes.

---

## Scenario 6: Quantity visible on card (US2 — FR-005)

1. Open any order with products.

**Expected**: Each product card shows the quantity (e.g., `×3`) without any interaction. Cards with quantity = 1 display `×1`.

---

## Scenario 7: Edit existing order products (US3 — P3)

1. Expand an order in the accordion.
2. Click the "Editează" button in the order row header.
3. Confirm a modal opens showing all current products with their saved quantities and notes in editable fields.
4. Change a product's quantity to `7`. Change notes to `"Actualizat"`.
5. Click Save.

**Expected**: Modal closes. The product card now shows `×7`. Long-press reveals `"Actualizat"`.

---

## Scenario 8: Duplicate product prevented (Clarification — uniqueness)

1. Add catalog product "Tricou" to an order.
2. Attempt to add the same catalog product "Tricou" to the same order again.

**Expected**: API returns 409 Conflict. UI shows an error message. The duplicate is not created.

---

## Scenario 9: Data survives reload (SC-003)

1. Add a product with quantity `5` and notes `"Test persistență"`.
2. Fully reload the page (`Ctrl+Shift+R`).
3. Expand the order and long-press the product card.

**Expected**: Card shows `×5`. Modal shows `"Test persistență"`.

---

## Running Tests

```bash
# Unit + integration
npm test

# E2E (requires dev server on port 3000)
npm run test:e2e -- --grep "product-details"
```

See [data-model.md](data-model.md) for the full schema and [contracts/api.md](contracts/api.md) for all API request/response shapes.
