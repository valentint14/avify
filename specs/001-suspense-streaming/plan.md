# Implementation Plan: Suspense Streaming & Progressive Loading

**Branch**: `001-suspense-streaming` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-suspense-streaming/spec.md`

---

## Summary

Replace the current synchronous-render-then-display pattern on all three main routes with React Suspense + Next.js App Router streaming. Each route gains a `loading.js` file that shows a Skeleton UI immediately on navigation, while an async Server Component resolves the SQLite query. Skeleton components from shadcn/ui are added to the design system. Data freshness is fully preserved via `force-dynamic` and `staleTimes: { dynamic: 0 }`.

---

## Technical Context

**Language/Version**: JavaScript (Node.js 22+); JSX in components; no TypeScript

**Primary Dependencies**:
- Next.js 14 (App Router, server streaming, `loading.js` convention)
- React 18.3.1 (Suspense, async Server Components)
- Tailwind CSS 4 (`animate-pulse`, `bg-muted` for skeleton animation)
- shadcn/ui component pattern (existing `src/components/ui/` structure)

**Storage**: SQLite via `node:sqlite` (`DatabaseSync`) — synchronous; no driver change

**Testing**: Jest (unit), Playwright (E2E — primary validation path)

**Target Platform**: Local web application (Next.js dev + prod server, Node.js 22)

**Project Type**: Web application (Next.js full-stack)

**Performance Goals**:
- Loading skeleton visible < 200ms from navigation
- Full content within 1.5s FCP on simulated 4G (constitution baseline)
- CLS ≈ 0 (skeleton mirrors real content layout; no reflow on resolve)

**Constraints**:
- `export const dynamic = 'force-dynamic'` MUST be preserved on all pages
- `staleTimes: { dynamic: 0 }` in `next.config.js` MUST NOT be changed
- No new npm dependencies (Skeleton primitive created manually)
- File extension: `.js` for route files, `.jsx` for new components

**Scale/Scope**: 3 routes × 1 `loading.js` + 3 skeleton components + 1 shared primitive + 1 error boundary + E2E tests

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| **Spec Gate** | ✅ PASS | `spec.md` complete; all acceptance scenarios defined; no open clarifications |
| **Code Quality** | ✅ PASS | Single responsibility per component; no dead code; consistent naming |
| **Testing Standards** | ✅ PASS | At least one Playwright acceptance test per user story; no existing tests broken |
| **UX Consistency** | ✅ PASS | Skeleton uses `bg-muted` + `animate-pulse` from design system; no custom one-off styles |
| **Accessibility** | ⚠️ REQUIRED | Loading containers must include `role="status"` or `aria-busy` for screen readers |
| **Performance Gate** | ✅ PASS | Feature improves perceived performance; no regressions introduced |
| **No-Placeholder Gate** | ✅ PASS | No `TODO`/`FIXME` permitted in production paths |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-suspense-streaming/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings (sync SQLite + Suspense decisions)
├── data-model.md        ← skeleton structure + async component shapes
├── quickstart.md        ← validation guide
├── checklists/
│   └── requirements.md  ← spec quality checklist (all green)
└── tasks.md             ← Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/
│   │   └── skeleton.jsx                     ← NEW: shadcn/ui Skeleton primitive
│   └── skeletons/
│       ├── OrdersListSkeleton.jsx            ← NEW: skeleton for / route
│       ├── CatalogPageSkeleton.jsx           ← NEW: skeleton for /catalog route
│       └── MaterialsPageSkeleton.jsx         ← NEW: skeleton for /stoc-materiale route
└── app/
    ├── error.js                              ← NEW: root error boundary (FR-007)
    ├── loading.js                            ← NEW: route-level loading for /
    ├── page.js                               ← MODIFY: add Suspense + async sub-component
    ├── catalog/
    │   ├── loading.js                        ← NEW: route-level loading for /catalog
    │   └── page.js                           ← MODIFY: add Suspense + async sub-component
    └── stoc-materiale/
        ├── loading.js                        ← NEW: route-level loading for /stoc-materiale
        └── page.js                           ← MODIFY: add Suspense + async sub-component

tests/
└── e2e/
    └── loading-skeleton.spec.js              ← NEW: Playwright acceptance tests
```

**Structure Decision**: Next.js App Router colocation — `loading.js` files sit alongside `page.js` in each route directory. Skeleton components are grouped under `src/components/skeletons/` (distinct from `ui/` primitives, consistent with how full page components like `OrderList.js` live in `src/components/`).

---

## Implementation Design

### Pattern: Page Modification

Each of the three pages follows this identical pattern:

**Before** (current state):
```js
export const dynamic = 'force-dynamic';

export default function Page() {
  const data = fetchData();            // synchronous SQLite call
  return <ClientComponent data={data} />;
}
```

**After** (with Suspense + async sub-component):
```js
import { Suspense } from 'react';
import PageSkeleton from '@/components/skeletons/PageSkeleton';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageData />
    </Suspense>
  );
}

async function PageData() {
  const data = fetchData();            // still synchronous internally
  return <ClientComponent data={data} />;
}
```

### Pattern: Route Loading File

```js
// src/app/[route]/loading.js
import PageSkeleton from '@/components/skeletons/PageSkeleton';

export default function Loading() {
  return <PageSkeleton />;
}
```

### Pattern: Error Boundary

```js
// src/app/error.js  — covers all routes via layout inheritance
'use client';

export default function Error({ error, reset }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-6xl flex-col items-center gap-4 p-12 text-center"
    >
      <p className="text-muted-foreground">
        A apărut o eroare. Te rugăm să încerci din nou.
      </p>
      <button
        onClick={reset}
        className="text-sm underline underline-offset-4 hover:text-foreground"
      >
        Reîncearcă
      </button>
    </div>
  );
}
```

### Skeleton Shapes (detailed layout)

See [data-model.md](data-model.md) for full skeleton structure per route.

**Summary**:
- `OrdersListSkeleton`: `max-w-6xl` container, filter-bar row + 5 order-card rows (name bar + 2 badge pills + action area)
- `CatalogPageSkeleton`: `max-w-4xl` container, form row + 5 catalog item rows (name + description + 2 buttons)
- `MaterialsPageSkeleton`: `max-w-4xl` container, form row + 5 material rows (name + 3 numeric cells + 2 action buttons)

All containers carry `role="status"` and `aria-label="Se încarcă…"` for accessibility.

---

## Complexity Tracking

No constitution violations. All changes are additive UI enhancements. No new abstractions beyond what the spec requires.
