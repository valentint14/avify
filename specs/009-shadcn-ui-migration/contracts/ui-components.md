# UI Component Contracts: shadcn/ui Migration

**Feature**: 009-shadcn-ui-migration
**Date**: 2026-06-30

This is a presentation-layer migration — there are **no API contracts**. The contracts here are (1) the shared UI component surface, (2) the per-app-component migration contract, and (3) the stable test-selector contract.

---

## 1. Shared UI surface (`@/components/ui`)

Each generated component is the single source of truth for its control type. App code MUST import from here rather than styling native elements.

| Component | Exports (typical) | Behavior contract |
|---|---|---|
| `button` | `Button` | variants `default \| secondary \| destructive \| outline \| ghost`; sizes; `disabled`; renders `<button>`; keyboard-activatable |
| `input` | `Input` | controlled `<input>`; forwards `type`, `value`, `onChange`, `disabled`, `aria-*` |
| `textarea` | `Textarea` | controlled `<textarea>` |
| `label` | `Label` | associates with control via `htmlFor` |
| `select` | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` | Radix select; full keyboard nav; controlled via `value`/`onValueChange` |
| `dialog` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `DialogClose` | focus trap + restore, Esc close, overlay click close, `role="dialog"` `aria-modal` |
| `alert-dialog` | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogAction`, `AlertDialogCancel`, … | destructive-confirm pattern; focus trap; `role="alertdialog"` |
| `badge` | `Badge` | variants mapped to semantic tokens (status/event/collected/delivered/low-stock) |
| `card` | `Card`, `CardHeader`, `CardContent`, `CardFooter`, … | surface container |
| `collapsible` | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | per-order expand/collapse |
| `checkbox` | `Checkbox` | accessible checkbox (collected/delivered toggles, catalog multi-select) |
| `separator` | `Separator` | visual divider |
| `table` *(if used)* | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | only for genuinely tabular displays |

**Invariant**: app components contain no bespoke control markup styled by a deleted stylesheet; every control is one of the above (or pure Tailwind utilities for layout).

---

## 2. Per-component migration contract

For each of the 17 app components, the contract is **"same props in, same behavior out, new presentation"**:

| Component | Must preserve | Migrated to |
|---|---|---|
| `Navbar` | links, active state, `aria-current` | utility-styled nav |
| `OrderList` | filter state, multi-expand `Set`, derived lists, empty states | `Card`+`Collapsible`, utilities |
| `OrderRow` | total/profit/badges, edit action, expand toggle | `Card`, `Badge`, `Button` |
| `OrderFilters` | 5 filter dimensions, reset, dynamic options | `Input`, `Select`, `Button` |
| `AddOrderForm` | create + validation + error | `Input`, `Button` |
| `EditOrderModal` | load, edit all fields, save, inline delete confirm, live total | `Dialog` + `AlertDialog`, form components |
| `ProductBoard` | columns, **native DnD**, add product, refresh | `Card`/utilities (DnD handlers unchanged) |
| `ProductColumn` | drop target, drag-over state | utilities; keep drop handlers |
| `ProductCard` | drag source, status, qty, delete confirm, details open | `Card`/`Badge` + `AlertDialog` |
| `ProductDetailsModal` | show additional info | `Dialog` |
| `AddProductForm` | catalog/manual modes, add | `Input`/`Select`/`Button` |
| `CatalogPage` | CRUD, inline edit, recipe toggle | `Card`/`Button`/`AlertDialog` |
| `CatalogProductForm` | name/description + validation | `Input`/`Button` |
| `CatalogSelector` | multi-select behavior | `Checkbox` list / `Command`+`Popover` |
| `RecipeEditor` | lines add/remove, dedupe, qty validate, save | `Select`/`Input`/`Button` |
| `MaterialsPage` | CRUD, inline edit, low-stock alert | `Card`/`Button`/`Badge` |
| `MaterialForm` | 4 fields + validation | `Input`/`Button` |

No component's `props`, state shape, or fetch/handler logic changes.

---

## 3. Test-selector contract (`data-testid`)

- Every element an E2E test targets MUST expose a `data-testid` (see [data-model.md](../data-model.md) for the id list).
- Playwright tests select via `getByTestId(...)` (or `getByRole(...)` where idiomatic for dialogs/buttons); **no** selector may depend on a legacy CSS class.
- Unit/integration tests (which target `src/lib`) are unaffected.

**Acceptance**: grepping the E2E specs for legacy class selectors (`.order-row`, `.edit-modal`, `.material-row`, `.product-card`, etc.) returns nothing; the suite passes (SC-001, SC-007).

---

## 4. Tooling contract

- `components.json` present with `"tsx": false`, base color chosen, aliases `@/components` and `@/lib/utils`.
- `jsconfig.json` maps `@/*` → `./src/*`.
- `postcss.config.mjs` enables `@tailwindcss/postcss`.
- `src/lib/utils.js` exports `cn(...)`.
- `src/app/globals.css` is the ONLY stylesheet: `@import "tailwindcss";` + `@theme` tokens + base layer.
