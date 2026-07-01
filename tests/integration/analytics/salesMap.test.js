'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

let db;
let getSalesMapData;

beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
  ({ getSalesMapData } = require('../../../src/lib/analytics.js'));
});

beforeEach(() => {
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM orders');
});

function insertOrder({ county = null, delivered = 0, profit = null } = {}) {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO orders (id, name, created_at, county, delivered, profit)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, 'Test Order', new Date().toISOString(), county, delivered ? 1 : 0, profit);
  return id;
}

describe('getSalesMapData', () => {
  test('returns [] when no delivered orders exist', () => {
    insertOrder({ county: 'Cluj', delivered: false });
    expect(getSalesMapData()).toEqual([]);
  });

  test('returns aggregated data for delivered orders', () => {
    insertOrder({ county: 'Cluj', delivered: true, profit: 100 });
    insertOrder({ county: 'Cluj', delivered: true, profit: 200 });
    insertOrder({ county: 'Iași', delivered: true, profit: 50 });

    const result = getSalesMapData();

    expect(result).toHaveLength(2);
    const cluj = result.find((r) => r.county === 'Cluj');
    expect(cluj).toMatchObject({ county: 'Cluj', deliveredCount: 2, totalProfit: 300 });
    const iasi = result.find((r) => r.county === 'Iași');
    expect(iasi).toMatchObject({ county: 'Iași', deliveredCount: 1, totalProfit: 50 });
  });

  test('treats NULL profit as 0 in totalProfit', () => {
    insertOrder({ county: 'Cluj', delivered: true, profit: null });
    const [row] = getSalesMapData();
    expect(row.totalProfit).toBe(0);
    expect(row.deliveredCount).toBe(1);
  });

  test('excludes orders where county is NULL', () => {
    insertOrder({ county: null, delivered: true, profit: 500 });
    expect(getSalesMapData()).toEqual([]);
  });

  test('excludes orders where county is empty string', () => {
    insertOrder({ county: '', delivered: true, profit: 500 });
    expect(getSalesMapData()).toEqual([]);
  });

  test('excludes orders where delivered = 0', () => {
    insertOrder({ county: 'Cluj', delivered: false, profit: 200 });
    expect(getSalesMapData()).toEqual([]);
  });

  test('results are ordered alphabetically by county', () => {
    insertOrder({ county: 'Vrancea', delivered: true, profit: 10 });
    insertOrder({ county: 'Alba', delivered: true, profit: 20 });
    insertOrder({ county: 'Mureș', delivered: true, profit: 30 });

    const result = getSalesMapData();
    expect(result.map((r) => r.county)).toEqual(['Alba', 'Mureș', 'Vrancea']);
  });

  test('returns numeric types for deliveredCount and totalProfit', () => {
    insertOrder({ county: 'Timiș', delivered: true, profit: 150.75 });
    const [row] = getSalesMapData();
    expect(typeof row.deliveredCount).toBe('number');
    expect(typeof row.totalProfit).toBe('number');
    expect(row.totalProfit).toBeCloseTo(150.75);
  });
});
