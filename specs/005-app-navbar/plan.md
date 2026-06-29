# Implementation Plan: Application Navigation Bar

**Branch**: `005-app-navbar` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-app-navbar/spec.md`

## Summary

Integrate a persistent sticky navigation bar into the existing Next.js 14 (App Router) application by creating a single `Navbar` client component that uses the active pathname to highlight the current route, inserting it into the root `layout.js` so it renders on every page, and backing it with a dedicated CSS file that draws exclusively from the project's established design token system.

## Technical Context

**Language/Version**: JavaScript / Next.js 14 / React 18.3.1

**Primary Dependencies**: Next.js App Router — `next/link` (navigation), `next/navigation` (`usePathname`), React `'use client'` directive

**Storage**: N/A — the navbar is a presentational component with no data persistence

**Testing**: Jest (unit — active-state logic), Playwright (e2e — navigation & sticky scroll)

**Target Platform**: Web browser; tablet (768px) through desktop (1920px) viewport widths

**Project Type**: Web application (Next.js full-stack, App Router)

**Performance Goals**: Navigation transition < 1s perceived; navbar renders statically with no API calls, adding no measurable overhead to First Contentful Paint

**Constraints**: Must use existing CSS design tokens exclusively; no new npm dependencies; no new routing library; mobile viewports (< 768px) out of scope for this version

**Scale/Scope**: 2 navigation targets (`/` and `/catalog`); 1 new component file; 1 new CSS file; 2 existing files modified (`layout.js`, `globals.css`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence |
|------|--------|----------|
| **Code Quality** | ✅ PASS | `Navbar.js` has a single responsibility (render + active route detection). CSS tokens prevent style drift. No dead code introduced. |
| **Testing Standards** | ✅ PASS | Unit tests cover active-state logic; Playwright acceptance tests cover all 3 user stories (navigation, highlight accuracy, sticky scroll). Coverage floor applies to new code. |
| **UX Consistency** | ✅ PASS | All colours, spacing, typography drawn from `globals.css` design tokens. Navbar is a declared spec requirement, not a one-off component. |
| **Performance** | ✅ PASS | Static client component. No API calls, no N+1 patterns, no polling. `position: sticky` avoids layout reflow vs. `position: fixed`. |
| **No Placeholders** | ✅ PASS | Scope is fully defined; no anticipated TODO paths at design time. |

All gates pass. Complexity Tracking omitted (no violations).

## Project Structure

### Documentation (this feature)

```text
specs/005-app-navbar/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-components.md # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.js          ← modified: import Navbar; wrap children in <main>; import navbar.css
│   └── globals.css        ← modified: add --navbar-height token
├── components/
│   └── Navbar.js          ← new: sticky app navigation bar (client component)
└── styles/
    └── navbar.css         ← new: navbar layout and active-state styles
```

**Structure Decision**: Single Next.js project (App Router). The navbar component follows the existing pattern of one component per file in `src/components/`, styled by a dedicated CSS file in `src/styles/`. No additional directories are created.

## Implementation Notes

### Routing integration

Next.js App Router exposes `usePathname()` from `next/navigation` to read the current route client-side. Because `layout.js` is a Server Component, `Navbar.js` must be a Client Component (`'use client'`). Active state is derived by comparing `pathname` to each link's `href`:

- `/` → "Comenzi"
- `/catalog` → "Catalog Produse"

A pathname of anything else leaves both links inactive (handles future pages and edge cases from spec).

### Sticky layout

`position: sticky; top: 0` is preferred over `position: fixed` because sticky participates in document flow — it does not remove the navbar from layout calculations, which eliminates the need for a `padding-top` shim on every individual page (satisfying SC-005 without per-page changes).

### Design tokens used

| Purpose | Token | Value |
|---------|-------|-------|
| Navbar background | `--color-surface` | `#ffffff` |
| Bottom border | `--color-border` | `#dee2e6` |
| App name text | `--color-column-header` | `#1e293b` |
| Inactive link | `--color-text-muted` | `#6c757d` |
| Active link text | `--color-in-progres` | `#1e40af` |
| Active underline indicator | `--color-in-progres` | `#1e40af` |
| Horizontal padding | `--space-xl` | `32px` |
| Vertical padding | `--space-md` | `16px` |
| Typography | `--font-family`, `--font-weight-medium` | Segoe UI, 500 |
| Shadow | `--shadow-card` | subtle drop shadow |
| Z-index | explicit `100` | above all page content |

A new `--navbar-height: 56px` token is added to `globals.css` so page containers can reference it in future without magic numbers.
