# Feature Specification: Orders Calendar

**Feature Branch**: `011-orders-calendar`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Adaugă o pagină nouă de tip Calendar în aplicație. Aceasta trebuie să mapeze și să afișeze vizual comenzile sub formă de evenimente, folosind câmpurile 'Dată eveniment' și 'Termen livrare'. La click pe o comandă din calendar, deschide un pop-up rapid (Dialog din shadcn) cu detaliile și produsele acesteia."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Monthly Calendar View of Orders (Priority: P1)

A user navigates to the Calendar page from the main navigation bar. The page displays the current month in a grid format. Each order that has a "Dată eveniment" (event date) or "Termen livrare" (delivery date) appears as a labelled chip on the corresponding day. Orders with both dates appear on each relevant day. Events for event dates and delivery dates are visually differentiated (e.g., distinct colour or label prefix) so the user can instantly tell what type of deadline each event represents.

**Why this priority**: The calendar view is the core deliverable. Without it, no other story is meaningful. It gives users a spatial, at-a-glance understanding of workload across the month.

**Independent Test**: Navigate to `/calendar`. Seed one order with `event_date = today` and one with `delivery_date = today + 3 days`. Both must appear on the correct days with distinct visual treatments. The page must be fully usable without the dialog feature.

**Acceptance Scenarios**:

1. **Given** at least one order exists with a non-null `event_date`, **When** the user visits the Calendar page, **Then** a chip for that order appears on the correct calendar day under the "Eveniment" category.
2. **Given** at least one order exists with a non-null `delivery_date`, **When** the user visits the Calendar page, **Then** a chip for that order appears on the correct calendar day under the "Livrare" category.
3. **Given** an order has both `event_date` and `delivery_date` set to different days, **When** the calendar renders, **Then** the order appears as a chip on both days with the appropriate category label each time.
4. **Given** an order has neither `event_date` nor `delivery_date`, **When** the calendar renders, **Then** that order does not appear anywhere on the calendar.
5. **Given** multiple orders fall on the same day, **When** the calendar renders, **Then** all of them appear as chips stacked on that day cell (no events are hidden or collapsed by default, unless more than 3 — see edge cases).

---

### User Story 2 — Order Detail Dialog on Event Click (Priority: P2)

When the user clicks on any event chip in the calendar, a modal dialog opens immediately. The dialog displays the full order details (name, client, county, contact platform, event date, delivery date, advance, profit, collected and delivered status) and the complete list of products belonging to that order, including each product's name, status, quantity, and unit price.

**Why this priority**: The dialog transforms the calendar from a read-only overview into an actionable tool. Users can drill down without navigating away from the calendar context.

**Independent Test**: Click an event chip. A dialog must open within 500 ms containing the order name, at least one metadata field (e.g., client name), and the list of products. Closing the dialog must return focus to the calendar without a full-page reload.

**Acceptance Scenarios**:

1. **Given** the calendar displays an event chip, **When** the user clicks the chip, **Then** a dialog opens showing the order's name, client, county, contact platform, event date, delivery date, advance, profit, and collected/delivered flags.
2. **Given** the dialog is open, **When** the user reviews the products list, **Then** each product shows its name, status, quantity, and unit price.
3. **Given** an order has zero products, **When** the dialog opens, **Then** a message "Nicio comandă nu conține produse." (or similar) is displayed instead of an empty list.
4. **Given** the dialog is open, **When** the user presses Escape or clicks outside the dialog, **Then** the dialog closes and the calendar remains visible with no data loss.
5. **Given** the user opens the dialog for an event of type "Livrare", **When** the dialog header renders, **Then** it clearly indicates this is a delivery deadline (e.g., a label "Termen livrare") so the user knows which date triggered the event.

---

### User Story 3 — Month Navigation (Priority: P3)

The user can move forward and backward between calendar months using "Previous" and "Next" buttons. A "Today" button resets the view to the current month. The displayed month and year are always visible as a heading.

**Why this priority**: Without navigation, the calendar is only useful for the current month. Navigation is essential for planning ahead and reviewing past orders, but the single-month MVP still delivers standalone value.

**Independent Test**: Click "Next month" twice, then "Today". Verify the calendar returns to the current month and the heading updates correctly. Seed an order with `event_date` 2 months in the future and confirm it appears only after navigating forward.

