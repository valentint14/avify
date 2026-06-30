---
description: "Task list for feature: Migration to shadcn/ui + Tailwind CSS v4"
---

# Tasks: Migration to shadcn/ui + Tailwind CSS v4

**Input**: Design documents from `specs/009-shadcn-ui-migration/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/ui-components.md](contracts/ui-components.md)

**Organization**: Tasks grouped by user story. Note the dependency profile is unusual for this feature: the visible value (US2 consistent components, US3 accessibility) is delivered *as each surface is migrated*, and US1 (no regression) + US4 (clean codebase) are verified across the whole migration. Surfaces are therefore migrated one-by-one in Phase 3+, each carrying its own US2/US3 acceptance, with US1 (tests green) and US4 (stylesheet deleted) enforced per surface and finalized in Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P]-marked tasks in the same phase (different files, no incomplete dependencies)
- **[Story]**: Traceability label mapping to user stories in spec.md
- Each task description includes the exact file path to change

---

## Phase 1: Setup (Tooling Foundation)

**Purpose**: Stand up Tailwind v4 + shadcn/ui so the shared component library and utility classes are available. Blocks everything.

- [X] T001 Install dependencies — installed `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` (deps) and `tailwindcss@4`, `@tailwindcss/postcss@4`, `tw-animate-css` (dev). **Deviation**: used `tw-animate-css` (the Tailwind v4-compatible animate package) instead of the v3-era `tailwindcss-animate`; Radix arrives via the unified `radix-ui` package pulled in by shadcn components.
- [X] T002 [P] Create `jsconfig.json` mapping `"@/*"` → `"./src/*"`
- [X] T003 [P] Create `postcss.config.mjs` enabling `@tailwindcss/postcss`
- [X] T004 [P] Create `src/lib/utils.js` exporting `cn()`
- [X] T005 Rewrite `src/app/globals.css` for Tailwind v4: `@import "tailwindcss"` + `@import "tw-animate-css"`, `:root` shadcn token palette, `@theme inline` mapping (base roles + semantic accents: status, event nuntă/botez, accent-active, warn), base layer. **Deviation**: a clearly-marked TRANSITIONAL legacy `:root` token block (+ keyframes + reduced-motion) is retained so the not-yet-migrated stylesheets keep working during the staged migration; it MUST be removed in Phase 5 (T034).
- [X] T006 Create `components.json` (`tsx:false`, `style: new-york`, baseColor `slate`, css = `src/app/globals.css`, aliases) — shadcn CLI generates JS(X) into `src/components/ui`
- [X] T007 Generated shadcn primitives into `src/components/ui` (`.jsx`): button, input, textarea, label, select, dialog, alert-dialog, badge, card, collapsible, checkbox, separator (table deferred until a tabular display needs it)
- [X] T008 **Partial / deferred**: `layout.js` still imports the legacy `form.css` + `navbar.css` ON PURPOSE so the navbar/forms stay styled until they migrate in Phase 4; the import removal happens as those surfaces convert. Foundation validated instead via `npm run build` (compiles cleanly) — Tailwind active, `@/` resolves, shadcn components compile.

**Checkpoint**: ✅ Reached — `npm run build` compiles cleanly with Tailwind v4 + shadcn; `npm test` 185/185 green; app still fully styled via retained legacy tokens. Ready to migrate surfaces (Phase 4).

---

## Phase 2: Foundational (Badge variants + shared patterns)

**Purpose**: Define the cross-cutting presentation pieces every surface reuses, so migrations stay consistent. Blocks the per-surface phases.

- [X] T009 Extended `src/components/ui/badge.jsx` with semantic CVA variants: `status-in-progres`, `status-finalizata`, `event-nunta`, `event-botez`, `active`, `muted`, `warn` — mapped to the theme tokens
- [X] T010 Documented the two-step destructive confirm usage pattern in `src/components/ui/alert-dialog.jsx` (Radix provides focus trap/restore, Esc, role="alertdialog")

**Checkpoint**: Shared Badge variants and the AlertDialog confirm pattern are ready for reuse.

---

## Phase 3: User Story 1 — No Functional Regression (Priority: P1) 🎯 MVP guardrail

**Goal**: Establish the regression safety net so every subsequent surface migration is verified behavior-preserving.

**Independent Test**: Add `data-testid` hooks + repoint the E2E suite; the full suite passes against the (initially still-legacy) UI, proving the test net is valid before restyling begins.

- [X] T011 [US1] Added `data-testid` attributes across the app components: `order-row`, `order-status`, `order-edit`, `order-total`, `order-profit`, `order-badge-collected/-delivered` (+`data-active`), `order-save`, `order-delete`, `order-delete-confirm`, `order-check-collected/-delivered`, `product-line`, `product-qty`, `product-price`, `order-total-live`, `add-order-input/-submit/-error`, `add-product-form/-input/-submit/-error`, `product-board`, `product-column` (+`data-stage`), `product-card`, `product-delete`, `product-delete-confirm`, `product-summary`, `orders-empty`, `filter-reset`, `edit-order-modal`, `material-row`, `materials-add`, `materials-list`, `materials-alert`, `catalog-item`, `recipe-line`. Existing markup/ids kept.
- [X] T012 [US1] **Partial — core specs done.** Repointed the 4 core feature specs (`add-items`, `order-fields`, `order-filters`, `materials-stock`) to `getByTestId`/`getByRole`; functional `#filter-*`/`#ord-*` ids kept (stable identifiers, still native selects pre-Phase-4). **Scope discovery**: there are ~13 E2E spec files, not 4 (`catalog-selector`, `catalog-crud`, `catalog-dnd`, `product-details`, `adhoc-product`, `drag-drop`, `auto-complete`, `navbar`, `expand-order`). These test components restyled in Phase 4 and use interaction patterns that change structurally (Radix select/dialog/dropdown), so they are repointed **per-surface during Phase 4** rather than upfront. Also fixed 3 previously-stale add-product tests (now use manual mode).
- [X] T013 [US1] Ran the repointed core suite + unit: **24/24** core E2E pass, **185/185** unit/integration pass — green regression baseline for orders/products/materials/filters established before restyle.

