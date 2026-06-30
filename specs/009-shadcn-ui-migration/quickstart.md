# Quickstart: shadcn/ui + Tailwind v4 Migration Validation

**Feature**: 009-shadcn-ui-migration
**Date**: 2026-06-30

---

## Prerequisites

- Node.js ≥ 22, dependencies installed (`npm install`)
- New dependencies added: `tailwindcss@4`, `@tailwindcss/postcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, Radix primitives (pulled in by generated shadcn components)
- `components.json`, `jsconfig.json`, `postcss.config.mjs`, `src/lib/utils.js`, and a Tailwind-v4 `src/app/globals.css` in place

---

## Setup sanity checks

```bash
# 1. Dev server starts and renders with Tailwind active
npm run dev          # open http://localhost:3000 — styles load, no console errors

# 2. The @/ alias resolves (no module-not-found for @/components/ui/* or @/lib/utils)
npm run build        # must compile cleanly

# 3. No legacy stylesheets remain or are referenced
#    (expect: only src/app/globals.css; zero imports of ../styles/*.css)
ls src/styles 2>/dev/null || echo "no legacy styles dir — OK"
```

Expected: `src/styles/` is gone (or empty), `globals.css` is the only stylesheet, and grepping for `styles/*.css` imports yields nothing.

---

## Visual / interaction validation (per surface)

Walk each page and confirm unified components + preserved behavior:

1. **Navigation** — links styled consistently; active link highlighted; keyboard-focusable.
2. **Orders page** — add order (Input+Button); filter bar (Input/Select) narrows list; multiple orders expand independently (Collapsible); row shows total/profit and status/collected/delivered badges.
3. **Edit-order dialog** — opens as Dialog (focus trapped, Esc closes, focus returns); all fields editable; live total; "Șterge comanda" opens an AlertDialog two-step confirm.
4. **Product board** — cards/columns restyled; **drag-and-drop still moves products and changes status**; completing an order still deducts stock.
5. **Product card** — delete opens accessible confirm; details dialog opens for items with info.
6. **Catalog** — CRUD + recipe editor (Select/Input) work; validation messages show.
7. **Materials** — CRUD + low-stock alert (Badge/Card) styled; alert appears strictly below minimum.

Accessibility spot-check: complete one full flow using only the keyboard; verify visible focus rings and dialog focus trap/restore.

---

## Automated validation

```bash
# Unit + integration (unchanged — must stay green)
npm test

# E2E — selectors now target data-testid; full suite must pass
npm run test:e2e

# E2E selectors are decoupled from styling (should return NOTHING):
#   grep for legacy class selectors in specs
#   e.g. ".order-row", ".edit-modal", ".material-row", ".product-card"
```

**Expected outcomes**:
- `npm run build` succeeds (lint clean, `@/` resolves, Tailwind compiles).
- All previously passing unit/integration/E2E scenarios pass (SC-001).
- E2E specs contain no legacy-class selectors (SC-007).
- Zero files under `src/styles/`; only `src/app/globals.css` remains (SC-003).
- Production bundle size has no material regression vs. the pre-migration baseline (Performance watch item).
