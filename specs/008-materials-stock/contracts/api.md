# API Contracts: Materials Stock & Recipe-Based Consumption

**Feature**: 008-materials-stock
**Date**: 2026-06-29

All endpoints return JSON. Errors use `{ "error": "<Romanian message>" }` with the appropriate HTTP status, consistent with existing routes.

---

## Materials

### `GET /api/materials`

List all materials, ordered by name.

**200**:
```json
{ "materials": [
  { "id": "…", "name": "Carton", "currentStock": 100, "minStock": 20, "unit": "foi", "createdAt": "…" }
] }
```

### `POST /api/materials`

Create a material.

**Request body**:
```json
{ "name": "Carton", "currentStock": 100, "minStock": 20, "unit": "foi" }
```

- `name` required, non-empty after trim → else **400** `"Numele materialului este obligatoriu."`
- `currentStock`, `minStock` optional (default 0), must be finite ≥ 0 → else **400** `"Stocul trebuie să fie un număr pozitiv."`
- `unit` optional free text.

**201**: `{ "material": { … } }`

### `PATCH /api/materials/[id]`

Update any subset of `{ name, currentStock, minStock, unit }`.

- At least one field required → else **400** `"Cel puțin un câmp trebuie furnizat."`
- Same validation as POST for provided fields.
- **404** `"Materialul nu a fost găsit."` if id unknown.

**200**: `{ "material": { … } }`

### `DELETE /api/materials/[id]`

Delete a material. Cascades to remove any `recipe_lines` referencing it.

- **404** `"Materialul nu a fost găsit."` if id unknown.

**200**: `{ "deleted": true }`

---

## Recipe (scoped to a catalog product)

### `GET /api/catalog/[id]/recipe`

Return the recipe lines for a catalog product, enriched with material info for display.

**200**:
```json
{ "recipe": [
  { "id": "…", "materialId": "…", "materialName": "Carton", "unit": "foi", "qtyPerPiece": 1 },
  { "id": "…", "materialId": "…", "materialName": "Satin",  "unit": "m",   "qtyPerPiece": 0.2 }
] }
```

- **404** `"Produsul nu a fost găsit."` if the catalog product id is unknown.

### `PUT /api/catalog/[id]/recipe`

Replace the entire recipe for a catalog product with the supplied set of lines (transactional clear + re-insert).

**Request body**:
```json
{ "lines": [
  { "materialId": "…", "qtyPerPiece": 1 },
  { "materialId": "…", "qtyPerPiece": 0.2 }
] }
```

Validation (applied to the submitted set):
- Catalog product must exist → else **404** `"Produsul nu a fost găsit."`
- Each `qtyPerPiece` finite > 0 → else **400** `"Consumul per bucată trebuie să fie un număr pozitiv."` (FR-008)
- Each `materialId` must reference an existing material → else **400** `"Material inexistent."`
- No `materialId` may appear twice in `lines` → else **400** `"Un material nu poate apărea de două ori în rețetă."` (FR-009)
- An empty `lines` array is valid and clears the recipe.

**200**: `{ "recipe": [ … ] }` (the new enriched recipe)

---

## Modified: `PATCH /api/products/[id]`

Existing endpoint (status / quantity / unitPrice / additionalInfo updates). **New behavior**: after a successful **status** change, the route calls `deductStockForOrder(product.orderId)`.

- The deduction is idempotent and gated (order fully `gata` AND `stock_deducted = 0`); calling it on non-completing status changes is a safe no-op.
- The product PATCH response is **unchanged** in shape (`{ "product": { … } }`); stock deduction is a side effect and does not alter the response contract.
- Failure isolation: a deduction error MUST NOT corrupt the status update; deduction runs in its own transaction.

**Behavioral contract (FR-013…FR-018)**:
- When the status change makes every product in the order `gata` for the first time, materials are decremented by the summed `quantity × qtyPerPiece` and `stock_deducted` is set to 1.
- Products without a recipe contribute nothing; completion still succeeds.
- Re-completing an already-deducted order does nothing further.

---

## Unaffected but related: `DELETE /api/orders/[id]`

No contract change. Per FR-018, deleting an order does **not** restore stock. (Order deletion cascades to its products and recipe references are unaffected since recipes live on catalog products, not order products.)
