# Implementation Plan: Materials Stock & Recipe-Based Consumption

**Branch**: `008-materials-stock` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-materials-stock/spec.md`

## Summary

Add a "Stoc Materiale" page for managing raw materials (name, current stock, minimum stock, unit), extend the Product Catalog so each catalog product can carry a recipe (material + per-piece consumption), show a persistent low-stock alert on the materials page, and automatically deduct material stock exactly once when an order reaches its finalized state (all products in stage "gata"). Deduction is guarded by a stored per-order marker so it never runs twice and is never reversed (including on order deletion).

The work introduces two new tables (`materials`, `recipe_lines`), one new column on `orders` (`stock_deducted`), three new data-layer modules, a new page + components, and a new navigation link. The consumption math is a pure, unit-testable function; the deduction orchestration hooks into the existing product status-update path.

## Technical Context

**Language/Version**: JavaScript (ES2022) — Node.js 22, React 18.3.1, Next.js 14 (App Router)

**Primary Dependencies**: Node built-in `node:sqlite` (`DatabaseSync`), React (`useState`, `useMemo`); no new npm packages

**Storage**: SQLite at `data/avify.db`; schema extended via the existing idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` guard pattern in `src/lib/db.js`

**Testing**: Jest 29 (unit + integration, 80% coverage floor for `src/lib/`), Playwright 1.49 (E2E, `workers: 1`, real SQLite, no mocks per constitution)

**Target Platform**: Web browser (desktop-first), same responsive approach as the rest of the app

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Materials page renders and low-stock alert computes client-side instantly (<300 ms perceived); stock deduction on completion runs in a single SQLite transaction

**Constraints**: No new npm dependencies; reuse existing raw-SQL + `parseRow` data-layer conventions; deduction MUST be idempotent and transactional; units are free-text labels with no conversion

**Scale/Scope**: Tens of materials, tens of recipe lines per product, hundreds of orders — no indexing or virtualization concerns beyond standard foreign-key indexes

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Spec Gate | ✅ PASS | `spec.md` complete; 2 clarifications resolved; all acceptance scenarios defined |
| Test Gate | ✅ PASS | Pure consumption function + CRUD covered by unit tests; deduction + recipe persistence by integration; user stories by E2E |
| Code Review Gate | ✅ PASS | Follows existing module/route/parseRow patterns; no new architecture |
| Performance Gate | ✅ PASS | Single-transaction deduction; client-side alert; no N+1 (recipes fetched per order in one query) |
| UX Gate | ✅ PASS | Reuses design-system CSS variables, navbar pattern, modal/form patterns |
| No-Placeholder Gate | ✅ PASS | All requirements concrete |

No constitution violations. Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/008-materials-stock/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api.md           ← Phase 1 output
└── tasks.md             ← /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── db.js                    ← MODIFY: add materials + recipe_lines tables, orders.stock_deducted column
│   ├── materials.js             ← NEW: material CRUD + parseRow + low-stock helper
│   ├── recipes.js               ← NEW: recipe-line CRUD scoped to a template + getRecipeForTemplate
│   ├── stock.js                 ← NEW: pure computeConsumption() + transactional deductStockForOrder()
│   ├── navigation.js            ← MODIFY: add "Stoc Materiale" nav link
│   └── products.js              ← (unchanged) status updates flow through the products [id] route
├── app/
│   ├── stoc-materiale/
│   │   └── page.js              ← NEW: server component, loads materials, renders MaterialsPage
│   └── api/
│       ├── materials/
│       │   ├── route.js         ← NEW: GET (list) + POST (create)
│       │   └── [id]/route.js    ← NEW: PATCH (update) + DELETE
│       ├── catalog/[id]/
│       │   └── recipe/route.js  ← NEW: GET + PUT (replace recipe) for a catalog product
│       └── products/[id]/route.js ← MODIFY: after a status change, call deductStockForOrder(orderId)
├── components/
│   ├── MaterialsPage.js         ← NEW: list + add/edit/delete + low-stock alert
│   ├── MaterialForm.js          ← NEW: add/edit a material
│   ├── RecipeEditor.js          ← NEW: recipe lines editor embedded in the catalog item
│   └── CatalogPage.js           ← MODIFY: expose a "Rețetă" editor per catalog product
└── styles/
    ├── materials.css            ← NEW: materials page + alert styling
    └── recipe.css               ← NEW: recipe editor styling

tests/
├── unit/lib/
│   ├── materials.test.js        ← NEW: CRUD + low-stock helper
│   ├── recipes.test.js          ← NEW: recipe CRUD, uniqueness, validation
│   └── stock.test.js            ← NEW: computeConsumption + deductStockForOrder idempotency
├── integration/api/
│   ├── materials.test.js        ← NEW: materials endpoints
│   └── recipe.test.js           ← NEW: catalog recipe endpoint
└── e2e/
    └── materials-stock.spec.js  ← NEW: US1–US4 acceptance scenarios
```

**Structure Decision**: Single Next.js project, following the established layering: raw-SQL data modules in `src/lib/`, thin API routes under `src/app/api/`, client components in `src/components/`. The consumption math lives in a pure `computeConsumption()` function for unit testing; the idempotent transactional `deductStockForOrder()` wraps it and is invoked from the existing product status-update route — no new trigger mechanism is introduced.

## Complexity Tracking

No constitution violations — this section intentionally left empty.
