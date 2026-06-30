# Feature Specification: Financial Dashboard

**Feature Branch**: `010-financial-dashboard`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Creează o pagină numită 'Dashboard' pentru analize financiare și grafice vizuale (folosind recharts/shadcn). Dashboard-ul trebuie să afișeze: evoluția profitului lunar, un clasament al celor mai vândute produse din Catalog."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Monthly Revenue Evolution Chart (Priority: P1)

A manager opens the Dashboard to see how total revenue has evolved over recent months. The chart provides a clear visual trend — which months were high-performing, which were slow — enabling informed business decisions without having to manually tally individual orders.

**Why this priority**: Revenue trend is the core financial insight. Without it, the dashboard delivers no analytical value. It is the primary reason the page exists.

**Independent Test**: Navigate to `/dashboard` with at least two months of order data in the system. A chart displaying one data point per month with the correct aggregated revenue value must be visible and accurate.

**Acceptance Scenarios**:

1. **Given** there are orders spread across multiple months, **When** the manager opens the Dashboard, **Then** a chart displays one aggregated revenue value per month in chronological order.
2. **Given** the chart is visible, **When** the manager inspects a specific month's bar or data point, **Then** the displayed value matches the sum of all order values for that month.
3. **Given** there are no orders in the system, **When** the manager opens the Dashboard, **Then** the chart area shows a clear empty-state message instead of a broken or blank chart.
4. **Given** data exists for only one month, **When** the manager opens the Dashboard, **Then** the chart renders that single data point without errors.

---

### User Story 2 — Top-Selling Products Ranking (Priority: P2)

A manager wants to know which products from the Catalog appear most frequently across all orders. The ranking shows a quick ordered list of best-sellers so they can prioritise procurement, promotional efforts, and catalog pruning decisions.

**Why this priority**: Product performance insight is complementary to revenue trends. Knowing *what* sells best enables action. It depends on order data already aggregated for US1, making it a natural second priority.

**Independent Test**: Navigate to `/dashboard` with orders containing at least 3 distinct products. A ranking list or chart must appear showing products ordered from most to least frequently ordered, with the correct counts.

**Acceptance Scenarios**:

1. **Given** orders reference multiple products, **When** the manager opens the Dashboard, **Then** a ranking of products is displayed, ordered from most ordered to least ordered.
2. **Given** the ranking is visible, **When** the manager reads the first entry, **Then** it is the product that appears in the greatest number of orders (or order lines), with the correct count shown.
3. **Given** the catalog has products that have never been ordered, **When** the manager views the ranking, **Then** those products do not appear in the ranking (or clearly appear at the bottom as zero-sales).
4. **Given** there are no orders in the system, **When** the manager opens the Dashboard, **Then** the ranking area shows a clear empty-state message.

---

### User Story 3 — Summary KPI Cards (Priority: P3)

At a glance, the manager can see high-level totals (total number of orders, total revenue all-time) as summary metric cards at the top of the Dashboard, without needing to read through charts.

**Why this priority**: KPI cards add quick-scan value for frequent visits but are not required to deliver the core analytical experience. They enhance US1 and US2 but can be added after.

**Independent Test**: Navigate to `/dashboard`. Two or more summary cards must be visible showing the total order count and total all-time revenue, both matching the raw database counts exactly.

**Acceptance Scenarios**:

1. **Given** there are orders in the system, **When** the manager opens the Dashboard, **Then** summary cards display the total number of orders and total all-time revenue.
2. **Given** a new order is added, **When** the manager refreshes the Dashboard, **Then** summary cards reflect the updated counts immediately.
3. **Given** there are no orders, **When** the manager opens the Dashboard, **Then** summary cards show zero values (not blank or errored).

---

### Edge Cases

- What happens when there are zero orders? — Each widget shows a clear, friendly empty state (no broken charts or blank space).
- What happens when only one month of data exists? — The monthly chart renders a single data point without errors.
- What happens when a product has been removed from the Catalog but appears in historical orders? — It still counts toward the ranking (historical data is preserved).
- What happens when two products are tied in sales count? — Both are displayed; tie-breaking is by product name alphabetically.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Dashboard page accessible via the main navigation bar.
- **FR-002**: Dashboard MUST display a time-series chart showing total revenue aggregated by calendar month, covering all available historical data (up to the most recent 12 months, or all data if less than 12 months exist).
- **FR-003**: Dashboard MUST display a ranking of products ordered by the total number of times they appear in orders, showing at least the top 10 entries.
- **FR-004**: Dashboard MUST display summary metric cards showing: total number of orders and total all-time revenue.
- **FR-005**: Each chart and ranking widget MUST display a user-friendly empty-state message when no data is available, rather than a blank or broken UI.
- **FR-006**: Revenue figures MUST be calculated as the sum of individual product prices across all orders (not filtered by order status, unless a specific status filter is introduced in a future feature).
- **FR-007**: The product ranking MUST show the product name and the count of orders it appears in.
- **FR-008**: The Dashboard MUST be a read-only page — no data entry or mutation occurs on this page.
- **FR-009**: The Dashboard page MUST show a loading skeleton while data is being fetched, consistent with the existing loading pattern in the application.

### Key Entities

- **Monthly Revenue Entry**: A computed record grouping orders by calendar month, with total revenue for that month. Derived from existing order and product data; no new persisted entity required.
- **Product Sales Summary**: A computed record pairing a product name with the number of orders it appears in. Derived from existing order-product relationships; no new persisted entity required.
- **Summary KPIs**: Scalar values (total order count, total all-time revenue) computed from existing order data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Dashboard page fully renders (charts visible, data loaded) within 2 seconds on a standard desktop connection.
- **SC-002**: The monthly revenue chart values match the sum of corresponding order values with 100% accuracy (zero tolerance for calculation errors).
- **SC-003**: The product ranking lists products in correct descending order by sales volume with 100% accuracy.
- **SC-004**: The Dashboard renders without errors or blank sections for all data states: zero orders, one month of data, and 24+ months of data.
- **SC-005**: A manager can identify the top 3 best-selling products within 10 seconds of opening the Dashboard, without any additional navigation.
- **SC-006**: Summary KPI values match raw database counts with 100% accuracy at the time of page load.

## Assumptions

- "Profit" is interpreted as total **revenue** (sum of product prices across orders), since the application does not currently track costs or margins. This is documented as a known simplification.
- All orders count toward revenue calculations regardless of status, unless the order management feature introduces a formal "cancelled" status that should be excluded (to be revisited when that feature ships).
- The top products ranking displays the top 10 products by default; no pagination or "load more" is required for v1.
- The monthly chart covers the most recent 12 months of data. If data spans fewer than 12 months, all available months are shown.
- The Dashboard is a new route at `/dashboard` and requires a new entry in the main navigation bar.
- All users have equal access to the Dashboard (no role-based access restrictions in v1).
- The Dashboard is read-only — it presents aggregated data from existing orders and catalog entries but does not allow any modifications.
- Mobile responsiveness is required for the layout (charts must be legible on tablet-sized screens); very small phone screens are out of scope for v1.
