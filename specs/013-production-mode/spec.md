# Feature Specification: Mod producție (Production Mode)

**Feature Branch**: `013-production-mode`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Adaugă o pagină numită 'Mod producție'. Aceasta trebuie să extragă toate produsele din comenzi aflate în starea 'De realizat' și să le cumuleze într-o listă unică, grupate după șablonul de produs sau materialul folosit, afișând cantitatea totală de produs de realizat la nivel de atelier."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Aggregated Production Queue (Priority: P1)

The workshop manager navigates to the "Mod producție" page and immediately sees a consolidated list of everything that needs to be produced. All products from orders in "De realizat" status are extracted and merged into a single list, grouped by product template or material, each group showing the total quantity to produce. This eliminates the need to open each order individually to figure out what to produce and how much.

**Why this priority**: This is the entire purpose of the feature. Without this view, the workshop manager must mentally aggregate quantities across many orders — a slow, error-prone process. This is the minimum viable deliverable.

**Independent Test**: Can be fully tested by creating several orders with "De realizat" status containing overlapping product templates, navigating to "Mod producție", and verifying the quantities are correctly summed per group.

**Acceptance Scenarios**:

1. **Given** there are orders in "De realizat" status with products, **When** the user navigates to the "Mod producție" page, **Then** the page MUST display a grouped list of all products from those orders, each group labeled by product template name or material name, with the total quantity to produce.
2. **Given** two orders both contain the same product template (e.g., 3 units in order A and 5 units in order B), **When** the user views the "Mod producție" page, **Then** that product template group MUST show a total quantity of 8.
3. **Given** the page is displayed, **When** there are no orders in "De realizat" status, **Then** the page MUST display an empty state message indicating there is nothing to produce at the moment.
4. **Given** the page is displayed, **When** an order's status changes to something other than "De realizat" in another browser session, **Then** refreshing the page MUST reflect the updated production queue (eventual consistency on reload is acceptable).
5. **Given** orders contain products with different templates, **When** the user views the page, **Then** each distinct product template or material MUST appear as a separate group, in descending order by total quantity.

---

### User Story 2 - Drill Down Into a Production Group (Priority: P2)

After seeing the aggregated list, the workshop manager wants to know which specific orders contribute to a particular production group. Tapping or clicking a group expands it to reveal the list of contributing orders and the quantity each order contributes, so the manager can plan production batches or prioritize specific client orders.

**Why this priority**: The aggregated view answers "what to produce and how much"; the drill-down answers "for whom." This information is needed when prioritizing production runs or when a client calls to check on their specific order. It is secondary to the aggregated view but adds significant operational value.

**Independent Test**: Can be fully tested by clicking on any group in the production list and confirming the expanded view shows each contributing order with its individual quantity.

**Acceptance Scenarios**:

1. **Given** a production group is displayed, **When** the user taps or clicks on it, **Then** the group MUST expand to show a list of contributing orders (identified by order name or client name) and the quantity each order contributes to the group total.
2. **Given** a group is expanded, **When** the user taps or clicks it again, **Then** the group MUST collapse back to its summary view.
3. **Given** a group is expanded, **When** the user views the contributing orders, **Then** the sum of individual order quantities displayed MUST equal the group's total quantity.

---

### User Story 3 - Refresh Production Queue on Demand (Priority: P3)

The workshop manager wants to refresh the production queue at any moment to reflect newly added orders or status changes without needing a full page reload. A visible refresh action updates the data and shows when it was last fetched.

**Why this priority**: Production data changes throughout the workday as new orders are created or order statuses are updated. While a manual page reload works, an explicit refresh action with a "last updated" timestamp reduces uncertainty and supports a smoother workflow. This is a usability enhancement on top of the core feature.

**Independent Test**: Can be fully tested by opening the page, adding a new order with "De realizat" status in another tab, then using the refresh action and confirming the new order's products appear in the updated list.

**Acceptance Scenarios**:

1. **Given** the "Mod producție" page is open, **When** the user activates the refresh action, **Then** the page MUST re-fetch the current production queue and update the displayed list without a full page navigation.
2. **Given** the page has been refreshed, **When** new orders with "De realizat" status were added since the last load, **Then** their products MUST now appear in the aggregated list with correct quantities.
3. **Given** the page displays data, **When** the data was last fetched, **Then** the page MUST show a "last updated" timestamp so the manager knows how current the view is.

