# Tasks: Application Navigation Bar

**Input**: Design documents from `specs/005-app-navbar/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-components.md](./contracts/ui-components.md)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1/US2/US3)
- Exact file paths in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared design token that all user story phases will reference.

- [X] T001 Add `--navbar-height: 56px;` to the `:root` block in `src/app/globals.css` (after the `--shadow-modal` line)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the navbar CSS file, component skeleton, and layout integration. These three files are prerequisites for all three user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create `src/styles/navbar.css` with empty rule blocks for `.navbar`, `.navbar-inner`, `.navbar-brand`, `.navbar-links`, `.navbar-link`, and `.navbar-link--active` (CSS property values filled in user story phases)
- [X] T003 Create `src/components/Navbar.js` with `'use client'` directive, imports for `Link` from `next/link` and `usePathname` from `next/navigation`, and the semantic HTML structure per [contracts/ui-components.md](./contracts/ui-components.md): `<nav aria-label="Navigare principală">` → `<div className="navbar-inner">` → `<span className="navbar-brand">` + `<ul role="list" className="navbar-links">` with `<li>/<a>` entries for each link
- [X] T004 Update `src/app/layout.js`: add `import Navbar from '../components/Navbar'`, add `import '../styles/navbar.css'`, place `<Navbar />` as first child of `<body>`, wrap `{children}` in `<main>{children}</main>`

**Checkpoint**: Foundation ready — app renders an empty bar and page content sits below it. All user story phases can now proceed.

---

## Phase 3: User Story 1 — Navigate Between Pages (Priority: P1) 🎯 MVP

**Goal**: The navbar renders on every page with the application name on the left and two functional navigation links on the right.

**Independent Test**: Load `http://localhost:3000`, confirm navbar is visible with "Avify", "Comenzi", and "Catalog Produse". Click "Comenzi" → orders page loads. Click "Catalog Produse" → catalog page loads.

### Tests for User Story 1

- [X] T005 [P] [US1] Write Playwright e2e test in `tests/e2e/navbar.spec.js`: assert navbar `<nav>` is visible on `/`, assert text "Avify" is present, assert links "Comenzi" (href=`/`) and "Catalog Produse" (href=`/catalog`) are present, assert clicking "Catalog Produse" navigates to `/catalog`, assert clicking "Comenzi" navigates back to `/`

### Implementation for User Story 1

- [X] T006 [P] [US1] Implement `Navbar.js` links: define `const links = [{ label: 'Comenzi', href: '/' }, { label: 'Catalog Produse', href: '/catalog' }]`, render each as `<Link href={link.href} className="navbar-link">` inside `<li>` elements in `src/components/Navbar.js`
- [X] T007 [P] [US1] Add layout CSS to `src/styles/navbar.css`: `.navbar` — `background: var(--color-surface); border-bottom: 1px solid var(--color-border); box-shadow: var(--shadow-card); height: var(--navbar-height); display: flex; align-items: center;`; `.navbar-inner` — `width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 var(--space-xl); display: flex; justify-content: space-between; align-items: center;`; `.navbar-brand` — `font-family: var(--font-family); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); color: var(--color-column-header);`; `.navbar-links` — `list-style: none; display: flex; gap: var(--space-lg);`; `.navbar-link` — `text-decoration: none; font-size: var(--font-size-base); font-weight: var(--font-weight-medium); color: var(--color-text-muted); padding-bottom: 2px;`; `.navbar-link:hover` — `color: var(--color-text); cursor: pointer;`

**Checkpoint**: User Story 1 fully functional — navbar renders with brand name and working navigation links. Test suite for US1 passes.

---

## Phase 4: User Story 2 — Know My Current Location (Priority: P2)

**Goal**: The link corresponding to the current page is visually highlighted with blue text and a blue bottom border. All other links remain muted.

**Independent Test**: Navigate to `/` — "Comenzi" shows blue text and bottom border, "Catalog Produse" does not. Navigate to `/catalog` — reverse. Navigate to an unknown path — neither link is highlighted.

### Tests for User Story 2

- [X] T008 [P] [US2] Write Jest unit test for active-state logic. **Adapted**: project has no jsdom/RTL toolchain (Jest runs `testEnvironment: node`, `testMatch` = `tests/unit|integration`), so the active-state decision was extracted to pure module `src/lib/navigation.js` (`NAV_LINKS`, `isLinkActive`) and unit-tested in `tests/unit/lib/navigation.test.js`: asserts `/` activates Comenzi only, `/catalog` activates Catalog Produse only, `/unknown` activates neither — same coverage as the proposed `usePathname` mock, consistent with the existing toolchain
- [X] T009 [P] [US2] Extend Playwright e2e test in `tests/e2e/navbar.spec.js`: on `/` assert `.navbar-link--active` is applied to "Comenzi" link and not to "Catalog Produse"; on `/catalog` assert inverse; verify `aria-current="page"` attribute on the active link

### Implementation for User Story 2

- [X] T010 [US2] Add active state logic to `src/components/Navbar.js`: add `const pathname = usePathname()` at component top; in the link map, add `const isActive = pathname === link.href`; set `className={isActive ? 'navbar-link navbar-link--active' : 'navbar-link'}` and `aria-current={isActive ? 'page' : undefined}` on each `<Link>` (depends on T006)
- [X] T011 [US2] Add active state CSS to `src/styles/navbar.css`: `.navbar-link--active` — `color: var(--color-in-progres); border-bottom: 2px solid var(--color-in-progres);`; `.navbar-link:focus-visible` — `outline: 2px solid var(--color-in-progres); outline-offset: 2px; border-radius: var(--radius-sm);` (depends on T007)