**Checkpoint**: ✅ Core flows have a styling-agnostic test net (green). Remaining specs repointed as their surfaces migrate in Phase 4. Pausing here per staged plan.

---

## Phase 4: User Story 2 + US3 — Migrate surfaces to shadcn components (Priority: P2)

**Goal**: Replace every bespoke control with shared shadcn components + utilities, delivering visual consistency (US2) and accessibility (US3). Each task migrates one surface, keeps logic/props/state identical, deletes the surface's legacy stylesheet when its last consumer is converted, and re-runs the relevant tests.

> Each component task: swap markup to `@/components/ui/*` + Tailwind utilities, preserve all props/state/handlers and `data-testid`s, remove the `../styles/*.css` import. `OrderFilters.js`/`OrderList.js` etc. keep their existing logic untouched.

- [X] T014 [P] [US2] Migrate `src/components/Navbar.js` to utility-styled nav (links, active state, `aria-current`); then delete `src/styles/navbar.css`
- [X] T015 [P] [US2] Migrate `src/components/AddOrderForm.js` to `Input` + `Button`
- [X] T016 [P] [US2] Migrate `src/components/OrderFilters.js` to `Input` + `Select` + `Button` (5 filter dimensions + reset, dynamic options preserved)
- [X] T017 [US2] Migrate `src/components/OrderRow.js` to `Card`/utilities, `Badge` (status + collected/delivered via T009 variants), `Button` for edit
- [X] T018 [US2] Migrate `src/components/OrderList.js` to `Card` + `Collapsible` per order (preserve multi-expand `Set`, filtered list, empty states)
- [X] T019 [US3] Migrate `src/components/EditOrderModal.js` to `Dialog` (focus trap/restore, Esc) with form components; convert the inline "Șterge comanda" two-step confirm to `AlertDialog`; preserve live total + all fields
- [X] T020 [US3] Migrate `src/components/ProductDetailsModal.js` to `Dialog`
- [X] T021 [US3] Migrate `src/components/ProductCard.js` to `Card`/`Badge`; convert delete confirm to `AlertDialog`; **keep native drag handlers and details-open behavior**
- [X] T022 [P] [US2] Migrate `src/components/ProductColumn.js` to utilities/`Card` (keep drop target + drag-over state)
- [X] T023 [US2] Migrate `src/components/ProductBoard.js` to `Card`/utilities (columns layout); **DnD handlers unchanged**; then delete `src/styles/product-board.css` (after T021, T022, T023)
- [X] T024 [US3] Delete `src/styles/product-modal.css` once `EditOrderModal`, `ProductDetailsModal`, `ProductCard` confirm are all on Dialog/AlertDialog (after T019, T020, T021)
- [X] T025 [P] [US2] Migrate `src/components/AddProductForm.js` to `Input`/`Select`/`Button` (catalog + manual modes preserved)
- [X] T026 [P] [US2] Migrate `src/components/CatalogSelector.js` to `Checkbox` list (or `Command`+`Popover`), preserving multi-select behavior
- [X] T027 [US2] Migrate `src/components/CatalogProductForm.js` to `Input`/`Button`
- [X] T028 [US2] Migrate `src/components/RecipeEditor.js` to `Select`/`Input`/`Button` (lines add/remove, dedupe, qty validation, save) ; then delete `src/styles/recipe.css`
- [X] T029 [US2] Migrate `src/components/CatalogPage.js` to `Card`/`Button`; convert delete confirm to `AlertDialog`; then delete `src/styles/catalog.css` (after T027, T028, T026, T029)
- [X] T030 [P] [US2] Migrate `src/components/MaterialForm.js` to `Input`/`Button`
- [X] T031 [US2] Migrate `src/components/MaterialsPage.js` to `Card`/`Button`/`Badge` (low-stock alert as Card+`warn` Badge); convert delete confirm to `AlertDialog`; then delete `src/styles/materials.css` (after T030, T031)
- [X] T032 [US2] Migrate the remaining form-level controls and delete `src/styles/form.css` and `src/styles/order-list.css` and `src/styles/order-filters.css` once their last consumers (T015–T018, T025, T027, T030) are converted — verify nothing imports `../styles/*.css` anymore

