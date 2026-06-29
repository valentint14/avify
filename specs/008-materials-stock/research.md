# Research: Materials Stock & Recipe-Based Consumption

**Feature**: 008-materials-stock
**Date**: 2026-06-29

---

## Decision 1: Where and how to trigger automatic stock deduction

**Decision**: Deduction runs inside the existing product status-update path (the `PATCH /api/products/[id]` route). After a successful status change, the route calls `deductStockForOrder(orderId)`. That function is idempotent: it checks whether the order is now fully complete (all products in stage `gata`) AND not yet deducted (`orders.stock_deducted = 0`); only then does it compute and apply consumption inside a transaction and set the marker.

**Rationale**: The order "finalized" status is *derived* in SQL (`DERIVED_STATUS_SQL` in `orders.js`), not stored — there is no status column to hook a trigger onto. The only moment an order can transition into the finalized state is when a product's status changes to `gata`. The product PATCH route is exactly that choke point. Making `deductStockForOrder` idempotent and safe to call on every status change means we don't need to detect the specific transition — calling it always is correct and cheap.

**Alternatives considered**:
- A separate explicit "Finalizează comanda" button: rejected via clarification (Q1) — user chose automatic on all-`gata`.
- A stored `status` column with a DB trigger: larger change to the existing derived-status model; unnecessary given the choke point above.
- Recomputing/deducting in a background job: over-engineered for a single-user local app.

---

## Decision 2: Idempotency via a stored per-order marker

**Decision**: Add `stock_deducted INTEGER NOT NULL DEFAULT 0` to the `orders` table. `deductStockForOrder` sets it to `1` in the same transaction as the stock decrements. Re-entry is a no-op when it is already `1`.

**Rationale**: Satisfies FR-015 (deduct exactly once) and FR-018 (never reverse, even on delete) deterministically. A boolean marker is the simplest correct mechanism and survives reverting/re-completing an order (an order that drops out of `gata` and returns stays marked, so no second deduction).

**Alternatives considered**:
- Deriving "already deducted" from a stock-movement ledger: more powerful (full audit trail) but heavier than the spec needs; can be added later if audit history becomes a requirement.
- No marker, recompute idempotently from a ledger: same — out of scope.

---

## Decision 3: Recipe storage model

**Decision**: A `recipe_lines` table with `(id, template_id, material_id, qty_per_piece, created_at)`, a `UNIQUE(template_id, material_id)` index, and `ON DELETE CASCADE` on both foreign keys. Recipes belong to catalog products (`product_templates`).

**Rationale**: A normalized join table is the natural fit for a many-to-many (product ↔ material) with an attribute (qty per piece). `UNIQUE(template_id, material_id)` enforces FR-009 (a material at most once per recipe) at the database level. `ON DELETE CASCADE` from `materials` implements the assumption that deleting a material removes it from recipes; `ON DELETE CASCADE` from `product_templates` cleans up recipes when a catalog product is deleted.

**Alternatives considered**:
- JSON blob column on `product_templates`: simpler to write but loses referential integrity, the uniqueness guarantee, and cascade-on-material-delete; rejected.

---

## Decision 4: Recipe editing API shape — replace-whole-recipe (PUT)

**Decision**: Expose `GET /api/catalog/[id]/recipe` (returns the recipe lines) and `PUT /api/catalog/[id]/recipe` (replaces the entire recipe with the supplied set of lines) in a single transaction.

**Rationale**: A recipe is a small set edited as a unit in the UI (add/remove/change lines, then save). Replace-whole semantics avoid per-line add/update/delete endpoint sprawl and make the client trivial: send the current desired lines, server diffs by clearing and re-inserting within one transaction. Validation (positive qty, no duplicate material) happens server-side on the submitted set.

**Alternatives considered**:
- Per-line CRUD endpoints (`POST/PATCH/DELETE /recipe-lines/[id]`): more endpoints, more client state, more round-trips for what is always a small set.

---

## Decision 5: Consumption computation as a pure function

**Decision**: `computeConsumption(products, recipesByTemplateId)` is a pure function returning a `Map`/object of `materialId → totalQty`, where each product contributes `product.quantity × qtyPerPiece` for every line of its template's recipe. Products with no `template_id` or no recipe contribute nothing. `deductStockForOrder` calls it, then applies the decrements.

**Rationale**: Pure functions are trivially unit-testable with no DB, satisfying the 80% `src/lib/` coverage floor and making the multiplication/summation logic (the financial heart of the feature) easy to verify against the spec's worked examples (e.g. 30 × 1 = 70 from 100).

**Alternatives considered**:
- Compute inline in SQL with a JOIN + SUM + UPDATE: possible but harder to unit-test and to reason about for the "sum across products sharing a material" case; the pure-function approach keeps the math reviewable.

---

## Decision 6: Low-stock alert computed client-side

**Decision**: The "Stoc Materiale" page computes the below-threshold set client-side from the already-loaded materials list (`currentStock < minStock`, strictly) and renders a persistent alert listing those materials. No dedicated endpoint.

**Rationale**: The materials list is already in memory on the page; deriving the alert client-side is instant and avoids a redundant endpoint. Strict `<` matches FR-012/AS-5 (equal to minimum is NOT low). A small pure helper `isLowStock(material)` (and `lowStockMaterials(list)`) lives in `materials.js` so the threshold rule is unit-tested and shared.

**Alternatives considered**:
- Server-computed alert flag per material: fine, but redundant given the data is already client-side; the shared pure helper gives us the testable rule without an endpoint.

---

## Decision 7: Decimal quantities

**Decision**: `current_stock`, `min_stock`, and `qty_per_piece` are stored as SQLite `REAL`. Product `quantity` remains an integer (existing). Consumption results are decimals (e.g. 0.2 × 10 = 2.0).

**Rationale**: The spec explicitly requires decimals (0.2 m satin). `REAL` matches the existing `unit_price`/`advance`/`profit` columns. Validation enforces non-negative stock values and strictly-positive per-piece quantities (FR-005, FR-008).

**Alternatives considered**: Integer-only — rejected, contradicts the spec's satin example.
