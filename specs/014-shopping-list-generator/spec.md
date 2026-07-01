# Feature Specification: Generează Listă Cumpărături (Shopping List Generator)

**Feature Branch**: `014-shopping-list-generator`

**Created**: 2026-07-01

**Status**: Draft

**Input**: User description: "Creează un buton 'Generează listă cumpărături' în pagina de stocuri. Sistemul trebuie să scaneze comenzile din următoarele 30 de zile, să calculeze necesarul total de materiale pe baza rețetelor și să genereze o listă cu cantitățile exacte ce trebuie cumpărate pentru a acoperi producția."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate and View Shopping List (Priority: P1)

The workshop manager opens the "Stoc materiale" page, clicks the "Generează listă cumpărături" button, and immediately sees a calculated shopping list. The list shows every material that needs to be purchased — with the exact quantity to buy — to cover production for all orders due in the next 30 days. Materials already sufficiently stocked are excluded from the buy list, so the manager only sees what is actually needed.

**Why this priority**: This is the entire purpose of the feature. Without it, the manager must manually cross-reference order recipes and current stock — a slow, error-prone process that leads to either under-buying (production delays) or over-buying (cash tied up in unused stock).

**Independent Test**: Can be fully tested by seeding two orders due within 30 days, both containing products from templates with known recipes, then clicking the button and verifying the list shows the correct buy quantities after subtracting existing stock.

**Acceptance Scenarios**:

1. **Given** there are orders with event dates within the next 30 days containing products linked to templates with recipe data, **When** the user clicks "Generează listă cumpărături", **Then** the system MUST display a shopping list showing each needed material, its required quantity, current stock, and quantity to buy (required minus current stock, floored at zero).
2. **Given** the calculation produces results, **When** the list is displayed, **Then** materials where current stock already covers the full requirement MUST NOT appear in the "to buy" section (or MUST be shown with a "0 de cumpărat" indicator and visually distinguished).
3. **Given** the list is displayed, **When** no orders are due in the next 30 days, **Then** the system MUST show a clear message: "Nu există comenzi cu termen în următoarele 30 de zile."
4. **Given** the list is displayed, **When** all required materials are already in stock, **Then** the system MUST show a message: "Stocul existent acoperă toată producția planificată."
5. **Given** the user clicks the button, **When** some order products are linked to templates without any recipe defined, **Then** those products MUST be excluded from the calculation and a warning MUST appear listing how many products could not be calculated.
6. **Given** the shopping list is displayed, **When** the user dismisses it and clicks the button again, **Then** the list MUST be recalculated fresh each time (reflects any stock or order changes since the last generation).

---

### User Story 2 - Print or Export the Shopping List (Priority: P2)

After reviewing the shopping list on screen, the workshop manager wants a physical copy to take to the supplier. A print action (or equivalent export) produces a clean, formatted version of the list — material names and buy quantities — suitable for use at the store.

**Why this priority**: The shopping list is most useful when carried to a supplier. A digital-only list forces the manager to carry a phone or print from a browser — neither is ideal. A one-click print action makes the workflow end-to-end within the app.

**Independent Test**: Can be fully tested by generating a shopping list and activating the print action, then verifying the browser print dialog opens with the list content correctly formatted (material name + quantity to buy visible).

**Acceptance Scenarios**:

1. **Given** the shopping list is displayed with at least one item to buy, **When** the user clicks "Printează lista", **Then** the browser print dialog MUST open with a print-ready version of the list — showing material name and quantity to buy for each row.
2. **Given** the print view is rendered, **When** it is printed, **Then** navigation elements, buttons, and UI chrome MUST NOT appear — only the list content and a header identifying it as a shopping list (e.g., date generated).
3. **Given** the shopping list is empty (all stock sufficient), **When** the user activates print, **Then** the printed page MUST convey that no purchasing is needed, not produce a blank page.

---

### Edge Cases

