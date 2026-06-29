# Data Model: Application Navigation Bar

**Feature**: 005-app-navbar | **Date**: 2026-06-29

## Overview

The navbar feature has no data persistence layer. All state is derived at render time from the current URL pathname. The entities below are presentational/structural, not stored.

---

## Entities

### NavLink

A single navigation entry rendered in the navbar's link list.

| Attribute | Type | Description |
|-----------|------|-------------|
| `label` | `string` | Display text shown to the user (e.g., "Comenzi", "Catalog Produse") |
| `href` | `string` | Target URL path (e.g., `/`, `/catalog`) |
| `isActive` | `boolean` | Derived at render time: `true` when current pathname equals `href` |

**Derivation rule for `isActive`**:

```
isActive = (currentPathname === href)
```

The equality check is exact — partial matches are intentionally excluded to avoid false positives on sub-routes. If `href` is `/` and `currentPathname` is `/catalog`, `isActive` is `false` for the "/" link.

**State transitions**:

```
inactive ──[user navigates to href]──► active
active   ──[user navigates elsewhere]──► inactive
```

Only one NavLink can be active at a time. If `currentPathname` does not match any defined `href`, all NavLinks remain inactive (handles edge case from spec).

---

### Navbar

The container component. Stateless beyond reading the current pathname.

| Attribute | Type | Description |
|-----------|------|-------------|
| `appName` | `string` | Fixed value: `"Avify"` — the application brand name displayed on the left |
| `links` | `NavLink[]` | Ordered list of navigation entries; rendered left-to-right on the right side of the bar |

**Defined links (fixed, not configurable at runtime)**:

| Order | Label | href |
|-------|-------|------|
| 1 | Comenzi | `/` |
| 2 | Catalog Produse | `/catalog` |

---

## No Database Entities

This feature does not introduce any new database tables, files, or API endpoints. It is a pure UI composition feature.
