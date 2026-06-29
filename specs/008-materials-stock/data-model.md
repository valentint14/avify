# Data Model: Materials Stock & Recipe-Based Consumption

**Feature**: 008-materials-stock
**Date**: 2026-06-29

---

## New Table: `materials`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | `crypto.randomUUID()` |
| `name` | TEXT | NOT NULL | e.g. "Carton", "Satin", "Ceară" |
| `current_stock` | REAL | NOT NULL DEFAULT 0 | on-hand quantity; may go negative via consumption |
| `min_stock` | REAL | NOT NULL DEFAULT 0 | reorder threshold |
| `unit` | TEXT | | free-text label, e.g. "foi", "m", "g" (display only, no conversion) |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

Index: `idx_materials_name` on `(name)`.

**Validation (data layer / API)**:
- `name` required, trimmed, non-empty (FR-004) → else error "Numele materialului este obligatoriu."
- `current_stock`, `min_stock` finite numbers ≥ 0 (FR-005) → else error "Stocul trebuie să fie un număr pozitiv."
- `unit` optional free text.

**JS shape (`parseRow`)**: `{ id, name, currentStock, minStock, unit, createdAt }` (numbers via `Number(...)`).

---

## New Table: `recipe_lines`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | `crypto.randomUUID()` |
| `template_id` | TEXT | NOT NULL REFERENCES `product_templates(id)` ON DELETE CASCADE | the catalog product owning this recipe line |
| `material_id` | TEXT | NOT NULL REFERENCES `materials(id)` ON DELETE CASCADE | the consumed material |
| `qty_per_piece` | REAL | NOT NULL | consumption per single piece of the product |
| `created_at` | TEXT | NOT NULL | ISO timestamp |

Indexes:
- `UNIQUE(template_id, material_id)` → enforces FR-009 (a material at most once per recipe).
- `idx_recipe_lines_template` on `(template_id)` for fast recipe lookup.

**Validation (data layer / API)**:
- `qty_per_piece` finite number > 0 (FR-008) → else error "Consumul per bucată trebuie să fie un număr pozitiv."
- `material_id` must reference an existing material.
- Duplicate `(template_id, material_id)` rejected (UNIQUE) → surfaced as a validation error in the replace-recipe handler.

**JS shape (`parseRow`)**: `{ id, templateId, materialId, qtyPerPiece, createdAt }`. Enriched views may join `materials` to include `materialName` and `unit`.

---

## Modified Table: `orders`

| New Column | Type | Constraints | Notes |
|---|---|---|---|
| `stock_deducted` | INTEGER | NOT NULL DEFAULT 0 | 0 = not yet deducted, 1 = consumption already applied (idempotency marker, FR-015) |

Added via the existing `ALTER TABLE` guard pattern in `db.js`. Exposed in the order JS shape as `stockDeducted: Boolean(row.stock_deducted)` (internal; not necessarily surfaced in the UI).

---

## Derived / Computed Values

| Value | Derived from | Description |
|---|---|---|
| `isLowStock(material)` | a material | `material.currentStock < material.minStock` (strictly). FR-011/FR-012, AS US3-5. |
| `lowStockMaterials(list)` | materials list | the subset where `isLowStock` is true — drives the persistent alert. |
| `consumption` | order products + recipes | `Map<materialId, totalQty>` where each product adds `quantity × qtyPerPiece` per recipe line. |

---

## Consumption Logic (pure function contract)

```
computeConsumption(products, recipesByTemplateId) -> { [materialId]: totalQty }
```

For each `product` in `products`:
- If `product.templateId` is null OR has no recipe in `recipesByTemplateId` → contributes nothing (FR-016).
- Else for each recipe line `{ materialId, qtyPerPiece }` of that template:
  - `total[materialId] += product.quantity × qtyPerPiece`

Worked examples (from spec):
- 30 × Invitație, recipe 1 Carton/piece → Carton −30 (100 → 70). [AS US4-1]
- 10 × product, 0.2 satin/piece → satin −2. [AS US4-2]
- Two products sharing a material → summed. [AS US4-3]

---

## Deduction Orchestration (stateful, transactional)

```
deductStockForOrder(orderId) -> { deducted: boolean, changes?: object }
```

1. Load the order. If not found → `{ deducted: false }`.
2. If `stock_deducted = 1` → `{ deducted: false }` (idempotent no-op, FR-015/FR-018).
3. Load the order's products. If the order is NOT fully complete (any product not `gata`, or zero products) → `{ deducted: false }` (FR-013).
4. Build `recipesByTemplateId` for the templates referenced by the order's products (single query).
5. `consumption = computeConsumption(products, recipesByTemplateId)`.
6. In one transaction: `UPDATE materials SET current_stock = current_stock - ?` for each entry (allowed to go below min / below zero per FR-017), then `UPDATE orders SET stock_deducted = 1`.
7. Return `{ deducted: true, changes: consumption }`.

Invoked from `PATCH /api/products/[id]` after any successful status update — safe to call unconditionally because steps 2–3 gate the actual work.

---

## Relationships Diagram (textual)

```
product_templates (1) ──< recipe_lines >── (1) materials
        │                                        ▲
        │ template_id on products                │ current_stock decremented
        ▼                                        │ on order completion
orders (1) ──< products                ─────────-┘
   │ stock_deducted marker
```
