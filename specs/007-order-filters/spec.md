# Feature Specification: Order Filters

**Feature Branch**: `007-order-filters`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "Adaugă un sistem de filtrare deasupra tabelului principal de comenzi. Vreau să pot filtra lista de comenzi simultan după: Județ, Platformă contact, Status încasare (Încasată/Neîncasată), Status livrare (Livrată/Nelivrată) și o bară de căutare textuală pentru numele Clientului. Filtrarea trebuie să se aplice instantaneu asupra rândurilor din tabel."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Client Name Search (Priority: P1)

A user needs to find a specific order quickly by typing the client's name into a search bar above the order table. As they type, the list narrows instantly to show only orders whose client name contains the typed text.

**Why this priority**: Searching by client is the most frequent lookup action — it covers the majority of daily "find this order" tasks with a single control.

**Independent Test**: With at least 3 orders in the system (different client names), type a partial name in the search bar — only matching orders appear immediately. Clearing the search restores all orders.

**Acceptance Scenarios**:

1. **Given** the order list is visible with multiple orders, **When** the user types a partial client name (e.g., "Ana") in the search bar, **Then** only orders whose client name contains "Ana" (case-insensitive) are shown, updated with each keystroke.
2. **Given** a search term is active, **When** the user clears the search input, **Then** all orders reappear immediately.
3. **Given** a search term that matches no client names, **When** the term is entered, **Then** an empty-state message is displayed (e.g., "Nicio comandă găsită").
4. **Given** some orders have no client name set, **When** a search term is entered, **Then** orders without a client name are excluded from results.

---

### User Story 2 - Categorical Dropdown Filters: County & Contact Platform (Priority: P2)

A user wants to narrow the order list to a specific county or contact platform using dropdown menus. Selecting a value from either dropdown instantly hides all orders that do not match.

**Why this priority**: Useful for regional or channel-based workflow reviews; builds on the same instant-filter pattern as US1 but for categorical fields.

**Independent Test**: With orders spread across at least 2 counties, select a county from the dropdown — only orders for that county remain visible. Resetting the dropdown to "Toate" restores all orders.

**Acceptance Scenarios**:

1. **Given** orders exist with different county values, **When** the user selects a county from the Județ dropdown, **Then** only orders matching that county are shown instantly.
2. **Given** orders exist with different contact platforms, **When** the user selects a platform from the Platformă contact dropdown, **Then** only orders with that platform are shown instantly.
3. **Given** a county filter is active, **When** the user selects "Toate" from the dropdown, **Then** the county filter is cleared and all orders (subject to other active filters) are shown.
4. **Given** no orders have a county set, **When** the Județ dropdown is opened, **Then** it contains only the "Toate" option and selecting it has no filtering effect.
5. **Given** both county and platform filters are active simultaneously, **When** either is changed, **Then** results reflect the AND combination of all currently active filters.

---

### User Story 3 - Boolean Status Filters: Collected & Delivered (Priority: P2)

A user wants to show only orders that are marked as collected, or only those not yet delivered, by toggling dedicated filter controls for "Încasată" and "Livrată" status.

**Why this priority**: Operational scanning — a user running end-of-day reconciliation needs to instantly see all uncollected or undelivered orders. Follows the same instant-filter pattern as prior stories.

**Independent Test**: With a mix of collected and uncollected orders, select "Încasată" in the collection filter — only collected orders appear. Resetting to "Toate" restores all orders.

**Acceptance Scenarios**:

1. **Given** orders exist in both collected and uncollected states, **When** the user selects "Încasată" in the collection status filter, **Then** only orders marked as collected are shown.
2. **Given** orders exist in both collected and uncollected states, **When** the user selects "Neîncasată", **Then** only uncollected orders are shown.
3. **Given** orders exist in both delivered and undelivered states, **When** the user selects "Livrată" or "Nelivrată" in the delivery status filter, **Then** results are filtered accordingly.
4. **Given** both a collection filter and a delivery filter are active, **When** either is changed, **Then** results reflect the AND combination of all active filters.
5. **Given** any status filter is set to a non-default value, **When** the user resets it to "Toate", **Then** that filter dimension is cleared and results update immediately.

---

### User Story 4 - Combined Multi-Filter & Reset (Priority: P3)

A user applies multiple filters simultaneously (e.g., county = "Cluj", platform = "Facebook", collection = "Neîncasată") and then resets all filters to the unfiltered state with a single action.

**Why this priority**: The combination of all filters and the reset action completes the filtering experience; it is only useful once individual filters (US1–US3) work correctly.

