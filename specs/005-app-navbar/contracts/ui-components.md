# UI Component Contracts: Application Navigation Bar

**Feature**: 005-app-navbar | **Date**: 2026-06-29

## Navbar Component

### Identity

| Property | Value |
|----------|-------|
| File | `src/components/Navbar.js` |
| Type | React Client Component (`'use client'`) |
| Directive | Must include `'use client'` as first line |

### Props

The `Navbar` component accepts **no props**. It is entirely self-contained: the app name is a constant, the link list is defined internally, and the active state is derived from `usePathname()`.

```js
<Navbar />
```

### Rendered HTML contract

The component MUST render the following semantic structure:

```html
<nav aria-label="Navigare principală">
  <div class="navbar-inner">
    <span class="navbar-brand">Avify</span>
    <ul class="navbar-links" role="list">
      <li>
        <a href="/" class="navbar-link [navbar-link--active]"
           aria-current="page">   <!-- only when active -->
          Comenzi
        </a>
      </li>
      <li>
        <a href="/catalog" class="navbar-link [navbar-link--active]"
           aria-current="page">   <!-- only when active -->
          Catalog Produse
        </a>
      </li>
    </ul>
  </div>
</nav>
```

**Rules**:
- The `<nav>` element MUST have `aria-label="Navigare principală"` for WCAG 2.1 AA landmark identification.
- The active link MUST have `aria-current="page"` and the `navbar-link--active` CSS class.
- Inactive links MUST NOT have `aria-current` or `navbar-link--active`.
- Links MUST be implemented with Next.js `<Link>` (not bare `<a>`) for client-side navigation.
- The `<ul>` MUST have `role="list"` to restore list semantics removed by CSS reset.

### CSS class contract

| Class | Element | Purpose |
|-------|---------|---------|
| `.navbar` | `<nav>` | Outer sticky container |
| `.navbar-inner` | `<div>` | Constrained-width inner flex row |
| `.navbar-brand` | `<span>` | App name on the left |
| `.navbar-links` | `<ul>` | Link list on the right |
| `.navbar-link` | `<a>` | Individual nav link (inactive state) |
| `.navbar-link--active` | `<a>` (modifier) | Active link visual treatment |

### Visual behaviour contract

| State | Appearance |
|-------|-----------|
| Default (inactive link) | Colour: `--color-text-muted`; no underline; no border |
| Hover (inactive link) | Colour: `--color-text`; cursor pointer |
| Active link | Colour: `--color-in-progres`; `border-bottom: 2px solid var(--color-in-progres)` |
| Focus-visible (any link) | Visible outline (browser default or custom) that meets WCAG 2.1 AA 3:1 contrast ratio |
| Navbar container | `background: --color-surface`; `border-bottom: 1px solid --color-border`; `box-shadow: --shadow-card`; `position: sticky; top: 0; z-index: 100` |

### Layout contract

- Navbar height: `56px` (matches `--navbar-height` token)
- Inner content: `display: flex; justify-content: space-between; align-items: center`
- Inner max-width: constrained to match page content (follows pattern of other page containers in the app)
- Horizontal padding: `var(--space-xl)` on each side
- Link spacing: `var(--space-lg)` gap between links
- App name font: `var(--font-weight-bold)`, `var(--font-size-lg)`, `--color-column-header`
- Link font: `var(--font-weight-medium)`, `var(--font-size-base)`

---

## layout.js Integration Contract

The root `src/app/layout.js` MUST be updated to:

1. Import `Navbar` from `'../components/Navbar'`
2. Import `'../styles/navbar.css'`
3. Render `<Navbar />` as the first child of `<body>`
4. Wrap `{children}` in a `<main>` element for accessibility landmark

```jsx
<body>
  <Navbar />
  <main>{children}</main>
</body>
```

The `<main>` wrapper requires no additional styling — `position: sticky` on the navbar means no padding-top offset is needed.

---

## globals.css Token Addition Contract

The following token MUST be added to the `:root` block in `src/app/globals.css`:

```css
--navbar-height: 56px;
```

Placement: after the `--shadow-modal` line, as the last entry in the `:root` block.
