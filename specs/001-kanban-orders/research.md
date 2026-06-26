# Research: Kanban Board for Stationery Order Management

**Feature**: `001-kanban-orders`
**Date**: 2026-06-25
**Status**: Complete — all decisions resolved

---

## SQLite Driver for Node.js / Next.js

**Decision**: `better-sqlite3`

**Rationale**: Synchronous API fits Next.js API Route Handlers naturally — no async overhead
for a single-user local application. Significantly simpler than the callback-based `sqlite3`
package or adding an ORM layer. Excellent read/write performance far beyond our 200-order scope.
The library is actively maintained and has no native binary compilation issues on Node.js 20 LTS.

**Alternatives considered**:
- `sqlite3`: Promise/callback API adds unnecessary complexity for synchronous single-user use.
- `Drizzle ORM + better-sqlite3`: Type-safe but introduces an abstraction layer the user
  explicitly asked to avoid (minimal dependencies).
- `Prisma`: Generates a separate query-engine binary; overcomplicated for this local app scope.

---

## Drag and Drop Strategy

**Decision**: Native HTML5 Drag and Drop API (`draggable`, `dragstart`, `dragover`, `drop`
event handlers on card and column elements)

**Rationale**: Moving cards between 6 fixed columns is a simple enough interaction for the
native DnD API. No library is needed. A keyboard-accessible fallback (a "Mută în…" context
button on each card) satisfies WCAG AA without requiring a DnD accessibility library.

**Alternatives considered**:
- `@dnd-kit/core`: Excellent accessible DnD library, but unnecessary given the simple
  column-to-column movement and the user's directive to minimize libraries.
- `react-beautiful-dnd`: Effectively unmaintained and deprecated upstream.
- `SortableJS`: Pure-JS, but adds a dependency; HTML5 DnD is sufficient for this UX.

---

## Next.js Routing Strategy

**Decision**: App Router (Next.js 14 default, `src/app/` directory)

**Rationale**: Current stable standard for new Next.js projects. Server components fetch initial
board data on the server with zero client-side waterfall. API routes (`route.js`) handle all
mutations. Benefit over Pages Router: no need for `getServerSideProps`; server components are
simpler to reason about.

**Alternatives considered**:
- Pages Router: Legacy approach; no benefit for a new project.

---

## Client State Management

**Decision**: React `useState` in the top-level `Board` component; re-fetch full orders list
after every mutation (create / update / move / delete)

**Rationale**: The board always holds ≤200 orders. A full re-fetch after any mutation is
instantaneous on localhost, eliminates optimistic-update edge cases, and requires no external
library. The board component is the single source of truth for the in-memory list.

**Alternatives considered**:
- React Query / SWR: Adds a dependency and cache-invalidation complexity for no practical
  benefit at this scale and user count.
- Redux / Zustand: Global state managers are overkill for a single-screen application.

---

## Filtering Strategy

**Decision**: Client-side filtering applied to the in-memory orders array before rendering

**Rationale**: With ≤200 orders always in memory, JavaScript `.filter()` is instantaneous —
satisfies SC-005 (< 1 second) trivially. No additional API call, no debounce needed, and the
column structure always remains visible even when a filter produces zero matches.

**Alternatives considered**:
- Server-side filtering via query params: Adds network round-trip and server complexity without
  any benefit at this scale.

---

## Unique ID Generation

**Decision**: `crypto.randomUUID()` (Node.js built-in, available since Node.js 14.17+)

**Rationale**: Generates RFC 4122 v4 UUIDs with no external package. Called server-side inside
API route handlers before inserting into SQLite.

---

## Testing Stack

**Decision**: Jest 29 for unit and integration tests; Playwright for E2E acceptance tests

**Rationale**:
- **Jest**: Standard choice for Next.js; fast for unit tests on `src/lib/` using an in-memory
  SQLite database (`:memory:`). Integration tests spin up the API routes via Next.js test
  utilities.
- **Playwright**: Official E2E recommendation for Next.js. Headless Chromium. Covers all
  3 User Story acceptance scenarios (create order, move through workflow, filter).

**Alternatives considered**:
- Vitest: Solid alternative, but Jest has broader Next.js documentation and example coverage.
- Cypress: Heavier setup and larger install footprint than Playwright.

---

## CSS Architecture

**Decision**: Plain `.css` files per component via Next.js built-in CSS Module support;
design tokens (colors, spacing, typography) as CSS custom properties in `globals.css`

**Rationale**: Scoped styles without any build-time or runtime library. CSS custom properties
define the design system once (e.g., `--color-neachitat`, `--space-md`) and are reused across
all components, satisfying Constitution Principle III (UX Consistency) without Tailwind or
CSS-in-JS.

**Alternatives considered**:
- Tailwind CSS: A utility library — contradicts the user's "vanilla CSS" requirement.
- styled-components / emotion: Adds runtime overhead and a dependency.
- Bootstrap: Pre-built component library; contrary to the minimal-library directive.