---

### Edge Cases

- What happens when a product template has been deleted from the catalog after an order was created with it? The product entry in the order still exists and MUST still appear in the production queue, identified by its saved name or a fallback label.
- What happens when an order contains the same product template more than once (duplicate line items)? All quantities for that template within the same order MUST be summed before aggregation across orders.
- What happens when a product has no assigned template or material? Those products MUST appear in a fallback group labeled "Fără categorie" (Uncategorized) so they are not silently excluded from the production queue.
- What happens when the total quantity for a group overflows a reasonable display limit (e.g., 9999+ units)? The display MUST truncate or format large numbers in a readable way (e.g., "10k+") without breaking the layout.
- What happens when the network is slow or the data load fails? The page MUST display a user-readable error message with an option to retry, rather than showing an empty state that could be mistaken for "nothing to produce."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated page accessible from the main navigation, labeled "Mod producție".
- **FR-002**: The page MUST retrieve all products belonging to orders in "De realizat" status at the time of page load.
- **FR-003**: Retrieved products MUST be grouped by product template; if no template is available, products MUST be grouped by material. If neither is available, they fall into a "Fără categorie" group.
- **FR-004**: For each group, the system MUST display the group identifier (template name or material name) and the total aggregated quantity across all contributing orders.
- **FR-005**: Groups MUST be displayed in descending order by total quantity (highest first).
- **FR-006**: Tapping or clicking a group MUST expand it to show the contributing orders and each order's individual quantity for that group.
- **FR-007**: The page MUST display an empty state message when no orders are in "De realizat" status.
- **FR-008**: The page MUST display a user-readable error message with a retry option when data retrieval fails.
- **FR-009**: The page MUST include a manual refresh action that re-fetches the production queue without a full navigation.
- **FR-010**: The page MUST display a "last updated" timestamp showing when the data was last loaded.
- **FR-011**: Products from the same order that share the same template or material MUST have their quantities summed before contributing to the group total.

### Key Entities *(include if feature involves data)*

- **Comandă (Order)**: An order record with a status field. Only orders in "De realizat" status contribute to the production queue. Has a name or client reference for identification in drill-down view.
- **Produs din comandă (Order Product)**: A line item in an order — links to a product template, has a quantity and optional material reference. Multiple line items per order are possible.
- **Șablon de produs (Product Template)**: The catalog product that serves as the grouping key. Has a name displayed in the production queue.
- **Material**: A secondary grouping attribute used when a product template is not available. Has a name displayed in the production queue.
- **Grup de producție (Production Group)**: A derived, read-only aggregate entity — not persisted — representing a unique template-or-material key with a total quantity and a list of contributing orders.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The production queue page loads and displays the full aggregated list within 2 seconds under normal workshop data volumes (up to 500 active orders).
- **SC-002**: 100% of products from orders in "De realizat" status appear in the production queue — no products are silently excluded, including those with missing templates or materials.
- **SC-003**: A workshop manager can identify the top production item and its total quantity in under 10 seconds of arriving on the page, without scrolling or additional interactions.
- **SC-004**: The manual refresh action updates the displayed data within 2 seconds of activation.
- **SC-005**: The page is usable on standard tablet viewports (768px wide and above) without horizontal scrolling or truncated group labels.

## Assumptions

- Orders have a discrete status field and "De realizat" is one defined status value already present in the system — no new order status needs to be introduced.
- Each order product already stores a reference to a product template (from the catalog) and/or a material attribute; these fields are already captured in the order creation flow (see spec 004).
- The production queue is a read-only view — no actions to change order status or quantities are taken from this page.
- Authentication and user roles are out of scope; all authenticated users can access the "Mod producție" page.
- The view operates at the workshop (atelier) level, meaning it aggregates across all orders and clients — no per-client filtering is required for v1.
- Sorting within a group (by order date or client name) is out of scope for v1; only the group-level sort by total quantity is required.
- The page does not auto-refresh on a timer; refresh is always triggered by the user or by navigating to the page.
