# Implementation Plan: Order Product Details (Quantity & Notes)

**Branch**: `004-order-product-details` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-order-product-details/spec.md`

## Summary

Extend the product model to store per-order-product quantity (positive integer, default 1) and optional additional info (free text). Expose quantity+notes inputs in the existing `AddProductForm` during catalog selection; display quantity on `ProductCard`; reveal notes via a long-press modal with a CSS gradient-fill progress animation on the card. Add an "Editează" button to each order row header to reopen an edit modal for existing products. Keyboard users open the notes modal via Tab + Enter/Space (WCAG 2.1 AA).

## Technical Context

**Language/Version**: JavaScript (ES2022); Node.js built-in `node:sqlite` (Node 22+)

**Primary Dependencies**: Next.js 14 (App Router), React 18, plain CSS

**Storage**: SQLite via `node:sqlite` (DatabaseSync) — `data/avify.db`

**Testing**: Jest 29 (unit + integration), Playwright 1.49 (e2e)

**Target Platform**: Web — desktop browser primary, mobile browser secondary

**Project Type**: Web application (Next.js App Router)

**Performance Goals**: Page interactions within standard Next.js client-side response times; long-press timer accuracy within ±100ms; modal open < 16ms (single animation frame)

**Constraints**: No new npm dependencies — all features implemented with existing stack. CSS animations only (no JS animation libraries).

**Scale/Scope**: Single-user production workflow; small order/product volumes (tens of orders, tens of products per order)

## Constitution Check

*GATE: Must pass before implementation. Re-checked post-design.*

| Gate | Status | Notes |
|------|--------|-------|
| Spec Gate | ✅ PASS | `spec.md` complete, clarified, all acceptance scenarios defined |
| Test Gate | ✅ PLAN | Unit + integration tests cover new DB columns and API changes; e2e covers long-press and modal; 80% coverage floor applies |
| Code Review Gate | ⏳ PENDING | Peer review required before merge |
| Performance Gate | ✅ LOW RISK | No new I/O paths; SQL changes are additive column adds; CSS animations use GPU-composited properties only |
| UX Gate | ✅ PLAN | Long-press gradient + keyboard fallback; WCAG 2.1 AA verified via Tab/Enter/Space flow; mobile touch tested |
| No-Placeholder Gate | ✅ PLAN | No TODOs or placeholder code in production paths |

## Project Structure

### Documentation (this feature)

```text
specs/004-order-product-details/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api.md           ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code

```text
src/
├── lib/
│   ├── db.js                     ← modified: ALTER TABLE migration for quantity + additional_info
│   └── products.js               ← modified: parseRow, createProduct, createProductFromTemplate, new updateProduct()
├── app/api/products/
│   ├── route.js                  ← modified: POST accepts quantity + additionalInfo
│   └── [id]/route.js             ← modified: PATCH handles quantity + additionalInfo
├── components/
│   ├── AddProductForm.js         ← modified: per-template quantity + notes fields after catalog selection
│   ├── OrderRow.js               ← modified: "Editează" button in header
│   ├── ProductCard.js            ← modified: quantity badge, long-press logic, keyboard handler
│   ├── ProductDetailsModal.js    ← new: modal overlay for additional info
│   └── EditOrderModal.js         ← new: edit existing order products (quantity + notes)
└── styles/
    ├── product-board.css         ← modified: long-press gradient keyframe + card state classes
    └── product-modal.css         ← new: modal overlay and content styles

tests/
├── unit/lib/products.test.js     ← extended: quantity/additionalInfo in CRUD
├── integration/api/products.test.js ← extended: POST + PATCH with new fields
└── e2e/product-details.spec.js   ← new: long-press, modal, keyboard, gradient animation
```

## Complexity Tracking

No constitution violations — all additions are within existing single-project structure.
