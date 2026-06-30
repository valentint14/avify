# Research: Suspense Streaming & Progressive Loading

**Feature**: 001-suspense-streaming
**Date**: 2026-06-30

---

## Decision 1: Synchronous SQLite + Async Page Components

**Decision**: Keep `node:sqlite` (`DatabaseSync`) as-is; make page functions `async` without awaiting.

**Rationale**: The project uses Node.js 22's built-in `DatabaseSync` driver, which is intentionally synchronous. Switching to an async driver (e.g., `@libsql/client`) would require query rewrites across all lib files and is out of scope. Making page functions `async` is sufficient because:

1. An `async function` always returns a Promise, even if the body executes synchronously.
2. Next.js App Router wraps async Server Components in a Suspense boundary and streams the loading UI as the first HTML chunk, before the Promise resolves on the server.
3. The `loading.js` file is sent immediately as part of the HTTP response, while the server executes the page's async function. On the client side, the loading skeleton appears instantly during navigation.
4. `staleTimes: { dynamic: 0 }` in `next.config.js` must be preserved — it guarantees fresh data on every navigation and must not be removed.

**Alternatives considered**:
- **Async SQLite driver** (`better-sqlite3` async workers, `@libsql/client`): Rejected — out of scope, requires rewriting all `lib/*.js` data access functions and breaks the existing synchronous contract.
- **Client-side loading state in Client Components**: Rejected — this would show a loading spinner after hydration, not during SSR. It doesn't improve TTFB or eliminate blank-page flash.

---

## Decision 2: Loading Boundary Strategy — `loading.js` + Explicit `<Suspense>`

**Decision**: Use both `loading.js` (route-level boundary) AND explicit `<Suspense>` wrapping an async Server Component per page.

**Rationale**:
- `loading.js` activates automatically on navigation for the entire route segment, providing the instant skeleton on client-side navigation.
- Explicit `<Suspense fallback={<Skeleton />}>` wrapping an async sub-component within `page.js` provides fine-grained control and allows multiple independent loading zones per page in the future.
- This dual approach satisfies both the spec requirement ("implementează fișiere loading.tsx" AND "încapsulează componentele asincrone în <Suspense>") without redundancy: `loading.js` handles the route transition; `<Suspense>` in the page handles within-page streaming.

**Pattern per route**:
```js
// src/app/page.js
import { Suspense } from 'react';
import OrdersListSkeleton from '@/components/skeletons/OrdersListSkeleton';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<OrdersListSkeleton />}>
      <OrdersData />
    </Suspense>
  );
}

async function OrdersData() {
  const orders = getAllWithStatus();
  return <OrderList initialOrders={orders} />;
}

// src/app/loading.js
import OrdersListSkeleton from '@/components/skeletons/OrdersListSkeleton';
export default function Loading() {
  return <OrdersListSkeleton />;
}
```

**Alternatives considered**:
- **`loading.js` only, no explicit `<Suspense>`**: Would work for route-level transitions but wouldn't demonstrate per-component Suspense granularity; doesn't satisfy the spec's `<Suspense>` requirement.
- **Only `<Suspense>` in page, no `loading.js`**: The `loading.js` file is the canonical Next.js App Router mechanism for instant route transitions. Omitting it means the route won't benefit from the built-in streaming optimization.

---

## Decision 3: Skeleton Component Approach

**Decision**: Create `src/components/ui/skeleton.jsx` manually (minimal shadcn/ui Skeleton implementation) rather than installing via `npx shadcn@latest add skeleton`.

**Rationale**:
- The project installs shadcn/ui components manually (source files in `src/components/ui/`) rather than using the CLI registry.
- The Skeleton component is trivially simple: a `<div>` with Tailwind `animate-pulse` and `rounded-md bg-muted` classes.
- Manual creation avoids introducing a CLI dependency or registry fetch into the workflow and stays consistent with how existing shadcn/ui components (button, input, badge, dialog, etc.) were added.

**The component**:
```jsx
// src/components/ui/skeleton.jsx
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
```

**Alternatives considered**:
- **`npx shadcn@latest add skeleton`**: The project doesn't use the shadcn CLI workflow — all components are manually maintained source files. Using the CLI here would be inconsistent.
- **CSS spinner / indeterminate bar**: Rejected — spec explicitly requires Skeleton components matching the shape of final content.

---

## Decision 4: Skeleton Shape Design

**Decision**: Each route gets a bespoke skeleton component under `src/components/skeletons/` that mirrors the actual page layout.

**Layout analysis per route**:

| Route | Layout | Skeleton shape |
|-------|--------|----------------|
| `/` (Orders) | `max-w-6xl` container, filter bar, list of card rows (each ~60px tall, with name + badges + buttons) | Filter bar skeleton + 5 order row placeholders (name bar, 2 badge pills, action area) |
| `/catalog` | Table/list of product templates, name + description, action buttons | 5 catalog row placeholders (name bar, description bar, action buttons) |
| `/stoc-materiale` | Materials table: name, current stock, min stock, unit, actions | Form area skeleton + 5 material row placeholders (name bar, 3 numeric cells, action area) |

**Rationale**: Matching the skeleton to the actual layout prevents layout shift (CLS ≈ 0) when the real content arrives. Using the same max-width containers and spacing as the real components ensures the transition is seamless.

---

## Decision 5: File Extension — `.js` vs `.jsx` vs `.tsx`

**Decision**: Use `.js` for `loading.js` route files; use `.jsx` for new skeleton components under `src/components/skeletons/`.

**Rationale**:
- Route files (`page.js`, `layout.js`) already use `.js` — `loading.js` must follow the same pattern to be recognized by Next.js.
- New skeleton components are pure JSX and should use `.jsx` for clarity, consistent with `src/components/ui/*.jsx`.
- The user description mentions `.tsx` but the project has no TypeScript setup (`tsconfig.json` absent, `jsconfig.json` present). Using `.tsx` would require adding TypeScript tooling — out of scope.

---

## Resolved: All NEEDS CLARIFICATION Items

The spec had zero `[NEEDS CLARIFICATION]` markers. The decisions above address all implementation questions that could not be derived from the spec alone.
