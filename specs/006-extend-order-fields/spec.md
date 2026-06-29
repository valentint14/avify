# Feature Specification: Extend Order Fields & Auto-Calculated Totals

**Feature Branch**: `006-extend-order-fields`

**Created**: 2026-06-29

**Status**: Draft

**Input**: User description: "Extinde formularul și structura comenzii cu următoarele câmpuri: Client, Dată primire, Avans (număr), Județ, Platformă contact (text/enum), Dată eveniment, Termen livrare, Profit (valoare mock/calculată), Încasată (boolean) și Livrată (boolean). Adaugă câmpul Preț unitar pentru fiecare produs din comandă. Aplicația trebuie să calculeze automat Totalul comenzii (Cantitate × Preț pentru fiecare item, apoi suma lor) și să afișeze valoarea Totalului și a Profitului în rândul principal al comenzii din tabel și în detalii."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Order with All Client & Logistics Fields (Priority: P1)

A user creates or edits an order and fills in all new fields: client name, reception date, county, contact platform, event date, delivery deadline, advance amount, collected status, and delivered status. These fields are saved and displayed correctly in the order details view.

**Why this priority**: These fields capture the essential business data for every order — who the client is, when the event takes place, which channel they came from, and the financial/logistics status. Without this data, the order record is incomplete for business operations.

**Independent Test**: Can be fully tested by opening the order form, filling in all new fields, saving, and verifying the saved values appear in order details and the table row — delivers a complete, auditable order record.

**Acceptance Scenarios**:

1. **Given** an existing order in the system, **When** a user opens the order form and fills in Client ("Maria Ionescu"), Dată primire (2026-07-01), Avans (500), Județ ("Cluj"), Platformă contact ("Facebook"), Dată eveniment (2026-08-15), Termen livrare (2026-08-10), Încasată (true), Livrată (false), and saves, **Then** all fields are persisted and visible in the order details panel.

2. **Given** a new order form, **When** the user submits without filling optional fields, **Then** the order is saved with sensible defaults (empty string for text, false for booleans, 0 for numbers) and no validation errors are shown.

3. **Given** a saved order, **When** the user reopens the form, **Then** all previously entered field values are pre-populated correctly.

4. **Given** the order list table, **When** orders are displayed, **Then** the Total and Profit values are visible in the main row of each order.

---

### User Story 2 - Unit Price per Product & Auto-Calculated Order Total (Priority: P1)

A user adds products to an order, each with a quantity and a unit price. The system automatically calculates the line total (Quantity × Unit Price) per product and sums them to display the Order Total in both the product list and the order header row.

**Why this priority**: The financial total is the most critical business metric per order. Automating this calculation eliminates manual errors and ensures the displayed total is always consistent with the product data.

**Independent Test**: Can be fully tested by creating an order with two products, setting quantities and unit prices, and verifying the total shown matches the manual calculation — delivers accurate financial tracking per order.

**Acceptance Scenarios**:

1. **Given** an order with product A (qty 3, price 50 RON) and product B (qty 2, price 120 RON), **When** the order detail view is displayed, **Then** the Total shows 390 RON (3×50 + 2×120).

2. **Given** an order with products displayed, **When** a user changes the unit price or quantity of any product and saves, **Then** the Order Total recalculates immediately and updates in both the details view and the order's main row in the table.

3. **Given** an order with no products, **When** displayed, **Then** the Total shows 0 RON.

4. **Given** an order with unit prices set, **When** the order row is shown in the main table, **Then** the Total value is visible inline without requiring the user to expand the order details.

---

### User Story 3 - Profit Display (Priority: P2)

The system displays a Profit value for each order, visible in both the main order row and the expanded order details. The Profit is calculated or provided as a mock value relative to the order total.

**Why this priority**: Profit visibility gives business operators a quick assessment of margin per order. It is secondary to accurate total calculation but important for business decision-making.

**Independent Test**: Can be fully tested by verifying that each order row displays a Profit figure alongside the Total, and that the Profit updates when the Total changes — delivers financial insight per order.

**Acceptance Scenarios**:

1. **Given** an order with a calculated Total, **When** displayed in the table, **Then** a Profit value is shown alongside the Total in the main row.

2. **Given** an order's detail view, **When** the order is expanded, **Then** Profit is displayed prominently near the Total.

3. **Given** an order with Total = 0, **When** displayed, **Then** Profit shows 0 or an appropriate indicator.

---

### User Story 4 - Collected & Delivered Status Tracking (Priority: P2)

A user can mark an order as "Încasată" (payment collected) and "Livrată" (delivered) via boolean toggles. These states are visible at a glance in the order table.

**Why this priority**: These two boolean flags are the primary operational checkpoints for fulfillment and payment. Operators need to scan orders and quickly identify which are paid and which have been shipped.