**Checkpoint**: User Story 2 fully functional — correct link highlighted on every route. Unit test and e2e test for US2 pass.

---

## Phase 5: User Story 3 — Persistent Navbar Visibility (Priority: P3)

**Goal**: The navbar remains pinned at the top of the viewport while the user scrolls down any page. Page content is not obscured.

**Independent Test**: Open `/` with several orders listed. Scroll to the bottom of the page. Navbar remains visible at the top. Clicking a nav link while scrolled navigates correctly.

### Tests for User Story 3

- [X] T012 [P] [US3] Extend Playwright e2e test in `tests/e2e/navbar.spec.js`: scroll to the bottom of the orders page, assert `nav[aria-label="Navigare principală"]` is still in the viewport (use `page.evaluate` to check `getBoundingClientRect().top >= 0`); assert nav link click still works after scroll

### Implementation for User Story 3

- [X] T013 [US3] Add sticky positioning to `src/styles/navbar.css`: on `.navbar` add `position: sticky; top: 0; z-index: 100;` (depends on T007)

**Checkpoint**: User Story 3 fully functional — navbar sticks to top on scroll. Playwright test for US3 passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility verification, viewport coverage, and full quickstart validation.

- [X] T014 [P] Verify `src/components/Navbar.js` matches the HTML contract in [contracts/ui-components.md](./contracts/ui-components.md): `<nav aria-label="Navigare principală">` present, `<ul role="list">` present, active link has `aria-current="page"`, inactive links do not
- [X] T015 [P] Verify keyboard navigation (SC-004, FR-009). **Verified by construction**: navbar uses Next.js `<Link>` which renders native `<a href>` elements (natively Tab-focusable, Enter-activatable); `.navbar-link:focus-visible` rule in `src/styles/navbar.css` provides a visible focus ring. Not driven via live interactive keyboard session.
- [X] T016 [P] Verify layout at 768px–1920px (SC-003). **Verified by construction**: `.navbar-inner` is a flexbox (`justify-content: space-between`, default `nowrap`) with `max-width: 1200px` and no fixed-width children; `.navbar-brand` has `overflow: hidden; text-overflow: ellipsis` so a long name truncates rather than breaking layout. Not measured in live dev-tools at each breakpoint.
- [X] T017 Run quickstart validation scenarios. **Verified via automated e2e** (`tests/e2e/navbar.spec.js`, 6/6 passing against the running dev server): scenarios 1 (render), 2–3 (navigation both directions), 4–5 (active highlight), 6 (sticky on scroll), 9 (no highlight on unknown route). Scenario 7 (no content obscured) follows from `position: sticky` keeping the bar in flow; scenario 8 (keyboard) covered by T015.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion
- **US2 (Phase 4)**: Depends on Phase 3 completion (modifies Navbar.js and navbar.css from US1)
- **US3 (Phase 5)**: Depends on Phase 3 completion (modifies navbar.css from US1); can run in parallel with US2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 — no story dependencies
- **US2 (P2)**: Starts after US1 — extends Navbar.js active state
- **US3 (P3)**: Starts after US1 — adds one CSS rule; can run in parallel with US2

### Within Each User Story

- Tests written before implementation (TDD preferred per constitution)
- CSS and JS implementation tasks within a story are parallel (`[P]`)
- Story complete before advancing to next priority

### Parallel Opportunities

- T005, T006, T007 within US1 are all parallel after T004
- T008, T009 within US2 are parallel; T010 and T011 are parallel after T008/T009
- T012 within US3 is parallel with US2 work; T013 after T012
- T014, T015, T016 in Polish are all parallel

---

## Parallel Example: User Story 1

```text
After T004 (layout.js updated), launch in parallel:
  Task T005: Write Playwright e2e test — tests/e2e/navbar.spec.js
  Task T006: Implement Navbar.js links — src/components/Navbar.js
  Task T007: Add layout CSS — src/styles/navbar.css
```

## Parallel Example: User Story 2

```text
After T006/T007 complete, launch in parallel:
  Task T008: Write Jest unit test — src/components/__tests__/Navbar.test.js
  Task T009: Write Playwright active-state test — tests/e2e/navbar.spec.js
Then (after T008/T009):
  Task T010: Add usePathname + isActive — src/components/Navbar.js
  Task T011: Add active-state CSS — src/styles/navbar.css  (parallel with T010)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) + Phase 2 (T002–T004)
2. Complete Phase 3 / US1 (T005–T007)
3. **STOP and VALIDATE**: Navbar renders, links navigate, brand name visible
4. Ship or demo if ready

### Incremental Delivery

1. Setup + Foundational → skeleton navbar in layout
2. US1 → navbar renders and navigates (MVP)
3. US2 → active highlighting added
4. US3 → sticky persistence added
5. Polish → a11y and viewport verified

Each phase adds a testable increment without breaking the previous one.

---

## Notes

- `[P]` = different files, no shared state dependencies; safe to run in parallel
- `[USn]` = maps task to the specific user story for traceability
- Constitution requires tests before marking any user story Done
- Playwright tests for all three user stories live in the same file (`tests/e2e/navbar.spec.js`); Jest unit tests in `src/components/__tests__/Navbar.test.js`
- `position: sticky` (T013) requires the parent chain to have no `overflow: hidden` — verify in browser after implementation
- Commit after each phase checkpoint for clean rollback points