**Acceptance Scenarios**:

1. **Given** the calendar shows the current month, **When** the user clicks "Luna anterioară", **Then** the calendar transitions to the previous month and the heading updates.
2. **Given** the user has navigated away from the current month, **When** the user clicks "Azi", **Then** the calendar returns to the current month.
3. **Given** an order has `event_date` in the next month, **When** the user navigates to that month, **Then** the order chip appears on the correct day.
4. **Given** the calendar is on any month, **When** the page header is inspected, **Then** the displayed month name and year are correct (e.g., "Iulie 2026").

---

### Edge Cases

- What happens when a day has more than 3 events? Show the first 3 chips and a "+N more" indicator; all events are still accessible via click-to-expand or the dialog.
- What happens when the user navigates to a month with no orders? Display the empty grid with no chips and no error message.
- What happens when an order name is very long (>40 characters)? Truncate with an ellipsis in the chip; full name is visible in the dialog.
- What happens when the calendar is viewed on a narrow screen (mobile)? The grid must not overflow horizontally; day cells must remain tappable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST expose a Calendar page accessible from the main navigation bar under the label "Calendar".
- **FR-002**: The Calendar MUST display a monthly grid with days of the week as column headers (starting Monday, Romanian locale).
- **FR-003**: The Calendar MUST render one chip per order per date type for every order where `event_date` is within the displayed month.
- **FR-004**: The Calendar MUST render one chip per order per date type for every order where `delivery_date` is within the displayed month.
- **FR-005**: Chips for `event_date` and chips for `delivery_date` MUST be visually distinct from each other (different colour or label prefix).
- **FR-006**: Clicking any event chip MUST open a modal dialog with the order's full details and product list without navigating away from the calendar.
- **FR-007**: The dialog MUST display: order name, client, county, contact platform, event date, delivery date, advance, profit, collected status, delivered status.
- **FR-008**: The dialog MUST display all products of the order, each showing: name, status, quantity, unit price.
- **FR-009**: The dialog MUST be closable via a close button, the Escape key, or clicking the backdrop.
- **FR-010**: The Calendar MUST provide "Luna anterioară", "Luna următoare", and "Azi" controls for month navigation.
- **FR-011**: The currently displayed month and year MUST be visible as a heading above the grid.
- **FR-012**: The Calendar page MUST display a loading indicator while order data is being fetched.
- **FR-013**: Day cells with more than 3 events MUST show the first 3 chips and a "+N more" overflow indicator.

### Key Entities

- **Order**: The central entity shown on the calendar. Relevant fields: `id`, `name`, `client`, `county`, `contact_platform`, `event_date`, `delivery_date`, `advance`, `profit`, `collected`, `delivered`.
- **CalendarEvent**: A derived view object pairing an Order with a specific date and event type (`eveniment` | `livrare`). Not stored — computed at render time from orders data.
- **Product**: Belongs to an Order. Relevant fields: `name`, `status`, `quantity`, `unit_price`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to the Calendar page and see all relevant orders for the current month within 2 seconds of page load on a standard connection.
- **SC-002**: Clicking an event chip opens the order detail dialog within 500 ms (no additional network request required if data is already loaded).
- **SC-003**: 100% of orders with a non-null `event_date` or `delivery_date` in the displayed month appear on the calendar — zero events are silently dropped.
- **SC-004**: The calendar grid and dialog are fully operable via keyboard alone (Tab, Enter, Escape, arrow keys for month navigation).
- **SC-005**: The calendar layout does not break or overflow on viewports as narrow as 375px (iPhone SE).

## Assumptions

- All orders and their products are already stored in the existing database; no new data entry is required by this feature.
- An order's `event_date` and `delivery_date` are stored as ISO date strings (YYYY-MM-DD or full ISO-8601); no format conversion beyond parsing is needed.
- Orders without both `event_date` and `delivery_date` are intentionally excluded from the calendar — this is expected behaviour, not an error.
- The calendar shows one month at a time; a week or agenda view is out of scope for this version.
- The navigation bar already supports adding a new "Calendar" link without layout changes.
- Product data for an order is available through the existing data layer without schema changes.
- The dialog does not need to allow editing of order or product data — it is read-only.
- Week starts on Monday (Romanian convention).
