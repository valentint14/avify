# Tasks: Order Product Details (Quantity & Notes)

**Input**: Design documents from `specs/004-order-product-details/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: User story label (US1, US2, US3) — required in story phases, absent in Setup/Foundational/Polish

---

## Phase 1: Setup

**Purpose**: Create new files required across user stories before any implementation begins.

- [x] T001 [P] Create `src/styles/product-modal.css` (new empty file)
- [x] T002 [P] Create `src/components/ProductDetailsModal.js` (new empty module stub — `export default function ProductDetailsModal() { return null; }`)
- [x] T003 [P] Create `src/components/EditOrderModal.js` (new empty module stub — `export default function EditOrderModal() { return null; }`)
- [x] T004 [P] Create `tests/e2e/product-details.spec.js` (new Playwright spec file with `import { test, expect } from '@playwright/test';` and empty describe block)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data layer changes that ALL user stories depend on — DB schema, lib CRUD, and unit tests.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Extend DB migration in `src/lib/db.js` — inside `openDb()`, after the existing `template_id` `PRAGMA` check, add two more column checks: if `quantity` column absent, run `ALTER TABLE products ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`; if `additional_info` column absent, run `ALTER TABLE products ADD COLUMN additional_info TEXT`; also add `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_order_template ON products (order_id, template_id) WHERE template_id IS NOT NULL` to the `SCHEMA` constant
- [x] T006 Update `src/lib/products.js` — (a) extend `parseRow()` to map `row.quantity` → `quantity` (Number) and `row.additional_info` → `additionalInfo` (string or null); (b) add `quantity = 1` and `additionalInfo = null` parameters to `createProduct(orderId, name, templateId, quantity, additionalInfo)` and pass them into the INSERT; (c) forward `quantity` and `additionalInfo` through `createProductFromTemplate(orderId, templateId, quantity, additionalInfo)`; (d) add new exported function `updateProduct(productId, fields)` that accepts `{ quantity?, additionalInfo? }`, builds a parameterized UPDATE for only the provided fields, and returns the updated parsed row (or null if not found)
- [x] T007 Extend unit tests in `tests/unit/lib/products.test.js` — add test cases for: `createProduct()` persists `quantity` and `additionalInfo` and `parseRow()` returns them; `createProduct()` with default params stores `quantity=1` and `additionalInfo=null`; `updateProduct()` updates `quantity` only, `additionalInfo` only, and both together; `updateProduct()` returns null for unknown productId; inserting the same `templateId` twice for the same `orderId` throws a constraint error

**Checkpoint**: DB schema updated and data layer CRUD is complete. All user stories can now be implemented.

---

## Phase 3: User Story 1 — Enter Quantity & Notes During Order Creation (Priority: P1) 🎯 MVP

**Goal**: Deliver quantity and notes input fields per product in the catalog selection form, persisted to DB on submit.

**Independent Test**: In `AddProductForm` (catalog mode), select a product, set quantity=3, notes="Font Arial", submit. Call `GET /api/products?orderId=X` — response must include `quantity:3` and `additionalInfo:"Font Arial"`. Set quantity=0 and submit — must see validation error, no product created.

- [x] T008 [P] [US1] Extend `src/app/api/products/route.js` — in the POST handler, read `quantity` from request body (coerce to integer, default 1) and `additionalInfo` (string or null, default null); validate `quantity >= 1` and return 400 with `"Cantitatea trebuie să fie un număr întreg pozitiv."` if not; pass both to `createProduct()`; catch SQLite unique constraint violation (error message contains `UNIQUE constraint failed`) and return 409 with `"Produsul există deja în această comandă."`
- [x] T009 [P] [US1] Extend integration tests in `tests/integration/api/products.test.js` — add test cases for: POST with `quantity:3` and `additionalInfo:"test"` returns 201 and persisted values match; POST with `quantity:0` returns 400; POST with `quantity:-1` returns 400; POST of same `templateId` to same order twice returns 409 on second call
- [x] T010 [US1] Modify `src/components/AddProductForm.js` — in catalog mode, after a template is added to `selected`, render a per-template detail section below the chips: for each selected template show a quantity `<input type="number" min="1" defaultValue={1}>` labeled "Cantitate" and a `<textarea>` labeled "Informații suplimentare"; store details as `templateDetails` state map `{ [templateId]: { quantity: number, additionalInfo: string } }`; on submit, pass `quantity` and `additionalInfo` from `templateDetails` (defaulting to 1 / null) to the POST body for each template; show validation error inline if any quantity < 1 before submit

**Checkpoint**: Products created from catalog now carry quantity and notes. `GET /api/products` returns both fields.

---

## Phase 4: User Story 2 — View Quantity on Card & Notes via Long-Press Modal (Priority: P2)

**Goal**: Each product card permanently shows quantity badge; 2-second hold triggers gradient fill animation then opens notes modal; Tab + Enter/Space opens modal instantly for keyboard users.

**Independent Test**: Open an order with saved products (quantity > 1, additionalInfo set). Confirm quantity badge visible without interaction. Hold card 2s → gradient sweeps left-to-right → modal opens with correct notes. Release before 2s → gradient resets, no modal. Tab to card → press Enter → modal opens. Card with null additionalInfo → long-press has zero effect.

- [x] T011 [P] [US2] Add gradient animation styles to `src/styles/product-board.css` — add `--hold-progress: 0` CSS custom property to `.product-card`; add `.product-card::before` pseudo-element with `content:''`, `position:absolute`, `inset:0`, `pointer-events:none`, `border-radius` matching card, `background: linear-gradient(to right, rgba(99,102,241,0.18) calc(var(--hold-progress) * 100%), transparent 0)`, `opacity:0`, `transition: opacity 0.1s`; add `.product-card--holding::before { opacity: 1; }`; ensure `.product-card` has `position: relative` and `overflow: hidden`
- [x] T012 [P] [US2] Implement `src/styles/product-modal.css` — `.product-modal-overlay`: fixed, inset 0, background rgba(0,0,0,0.4), display flex, align-items center, justify-content center, z-index 1000, opacity 0, pointer-events none, transition opacity 0.15s; `.product-modal-overlay--open`: opacity 1, pointer-events auto; `.product-modal-content`: background white, border-radius 8px, padding 24px, max-width 480px, width 90%, max-height 70vh, overflow-y auto, transform scale(0.96), transition transform 0.15s; `.product-modal-overlay--open .product-modal-content`: transform scale(1); `.product-modal-title`: font-weight bold, margin-bottom 12px; `.product-modal-body`: white-space pre-wrap, line-height 1.5; `.product-modal-close`: position absolute top-right, background none, border none, cursor pointer, font-size 1.25rem
- [x] T013 [P] [US2] Implement `src/components/ProductDetailsModal.js` — renders as React portal into `document.body`; accepts props `{ product, onClose }`; imports `product-modal.css`; returns overlay div with class `product-modal-overlay` + `product-modal-overlay--open` when mounted (use `useEffect` to add open class after first render for CSS transition to fire); inside: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="pdm-title"`; product name as `<h2 id="pdm-title" className="product-modal-title">`; additionalInfo as `<p className="product-modal-body">`; "×" close button calling `onClose`; backdrop click on overlay (but not content) calls `onClose`; Escape key listener via `useEffect` calls `onClose`
- [x] T014 [US2] Rewrite `src/components/ProductCard.js` — (a) add quantity badge: `<span className="product-card-qty">×{product.quantity}</span>` rendered after product name; (b) add `tabIndex={0}` to card div; (c) add `onKeyDown` handler: if `(e.key === 'Enter' || e.key === ' ') && product.additionalInfo` prevent default and `setModalOpen(true)`; (d) add long-press logic using `useRef` for timerId and rafId: on `mousedown`/`touchstart` (only when `product.additionalInfo` is truthy) record `startTime = Date.now()`, start RAF loop that sets `card.style.setProperty('--hold-progress', Math.min((Date.now()-startTime)/2000, 1))` and adds `.product-card--holding`, on reaching 2000ms clears RAF, removes class, sets `--hold-progress` to 0, calls `setModalOpen(true)`; `mouseup`/`mouseleave`/`touchend`/`touchcancel` cancel timer and RAF, remove `.product-card--holding`, reset `--hold-progress` to 0; (e) render `{modalOpen && <ProductDetailsModal product={product} onClose={() => setModalOpen(false)} />}`; add `.product-card-qty` styles to `src/styles/product-board.css` (small badge, muted text, font-size 0.75rem)
- [x] T015 [US2] Add e2e tests to `tests/e2e/product-details.spec.js` — test: quantity badge is visible on card without any interaction; long-press via `page.mouse.down()` held 2100ms opens modal containing correct additionalInfo text; releasing mouse before 2000ms causes no modal to appear; pressing Tab to focus card then Enter opens modal; pressing Space on focused card opens modal; card with no additionalInfo shows no gradient and no modal on hold; modal closes on backdrop click; modal closes on Escape key

