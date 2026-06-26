# Implementation Plan: Kanban Board for Stationery Order Management

**Branch**: `001-kanban-orders` | **Date**: 2026-06-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-kanban-orders/spec.md`

## Summary

Build a Romanian-language Kanban web application for managing stationery orders (weddings/baptisms)
across 6 fixed production stages. Orders persist in a local SQLite database file. The frontend is
a Next.js 14 (App Router) application using vanilla CSS and minimal JavaScript libraries. The app
runs on `http://localhost:3000` with no authentication required.

## Technical Context

**Language/Version**: JavaScript ES2022+, Node.js 20 LTS

**Primary Dependencies**: Next.js 14 (App Router), better-sqlite3 (synchronous SQLite driver)

**Storage**: SQLite via `better-sqlite3`; database file at `./data/avify.db` (gitignored)

**Testing**: Jest 29 (unit + API integration), Playwright (E2E acceptance tests)

**Target Platform**: Modern desktop browsers (Chrome 120+, Firefox 120+, Edge 120+) at
`http://localhost:3000`

**Project Type**: Full-stack web application (Next.js — server components + API routes + React UI)

**Performance Goals**: API responses < 200ms p95; board page FCP < 1.5s on localhost;
filter results visible in < 1s for ≤200 active orders

**Constraints**: No authentication; vanilla CSS only (no Tailwind, Bootstrap, CSS-in-JS);
no external state management library (useState/useReducer only); desktop-first (1920×1080);
single local SQLite file

**Scale/Scope**: Single concurrent user; up to 200 active orders; 6 fixed Kanban stages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality
- [ ] ESLint + Prettier configured in `eslint.config.js` and `.prettierrc`
- [ ] `no-unused-vars` and `no-unreachable` rules enforced
- [ ] Each component and lib module has a single, clearly defined responsibility

### II. Testing Standards
- [ ] Jest configured for unit tests on `src/lib/` (in-memory SQLite `:memory:`)
- [ ] Jest configured for API route integration tests
- [ ] Playwright configured for E2E — covers all 3 User Story acceptance flows
- [ ] ≥80% line coverage on `src/lib/` (database query layer)
- [ ] All E2E tests fail before implementation (TDD-preferred)

### III. UX Consistency
- [ ] All UI text in Romanian; labels match spec terminology exactly
- [ ] CSS custom properties defined in `globals.css` (color, spacing, typography)
- [ ] Error messages are human-readable Romanian strings; no stack traces exposed
- [ ] All primary actions reachable via keyboard (tab focus + Enter/Space)

### IV. Performance
- [ ] SQLite indexes on `stage`, `event_date`, `payment_status` columns
- [ ] Board renders all ≤200 orders without a loading spinner on localhost
- [ ] Filtering applied client-side (no round-trip; satisfies < 1s target trivially)

*Gate status: ✅ No violations — all gates achievable with the chosen stack.*

## Project Structure

### Documentation (this feature)

```text
specs/001-kanban-orders/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions
├── data-model.md        # Phase 1 — SQLite schema + entity definitions
├── quickstart.md        # Phase 1 — validation guide
├── contracts/
│   └── api.md           # Phase 1 — REST API contract
└── tasks.md             # Phase 2 — /speckit-tasks output
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.js                  # Root layout; imports globals.css
│   ├── page.js                    # Board page (server component — fetches initial orders)
│   ├── globals.css                # CSS custom properties, resets
│   └── api/
│       ├── orders/
│       │   ├── route.js           # GET /api/orders, POST /api/orders
│       │   └── [id]/
│       │       └── route.js       # GET, PUT, DELETE /api/orders/:id
│       └── product-types/
│           └── route.js           # GET /api/product-types, POST
├── components/
│   ├── Board.js                   # Kanban grid; owns client state + fetch logic
│   ├── Column.js                  # Single column — header, card list, DnD drop target
│   ├── OrderCard.js               # Card face — names, date, type badge, payment badge
│   ├── OrderForm.js               # Create/edit modal — explicit Save button
│   └── FilterBar.js               # Payment status + date range filter controls
├── lib/
│   ├── db.js                      # SQLite connection singleton; schema init on startup
│   └── orders.js                  # CRUD query functions (getAll, create, update, delete)
└── styles/
    ├── board.css
    ├── card.css
    └── form.css

data/
└── avify.db                       # SQLite database file (git-ignored)

tests/
├── unit/
│   └── lib/orders.test.js         # Unit tests for query functions (in-memory SQLite)
├── integration/
│   └── api/orders.test.js         # API route integration tests
└── e2e/
    ├── create-order.spec.js       # US1 acceptance flow
    ├── move-order.spec.js         # US2 acceptance flow
    └── filter-orders.spec.js      # US3 acceptance flow
```

**Structure Decision**: Single full-stack Next.js project. API routes encapsulate all
SQLite access (server-side only; `better-sqlite3` cannot run in the browser). The client
board component uses `fetch()` with local React state — no external state manager. Styles
use plain `.css` files (Next.js CSS Modules support) with a CSS custom-property design
system in `globals.css`.

## Complexity Tracking

> No constitution violations detected — this section is not required.
