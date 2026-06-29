# Implementation Plan: Extend Order Fields & Auto-Calculated Totals

**Branch**: `006-extend-order-fields` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-extend-order-fields/spec.md`

## Summary

Extend the orders and products data model with 10 new order-level fields (Client, Dată primire, Avans, Județ, Platformă contact, Dată eveniment, Termen livrare, Profit, Încasată, Livrată) and one new product-level field (Preț unitar). The order Total is auto-computed from `Quantity × Preț unitar` summed across all order products using a SQL aggregate. Total and Profit are displayed inline in the order table row and in the edit modal. Încasată and Livrată appear as visual status badges in the order row.

## Technical Context

**Language/Version**: JavaScript (ES2022) — Next.js 14 App Router, React 18.3.1

**Primary Dependencies**: React 18, Next.js 14, `node:sqlite` (Node.js built-in DatabaseSync — no ORM)

**Storage**: SQLite at `data/avify.db` via `node:sqlite` `DatabaseSync`; schema migration is inline `ALTER TABLE` in `src/lib/db.js` (existing pattern)

**Testing**: Jest 29 (unit/integration, coverage floor 80% on `src/lib/`), Playwright 1.49 (E2E, workers: 1, real SQLite — no mocks)

**Target Platform**: Web browser + Node.js 22+ server (required for `node:sqlite`)

**Project Type**: Full-stack web application — Next.js App Router with server-side rendering for initial load and client-side React state for interactions

**Performance Goals**: Order list re-render after edit within 0.5 s; total recalculates without perceptible lag; SQL aggregate avoids N+1 queries

**Constraints**: No external ORM — raw SQL only; no TypeScript; local React state only (no Redux/Zustand); currency fixed to RON

**Scale/Scope**: Single-user application, tens to low hundreds of orders; no pagination or concurrency concerns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Code Quality | ✅ Pass | Extend existing single-responsibility functions; new `updateOrder` follows same shape as `updateProduct` |
| Testing Standards | ✅ Pass | New `orders.js` functions need unit tests; new user flows need E2E; integration tests use real SQLite (no mocks per constitution) |
| UX Consistency | ✅ Pass | Reuses existing modal, badge, and form CSS patterns; no custom one-off components without justification |
| Performance | ✅ Pass | Total computed via SQL `SUM(quantity * unit_price)` in the existing `DERIVED_STATUS_SQL` JOIN — single query, no N+1 |
| No-Placeholder Gate | ✅ Pass | All new code delivered production-ready; no TODO/FIXME in production paths |

No constitution violations. No Complexity Tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/006-extend-order-fields/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       ├── orders/
│       │   ├── route.js           ← update POST to accept new order fields
│       │   └── [id]/
│       │       └── route.js       ← add PATCH handler for order metadata updates
│       └── products/
│           └── [id]/
│               └── route.js       ← extend PATCH to handle unit_price
├── components/
│   ├── OrderRow.js                ← add total, profit, collected/delivered badges
│   ├── EditOrderModal.js          ← add order-level fields section + unit_price per product
│   └── OrderList.js               ← no structural change; order shape extends automatically
├── lib/
│   ├── db.js                      ← ALTER TABLE for 10 new order columns + 1 product column
│   ├── orders.js                  ← extend DERIVED_STATUS_SQL with SUM total; extend parseRow; add updateOrder
│   └── products.js                ← add unit_price to parseRow and updateProduct
└── styles/
    ├── order-list.css             ← styles for total/profit cells and collected/delivered badges
    └── product-modal.css          ← styles for order-details section in EditOrderModal

tests/
├── unit/
│   └── orders.test.js             ← unit tests for updateOrder and total computation
└── e2e/
    └── order-fields.spec.js       ← E2E scenarios covering spec acceptance criteria
```

**Structure Decision**: Single full-stack Next.js project. All changes extend existing files in-place; no new modules or directories are introduced.