**Independent Test**: Can be fully tested by toggling Încasată and Livrată on an order and verifying the visual indicators update in the order table row — delivers order lifecycle visibility.

**Acceptance Scenarios**:

1. **Given** an order, **When** a user sets Încasată to true and saves, **Then** the order table row displays a visual indicator that the order has been collected/paid.

2. **Given** an order, **When** a user sets Livrată to true and saves, **Then** the order table row displays a visual indicator that the order has been delivered.

3. **Given** an order where both Încasată and Livrată are false, **When** displayed in the table, **Then** the row reflects unpaid and undelivered status clearly.

---

### Edge Cases

- What happens when a product's unit price is left blank or set to 0? (Total calculation should treat it as 0 and not error.)
- How does the system handle very large numbers for Avans or unit prices? (Display should not overflow the UI.)
- What happens if Dată eveniment is before Dată primire? (System saves the data; no automatic validation blocking is required for v1.)
- What happens if Termen livrare is after Dată eveniment? (System saves the data; visual warning is optional for v1.)
- What if Platformă contact is an unrecognized value when entered as free text? (System accepts and saves any text value.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The order form MUST include the following new fields: Client (text), Dată primire (date), Avans (number), Județ (text), Platformă contact (text or selection from predefined options), Dată eveniment (date), Termen livrare (date), Încasată (boolean toggle), Livrată (boolean toggle).
- **FR-002**: Each product item within an order MUST include a Preț unitar (unit price) field accepting a numeric value.
- **FR-003**: The system MUST automatically calculate each product line's subtotal as Quantity × Preț unitar without requiring manual input from the user.
- **FR-004**: The system MUST automatically calculate the Order Total as the sum of all product line subtotals and update it whenever a quantity or unit price changes.
- **FR-005**: The Order Total MUST be displayed in the main order row in the orders table (visible without expanding the order).
- **FR-006**: The Order Total MUST be displayed in the expanded order details view.
- **FR-007**: A Profit value MUST be displayed in the main order row and in the expanded order details view. The Profit value is either entered manually or computed as a mock/derived value from the Total for v1.
- **FR-008**: The Încasată and Livrată boolean fields MUST be displayed as visual indicators (e.g., checkboxes, badges, or icons) in the main order row in the table without requiring the user to expand the order.
- **FR-009**: All new fields MUST be persisted with the order and correctly reloaded when the order form is reopened for editing.
- **FR-010**: Platformă contact MUST support at minimum the following predefined values: Facebook, Instagram, TikTok, Telefon, Email, Altele — and MUST allow custom text input as well.
- **FR-011**: The order form MUST allow all new fields to be left empty/unset without blocking order submission.

### Key Entities *(include if feature involves data)*

- **Order**: Represents a customer order. Gains new attributes — Client (string), Dată primire (date), Avans (number), Județ (string), Platformă contact (string), Dată eveniment (date), Termen livrare (date), Profit (number, derived or manual), Încasată (boolean), Livrată (boolean), Total (computed from products).
- **OrderProduct**: Represents a product line within an order. Gains a new attribute — Preț unitar (number). The line subtotal (Quantity × Preț unitar) is computed on the fly, not persisted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the order form, fill in all 10 new order-level fields and the unit price per product, and save — all within under 2 minutes for a typical order with 3–5 products.
- **SC-002**: The Order Total displayed always matches the manually verified calculation (Quantity × Price per item, summed), with zero tolerance for discrepancy.
- **SC-003**: Total and Profit values are visible in the order table row without any additional user interaction (no expand, no hover required).
- **SC-004**: Încasată and Livrată status indicators are distinguishable at a glance in the order table, allowing an operator to scan 20 orders and identify paid/unpaid and delivered/undelivered without reading labels.
- **SC-005**: All new fields survive a full save-reload cycle — values entered are identical to values retrieved after page refresh.
- **SC-006**: The order total recalculates and updates within 0.5 seconds of a quantity or unit price change.

## Assumptions

- The existing order data model is stored in a local SQLite database (based on prior feature context); new fields will be added as columns via a database migration.
- Profit for v1 is a manually entered field or a simple mock value (e.g., Total − Avans); a sophisticated margin calculation engine is out of scope.
- The Platformă contact predefined options (Facebook, Instagram, TikTok, Telefon, Email, Altele) are reasonable defaults for the target market; the list can be expanded later.
- Currency is RON (Romanian Leu) throughout; no multi-currency support is needed.
- The existing order table (Kanban/accordion UI) will be extended in place; no redesign of the table layout is required beyond adding the new column values.
- Termen livrare and Dată eveniment are informational fields; no automated deadline alerts or overdue highlighting are required for v1.
- Mobile responsiveness follows the project's existing responsive design approach; no new breakpoints need to be defined for this feature.
- The Profit field is stored as a number (RON amount), not a percentage.
