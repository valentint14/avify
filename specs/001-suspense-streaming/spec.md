# Feature Specification: Suspense Streaming & Progressive Loading

**Feature Branch**: `001-suspense-streaming`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Integrează React Suspense și streaming-ul nativ din Next.js pentru gestionarea stărilor de încărcare (loading scenes). Implementează fișiere loading.tsx la nivelul fiecărei rute principale și încapsulează componentele asincrone în <Suspense>. Folosește componente de tip Skeleton din shadcn/ui drept fallback, asigurând o randare progresivă și fluidă a interfeței în timp ce datele sunt extrase din SQLite."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Immediate Visual Feedback on Navigation (Priority: P1)

A user navigates to any main page of the app (orders list, catalog, or material stock). Instead of staring at a blank screen while the server retrieves data, they immediately see a structured placeholder that mirrors the layout of the real content. The actual data fills in progressively as it becomes available.

**Why this priority**: Eliminating the blank-screen experience is the most visible UX improvement this feature delivers. Every user on every page visit benefits from this change, and it directly reduces perceived wait time — the single most important factor in UX responsiveness.

**Independent Test**: Can be tested in isolation on any single route: navigate to `/`, observe that a skeleton structure appears before the real order data is rendered. Delivers immediate value as a standalone improvement to the orders page.

**Acceptance Scenarios**:

1. **Given** the user is on any page, **When** they navigate to the Orders list (`/`), **Then** a skeleton placeholder representing the list of orders is visible within 200ms, before any real order data appears.
2. **Given** the user is on any page, **When** they navigate to the Catalog (`/catalog`), **Then** a skeleton placeholder representing catalog cards/rows is visible before the product templates load.
3. **Given** the user is on any page, **When** they navigate to Material Stock (`/stoc-materiale`), **Then** a skeleton placeholder representing the materials table/list is visible before the materials data loads.
4. **Given** a skeleton is showing, **When** the server finishes fetching data, **Then** the skeleton is replaced by real content without a visible layout shift or flash.

---

### User Story 2 - Consistent Skeleton Shape Across the App (Priority: P2)

A user visits multiple sections of the app on the same session. The loading placeholders in each section visually match the shape of the final content — they are not generic spinners, but structured previews that look like the real page with greyed-out blocks in place of actual data.

**Why this priority**: Consistency in loading UI reduces cognitive dissonance and reinforces the app's professional quality. A skeleton that matches the final content layout also makes the transition to real data feel smooth rather than jarring.

**Independent Test**: Can be verified without data by throttling the network or slowing down data fetching and comparing the skeleton shape side-by-side with the loaded state for each route.

**Acceptance Scenarios**:

1. **Given** the Orders page is loading, **When** the skeleton is displayed, **Then** it contains the same number of placeholder rows as a typical loaded state (e.g., 3–5 placeholder order rows), each with placeholder columns matching the real row structure.
2. **Given** the Catalog page is loading, **When** the skeleton is displayed, **Then** it shows placeholder blocks that match the catalog grid or list layout.
3. **Given** the Material Stock page is loading, **When** the skeleton is displayed, **Then** it shows placeholder rows matching the materials table layout.

---

### User Story 3 - No Regression in Data Freshness or Completeness (Priority: P3)

A user who was previously relying on the app to show the latest order/catalog/stock data continues to see accurate, up-to-date information after the loading improvements. The change only affects how quickly initial feedback is displayed — it does not alter what data is ultimately shown.

**Why this priority**: The loading UX improvement must not come at the cost of correctness. All three pages currently fetch fresh data on every navigation; this must be preserved. This story exists to explicitly define the non-regression contract.

**Independent Test**: Can be validated by creating or modifying a record (order, product, or material) and then navigating to the corresponding page — the latest data must appear after the skeleton resolves.

**Acceptance Scenarios**:

