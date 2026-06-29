// Navigation links shown in the top navbar. Single source of truth used by
// both the Navbar component and its tests. Order here is the left-to-right
// render order in the bar.
export const NAV_LINKS = [
  { label: 'Comenzi', href: '/' },
  { label: 'Catalog Produse', href: '/catalog' },
];

// A link is active only on an exact pathname match. Partial matches are
// intentionally excluded so sub-routes do not falsely highlight a top-level
// link (e.g. "/" must not stay active while on "/catalog").
export function isLinkActive(pathname, href) {
  return pathname === href;
}
