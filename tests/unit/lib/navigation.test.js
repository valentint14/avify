'use strict';

const { NAV_LINKS, isLinkActive } = require('../../../src/lib/navigation.js');

describe('navigation links', () => {
  test('exposes Comenzi (/), Catalog Produse (/catalog) and Stoc Materiale (/stoc-materiale) in order', () => {
    expect(NAV_LINKS).toEqual([
      { label: 'Comenzi', href: '/' },
      { label: 'Catalog Produse', href: '/catalog' },
      { label: 'Stoc Materiale', href: '/stoc-materiale' },
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
