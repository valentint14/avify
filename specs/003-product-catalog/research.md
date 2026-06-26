# Research: Catalog Produse

## Decision 1 — SQLite Additive Migration Strategy

**Decision**: Use `PRAGMA table_info(products)` at startup to check whether `template_id` column exists, then run `ALTER TABLE products ADD COLUMN template_id` conditionally if absent. New `product_templates` table is added via `CREATE TABLE IF NOT EXISTS` (idempotent). No migration versioning system is needed at this scale.

**Rationale**: `node:sqlite` does not support `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. The `PRAGMA` check is the standard SQLite idiom for safe additive migrations without a migration runner. The app is single-user/local with no concurrent schema writers, so the check-then-alter window is safe.

**Alternatives considered**:
- Migration versioning table (`schema_migrations`) — overkill for a two-table local app with a single developer.
- Dropping and recreating the `products` table — destructive; loses existing order data.

---

## Decision 2 — Catalog Selector UI (Multi-Select with Search)

**Decision**: Build a custom `<input>` + filtered `<ul>` + chip set in plain React (`useState` only). No external component library. Pattern:
1. Text input filters the template list client-side as the user types.
2. Clicking a result adds it to a "selected" set, shown as removable chips above the input.
3. The same template can be selected multiple times (duplicates allowed per edge case in spec).
4. Chips show the template name + an × button to remove.

**Rationale**: Matches the existing constraint of no external component/UI libraries (same as the DnD constraint in 002). The catalog size is small (≤100 items), so client-side filtering is instantaneous and no virtualization is needed.

**Alternatives considered**:
- Native `<select multiple>` — poor UX for search/filter; hard to style; keyboard-only.
- Native `<datalist>` — single-select only; cannot support multiple products per order.
- External select library (react-select, downshift) — violates the no-external-library constraint.

---

## Decision 3 — Order Creation Atomicity (Templates → Products)

**Decision**: `POST /api/orders` accepts an optional `templateIds: string[]` field. The handler creates the order row and then inserts one `products` row per template ID in a single SQLite transaction (`db.exec('BEGIN; ...; COMMIT;')`). If any insert fails, the transaction rolls back and the order is not created.

**Rationale**: Keeps client code simple (one API call) and guarantees consistency — no partially-created orders with missing products.

**Alternatives considered**:
- Two-step client: POST /api/orders then N × POST /api/products — risk of partial state if products fail; more network round-trips; more complex client error handling.
- Queue-based retry — massively over-engineered for a local single-user app.

---

## Decision 4 — Template Deletion Behaviour

**Decision**: `product_templates.id` is referenced from `products.template_id` with `ON DELETE SET NULL`. Deleting a template sets `template_id = NULL` on any product rows that referenced it, leaving the product name intact.

**Rationale**: Matches the spec edge case: "Sub-task-urile existente rămân neschimbate; ștergerea din Catalog nu afectează retrospectiv Comenzile create anterior." The product name was copied at creation time, so historical orders are self-contained.

**Alternatives considered**:
- `ON DELETE RESTRICT` — would block catalog cleanup if any order ever used the template.
- `ON DELETE CASCADE` — would delete products from existing orders; data loss; violates spec.
- Soft-delete on templates — adds complexity without benefit at this scale.

---

## Decision 5 — Catalog Selector Placement

**Decision**: Catalog multi-select is added to `AddOrderForm` (at order creation time). `AddProductForm` (add-product-to-existing-order) gains a "From Catalog" mode toggle alongside the existing manual text entry, so users can also add catalog products to an already-created order. Ad-hoc (manual text) entry remains available in both contexts.

**Rationale**: Satisfies FR-006 ("creare/editare Comandă") and US2 (create) + US4 (ad-hoc). Keeps the two forms' roles clear: `AddOrderForm` = bulk pre-population at creation; `AddProductForm` = incremental additions post-creation.

**Alternatives considered**:
- Catalog selection only at creation time — leaves users unable to add catalog products to an existing order; poor UX for users who forgot to select at creation.
- Replacing `AddProductForm` entirely — removes ad-hoc entry; violates US4.
