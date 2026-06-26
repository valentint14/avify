# Implementation Plan: Orders & Products Board

**Branch**: `002-orders-products-board` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-orders-products-board/spec.md`

## Summary

Redesign the Avify stationery order management app from a flat Kanban board to a JIRA-style
accordion list where each order (Comandă) expands inline to reveal a mini 6-column Kanban board
of its products (Produse). Products move between columns via drag-and-drop. Order status is fully
derived from product states — the order becomes "Finalizată" automatically when all its products
reach the "Gata" column, and reverts to "În progres" if any product moves back.

The implementation adds a `products` table to the existing SQLite database, introduces a new
set of React components (accordion list, mini-board, draggable product cards), and adds
`/api/products` routes. Existing `orders` table columns (`stage`, `event_type`, etc.) are left
in place but become unused by the new UI (additive migration — no data loss).

## Technical Context

**Language/Version**: JavaScript ES2022+, Node.js 22+ LTS

**Primary Dependencies**: Next.js 14 (App Router), `node:sqlite` (Node.js built-in)

**Storage**: SQLite via `node:sqlite`; database file at `./data/avify.db` (gitignored).
New `products` table added alongside existing `orders` table.

**Testing**: Jest 29 (unit tests on `src/lib/`, API integration tests), Playwright (E2E
acceptance tests covering all 5 User Story acceptance flows from spec)

**Target Platform**: Modern desktop browsers (Chrome 120+, Firefox 120+, Edge 120+) at
`http://localhost:3000`

**Project Type**: Full-stack web application (Next.js — server components + API routes + React UI)

**Performance Goals**: API responses < 200ms p95; list page FCP < 1.5s on localhost;
drag-and-drop visual feedback within one animation frame (≤16ms)

**Constraints**: No authentication; vanilla CSS only; no external DnD library (HTML5 Drag and
Drop API); no external state management library (`useState`/`useReducer` only); desktop-first
(1920×1080); single local SQLite file; single user

**Scale/Scope**: Single concurrent user; up to 50 active orders; up to 20 products per order;
6 fixed product status columns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality
- [ ] ESLint + Prettier configured (`eslint.config.js`, `.prettierrc`) — existing, no changes needed
- [ ] `no-unused-vars` enforced — legacy constants (`VALID_PAYMENT`, `EVENT_LABELS`) removed from `constants.js`
- [ ] Each new component has one responsibility: `OrderList` owns accordion state; `ProductBoard` owns DnD state; `ProductColumn` is a pure drop target; `ProductCard` is a pure draggable

### II. Testing Standards
- [ ] Jest unit tests for `src/lib/orders.js` derived status logic (in-memory SQLite)
- [ ] Jest unit tests for `src/lib/products.js` CRUD + status update
- [ ] Jest API integration tests for `GET /api/orders`, `POST /api/orders`, `POST /api/products`, `PATCH /api/products/:id`
- [ ] Playwright E2E for all 5 User Story acceptance flows
- [ ] ≥80% line coverage on `src/lib/orders.js` and `src/lib/products.js`
- [ ] Acceptance Gate: every user story has at least one passing E2E scenario before story is done

### III. UX Consistency
- [ ] All UI text in Romanian; column labels match spec exactly: De făcut, În Design, Validare Client, Printare, Asamblare, Gata
- [ ] "Finalizată" orders visually distinct from "În progres" (badge color / strikethrough / opacity)
- [ ] Empty states in Romanian (`"Nicio comandă"`, `"Niciun produs în această coloană"`)
- [ ] Error messages human-readable Romanian; no stack traces exposed to UI
- [ ] Drag-over column highlighted; dragged card shows ghost with product name

### IV. Performance
- [ ] `products` table has indexes on `order_id` and `status`
- [ ] Derived status computed via single SQL subquery in `GET /api/orders` (no N+1 queries)
- [ ] 50-order list loads and is interactive without a spinner on localhost

*Gate status: ✅ No violations — all gates achievable with the chosen stack.*

*Post-design re-check: ✅ data-model.md and api.md introduce no new violations.*

## Project Structure

### Documentation (this feature)

```text
specs/002-orders-products-board/
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
│   ├── layout.js                    # (existing — no changes)
│   ├── page.js                      # REPLACE: server component passes orders to OrderList
│   ├── globals.css                  # UPDATE: add CSS custom properties for new UI
│   └── api/
│       ├── orders/
│       │   ├── route.js             # REPLACE: GET /api/orders (with derived status), POST /api/orders
│       │   └── [id]/
│       │       └── route.js         # REPLACE: DELETE /api/orders/:id only (no PUT)
│       └── products/                # NEW
│           ├── route.js             # NEW: POST /api/products
│           └── [id]/
│               └── route.js         # NEW: PATCH /api/products/:id, DELETE /api/products/:id
├── components/
│   ├── OrderList.js                 # NEW: 'use client' — accordion state (expandedOrderId)
│   ├── OrderRow.js                  # NEW: order header row — name, status badge, product summary
│   ├── ProductBoard.js              # NEW: mini 6-col Kanban — DnD state, product list
│   ├── ProductColumn.js             # NEW: drop target column with ProductCard list
│   ├── ProductCard.js               # NEW: draggable product card
│   ├── AddOrderForm.js              # NEW: inline form — add order by name
│   └── AddProductForm.js            # NEW: inline form — add product to expanded order
├── lib/
│   ├── db.js                        # UPDATE: add products table DDL + new STAGES constant
│   ├── orders.js                    # REPLACE: name-only CRUD + derived status via SQL subquery
│   └── products.js                  # NEW: product CRUD + updateStatus
└── styles/
    ├── order-list.css               # NEW: accordion list + order row styles
    ├── product-board.css            # NEW: mini-board, columns, cards, DnD states
    └── form.css                     # UPDATE: minor changes for new form shapes

DELETE (replaced):
  src/components/Board.js            # → OrderList.js
  src/components/Column.js           # → ProductColumn.js
  src/components/OrderCard.js        # → OrderRow.js + ProductCard.js
  src/components/OrderForm.js        # → AddOrderForm.js + AddProductForm.js
  src/components/FilterBar.js        # removed — no filter in new spec
  src/app/api/product-types/         # removed — no product-types in new spec
  src/styles/board.css               # → order-list.css
  src/styles/card.css                # → product-board.css

UPDATE:
  src/lib/constants.js               # rename livrat→gata; remove payment/event constants
```

**Structure Decision**: Single full-stack Next.js project (same as 001). API routes handle
all SQLite access server-side. New components follow the same one-file-per-component convention.
Styles use plain `.css` files per feature area.

## Complexity Tracking

> No constitution violations detected — this section is not required.