1. **Given** an order was updated elsewhere, **When** the user navigates to the Orders page, **Then** after the skeleton resolves, the order list reflects the latest data.
2. **Given** a product template was added to the catalog, **When** the user navigates to the Catalog, **Then** after the skeleton resolves, the new template is visible.
3. **Given** material stock was deducted via an order completion, **When** the user navigates to Material Stock, **Then** after the skeleton resolves, the updated stock quantities are shown.

---

### Edge Cases

- What happens when data fetching fails (e.g., database read error)? The skeleton should not spin indefinitely; an appropriate error state must replace it.
- What happens on slow connections or artificially slow data retrieval? The skeleton must remain visible and stable without flickering or disappearing prematurely.
- What happens if a user navigates away before data finishes loading? The loading state must cancel gracefully with no orphaned skeleton.
- What happens if data returns so quickly that the skeleton is barely visible? A minimum display threshold is not required; a seamless transition is acceptable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a structured, page-specific skeleton placeholder immediately upon navigation to each main route, before data retrieval is complete.
- **FR-002**: Skeleton placeholders MUST visually reflect the shape and layout of the actual page content (not generic spinners or blank space).
- **FR-003**: Skeleton components MUST be drawn from the established design system (shadcn/ui) to ensure consistency with the rest of the UI.
- **FR-004**: Each of the three main routes (`/`, `/catalog`, `/stoc-materiale`) MUST have its own dedicated loading state.
- **FR-005**: Once data is available, the skeleton MUST be replaced by real content without a visible layout shift or screen flash.
- **FR-006**: Data freshness MUST be preserved — each route MUST continue to return the latest data from the database on every navigation (no stale caching).
- **FR-007**: When data retrieval fails, the system MUST display an informative, user-readable error state rather than leaving the skeleton visible indefinitely.
- **FR-008**: The loading mechanism MUST allow fine-grained streaming — individual page sections can resolve independently if they fetch different data.

### Key Entities

- **Route Loading State**: A per-route placeholder UI that activates during data retrieval and is replaced by real content on resolution.
- **Skeleton Component**: A reusable UI element from the design system that mimics the visual structure of real content using neutral placeholder blocks.
- **Route**: One of the three navigable sections of the app — Orders (`/`), Catalog (`/catalog`), or Material Stock (`/stoc-materiale`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see a structured loading placeholder within 200ms of initiating navigation to any main route, measured on a simulated mid-tier device with a standard local database.
- **SC-002**: Pages achieve First Contentful Paint under 1.5 seconds on a simulated 4G connection (aligns with the project's constitution performance baseline).
- **SC-003**: Zero occurrences of a fully blank page between navigation and final content render — a skeleton or content must always be visible.
- **SC-004**: The shape of each skeleton matches the final page layout well enough that no visible layout shift occurs when real content replaces it (Cumulative Layout Shift score approaches 0).
- **SC-005**: All three main routes continue to display accurate, up-to-date data after implementing streaming (no regression in data freshness verified by automated acceptance tests).
- **SC-006**: All acceptance scenarios in User Stories 1–3 pass in automated end-to-end tests.

## Assumptions

- The app's three main routes (`/`, `/catalog`, `/stoc-materiale`) are the only routes in scope for this feature; API routes are excluded.
- The skeleton designs will closely mirror the existing content layouts without requiring a redesign of those layouts.
- The shadcn/ui Skeleton component will be added to the project's component library as part of this feature (it is not currently present).
- Data reading from SQLite is fast enough that the skeleton is typically visible for only a short duration under normal conditions; performance optimization of the queries themselves is out of scope.
- The project currently uses JavaScript (`.js`/`.jsx`) files; loading state files will follow the same convention unless TypeScript migration is adopted separately.
- No authentication or permission system gates access to these routes; all routes are publicly accessible within the app.
- Mobile responsiveness of the skeleton components must match the responsiveness of the real content they replace (per WCAG 2.1 AA and constitution UX standards).
