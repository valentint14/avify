# Research: Extend Order Fields & Auto-Calculated Totals

**Feature**: 006-extend-order-fields
**Date**: 2026-06-29

## Decision 1: Schema Migration Strategy

**Decision**: Continue the existing inline `ALTER TABLE` pattern in `src/lib/db.js`

**Rationale**: The project already uses idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`-style checks (`if (!cols.some(c => c.name === '...'))`) in `openDb()`. Eleven new columns across two tables follow this same pattern with zero new dependencies. A formal migration tool (e.g., Flyway, knex migrations) would be disproportionate for a single-user app.

**Alternatives considered**:
- External migration tool (knex, Drizzle) — adds a dependency; overkill for the scale
- Separate migration script run manually — breaks the zero-setup startup contract the app currently has

---

## Decision 2: Where to Compute Order Total

**Decision**: Compute total in the `DERIVED_STATUS_SQL` query using `SUM(p.quantity * COALESCE(p.unit_price, 0))` in `orders.js`

**Rationale**: The total is always derived from the current product rows. Computing it in SQL at read-time means the single `GET /api/orders` call already returns the correct total — no separate fetch, no client-side aggregation, no stale-total risk. The existing query already does a `LEFT JOIN products` for `product_count` and `done_count`, so adding the SUM costs no extra round-trip.

**Alternatives considered**:
- Store total as a denormalised column on `orders` — requires updating on every product change, introduces consistency risk
- Compute client-side by fetching all products and summing — requires extra API call and duplicates logic

---

## Decision 3: Where Order Metadata Is Edited

**Decision**: Extend `EditOrderModal` with an "Order Details" section above the existing "Products" section

**Rationale**: Users access order editing via the "Editează" button already on every order row. Reusing the same modal avoids adding a second modal trigger and keeps the mental model simple: one "edit" action per order. The modal is already a full-height scrollable dialog; adding a collapsible section above the product list is natural.

**Alternatives considered**:
- Separate "Edit Order Details" modal triggered by a second button — increases UI surface area and introduces two independent save flows
- Inline editing in the order row — complex layout, poor mobile experience

---

## Decision 4: Profit Field — Manual or Computed

**Decision**: Profit is a manually entered numeric field stored on the `orders` table for v1

**Rationale**: The spec explicitly states "valoare mock/calculată" and the Assumptions section confirms "Profit for v1 is a manually entered field or a simple mock value". A full margin calculation engine (cost-of-goods tracking per product) is out of scope. Storing it as a plain number lets the user enter any value and keeps the feature self-contained.

**Alternatives considered**:
- Compute as `Total − Avans` automatically — reasonable approximation but not always accurate (advance ≠ costs); deferred to a future iteration
- Per-product cost tracking — full COGS engine; clearly out of scope for this feature

---

## Decision 5: Platformă Contact — Storage and UI

**Decision**: Store as a free-text `TEXT` column; render in the UI as a `<select>` with an "Altele" option that reveals a free-text input

**Rationale**: Storing as text gives full flexibility. The six predefined values (Facebook, Instagram, TikTok, Telefon, Email, Altele) cover the common cases. Selecting "Altele" reveals a text input for custom values. This pattern is already used in similar apps and requires no schema enum constraint.

**Alternatives considered**:
- `CHECK` constraint in SQLite — would block custom values; too rigid
- Separate `contact_platforms` lookup table — unnecessary relational overhead for a short, stable list

---

## Decision 6: Collected/Delivered — Storage as SQLite Integers

**Decision**: Store `collected` and `delivered` as `INTEGER DEFAULT 0` (0 = false, 1 = true) — standard SQLite boolean pattern

**Rationale**: SQLite has no native boolean type. Using INTEGER 0/1 is the universal SQLite convention, consistent with how the project already handles boolean-like flags. The JavaScript layer maps these with `Boolean(row.collected)`.

---

## Decision 7: API Endpoint for Order Metadata Update

**Decision**: Add `PATCH /api/orders/[id]` for updating order-level metadata fields

**Rationale**: `DELETE /api/orders/[id]` already exists. Adding `PATCH` to the same `route.js` file follows the existing REST pattern (cf. `PATCH /api/products/[id]` for product updates). The handler accepts only the documented new fields and ignores anything else.

**Alternatives considered**:
- `PUT /api/orders/[id]` (full replacement) — overkill; partial updates are simpler and less error-prone
- Updating order metadata through the `POST /api/orders` body on creation only — cannot support post-creation edits

---

## Resolved Clarifications

All aspects of the feature were fully specified in the spec or resolved via the decisions above. No `[NEEDS CLARIFICATION]` markers remain.