**Checkpoint**: Product cards display quantity; long-press triggers gradient fill and opens notes modal; keyboard users can access notes via Enter/Space.

---

## Phase 5: User Story 3 — Edit Existing Order Products (Priority: P3)

**Goal**: "Editează" button in order accordion header opens a modal listing all current products with editable quantity and notes; save PATCHes each changed product.

**Independent Test**: Create order with products (via US1 flow). Click "Editează" in accordion header. Change quantity of first product to 7 and notes to "Modificat". Click Save. Modal closes. Card shows ×7. Long-press reveals "Modificat".

- [x] T016 [P] [US3] Extend `src/app/api/products/[id]/route.js` — in PATCH handler, in addition to `status`, accept `quantity` (integer ≥ 1) and `additionalInfo` (string or null); if `status` is present, call existing `updateProductStatus()`; if `quantity` or `additionalInfo` is present, call new `updateProduct()`; if both are present, apply both; if neither recognized field is present, return 400 `"Cel puțin un câmp trebuie furnizat."`; validate `quantity >= 1` if provided; return updated product
- [x] T017 [P] [US3] Implement `src/components/EditOrderModal.js` — on open, fetch `GET /api/products?orderId={orderId}` and store products in state; render list of products, each with read-only name, number input for quantity (min=1), textarea for additionalInfo; track dirty state per product; on "Salvează" button click, PATCH `/api/products/{id}` for each product where quantity or additionalInfo differs from loaded value (skip unchanged products); on all PATCHes succeed, call `onSaved()` then `onClose()`; on any error, show error message; renders as portal using same `.product-modal-overlay` and `.product-modal-content` classes from `product-modal.css`; accepts props `{ orderId, onClose, onSaved }`
- [x] T018 [P] [US3] Extend integration tests in `tests/integration/api/products.test.js` — add test cases for: PATCH `/api/products/{id}` with `{ quantity: 5 }` updates quantity and returns updated product; PATCH with `{ additionalInfo: null }` clears additionalInfo; PATCH with `{ quantity: 0 }` returns 400; PATCH with empty body `{}` returns 400; PATCH with `{ status: "printare", quantity: 2 }` updates both fields
- [x] T019 [US3] Modify `src/components/OrderRow.js` — add `onEdit` prop to function signature; add "Editează" button inside `.order-row-header` after the status badge (before delete button): `<button className="order-row-edit" aria-label={...} onClick={(e) => { e.stopPropagation(); onEdit(order.id); }}>Editează</button>`; add `.order-row-edit` style to `src/styles/order-list.css` (ghost/secondary button style consistent with existing design)
- [x] T020 [US3] Modify `src/components/OrderList.js` — add `editingOrderId` state (null initial); add `handleEditOrder(orderId)` that sets `editingOrderId`; pass `onEdit={handleEditOrder}` to each `<OrderRow>`; render `{editingOrderId && <EditOrderModal orderId={editingOrderId} onClose={() => setEditingOrderId(null)} onSaved={handleProductChange} />}` at bottom of return

