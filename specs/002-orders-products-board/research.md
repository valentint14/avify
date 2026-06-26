# Research: Orders & Products Board

## Decision 1: Technology Stack

**Decision**: Keep the existing stack — JavaScript ES2022+, Node.js 22+ LTS, Next.js 14 App Router, `node:sqlite` (built-in).

**Rationale**: The codebase is already bootstrapped with this stack and it satisfies all requirements of the new feature. No new runtime dependency is introduced.

**Alternatives considered**:
- `better-sqlite3`: Listed in the 001 plan but the actual implementation uses `node:sqlite` (Node 22 built-in). No reason to switch.
- React Server Actions: Considered for form submissions but fetch-based API routes are already established in the codebase and simpler to test.

---

## Decision 2: Drag-and-Drop in Mini-Board

**Decision**: Reuse the HTML5 Drag and Drop API pattern already established in `Column.js` and `OrderCard.js`. No external DnD library.

**Rationale**: The existing DnD implementation (`dataTransfer.setData` / `dataTransfer.getData`) works correctly and is already in use. Adding a library would violate the project's constraint of minimal external dependencies.

**Alternatives considered**:
- `@dnd-kit/core`: Full-featured, accessible DnD library. Rejected — adds an external dependency without a compelling need given the working native implementation.
- `react-beautiful-dnd`: Deprecated by Atlassian. Rejected.

**Implementation pattern** (from `Column.js`):
```
ProductCard: onDragStart → dataTransfer.setData('productId', id)
ProductColumn: onDragOver → preventDefault(); onDrop → getData('productId') → PATCH /api/products/:id
```

---

## Decision 3: Accordion State Management

**Decision**: Client-side React `useState` in `OrderList.js` tracks a single `expandedOrderId` (string | null). Only one order is expanded at a time (accordion behaviour matching the spec).

**Rationale**: No external state manager needed. The constraint from 001 (`useState/useReducer only`) applies here. The expanded ID resets to `null` on page reload, which is acceptable UX for a local single-user app.

**Alternatives considered**:
- URL query params (`?expanded=id`): Preserves state across refresh. Rejected — over-engineered for a local single-user app; not required by the spec.
- Multiple expanded at once: Simpler but the spec explicitly requires accordion (single expansion).

---

## Decision 4: Derived Order Status — Compute Location

**Decision**: Derive order status in the **API layer** (`GET /api/orders`). The `orders` table does not store a `status` column. Status is computed from a SQL subquery (`COUNT(products) = COUNT(products WHERE status='gata') AND COUNT(products) > 0`).

**Rationale**:
- Single source of truth: status is never stale.
- Scale is trivial (≤50 orders, ≤20 products each) — a SQL subquery on `localhost` is near-instant.
- No event-sourcing or trigger complexity required.

**Alternatives considered**:
- Store `status` in `orders` table: Updated on every product PATCH. Rejected — introduces a write-to-two-tables pattern and potential inconsistency.
- Compute client-side from returned products: Would require `GET /api/orders` to return all products for all orders in one shot — correct but wasteful for the list view (product details only needed when expanded).

---

## Decision 5: Stage Rename — "Livrat" → "Gata"

**Decision**: The final stage is renamed from `livrat` (existing 001 implementation) to `gata` as specified in the new spec. The DB column check constraint and constants file are updated accordingly.

**Rationale**: The spec explicitly defines the terminal column as "Gata". This is also the trigger for auto-completion logic; the constant must exactly match.

**Migration note**: The existing `orders.stage` column references `'livrat'`. Since the new design removes `orders.stage` entirely (status is derived from products), no data migration of that value is required. Existing rows in the `orders` table retain their legacy `stage` value but the new UI ignores it.

---

## Decision 6: Schema Migration Strategy

**Decision**: The `db.js` schema init uses `CREATE TABLE IF NOT EXISTS`. For the new `products` table this is additive and safe. The existing `orders` table schema is **not altered** — `stage`, `event_type`, `product_types`, etc. remain as columns but the new UI does not read or write them.

**Rationale**:
- `node:sqlite` does not run migrations automatically.
- `ALTER TABLE DROP COLUMN` in SQLite requires recreating the table — risky for an existing DB file with data.
- The safest, lowest-risk approach for a local single-user app is to leave the legacy columns in place and add the new `products` table alongside.

**Alternatives considered**:
- Full schema reset (drop + recreate): Cleaner but destroys existing order data. Rejected unless user explicitly requests data wipe.
- A formal migration runner (`db-migrate`, `node-pg-migrate`): Overkill for a local SQLite app. Rejected.

---

## Decision 7: Products API — Separate Resource vs Nested Route

**Decision**: Products are a top-level API resource at `/api/products/[id]` for individual operations (PATCH status, DELETE). Product creation uses `POST /api/products` with `order_id` in the body.

**Rationale**: Next.js App Router route segments are file-based. Nesting products under orders (`/api/orders/[id]/products/[productId]`) requires two dynamic segments in the path, which is supported but adds file nesting. Flat `/api/products/[id]` is simpler and consistent with RESTful conventions for a resource that has its own identity.

**Alternatives considered**:
- Fully nested: `/api/orders/[orderId]/products/[productId]`. Cleaner semantically but deeper file structure.
- GraphQL mutation: Overkill for this use case.
