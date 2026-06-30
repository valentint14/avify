# Data Model: Migration to shadcn/ui + Tailwind CSS v4

**Feature**: 009-shadcn-ui-migration
**Date**: 2026-06-30

---

## Overview

This feature introduces **no data entities** and changes no persisted data, API, or business logic. The "model" here is the mapping from today's bespoke controls/stylesheets to the shared shadcn/ui components and theme tokens, plus the stable test-selector contract.

---

## Theme Tokens (in `globals.css` `@theme`)

| Token (semantic) | Current value | Usage |
|---|---|---|
| event type — nuntă | `#7c3aed` | event badge/accent |
| event type — botez | `#0891b2` | event badge/accent |
| status — in_progres | `#1e40af` on `#dbeafe` | order/product status badge |
| status — finalizata | `#166534` on `#dcfce7` | order/product status badge |
| low-stock warning | `#d97706` / `#92400e` | materials alert + below-min badge |
| collected / delivered (active) | green `#166534` on `#dcfce7` | order row badges |
| danger | `#dc2626` | destructive actions, errors |
| base neutrals (bg/surface/border/text) | existing greys | mapped to shadcn `background`/`card`/`border`/`foreground` |

These remain visually distinguishable after migration (FR-008, SC-005).

---

## Control → shadcn Component Mapping

| Current (bespoke) | shadcn/ui component(s) | Notes |
|---|---|---|
| `.add-form-btn`, `.btn`, `.order-row-edit`, `.material-row-btn`, `.recipe-editor-btn`, `.catalog-form-btn`, `.edit-modal-btn` | `Button` (variants: `default`, `secondary`, `destructive`, `ghost`, `outline`) | all button states unified |
| `.add-form-input`, `.form-input`, `.edit-modal-input`, `.material-form-input`, `.order-filters__input`, `.recipe-line-qty`, `.catalog-form-input` | `Input` | text/number inputs |
| `.edit-modal-textarea` | `Textarea` | additional info |
| `.form-select`, `.edit-modal-input` (select), `.order-filters__select`, `.recipe-line-select` | `Select` | Radix select; keyboard accessible |
| field labels | `Label` | associated via `htmlFor`/`id` |
| `.product-modal-overlay` + `.edit-modal` / `.product-modal-content` (EditOrderModal, ProductDetailsModal) | `Dialog` | focus trap/restore, Esc close |
| inline delete confirms (order footer, product card) | `AlertDialog` | accessible two-step confirm |
| `.status-badge`, `.order-row-badge`, `.material-row-low-badge` | `Badge` (variants per semantic token) | status/event/collected/delivered/low-stock |
| `.order-item` / `.order-row` + expand | `Card` + `Collapsible` | per-order independent expand retained |
| `.product-board`, `.product-column`, `.product-card` | `Card` + `Badge` + utilities | native DnD handlers untouched |
| `.catalog-item`, `.materials-list` rows | `Card` / utility rows (or `Table` where tabular) | consistent spacing |
| `.navbar`, `.navbar-link` | utility-styled nav (links + active state) | brand + links |
| multi-select (`CatalogSelector`) | `Checkbox` list / `Command`+`Popover` | restyle, keep behavior |

---

## shadcn primitives to generate (`src/components/ui`)

`button`, `input`, `textarea`, `label`, `select`, `dialog`, `alert-dialog`, `badge`, `card`, `collapsible`, `checkbox`, `separator`, and `table` (only if a tabular display is used). Generated as JS (`tsx:false`).

---

## `data-testid` Contract (stable test selectors)

Tests select via these ids instead of styling classes (FR-013, SC-007). Names mirror the current class-based anchors so the test intent is preserved:

| Element | `data-testid` |
|---|---|
| Order row (per order) | `order-row` (+ accessible name with order name) |
| Order edit button | `order-edit` |
| Edit-order modal | `edit-order-modal` |
| Edit-order save / delete / confirm-delete | `order-save`, `order-delete`, `order-delete-confirm` |
| Order total / profit / badges | `order-total`, `order-profit`, `order-badge-collected`, `order-badge-delivered` |
| Filter controls | `filter-client`, `filter-county`, `filter-platform`, `filter-collected`, `filter-delivered`, `filter-reset` |
| Product card / delete / confirm | `product-card`, `product-delete`, `product-delete-confirm` |
| Material row / edit / delete | `material-row`, `material-edit`, `material-delete` |
| Low-stock alert | `materials-alert` |
| Recipe editor / line / save | `recipe-editor`, `recipe-line`, `recipe-save` |
| Add-order / add-product / add-material submit | `add-order-submit`, `add-product-submit`, `add-material-submit` |

> Exact id set is finalized during implementation; the contract is: every element an E2E test targets exposes a `data-testid`, and tests use `getByTestId` (or `getByRole` where idiomatic), never legacy CSS classes.

---

## Invariants (must hold post-migration)

- No `.css` file remains under `src/styles/`; only `src/app/globals.css` exists (FR-007).
- No component imports a `../styles/*.css` file (FR-006).
- Every interactive control originates from `@/components/ui/*` or is styled purely with Tailwind utilities (FR-002–FR-005).
- All Romanian labels/messages unchanged.
- All existing behavior and data flows unchanged (FR-001).
