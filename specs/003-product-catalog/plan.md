# Implementation Plan: Catalog Produse

**Branch**: `003-product-catalog` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-product-catalog/spec.md`

## Summary

Add a Product Catalog page (`/catalog`) where the user manages reusable product templates (CRUD).
When creating a new Order on the main screen, a multi-select catalog picker pre-populates the
order's products instead of requiring manual typing. Products created from templates are fully
functional kanban sub-tasks (drag-and-drop, status columns) identical to manually-added products.
Ad-hoc product addition within an existing order is preserved unchanged.

The implementation adds a `product_templates` table to the existing SQLite database, a nullable
`template_id` FK on the existing `products` table (additive migration), a new `/api/catalog`
REST resource, a new Next.js route at `src/app/catalog/`, and extends `AddOrderForm` with a
multi-select catalog selector. No Navbar is added — navigation is via direct URL.

## Technical Context

**Language/Version**: JavaScript ES2022+, Node.js 22+ LTS

**Primary Dependencies**: Next.js 14 (App Router), `node:sqlite` (Node.js built-in)

**Storage**: SQLite via `node:sqlite`; database file at `./data/avify.db`.
New `product_templates` table; nullable `template_id` column added to existing `products` table
via conditional `ALTER TABLE` at startup.

**Testing**: Jest 29 (unit + API integration), Playwright (E2E acceptance)

**Target Platform**: Modern desktop browsers (Chrome 120+, Firefox 120+, Edge 120+) at
`http://localhost:3000`

**Project Type**: Full-stack web application (Next.js — server components + API routes + React UI)

**Performance Goals**: API responses <200ms p95; catalog page FCP <1.5s; catalog search filter
response <300ms visual feedback per SC-003

**Constraints**: No authentication; vanilla CSS only; no external component/DnD/state-management
library; no Navbar; desktop-first (1920×1080); single local SQLite file; single user

**Scale/Scope**: Single concurrent user; up to ~100 catalog templates; up to 50 active orders;
up to 20 products per order

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality
- [ ] ESLint + Prettier pass on all new/modified files
- [ ] `productTemplates.js` single responsibility: CRUD for catalog templates only
- [ ] `CatalogPage.js` owns catalog UI state; `AddOrderForm.js` owns order+selector state
- [ ] No dead imports or unused variables in any modified file

### II. Testing Standards
- [ ] Jest unit tests: `src/lib/productTemplates.js` — listAll, create, update, delete, edge cases
- [ ] Jest API integration tests: `GET /api/catalog`, `POST /api/catalog`, `PATCH /api/catalog/[id]`, `DELETE /api/catalog/[id]`
- [ ] Jest API integration test: `POST /api/orders` with `templateIds` — verifies atomic creation
- [ ] Playwright E2E: all 6 quickstart validation scenarios
- [ ] ≥80% line coverage on `src/lib/productTemplates.js`
- [ ] Acceptance Gate: each user story has at least one passing Playwright scenario

### III. UX Consistency
- [ ] All UI text in Romanian
- [ ] Empty catalog state shown with actionable message
- [ ] Catalog selector chips show product name + × remove button
- [ ] Error messages human-readable Romanian; no stack traces in UI
- [ ] Edit inline (no separate page needed): edit form replaces static row in catalog list

### IV. Performance
- [ ] `idx_product_templates_name` index exists for search queries
- [ ] `GET /api/catalog?q=` uses SQL LIKE with the index (not in-memory JS filter)
- [ ] `POST /api/orders` with templateIds uses a single SQLite transaction (no N+1 inserts outside transaction)

*Gate status: ✅ No violations — all gates achievable with the chosen stack.*

*Post-design re-check: ✅ data-model.md and api.md introduce no new violations.*

## Project Structure

### Documentation (this feature)

```text
specs/003-product-catalog/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions
├── data-model.md        # Phase 1 — SQLite schema + entities
├── quickstart.md        # Phase 1 — validation guide
├── contracts/
│   └── api.md           # Phase 1 — REST API contract
└── tasks.md             # Phase 2 — /speckit-tasks output
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.js                      # No change
│   ├── layout.js                    # No change
│   ├── globals.css                  # No change
│   ├── catalog/
│   │   └── page.js                  # NEW: server component for /catalog route
│   └── api/
│       ├── orders/
│       │   └── route.js             # MODIFY: POST accepts optional templateIds[]
│       └── catalog/                 # NEW
│           ├── route.js             # NEW: GET /api/catalog, POST /api/catalog
│           └── [id]/
│               └── route.js         # NEW: PATCH /api/catalog/:id, DELETE /api/catalog/:id
├── components/
│   ├── CatalogPage.js               # NEW: 'use client' — catalog list + add/edit/delete UI
│   ├── CatalogProductForm.js        # NEW: add/edit form for a single template
│   ├── CatalogSelector.js           # NEW: reusable multi-select picker (used in AddOrderForm + AddProductForm)
│   ├── AddOrderForm.js              # MODIFY: add CatalogSelector for pre-populating products
│   └── AddProductForm.js            # MODIFY: add "From Catalog" toggle mode (single-select)
├── lib/
│   ├── db.js                        # MODIFY: add product_templates DDL + conditional ALTER TABLE
│   ├── productTemplates.js          # NEW: CRUD for product_templates table
│   └── products.js                  # MODIFY: createProduct gains optional templateId param
└── styles/
    └── catalog.css                  # NEW: catalog page + selector styles
```

**Structure Decision**: Same single full-stack Next.js project. New page follows the existing
`src/app/[route]/page.js` convention. Reusable `CatalogSelector` component is shared between
`AddOrderForm` (multi-select) and `AddProductForm` (single-select mode).

## Complexity Tracking

> No constitution violations detected — this section is not required.
