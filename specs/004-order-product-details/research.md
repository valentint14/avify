# Research: Order Product Details (Quantity & Notes)

All decisions are based on direct inspection of the existing codebase (`src/lib/`, `src/components/`, `src/styles/`).

---

## Decision 1: Long-press Implementation Strategy

**Decision**: `setTimeout` triggered on `mousedown`/`touchstart`, cancelled on `mouseup`/`mouseleave`/`touchend`/`touchcancel`. Progress tracked via `Date.now()` delta driven by `requestAnimationFrame`.

**Rationale**: The codebase uses no external gesture libraries. A raw timer approach fits the existing pattern of vanilla event handlers in React components (see `ProductCard.js`, `ProductColumn.js`). `requestAnimationFrame` keeps the gradient animation in sync with the browser paint cycle — no `setInterval` drift.

**Alternatives considered**:
- Pointer Events API (`pointerdown`/`pointerup`) — cleaner unified mouse+touch, but the existing codebase mixes `mousedown` and touch events separately. Keeping that pattern reduces inconsistency risk.
- Third-party gesture library (e.g., `react-use-gesture`) — rejected; adds a dependency. Constitution forbids unnecessary dependencies.

---

## Decision 2: Gradient Fill Animation Technique

**Decision**: CSS `linear-gradient` on a `::before` pseudo-element sized via a CSS custom property `--hold-progress` (0 → 1) updated from JavaScript during the RAF loop. The gradient sweeps left-to-right. On release before threshold, `--hold-progress` is reset to 0 instantly (no reverse animation — abrupt cancel is the expected UX).

**Rationale**: CSS custom properties updated from JS give smooth per-frame control with zero layout thrashing — only `background-size` or `--hold-progress` changes, which compositors can handle without reflow. No keyframe animation is needed because the duration is driven by real elapsed time, not a fixed `animation-duration`.

**Alternatives considered**:
- CSS `@keyframes` with `animation-play-state` pause/resume — unpredictable progress reset; rejected.
- SVG circular progress ring — overkill for a card-level indicator; rejected.
- `clip-path` sweep — same power as pseudo-element approach, but less readable CSS; rejected.

---

## Decision 3: SQLite Schema Migration

**Decision**: Follow the existing `openDb()` pattern in `src/lib/db.js`: add `ALTER TABLE` checks in the startup migration block (checking `PRAGMA table_info(products)` for each new column before executing ALTER TABLE).

**Rationale**: The project already does this for `template_id` (lines 46-51 of `db.js`). Reusing the same pattern keeps the migration approach consistent and avoids introducing a migration framework.

**New columns**:
```sql
ALTER TABLE products ADD COLUMN quantity       INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN additional_info TEXT;
```

**Alternatives considered**:
- Versioned migration files (e.g., Knex migrations) — appropriate for team environments but over-engineered for a single-user SQLite app with an established informal migration pattern; rejected.

---

## Decision 4: Uniqueness Constraint (One Catalog Product Per Order)

**Decision**: Add a `UNIQUE` index on `(order_id, template_id)` for rows where `template_id IS NOT NULL`. Enforce at DB level; the API layer returns a 409 Conflict if violated.

**Rationale**: The spec clarification (Session 2026-06-26) confirmed one catalog product per order. A DB-level constraint is the safest guarantee — the UI can additionally filter out already-selected templates from the `CatalogSelector` dropdown, but the DB is the authoritative source.

**Implementation note**: SQLite supports partial indexes via `WHERE template_id IS NOT NULL`. The existing `openDb()` startup block checks for index existence before creating it.

**Alternatives considered**:
- Application-level uniqueness check only — rejected; no guarantee under concurrent inserts (even though concurrent editing is declared out of scope, defense in depth is free here).

---

## Decision 5: Edit Order Modal Architecture

**Decision**: New `EditOrderModal.js` component (separate from `AddProductForm.js`). It loads existing products via `GET /api/products?orderId=X`, renders each as a row with editable quantity and notes, and PATCHes changed products on save.

**Rationale**: `AddProductForm.js` is for adding new products (template selection + details). The edit flow operates on already-created products — fundamentally different state shape. Merging them would complicate both. The spec says "same UX pattern", not "same component".

**Alternatives considered**:
- Reusing `AddProductForm` with a pre-populated mode — possible but would require refactoring the component around two very different state shapes; rejected for simplicity.
- Inline editing directly on the card — rejected; spec clarification selected modal-based edit entry via accordion header button.

---

## Decision 6: Modal Open/Close Animation

**Decision**: CSS `opacity` + `transform: scale()` transition on the modal container, toggled via a CSS class. The modal is rendered in a React portal (`document.body`) to avoid z-index conflicts with the Kanban board.

**Rationale**: Smooth but not dramatic — matches the spec ("clean, smooth transition, no special effects"). React portals are the standard pattern for modals to escape stacking context. The existing codebase uses inline styles and class-toggling for UI state.

**Alternatives considered**:
- `<dialog>` element — browser-native, good for accessibility, but requires polyfill consideration and the team pattern is div-based overlays; neutral choice, can revisit.
- Framer Motion — adds a dependency; rejected.