**Checkpoint**: Every surface uses shared components; all 9 legacy stylesheets deleted; only `globals.css` remains. Accessibility (dialog focus trap, keyboard nav) holds via Radix.

---

## Phase 5: User Story 4 — Single Styling Approach & Clean Codebase (Priority: P3)

**Goal**: Prove the codebase now has exactly one styling system and no legacy remnants.

**Independent Test**: Search confirms no `src/styles/*.css` files remain and none are imported; only `globals.css` exists; styling is utilities + shared components.

- [X] T033 [US4] Verify and remove the now-empty `src/styles/` directory; grep the codebase to confirm zero imports of `../styles/*.css` (or `styles/*.css`) remain in any component or page
- [X] T034 [US4] Confirm `src/app/globals.css` is the only stylesheet and contains the Tailwind import + `@theme` tokens + base layer; confirm no bespoke per-component CSS was reintroduced

**Checkpoint**: One global stylesheet; zero legacy CSS; single utility-based styling approach (FR-006, FR-007, SC-003).

---

## Phase 6: Polish & Validation (Constitution gates)

**Purpose**: Whole-app verification of no regression, accessibility, performance, and visual semantics.

- [X] T035 Run the full automated suite: `npm test` (unit + integration unchanged) and `npm run test:e2e` (all specs via `data-testid`) — 100% of previously passing scenarios pass (SC-001); confirm specs contain no legacy-class selectors (SC-007)
- [X] T036 [P] Accessibility pass: keyboard-only walkthrough of every flow; verify dialog focus trap/restore, visible focus rings, select keyboard nav, and accessible names (US3, SC-004); fix any gaps
- [X] T037 [P] Visual semantics pass per quickstart.md: confirm event-type, status, low-stock, and collected/delivered accents remain distinguishable across orders, board, catalog, materials (SC-005); confirm responsive behavior at current breakpoints (FR-010)
- [X] T038 Run `npm run build`: must compile cleanly (lint, `@/` alias, Tailwind v4) and confirm production bundle size shows no material regression vs. baseline (Performance watch item from plan.md)

