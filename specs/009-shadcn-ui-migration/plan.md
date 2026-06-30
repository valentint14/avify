# Implementation Plan: Migration to shadcn/ui + Tailwind CSS v4

**Branch**: `009-shadcn-ui-migration` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-shadcn-ui-migration/spec.md`

## Summary

Replace the application's bespoke CSS (9 per-component stylesheets) with a Tailwind CSS v4 + shadcn/ui foundation. Every native/bespoke control — buttons, inputs, textareas, selects, dialogs, the orders list, the Kanban board cards, badges — is re-expressed with shared `@/components/ui` components and Tailwind utility classes. Behavior, data, routing, and business logic are untouched; only the presentation layer changes. The existing semantic accent colors (event types, statuses, low-stock, collected/delivered) are re-mapped onto shadcn theme tokens. Stable `data-testid` hooks are added to key elements and the E2E suite is repointed to them so tests are decoupled from styling.

## Technical Context

**Language/Version**: JavaScript (ES2022, **no TypeScript** — shadcn configured with `"tsx": false`), Node.js 22, React 18.3.1, Next.js 14.2 (App Router)

**Primary Dependencies (new)**:
- `tailwindcss@4` + `@tailwindcss/postcss` (Tailwind v4 PostCSS pipeline)
- shadcn/ui components (generated into `src/components/ui`), built on **Radix UI** primitives (`@radix-ui/react-*`)
- `class-variance-authority`, `clsx`, `tailwind-merge` (variant + class merging — the `cn()` helper)
- `lucide-react` (icon set used by shadcn)
- `tailwindcss-animate` (or v4 equivalent) for component animations

**Storage**: N/A — no data-layer changes.

**Testing**: Jest 29 (unit/integration — unaffected, they target `src/lib`), Playwright 1.49 (E2E — selectors repointed to `data-testid`, `workers: 1`).

**Target Platform**: Web browser (desktop-first), existing responsive behavior retained.

**Project Type**: Web application (Next.js full-stack).

**Performance Goals**: No regression in First Contentful Paint; Tailwind v4 produces a single tree-shaken stylesheet; Radix adds modest JS — keep within current page weight expectations.

**Constraints**:
- Tailwind v4 uses **CSS-first config** (`@import "tailwindcss"; @theme { … }`) — there is no large `tailwind.config.js`; theme tokens live in the single global stylesheet.
- Exactly one global stylesheet remains (`src/app/globals.css`); all 9 legacy stylesheets are deleted.
- New styling exclusively via utility classes + shared components (FR-006).
- `@/` path alias must resolve to `src/` (shadcn import convention) — added via `jsconfig.json`.
- Romanian UI text preserved verbatim.

**Scale/Scope**: 17 components, 3 pages, ~9 stylesheets removed; ~10–14 shadcn ui primitives generated.

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Spec Gate | ✅ PASS | spec complete; 2 clarifications resolved (visual direction, test-id strategy) |
| Test Gate | ✅ PASS | Unit/integration unaffected; E2E repointed to `data-testid`; full suite must stay green (FR-011, SC-001) |
| Code Review Gate | ✅ PASS | Standard component-library adoption; shared `cn()` + CVA variants |
| Performance Gate | ⚠️ WATCH | New runtime deps (Radix/lucide). Mitigation: import only used primitives; verify production build size doesn't regress materially |
| UX Gate | ✅ PASS | This feature *is* the UX-consistency + accessibility upgrade (Radix → WCAG 2.1 AA, focus trap/restore) |
| No-Placeholder Gate | ✅ PASS | All requirements concrete |
| Tech Constraints (deps/CVE) | ✅ PASS | All deps are mainstream, actively maintained; review at install time |

No unjustified violations. The Performance gate is a *watch item*, not a violation — validated by the production build in quickstart.

## Project Structure

### Documentation (this feature)

```text
specs/009-shadcn-ui-migration/
├── plan.md              ← this file
├── research.md          ← Phase 0 output (Tailwind v4 + shadcn-on-JS decisions)
├── data-model.md        ← Phase 1 output (control → shadcn component mapping)
├── quickstart.md        ← Phase 1 output (setup + validation)
├── contracts/
│   └── ui-components.md  ← Phase 1 output (ui inventory + data-testid contract)
└── tasks.md             ← /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
# New tooling / config
jsconfig.json                 ← NEW: "@/*" → "src/*" path alias
postcss.config.mjs            ← NEW: @tailwindcss/postcss plugin
components.json               ← NEW: shadcn config (tsx:false, baseColor, aliases)
src/lib/utils.js              ← NEW: cn() (clsx + tailwind-merge)

# Single global stylesheet (rewritten for Tailwind v4 + theme tokens)
src/app/globals.css           ← REWRITE: @import "tailwindcss"; @theme tokens
                                 (incl. semantic accents) + base layer

# Generated shared components
src/components/ui/            ← NEW: button, input, textarea, label, select,
                                 dialog, alert-dialog, badge, card, table,
                                 checkbox, separator (as needed)

# Migrated app components (markup + classes only; logic unchanged)
src/components/*.js           ← MODIFY all 17: Navbar, OrderList, OrderRow,
                                 OrderFilters, AddOrderForm, EditOrderModal,
                                 ProductBoard, ProductColumn, ProductCard,
                                 ProductDetailsModal, AddProductForm,
                                 CatalogPage, CatalogProductForm,
                                 CatalogSelector, RecipeEditor,
                                 MaterialsPage, MaterialForm

# Pages (drop per-component css imports; keep globals import in layout)
src/app/layout.js             ← MODIFY: import only globals.css
src/app/**/page.js            ← unchanged logic

# Deleted legacy stylesheets (9)
src/styles/form.css           ← DELETE
src/styles/navbar.css         ← DELETE
src/styles/order-list.css     ← DELETE
src/styles/order-filters.css  ← DELETE
src/styles/product-board.css  ← DELETE
src/styles/product-modal.css  ← DELETE
src/styles/catalog.css        ← DELETE
src/styles/recipe.css         ← DELETE
src/styles/materials.css      ← DELETE

# Tests
tests/e2e/*.spec.js           ← MODIFY: select via data-testid
tests/unit, tests/integration ← unchanged (target src/lib)
```

**Structure Decision**: Single Next.js project. Introduce Tailwind v4 (CSS-first) + shadcn/ui under the `@/` alias, generate primitives into `src/components/ui`, then migrate the 17 app components page-by-page, deleting each legacy stylesheet as its consumers are converted. The one global stylesheet holds the Tailwind import, the `@theme` tokens (including re-mapped semantic accents), and base styles — satisfying FR-006/FR-007.

## Complexity Tracking

No constitution violations requiring justification. The only flagged item is the Performance *watch* (new runtime dependencies), mitigated by importing only used primitives and validating bundle size via the production build — not a deviation requiring a complexity entry.
