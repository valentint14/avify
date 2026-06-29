'use strict';

const { DEFAULT_FILTERS, filterOrders, deriveOptions } = require('../../../src/lib/orderFilters.js');

// Sample order factory — only the fields the filter cares about.
function makeOrder(overrides = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    client: 'Maria Ionescu',
    county: 'Cluj',
    contactPlatform: 'Facebook',
    collected: false,
    delivered: false,
    ...overrides,
  };
}

const orders = [
  makeOrder({ client: 'Maria Ionescu', county: 'Cluj', contactPlatform: 'Facebook', collected: true, delivered: false }),
  makeOrder({ client: 'Ion Popescu', county: 'București', contactPlatform: 'Instagram', collected: false, delivered: true }),
  makeOrder({ client: 'Ana Maria', county: 'Cluj', contactPlatform: 'Telefon', collected: true, delivered: true }),
  makeOrder({ client: null, county: null, contactPlatform: null, collected: false, delivered: false }),
];

describe('filterOrders', () => {
  it('returns all orders unchanged with DEFAULT_FILTERS', () => {
    expect(filterOrders(orders, DEFAULT_FILTERS)).toHaveLength(orders.length);
  });

  it('defaults to DEFAULT_FILTERS when no filters passed', () => {
    expect(filterOrders(orders)).toHaveLength(orders.length);
  });

  it('matches client name case-insensitively and partially', () => {
    const result = filterOrders(orders, { ...DEFAULT_FILTERS, clientSearch: 'maria' });
    expect(result.map((o) => o.client)).toEqual(['Maria Ionescu', 'Ana Maria']);
  });

  it('trims surrounding whitespace in the search term', () => {
    const result = filterOrders(orders, { ...DEFAULT_FILTERS, clientSearch: '  ion  ' });
    // "Ion Popescu" and "Maria Ionescu" both contain "ion"
    expect(result).toHaveLength(2);
  });

  it('excludes orders with no client name when search term is non-empty', () => {
    const result = filterOrders(orders, { ...DEFAULT_FILTERS, clientSearch: 'a' });
    expect(result.every((o) => o.client != null)).toBe(true);
  });

  it('filters by exact county match', () => {
    const result = filterOrders(orders, { ...DEFAULT_FILTERS, county: 'Cluj' });
    expect(result).toHaveLength(2);
    expect(result.every((o) => o.county === 'Cluj')).toBe(true);
  });

  it('filters by exact platform match', () => {
    const result = filterOrders(orders, { ...DEFAULT_FILTERS, platform: 'Instagram' });
    expect(result).toHaveLength(1);
    expect(result[0].contactPlatform).toBe('Instagram');
  });

  it('filters by collected = true', () => {
    const result = filterOrders(orders, { ...DEFAULT_FILTERS, collected: 'true' });
    expect(result).toHaveLength(2);
    expect(result.every((o) => o.collected === true)).toBe(true);
  });

  it('filters by collected = false', () => {
    const result = filterOrders(orders, { ...DEFAULT_FILTERS, collected: 'false' });
    expect(result.every((o) => o.collected === false)).toBe(true);
  });

  it('filters by delivered = true', () => {
    const result = filterOrders(orders, { ...DEFAULT_FILTERS, delivered: 'true' });
    expect(result).toHaveLength(2);
    expect(result.every((o) => o.delivered === true)).toBe(true);
  });

  it('combines all five dimensions with AND logic', () => {
    const result = filterOrders(orders, {
      clientSearch: 'maria',
      county: 'Cluj',
      platform: 'Telefon',
      collected: 'true',
      delivered: 'true',
    });
    expect(result).toHaveLength(1);
    expect(result[0].client).toBe('Ana Maria');
  });

  it('returns an empty array when no order matches', () => {
    const result = filterOrders(orders, { ...DEFAULT_FILTERS, county: 'Timiș' });
    expect(result).toEqual([]);
  });
});

describe('deriveOptions', () => {
  it('returns sorted distinct non-null values for a field', () => {
    expect(deriveOptions(orders, 'county')).toEqual(['București', 'Cluj']);
  });

  it('returns distinct platforms', () => {
    expect(deriveOptions(orders, 'contactPlatform')).toEqual(['Facebook', 'Instagram', 'Telefon']);
  });

  it('returns an empty array when all values are null', () => {
    const nullOrders = [makeOrder({ county: null }), makeOrder({ county: null })];
    expect(deriveOptions(nullOrders, 'county')).toEqual([]);
  });

  it('ignores empty-string values', () => {
    const mixed = [makeOrder({ county: '' }), makeOrder({ county: 'Cluj' })];
    expect(deriveOptions(mixed, 'county')).toEqual(['Cluj']);
  });
});