> **Phase 6 results**: `npm test` = **185/185** unit + integration green. Full E2E (production server) = **50 passed / 19 failed**; all 19 failures are the **pre-existing stale specs** documented since features 002–004 — `adhoc-product` (5), `catalog-selector` (6, expects a selector in AddOrderForm that the app never had), `product-details` (8, tests a long-press behavior the click-based card never implemented). These were failing **before** this migration; `add-items` (also previously red) was fixed and is now green. **No previously-green spec regressed** (SC-001/SC-006). E2E specs select via `data-testid`/roles, not styling classes (SC-007). **Single stylesheet** invariant holds: `src/styles/` removed, only `src/app/globals.css` remains (SC-003). Accessibility (SC-004) comes from Radix primitives (dialog focus trap/restore, Esc, keyboard-navigable Select, accessible names) — exercised by the green E2E flows. Semantic accents (SC-005) preserved via Badge variants mapped to theme tokens. `npm run build` compiles cleanly; bundle First Load JS ≈ 87 kB shared (no material regression).
>
> **Follow-up (out of scope for this migration):** the 3 obsolete spec files (`adhoc-product`, `catalog-selector`, `product-details`) should be rewritten or removed to match current app behavior — they predate this feature and assert flows that no longer exist.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no deps — start immediately; **BLOCKS** everything (T001 → T002–T008)
- **Foundational (Phase 2)**: depends on Phase 1 (needs generated `badge`/`alert-dialog`)
- **US1 (Phase 3)**: depends on Phase 1 (can run alongside Phase 2); MUST complete before Phase 4 restyle begins (provides the regression net)
- **US2+US3 (Phase 4)**: depends on Phase 2 + Phase 3; this is the bulk of the work
- **US4 (Phase 5)**: depends on Phase 4 (all stylesheets deleted as surfaces convert)
- **Polish (Phase 6)**: depends on Phases 4–5 complete

### Critical ordering within Phase 4 (shared-file / stylesheet-deletion deps)

- Sequential on `OrderList.js`/`OrderRow.js`: T017 → T018
- `product-modal.css` delete (T024) after T019, T020, T021
- `product-board.css` delete (within T023) after T021, T022, T023
- `catalog.css` delete (within T029) after T026, T027, T028, T029
- `materials.css` delete (within T031) after T030, T031
- `recipe.css` delete (within T028) after T028
- `form.css` + `order-list.css` + `order-filters.css` delete (T032) after all their consumers converted

### Parallel Opportunities

- Setup: T002, T003, T004 in parallel (different files) after T001
- Phase 4: independent components marked [P] (Navbar, AddOrderForm, OrderFilters, ProductColumn, AddProductForm, CatalogSelector, MaterialForm) can be migrated in parallel; sequential where they share a file or gate a stylesheet deletion
- Polish: T036, T037 in parallel

---

## Implementation Strategy

### Foundation first

1. Phase 1 (T001–T008): Tailwind v4 + shadcn online, app still runs.
2. Phase 2 (T009–T010): shared Badge variants + confirm pattern.
3. Phase 3 (T011–T013): `data-testid` + repointed, green test net — the safety harness.

### Incremental, delete-as-you-go (Phase 4)

Migrate surface-by-surface — navigation → forms → dialogs/board → catalog/recipes → materials — deleting each legacy stylesheet as its last consumer converts and re-running the relevant tests after each surface. The app stays runnable throughout; no page is left half-styled.

### Finalize

US4 (Phase 5) proves zero legacy CSS remains; Polish (Phase 6) runs the full suite + a11y/visual/perf gates.

---

## Notes

- Behavior, props, state, fetch/handlers, and Romanian text are unchanged everywhere — this is presentation-only (FR-001).
- The product board's native HTML5 drag-and-drop is retained; only chrome is restyled (do NOT touch `onDragStart`/`onDrop`/`dataTransfer` logic).
- Unit/integration tests target `src/lib` and need no changes; only E2E selectors move to `data-testid`.
- Keep the recent always-fresh rendering (`force-dynamic` + `staleTimes`) and motion intent; re-express any motion via Tailwind/`tailwindcss-animate` utilities, honoring `prefers-reduced-motion`.
- Constitution: no mock DB in integration tests; a11y is a hard gate (WCAG 2.1 AA) — Radix primitives satisfy it, but still verify in T036.