**Checkpoint**: All three user stories are complete and independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: UX guard against duplicate selection and final validation.

- [x] T021 [P] Add duplicate guard to `src/components/AddProductForm.js` — on mount and when `orderId` changes (add `orderId` prop if not already present), fetch `GET /api/products?orderId={orderId}` to get the list of already-added `templateId`s; pass this list to `CatalogSelector` as an `excludedIds` prop; modify `src/components/CatalogSelector.js` to accept `excludedIds?: string[]` and filter them out of the `filtered` dropdown options
- [x] T022 Run all 9 validation scenarios from `specs/004-order-product-details/quickstart.md` manually against the running dev server and confirm each passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — T001–T004 all start immediately in parallel
- **Phase 2 (Foundational)**: After Phase 1 — T005 → T006 → T007 (sequential; each builds on previous)
- **Phase 3 (US1)**: After Phase 2 — T008 and T009 parallel, T010 after T008
- **Phase 4 (US2)**: After Phase 2 — T011/T012/T013 parallel, T014 after T011+T013, T015 after T014
- **Phase 5 (US3)**: After Phase 2 — T016/T017/T018 parallel, T019 then T020 sequential
- **Phase 6 (Polish)**: After Phases 3, 4, 5 complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no dependency on US2 or US3
- **US2 (P2)**: After Phase 2 — benefits from US1 data but is independently testable
- **US3 (P3)**: After Phase 2 — no dependency on US1 or US2

