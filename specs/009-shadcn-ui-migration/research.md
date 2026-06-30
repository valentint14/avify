# Research: Migration to shadcn/ui + Tailwind CSS v4

**Feature**: 009-shadcn-ui-migration
**Date**: 2026-06-30

---

## Decision 1: Tailwind CSS v4 with the PostCSS pipeline on Next 14

**Decision**: Use Tailwind v4 via the `@tailwindcss/postcss` plugin and a `postcss.config.mjs`. The global stylesheet starts with `@import "tailwindcss";` and declares design tokens in a `@theme { … }` block (CSS-first config). No large `tailwind.config.js` content file is needed — Tailwind v4 auto-detects sources.

**Rationale**: Tailwind v4's first-class integration is the PostCSS plugin (or the Vite plugin, which Next doesn't use). The CSS-first `@theme` approach keeps everything — utility generation and token definitions — in the single global stylesheet the spec requires (FR-007), avoiding a second config surface.

**Alternatives considered**:
- Tailwind v3 (`tailwind.config.js` + `content` globs): rejected — the user explicitly requires v4.
- Tailwind CLI build step: unnecessary; PostCSS integrates with Next's existing build.

---

## Decision 2: shadcn/ui on a JavaScript (non-TS) project

**Decision**: Configure shadcn via `components.json` with `"tsx": false` and the `@/` alias, so generated components are `.jsx`/`.js`. Provide `src/lib/utils.js` exporting `cn()` (clsx + tailwind-merge). Generate components on demand into `src/components/ui`.

**Rationale**: The project is JavaScript-only (no TypeScript). shadcn supports JS output with `tsx:false`. Components are copied into the repo (not a dependency), so we own and can adjust them — consistent with the "shared component library lives in `@/components/ui`" requirement.

**Alternatives considered**:
- Introduce TypeScript for the UI layer only: rejected — out of scope, adds toolchain complexity and a mixed codebase.
- Hand-write equivalents of Radix primitives: rejected — reinvents accessibility shadcn already provides.

---

## Decision 3: `@/` path alias without tsconfig

**Decision**: Add a root `jsconfig.json` mapping `"@/*": ["./src/*"]`. Next 14 reads `jsconfig.json` for path aliases and IDE support.

**Rationale**: shadcn's import convention is `@/components/ui/...` and `@/lib/utils`. A `jsconfig.json` provides the alias for both Next's bundler and editor tooling without adopting TypeScript.

**Alternatives considered**:
- Relative imports only (no alias): rejected — shadcn-generated files use `@/` internally; rewriting every generated import is brittle.

---

## Decision 4: Visual direction — adopt shadcn defaults, preserve semantic accents

**Decision** (from spec clarification): Adopt shadcn's default neutral design language (a base color such as `slate`/`zinc`), keep the existing page layouts, and re-map the app's semantic accents onto theme tokens: event types (nuntă `#7c3aed`, botez `#0891b2`), statuses (in_progres/finalizata), low-stock warning, collected/delivered. These become CSS variables in the `@theme` block and are applied through `Badge` variants and utility classes.

**Rationale**: Migrating to a component library implies embracing its look; preserving only the *semantic* accents keeps meaning (a glanceable board) without re-creating the old bespoke styling. Lowest effort for the cleanest, consistent result.

**Alternatives considered**:
- Pixel-perfect reproduction of the current look: rejected via clarification — higher theming effort, defeats the point of adopting the library's design.
- Drop all accents for a fully generic look: rejected — loses status/event-type differentiation the workflow relies on.

---

## Decision 5: Confirmations & dialogs → Radix-backed Dialog / AlertDialog

**Decision**: Migrate the edit-order and product-details modals to shadcn `Dialog`, and the two-step delete confirmations (order in the edit modal, product on the card) to shadcn `AlertDialog`. Both provide focus trap/restore, Escape-to-close, and correct ARIA roles out of the box.

**Rationale**: Satisfies FR-004 (shared dialog component) and FR-009/US3 (accessibility: focus management, roles). `AlertDialog` is the idiomatic shadcn pattern for destructive confirmations and preserves the "two-step confirm" behavior the user asked for, now accessible by construction.

**Alternatives considered**:
- Keep the current hand-rolled inline confirms styled with utilities: works visually but re-implements focus management that Radix gives for free; rejected for the accessibility win.

---

## Decision 6: Orders list & Kanban board presentation

**Decision**: Render the orders list with `Card` + a `Collapsible` (Radix) per order for expand/collapse, `Badge` for status/collected/delivered, and `Button` for actions. The Kanban board keeps its native HTML5 drag-and-drop handlers untouched; only the column/card chrome is restyled (`Card`, `Badge`, utility flex/grid). Where a genuine tabular display is warranted, use shadcn `Table`.

**Rationale**: There are no literal `<table>` elements today; the "tables" are the orders accordion and board grids. `Collapsible`/`Card`/`Badge` map cleanly and preserve current structure. Keeping DnD handlers as-is avoids regressing the board (spec edge case).

**Alternatives considered**:
- shadcn `Accordion` for orders: viable, but the current per-order independent expand (multiple open at once) maps more directly to one `Collapsible` per row than to a single `Accordion` with `type="multiple"`. Either is acceptable; `Collapsible` keeps existing state logic in `OrderList` unchanged.
- A drag-and-drop library (dnd-kit): out of scope — retain the working native DnD.

---

## Decision 7: Test decoupling via `data-testid`

**Decision** (from spec clarification): Add `data-testid` attributes to the elements E2E tests rely on (order rows, edit modal, material rows, product cards, recipe lines, filter controls, key buttons), and update Playwright selectors to use `getByTestId`. Class-based selectors tied to old CSS are removed from tests.

**Rationale**: shadcn/Radix markup and class names differ entirely from the bespoke CSS; pinning tests to `data-testid` decouples them from styling (SC-007) and prevents this kind of churn on future restyles.

**Alternatives considered**:
- Role/text selectors (`getByRole`): used where natural (dialogs, buttons), but `data-testid` is the primary, stable anchor per the clarification.
- Re-adding legacy class names as hooks: rejected in clarification — mixes old/new conventions.

---

## Decision 8: Migration sequencing — incremental, delete-as-you-go

**Decision**: Land the foundation first (Tailwind v4, shadcn init, `cn()`, theme tokens, `@/` alias), then migrate one surface at a time (navigation → forms/inputs → dialogs/confirmations → orders list + board → catalog/recipes → materials), deleting each legacy stylesheet as the last consumer is converted, and repointing tests per surface.

**Rationale**: Keeps the app runnable throughout, isolates regressions to the surface being migrated, and ensures no page is left half-styled. The final state has zero legacy stylesheets (FR-007/SC-003).

**Alternatives considered**:
- Big-bang rewrite of all components at once: higher risk, harder to bisect regressions; rejected.
