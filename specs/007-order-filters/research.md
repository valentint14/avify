# Research: Order Filters

**Feature**: 007-order-filters
**Date**: 2026-06-29

---

## Decision 1: Client-side vs. server-side filtering

**Decision**: Client-side filtering only.

**Rationale**: `GET /api/orders` already returns the full order list including all fields needed for filtering (`client`, `county`, `contactPlatform`, `collected`, `delivered`). The list is held in `OrderList.js` state. Filtering in-memory avoids round-trips, makes the filter instant, and requires zero backend changes — fully consistent with the spec's "instantaneous" requirement and the assumption documented in `spec.md`.

**Alternatives considered**:
- Server-side query parameters on `GET /api/orders`: Would require API and potentially query changes; adds latency; unnecessary given the data is already available client-side.

---

## Decision 2: Where to put the pure filter logic

**Decision**: Extract into `src/lib/orderFilters.js` as a pure function `filterOrders(orders, filters)`.

**Rationale**: A pure function is trivially unit-testable (no DOM, no React, no mocking required) and satisfies the constitution's 80% coverage floor for `src/lib/`. Keeping it separate from the component also makes the logic reusable and reviewable in isolation.

**Alternatives considered**:
- Inline the filter logic inside `OrderList.js`: Would work but make unit-testing harder and violate Single Responsibility.
- Computed property via `useMemo` only: Means the logic is embedded in JSX and cannot be tested without rendering.

---

## Decision 3: Text search debounce

**Decision**: No debounce — `OrderFilters` is a fully controlled, stateless component. The client-name input is bound directly to `filters.clientSearch` and calls `onChange` on every keystroke.

**Rationale**: An initial 150 ms debounce was prototyped but introduced a dual-source-of-truth bug: the input mirrored the search text in local state while the parent held the authoritative filter state. When the reset action cleared the parent state to a value the local mirror never matched (e.g. the parent's `clientSearch` was still `''` because other filters had already narrowed the list before the debounce fired), the input retained stale text. Making the component fully controlled — exactly as specified in the component contract ("stateless — all state is owned by the parent") — eliminates the bug entirely. For the expected scale (a few hundred orders) filtering on each keystroke is well within the 300 ms SC-002 threshold, so the optimization was unnecessary.

**Alternatives considered**:
- 150 ms debounce with local mirror state: Rejected — caused the stale-input reset bug above and violated the stateless contract.
- `lodash.debounce`: Would require a new dependency; overkill for a single call site.
- Debouncing only the filtering (separate "applied" state in the parent): More moving parts than warranted at this scale; can be revisited if order volume grows large enough to make per-keystroke filtering perceptible.

---

## Decision 4: Filter state shape and location

**Decision**: A single `filterState` object managed with `useState` in `OrderList.js`, passed down as props to `OrderFilters.js`.

```js
const DEFAULT_FILTERS = {
  clientSearch: '',   // string — partial, case-insensitive match on order.client
  county: '',         // '' = all; non-empty string = exact match on order.county
  platform: '',       // '' = all; non-empty string = exact match on order.contactPlatform
  collected: '',      // '' = all; 'true' = collected only; 'false' = uncollected only
  delivered: '',      // '' = all; 'true' = delivered only; 'false' = undelivered only
};
```

**Rationale**: `OrderList.js` already owns the `orders` array and all order mutations. Colocating filter state there keeps the data flow simple: one owner, one source of truth. Prop-drilling to `OrderFilters.js` is shallow (one level) and requires no context or global store.

**Alternatives considered**:
- React Context / Zustand: Unnecessary complexity for a single-page, single-component consumer.
- URL query params: Would persist filter state across refresh (not required per spec); adds routing complexity.

---

## Decision 5: Dynamic dropdown options

**Decision**: Derive county and platform dropdown options via `useMemo` from the `orders` array in `OrderList.js`, then pass as props to `OrderFilters.js`.

**Rationale**: Options must reflect current data (FR-003, FR-004). Computing them with `useMemo` ensures the lists update when orders are added/deleted without unnecessary recomputation on every render.

**Alternatives considered**:
- Hardcoded lists: County values are user-entered free text — impossible to enumerate. Platforms are partly enumerated but orders may contain legacy or custom values.
- Fetch from a dedicated API endpoint: Adds backend work; redundant since all order data is already in state.

---

## Decision 6: Boolean status filter control type

**Decision**: Use a `<select>` element with three options ("Toate", "Da", "Nu") for both `collected` and `delivered` filters.

**Rationale**: Consistent with the county and platform dropdowns already in the panel; accessible via keyboard; renders clearly on mobile. A tri-state toggle would require custom CSS and ARIA work.

**Alternatives considered**:
- Radio buttons: More space; fine for desktop but crowded in a compact filter bar.
- Custom toggle: Requires accessible markup and custom CSS; not worth the complexity for two fields.