### Within US2 (long-press — tightest internal dependencies)

```
T011 (CSS gradient)   ─┐
T012 (modal CSS)       ├─→ T014 (ProductCard.js) → T015 (e2e tests)
T013 (modal component)─┘
```

---

## Parallel Execution Examples

### Phase 1 — all 4 tasks simultaneously

```
T001  src/styles/product-modal.css stub
T002  src/components/ProductDetailsModal.js stub      } all simultaneously
T003  src/components/EditOrderModal.js stub
T004  tests/e2e/product-details.spec.js stub
```

### Phase 4 (US2) — CSS + component in parallel before card

```
T011  product-board.css gradient styles
T012  product-modal.css overlay styles               } simultaneously
T013  ProductDetailsModal.js implementation
         ↓ (all three complete)
T014  ProductCard.js (imports T013, uses T011 classes)
         ↓
T015  e2e tests
```

### Phase 5 (US3) — API + modal in parallel

```
T016  PATCH API extension
T017  EditOrderModal.js implementation               } simultaneously
T018  integration tests
         ↓ (all three complete)
T019  OrderRow.js — "Editează" button
         ↓
T020  OrderList.js — wire modal
```

---

## Implementation Strategy

### MVP First (US1 only — Phases 1 + 2 + 3)

1. Complete Phase 1 (T001–T004)
2. Complete Phase 2 (T005–T007)
3. Complete Phase 3 (T008–T010)
4. **Stop and validate**: Run quickstart Scenarios 1 and 2

### Incremental Delivery

1. MVP above → products have qty+notes persisted ✅
2. Add Phase 4 (US2) → quantity badge + long-press modal + keyboard access ✅
3. Add Phase 5 (US3) → edit existing order products ✅
4. Phase 6 → polish + full validation ✅

---

## Notes

- No new npm dependencies — entire feature built on existing stack (Next.js 14, React 18, node:sqlite, Jest, Playwright)
- Long-press uses `requestAnimationFrame` loop, not `setInterval` — avoids drift and stays in sync with browser paint cycle (see `research.md` Decision 1)
- Gradient animation uses CSS custom property `--hold-progress` updated from JS — no keyframe needed, progress reflects real elapsed time (see `research.md` Decision 2)
- DB migration follows exact pattern of `template_id` check at `src/lib/db.js:46-51` (see `research.md` Decision 3)
- UNIQUE index is partial (`WHERE template_id IS NOT NULL`) — manual products with `templateId=null` are not constrained
- `updateProduct()` must be a partial update — only fields present in the `fields` object are written to the DB (build dynamic SQL or two separate UPDATE paths)
- Both `ProductDetailsModal` and `EditOrderModal` use React portals to `document.body` to avoid z-index conflicts with the Kanban board (see `research.md` Decision 6)
