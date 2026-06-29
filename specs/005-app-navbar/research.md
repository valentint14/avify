# Research: Application Navigation Bar

**Feature**: 005-app-navbar | **Date**: 2026-06-29

## Decision Log

### D-001: Component type — Server vs. Client Component

**Decision**: `Navbar.js` must be a Client Component (`'use client'`).

**Rationale**: Active-state detection requires `usePathname()` from `next/navigation`, which is a React hook and therefore only available in Client Components. The root `layout.js` is a Server Component and cannot use hooks directly. Wrapping the hook usage in a separate client component is the canonical Next.js App Router pattern.

**Alternatives considered**:
- Pass `pathname` as a prop from layout (rejected: layout is a Server Component and cannot read the current URL at render time without a separate `headers()` call, which adds complexity and couples the layout to request context unnecessarily)
- Use `cookies` or `searchParams` for route tracking (rejected: over-engineering; `usePathname` is purpose-built for this)

---

### D-002: Sticky behaviour — `position: sticky` vs. `position: fixed`

**Decision**: `position: sticky; top: 0` with a defined `z-index`.

**Rationale**: `sticky` keeps the element in document flow, so the page body naturally begins below the navbar without any manual `padding-top` offset on each page — satisfying SC-005 and FR-007 simultaneously. `fixed` would require every page container to add `padding-top: var(--navbar-height)` to avoid content being hidden under the bar.

**Alternatives considered**:
- `position: fixed` (rejected: requires per-page padding shims; fragile when navbar height changes)
- No sticky (scrolls away — rejected: violates FR-007 and user story P3)

---

### D-003: Active-state visual treatment

**Decision**: Bottom border (`border-bottom: 2px solid var(--color-in-progres)`) on the active link, with the link text also taking `--color-in-progres` colour.

**Rationale**: A bottom-border indicator is a widely recognised navigation pattern (used by GitHub, Linear, Google). It works without background colour changes, keeping the navbar visually lightweight and consistent with the stationery brand aesthetic. The `--color-in-progres` token (#1e40af, a calm professional blue) is already used for "in-progress" status across the app, providing semantic consistency.

**Alternatives considered**:
- Background pill / chip highlight (more prominent — rejected: feels heavy for a minimal navbar)
- Bold font weight only (rejected: insufficient contrast for WCAG 2.1 AA; the colour change is needed)
- Separate accent colour (rejected: would require a new token not justified by the spec; reusing existing tokens aligns with constitution)

---

### D-004: Where to insert the Navbar in the component tree

**Decision**: Insert `<Navbar />` as the first child of `<body>` in `src/app/layout.js`, wrapping the page output in a `<main>` element.

**Rationale**: `layout.js` is the single root layout shared by all routes in the App Router. Inserting the navbar here guarantees it renders on every page without any per-page change. Wrapping children in `<main>` provides a semantic landmark for accessibility (WCAG 2.1 AA requires a `main` landmark).

**Alternatives considered**:
- Per-page navbar inclusion (rejected: violates DRY; every new page would need to include the navbar manually)
- Separate `template.js` (rejected: templates re-mount on navigation in Next.js; unnecessary complexity for a static component)

---

### D-005: CSS organisation — dedicated file vs. inline styles vs. CSS Modules

**Decision**: Dedicated `src/styles/navbar.css` file, imported in `layout.js`.

**Rationale**: The project uses a consistent pattern of one CSS file per feature area (`order-list.css`, `catalog.css`, `product-board.css`). Creating `navbar.css` maintains that convention. CSS Modules would be an inconsistency with the rest of the codebase; inline styles would not support pseudo-classes (`:hover`, `:focus-visible`) needed for accessibility.

**Alternatives considered**:
- CSS Modules (rejected: inconsistent with project convention; no scoping issue exists since navbar classes are unique)
- Inline styles (rejected: no support for `:hover` / `:focus-visible` without additional state)
- Adding to `globals.css` (rejected: globals should remain design tokens + reset only; feature styles belong in feature files)

---

### D-006: Navbar height token

**Decision**: Add `--navbar-height: 56px` to `:root` in `globals.css`.

**Rationale**: A single source of truth prevents magic numbers if future pages or components need to account for the navbar height (e.g., modals, scroll anchors). 56px (3.5rem) is a standard compact navbar height that accommodates 15px text with 16px vertical padding comfortably.

**Alternatives considered**:
- Hard-code height inline (rejected: fragile; duplicated if any other component needs to reference it)
- Derive from padding (rejected: computed heights are unreliable as a reference value)