**Independent Test**: Activate all 5 filters simultaneously with values that produce a small matching set, verify the result, then click the reset control — all orders reappear.

**Acceptance Scenarios**:

1. **Given** all 5 filter dimensions are set to non-default values, **When** the result set is inspected, **Then** only orders matching ALL active filters (AND logic) are visible.
2. **Given** one or more filters are active, **When** the user activates the "Resetează filtrele" (Reset filters) control, **Then** all filters return to their default (unfiltered) state and the full order list is restored.
3. **Given** all filters are at their defaults (no active filtering), **When** the reset control is activated, **Then** no visible change occurs and all orders remain displayed.

---

### Edge Cases

- What happens when filtering produces 0 results? → An explicit "Nicio comandă găsită" empty state message is shown; the table header remains visible.
- What happens when the dropdown values for county/platform change because a new order is added? → Dropdown options reflect the current state of data (dynamically sourced from existing orders).
- What happens when the user rapidly types in the search bar? → The filter is applied on each change event; no debounce delay is required for correctness, though a short debounce may be applied to avoid excessive re-renders.
- What happens if all orders have no client name? → The search bar is still visible and functional; entering text results in the empty state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a filter panel above the order table at all times when the order list is visible.
- **FR-002**: The filter panel MUST include a text input labelled "Caută client" that performs case-insensitive, partial-match filtering on the client name field of each order.
- **FR-003**: The filter panel MUST include a dropdown labelled "Județ" whose options are dynamically drawn from the distinct non-empty county values present in the loaded order list, plus a leading "Toate județele" option representing no county filter.
- **FR-004**: The filter panel MUST include a dropdown labelled "Platformă contact" whose options are drawn from the distinct non-empty contact platform values present in the loaded order list, plus a leading "Toate platformele" option representing no platform filter.
- **FR-005**: The filter panel MUST include a control labelled "Încasare" with three states: "Toate" (no filter), "Încasată" (show only collected), "Neîncasată" (show only uncollected).
- **FR-006**: The filter panel MUST include a control labelled "Livrare" with three states: "Toate" (no filter), "Livrată" (show only delivered), "Nelivrată" (show only undelivered).
- **FR-007**: All active filter dimensions MUST be combined with AND logic — an order is visible only if it satisfies every active filter simultaneously.
- **FR-008**: The filtered order list MUST update immediately upon any change to any filter control, without requiring a page reload or explicit confirmation action.
- **FR-009**: When no orders match the active filter combination, the order list area MUST display a human-readable empty state message rather than a blank or collapsed section.
- **FR-010**: The filter panel MUST include a "Resetează filtrele" control that returns all filter dimensions to their default (unfiltered) states in a single interaction.
- **FR-011**: Orders with a null or empty client name MUST be excluded from search results when the client name search field contains any non-empty text.

### Key Entities

- **Filter State**: A transient collection of five values — client search text (string), county (string or "all"), contact platform (string or "all"), collected status ("all" | true | false), delivered status ("all" | true | false). Not persisted beyond the current session.
- **Order** (existing): The data entity being filtered; provides `client`, `county`, `contactPlatform`, `collected`, `delivered` fields used for matching.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can locate a specific order by partial client name in under 10 seconds from opening the page.
- **SC-002**: Any filter change (typing, dropdown selection, status toggle) reflects in the visible order list within 300 milliseconds on a device with a modern browser.
- **SC-003**: All five filter dimensions can be active simultaneously and produce results that are the correct intersection of all five constraints — verifiable by manual inspection.
- **SC-004**: Activating the reset control restores the full, unfiltered order list in a single click with no additional confirmation required.
- **SC-005**: An empty filter result state is clearly communicated with a readable message; users are not left looking at a blank table body.

## Assumptions

- Filtering is performed client-side on data already present in memory (the full order list returned by the existing `GET /api/orders` call); no new backend endpoints or query parameters are required.
- Filter state is in-memory only — it resets when the page is refreshed or the user navigates away.
- County and contact platform dropdown options are derived dynamically from the loaded order data, not from a separately maintained static list.
- The AND logic between filter dimensions is the correct business expectation; OR logic across dimensions is explicitly out of scope.
- A short debounce (≤ 200 ms) on the client name text input is acceptable to reduce unnecessary re-renders, as long as the visible result updates within the SC-002 threshold.
- The filter panel is placed immediately above the existing order table and does not replace or restructure the table itself.
- Mobile/responsive layout of the filter panel is in scope but may follow the same responsive approach already established for the rest of the application.
