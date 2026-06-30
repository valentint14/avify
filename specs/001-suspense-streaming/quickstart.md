# Quickstart Validation Guide: Suspense Streaming & Progressive Loading

**Feature**: 001-suspense-streaming
**Date**: 2026-06-30

---

## Prerequisites

- Node.js 22+ installed (required for `node:sqlite`)
- Project dependencies installed: `npm install`
- Development server available: `npm run dev`

---

## Scenario 1: Verify Loading Skeleton Appears During Navigation

**What this validates**: FR-001, FR-002, FR-004, SC-001, SC-003

**Setup**:
1. Start the dev server: `npm run dev`
2. Open browser DevTools → Network tab
3. Enable "Slow 3G" throttling (or use `chrome://inspect` CPU/network throttling)

**Steps**:
1. Navigate to `http://localhost:3000` (Orders page)
2. Observe the page immediately — before any order rows appear

**Expected outcome**:
- A skeleton structure is visible: filter-bar placeholder + 5 order row placeholders with shimmer animation
- No blank white page is shown at any point
- After the skeleton, real order data replaces it without layout shift

**Repeat for**:
- `http://localhost:3000/catalog` → catalog skeleton (form placeholder + 5 item rows)
- `http://localhost:3000/stoc-materiale` → materials skeleton (form placeholder + 5 material rows)

---

## Scenario 2: Verify Skeleton Shape Matches Final Layout

**What this validates**: FR-002, FR-003, SC-004

**Steps**:
1. Load any of the three routes with throttling OFF (fast network)
2. Compare the skeleton (visible briefly) to the real content

**Expected outcome**:
- No visible layout shift when the real content replaces the skeleton
- Skeleton columns/rows align with real content columns/rows
- Container width and padding match (no reflow)
- Skeleton uses the project's `bg-muted` and `animate-pulse` classes (consistent with design system)

---

## Scenario 3: Verify Data Freshness is Preserved

**What this validates**: FR-006, US-3 (no regression), SC-005

**Steps**:
1. Create a new order via the Orders page
2. Navigate away to `/catalog`
3. Navigate back to `/` (Orders)
4. After the skeleton resolves, verify the new order appears

**Repeat**:
- Add a material on `/stoc-materiale`, navigate away, return — material visible after skeleton
- Add a catalog product on `/catalog`, navigate away, return — product visible after skeleton

**Expected outcome**: Real content after skeleton always reflects the latest database state.

---

## Scenario 4: Verify Error State (Graceful Failure)

**What this validates**: FR-007, Edge Case — fetch failure

**Setup** (development only):
1. Temporarily modify `src/lib/orders.js` to `throw new Error('Test error')` inside `getAllWithStatus`
2. Add a Next.js `error.js` at `src/app/error.js` if not already present

**Steps**:
1. Navigate to `http://localhost:3000`

**Expected outcome**:
- The skeleton does not spin indefinitely
- An error boundary catches the error and shows a user-readable error message
- No technical error details (stack traces) are shown to the user

**Cleanup**: Revert the intentional throw.

---

## Scenario 5: Run Automated Tests

**What this validates**: SC-006

```bash
# Unit tests (if added for skeleton components)
npm test

# End-to-end tests (Playwright)
npm run test:e2e
```

**Expected outcome**:
- All pre-existing E2E tests pass without regression
- New E2E tests for loading skeleton visibility pass

---

## Quick Check: Skeleton Components Are in Design System

1. Inspect any skeleton element in DevTools
2. Confirm classes include `animate-pulse`, `rounded-md`, `bg-muted`
3. Confirm no inline styles are used
4. Confirm accessibility: skeleton elements should have `aria-busy="true"` or be wrapped in a container with `role="status"` and an `aria-label` for screen reader announcement

---

## Reference

- Data model: [data-model.md](data-model.md)
- Spec: [spec.md](spec.md)
- Research decisions: [research.md](research.md)
