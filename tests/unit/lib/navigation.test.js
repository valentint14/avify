'use strict';

const { NAV_LINKS, isLinkActive } = require('../../../src/lib/navigation.js');

describe('navigation links', () => {
  test('exposes all nav links in order', () => {
    expect(NAV_LINKS).toEqual([
      { label: 'Comenzi', href: '/' },
      { label: 'Catalog produse', href: '/catalog' },
      { label: 'Stoc materiale', href: '/stoc-materiale' },
      { label: 'Calendar', href: '/calendar' },
      { label: 'Mod producție', href: '/mod-productie' },
      { label: 'Statistici', href: '/dashboard' },
    ]);
  });
});

describe('isLinkActive', () => {
  test('orders link is active on "/" and catalog link is not', () => {
    expect(isLinkActive('/', '/')).toBe(true);
    expect(isLinkActive('/', '/catalog')).toBe(false);
  });

  test('catalog link is active on "/catalog" and orders link is not', () => {
    expect(isLinkActive('/catalog', '/catalog')).toBe(true);
    expect(isLinkActive('/catalog', '/')).toBe(false);
  });

  test('no link is active on an unknown route', () => {
    expect(isLinkActive('/unknown', '/')).toBe(false);
    expect(isLinkActive('/unknown', '/catalog')).toBe(false);
  });
});
