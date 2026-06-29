# Implementation Plan: Order Filters

**Branch**: `007-order-filters` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-order-filters/spec.md`

## Summary

Add a filter panel above the order table that lets users narrow the visible orders by client name (text search), county (dropdown), contact platform (dropdown), collection status (toggle), and delivery status (toggle). All filtering is performed client-side on the data already held in `OrderList.js` state — no new API endpoints or schema changes are required. The filter panel is a new `OrderFilters` component rendered above the existing order rows; `OrderList.js` holds the filter state and derives the visible order list via a pure filtering function.

## Technical Context

**Language/Version**: JavaScript (ES2022) — Node.js 22, React 18.3.1, Next.js 14 (App Router)

**Primary Dependencies**: React `useState`, `useMemo`, `useRef` (built-ins, no new packages)

**Storage**: N/A — filtering operates entirely in memory on data returned by the existing `GET /api/orders` call; no new DB columns or queries

**Testing**: Jest 29 (unit — pure filter function), Playwright 1.49 (E2E — `workers: 1`, real SQLite, no mocks per constitution)

**Target Platform**: Web browser (desktop-first, same responsive targets as existing app)

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**: Filter result visible within 300 ms of user input (SC-002); text search debounced at ≤ 150 ms to limit re-renders

**Constraints**: No new npm dependencies; no new API routes; no DB migrations; filter state is in-memory only (resets on page refresh)

**Scale/Scope**: Single orders page; up to a few hundred orders in the list (no virtualisation required)

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| Spec Gate | ✅ PASS | `spec.md` complete, all acceptance scenarios defined |
| Test Gate | ✅ PASS | Unit tests for pure filter logic + E2E acceptance scenarios planned |
| Code Review Gate | ✅ PASS | No violations; standard component/state pattern |
| Performance Gate | ✅ PASS | Client-side filter + 150 ms debounce; well within 300 ms SC-002 |
| UX Gate | ✅ PASS | Filter panel uses existing design-system CSS variables and patterns |
| No-Placeholder Gate | ✅ PASS | All requirements clearly defined |

No constitution violations. Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-order-filters/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── ui-components.md ← Phase 1 output
└── tasks.md             ← /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── OrderFilters.js          ← NEW: filter panel component
│   ├── OrderList.js             ← MODIFY: add filter state + derived filtered list
│   └── OrderRow.js              (unchanged)
├── styles/
│   ├── order-filters.css        ← NEW: filter panel styles
│   └── order-list.css           (unchanged)
└── lib/
    └── orderFilters.js          ← NEW: pure filter function (unit-testable)

tests/
├── unit/
│   └── lib/
│       └── orderFilters.test.js ← NEW: unit tests for pure filter logic
└── e2e/
    └── order-filters.spec.js    ← NEW: E2E acceptance scenarios
```

**Structure Decision**: Single Next.js project. New logic lives in `src/lib/orderFilters.js` (pure function, easy to unit-test), the UI in `src/components/OrderFilters.js`, and state wiring in the existing `OrderList.js`. No backend files change.