- What happens when an order has both an event date and a delivery date, and only one falls within the 30-day window? Either qualifying date places the order in scope.
- What happens when a product's quantity was updated after the recipe was last defined? The calculation uses the current product quantity and the current recipe — no historical snapshotting.
- What happens when a material is used by multiple templates in the same or different orders? All contributions MUST be summed into a single line for that material.
- What happens when the order window produces a very large list (20+ materials)? The display MUST be scrollable and remain readable.
- What happens when an order has no products at all? It contributes nothing to the shopping list and is silently ignored.
- What happens when a product has `status = 'realizat'`? Already-completed products are excluded from the calculation — their materials have already been consumed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "Stoc materiale" page MUST include a "Generează listă cumpărături" button, visible without scrolling on standard desktop viewports.
- **FR-002**: Clicking the button MUST trigger a calculation that scans all orders whose `event_date` OR `delivery_date` falls within the next 30 calendar days from the current date.
- **FR-003**: Orders with neither `event_date` nor `delivery_date` set MUST be excluded from the calculation.
- **FR-004**: For each qualifying order, only products with `status` of `'de_realizat'` or `'in_realizare'` MUST be included; products with `status = 'realizat'` MUST be excluded.
- **FR-005**: For each included product, the system MUST look up the product's template recipe and multiply each material's `qty_per_piece` by the product's quantity to get the material requirement for that product.
- **FR-006**: Requirements for the same material across all products and orders MUST be summed into a single total required quantity per material.
- **FR-007**: For each material, the quantity to buy MUST be calculated as: `MAX(0, total_required − current_stock)`. If `current_stock ≥ total_required`, the material requires no purchase.
- **FR-008**: The system MUST display the result as a modal or panel showing: material name, total required quantity (with unit), current stock (with unit), and quantity to buy (with unit).
- **FR-009**: Materials with a quantity to buy of zero MUST be visually separated from those that require purchasing (e.g., shown in a secondary "covered" section or hidden by default).
- **FR-010**: If no orders qualify for the date window, the system MUST show the message: "Nu există comenzi cu termen în următoarele 30 de zile."
- **FR-011**: If all materials are sufficiently stocked, the system MUST show the message: "Stocul existent acoperă toată producția planificată."
- **FR-012**: Products linked to templates with no recipe defined MUST be excluded from the calculation. If any such products exist, a warning count MUST be shown: "X produs(e) fără rețetă nu au putut fi calculate."
- **FR-013**: Products without a template link (ad-hoc products) MUST also be excluded with the same warning mechanism as FR-012.
- **FR-014**: The result list MUST include a "Printează lista" button that opens the browser print dialog with a print-optimized view (no navigation, no UI chrome, only material name, quantity to buy, and unit, plus a generation date header).
- **FR-015**: The list MUST be recalculated on each button click — no caching of previous results.

### Key Entities *(include if feature involves data)*

- **Comandă (Order)**: An order with `event_date` and/or `delivery_date`. Only orders with at least one of these dates within the next 30 days are in scope.
- **Produs din comandă (Order Product)**: A product in a qualifying order with a status other than `'realizat'`. Has a `quantity` and links to a product template.
- **Șablon de produs (Product Template)**: Provides the link to recipe lines. Products without a template or whose template has no recipe are excluded with a warning.
- **Linie de rețetă (Recipe Line)**: Maps a template to a material with a `qty_per_piece` value. Drives the material requirement calculation.
- **Material**: Has `name`, `current_stock`, and `unit`. The shopping list aggregates required quantities and compares to `current_stock`.
- **Linie de cumpărături (Shopping List Row)**: A derived, non-persisted aggregate — one row per material — showing `total_required`, `current_stock`, `to_buy` (= MAX(0, total_required − current_stock)), and `unit`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The shopping list is generated and displayed within 3 seconds of the button click, for a typical workshop dataset (up to 100 orders and 50 materials).
- **SC-002**: 100% of qualifying order products with valid recipe data contribute to the shopping list — no silent omissions.
- **SC-003**: A workshop manager can generate, review, and initiate printing of the shopping list in under 2 minutes from opening the stock page.
- **SC-004**: The printed shopping list contains only the relevant purchase data — no extraneous UI elements appear on paper.
- **SC-005**: The feature correctly handles the case where current stock already covers all needs — zero items appear in the "to buy" list and the "all covered" message is displayed.

## Assumptions

- Orders are identified as "upcoming" based on `event_date` or `delivery_date` — not on creation date or order name.
- The 30-day window is calculated from the current calendar date (today inclusive, day+30 inclusive).
- Products in `'realizat'` status have already consumed their materials; they are excluded from the calculation.
- Products in `'de_realizat'` and `'in_realizare'` status have not yet consumed materials; both are included in the calculation.
- `qty_per_piece` in recipe lines is expressed in the same unit as the material's stock unit — no unit conversion is needed.
- If a recipe line's `qty_per_piece` is zero or negative (data error), that line contributes zero to the material requirement.
- The shopping list is read-only — it does not automatically update stock levels or create purchase orders.
- No export to CSV or PDF is required for v1; only browser print is needed.
- The feature is visible to all authenticated users of the stock page; no role-based access restrictions are applied.
- The 30-day range is fixed and not user-configurable in v1.
