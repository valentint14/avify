# Quickstart Validation Guide: Catalog Produse

## Prerequisites

- App running: `npm run dev` → `http://localhost:3000`
- SQLite DB at `./data/avify.db` (auto-created on first run)
- No seed data needed — catalog starts empty by design

---

## Scenario 1: Catalog CRUD (User Story 1 — P1)

**Goal**: Verify the catalog page allows adding, editing, and deleting product templates.

1. Navigate to `http://localhost:3000/catalog`
2. **Add**: Enter "Invitație clasică" → click "Adaugă". Expect: item appears in the list below.
3. **Add**: Enter "Meniu nuntă" with description "Meniu tipărit" → click "Adaugă". Expect: second item in list.
4. **Edit**: Click edit on "Meniu nuntă" → change name to "Meniu de nuntă elegantă" → save. Expect: updated name in list.
5. **Delete**: Click delete on "Invitație clasică" → confirm dialog → item removed from list.
6. **Validation**: Reload page (`F5`) → "Meniu de nuntă elegantă" still appears (persistence check).
7. **Empty name guard**: Click "Adaugă" with empty input → expect error message, no item added.

**Pass criteria**: All 7 steps complete without errors.

---

## Scenario 2: Catalog Selector in Order Creation (User Story 2 — P1)

**Goal**: Verify that products from the catalog are selectable when creating a new order.

Pre-condition: Catalog has at least "Meniu de nuntă elegantă" and "Place card" (add via Scenario 1 if needed).

1. Navigate to `http://localhost:3000`
2. Open the "Adaugă comandă" form.
3. Enter order name "Nuntă Ionescu 20 iulie".
4. In the catalog selector, type "meniu" → expect filtered results showing "Meniu de nuntă elegantă".
5. Click "Meniu de nuntă elegantă" → expect it appears as a chip/tag.
6. Type "place" → click "Place card" → second chip appears.
7. Click "Adaugă comandă" to submit.
8. Expect: new order appears in the list with 2 products.
9. Expand the order → mini-board shows "Meniu de nuntă elegantă" and "Place card" both in "De făcut" column.

**Pass criteria**: Order created with pre-populated products visible in the mini-board.

---

## Scenario 3: Empty Catalog Warning (User Story 2 edge case)

**Goal**: Verify user sees a helpful message when catalog is empty.

Pre-condition: Delete all templates from catalog so it's empty.

1. Navigate to `http://localhost:3000`
2. Open the "Adaugă comandă" form.
3. Click or focus the catalog selector → expect message: navigates to catalog first (or inline link).

**Pass criteria**: Empty state message shown with guidance.

---

## Scenario 4: Drag-and-Drop from Catalog Products (User Story 3 — P2)

**Goal**: Verify products added via catalog behave identically to manually-added products in the DnD mini-board.

Pre-condition: Order "Nuntă Ionescu 20 iulie" exists with "Meniu de nuntă elegantă" in "De făcut".

1. Navigate to `http://localhost:3000`
2. Expand "Nuntă Ionescu 20 iulie".
3. Drag "Meniu de nuntă elegantă" from "De făcut" to "În Design".
4. Expect: card moves to "În Design" column; order status stays "In progres".
5. Reload page → expand order → card remains in "În Design".

**Pass criteria**: DnD works and state persists across reload.

---

## Scenario 5: Ad-hoc Product Addition (User Story 4 — P3)

**Goal**: Verify products can still be added manually (not from catalog) inside an existing order.

1. Navigate to `http://localhost:3000`
2. Expand any existing order.
3. In the "add product" area, choose manual entry mode.
4. Type "Produs unicat special" → click add.
5. Expect: product appears in "De făcut" column.
6. Navigate to `http://localhost:3000/catalog` → "Produs unicat special" does NOT appear in the catalog list.

**Pass criteria**: Ad-hoc product visible in order, absent from catalog.

---

## Scenario 6: Catalog Delete Doesn't Break Orders (Edge Case — FR-010)

**Goal**: Verify deleting a template from the catalog doesn't affect existing orders.

Pre-condition: Order exists with "Place card" product (added from catalog).

1. Navigate to `http://localhost:3000/catalog`
2. Delete "Place card" from the catalog.
3. Navigate to `http://localhost:3000`
4. Expand the order → "Place card" still appears in the mini-board with its original name.
5. DnD still works on the product.

**Pass criteria**: Existing order products unaffected by catalog deletion.

---

## API Smoke Tests (optional, via curl or browser DevTools)

```bash
# List catalog
curl http://localhost:3000/api/catalog

# Create template
curl -X POST http://localhost:3000/api/catalog \
  -H "Content-Type: application/json" \
  -d '{"name":"Mărturie","description":"Cutie mică de amintire"}'

# Create order with templates (replace <id> with real template IDs from list above)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"name":"Test order","templateIds":["<id>"]}'
```

See [api.md](contracts/api.md) for full contract details and expected responses.
