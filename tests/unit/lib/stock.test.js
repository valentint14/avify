'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const { computeConsumption, deductStockForOrder } = require('../../../src/lib/stock.js');
const { create: createMaterial, getById: getMaterial } = require('../../../src/lib/materials.js');
const { replaceRecipe } = require('../../../src/lib/recipes.js');

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM recipe_lines');
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM materials');
  db.exec('DELETE FROM product_templates');
});

function makeTemplate(name) {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO product_templates (id, name, created_at) VALUES (?, ?, ?)').run(
    id,
    name,
    new Date().toISOString()
  );
  return id;
}

function makeOrder() {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO orders (id, name, created_at) VALUES (?, ?, ?)').run(
    id,
    'Order',
    new Date().toISOString()
  );
  return id;
}

function addProduct(orderId, templateId, quantity, status = 'realizat') {
  db.prepare(
    'INSERT INTO products (id, order_id, name, status, template_id, quantity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), orderId, 'P', status, templateId, quantity, new Date().toISOString());
}

describe('computeConsumption', () => {
  it('multiplies quantity by per-piece for a single product', () => {
    const recipes = { t1: [{ materialId: 'carton', qtyPerPiece: 1 }] };
    const products = [{ templateId: 't1', quantity: 30 }];
    expect(computeConsumption(products, recipes)).toEqual({ carton: 30 });
  });

  it('supports decimal per-piece quantities', () => {
    const recipes = { t1: [{ materialId: 'satin', qtyPerPiece: 0.2 }] };
    const products = [{ templateId: 't1', quantity: 10 }];
    expect(computeConsumption(products, recipes)).toEqual({ satin: 2 });
  });

  it('sums consumption across products sharing a material', () => {
    const recipes = {
      t1: [{ materialId: 'carton', qtyPerPiece: 1 }],
      t2: [{ materialId: 'carton', qtyPerPiece: 2 }],
    };
    const products = [
      { templateId: 't1', quantity: 10 },
      { templateId: 't2', quantity: 5 },
    ];
    expect(computeConsumption(products, recipes)).toEqual({ carton: 20 });
  });

  it('ignores products with no template or no recipe', () => {
    const recipes = { t1: [{ materialId: 'carton', qtyPerPiece: 1 }] };
    const products = [
      { templateId: null, quantity: 5 },
      { templateId: 'no-recipe', quantity: 5 },
      { templateId: 't1', quantity: 3 },
    ];
    expect(computeConsumption(products, recipes)).toEqual({ carton: 3 });
  });
});

describe('deductStockForOrder', () => {
  it('deducts when all products are realizat', () => {
    const carton = createMaterial({ name: 'Carton', currentStock: 100 });
    const t = makeTemplate('Invitație');
    replaceRecipe(t, [{ materialId: carton.id, qtyPerPiece: 1 }]);
    const order = makeOrder();
    addProduct(order, t, 30, 'realizat');

    const result = deductStockForOrder(order);
    expect(result.deducted).toBe(true);
    expect(getMaterial(carton.id).currentStock).toBe(70);
  });

  it('is a no-op when the order is not complete', () => {
    const carton = createMaterial({ name: 'Carton', currentStock: 100 });
    const t = makeTemplate('Invitație');
    replaceRecipe(t, [{ materialId: carton.id, qtyPerPiece: 1 }]);
    const order = makeOrder();
    addProduct(order, t, 30, 'in_realizare'); // not realizat

    expect(deductStockForOrder(order).deducted).toBe(false);
    expect(getMaterial(carton.id).currentStock).toBe(100);
  });

  it('deducts exactly once (idempotent)', () => {
    const carton = createMaterial({ name: 'Carton', currentStock: 100 });
    const t = makeTemplate('Invitație');
    replaceRecipe(t, [{ materialId: carton.id, qtyPerPiece: 1 }]);
    const order = makeOrder();
    addProduct(order, t, 30, 'realizat');

    deductStockForOrder(order);
    const second = deductStockForOrder(order);
    expect(second.deducted).toBe(false);
    expect(getMaterial(carton.id).currentStock).toBe(70); // unchanged on re-run
  });

  it('is a no-op for an unknown order', () => {
    expect(deductStockForOrder('nope').deducted).toBe(false);
  });

  it('allows stock to go below zero', () => {
    const carton = createMaterial({ name: 'Carton', currentStock: 5 });
    const t = makeTemplate('Invitație');
    replaceRecipe(t, [{ materialId: carton.id, qtyPerPiece: 1 }]);
    const order = makeOrder();
    addProduct(order, t, 30, 'realizat');

    deductStockForOrder(order);
    expect(getMaterial(carton.id).currentStock).toBe(-25);
  });

  it('completes with no deduction when products have no recipe', () => {
    const t = makeTemplate('NoRecipe');
    const order = makeOrder();
    addProduct(order, t, 10, 'realizat');
    const result = deductStockForOrder(order);
    expect(result.deducted).toBe(true);
    expect(result.changes).toEqual({});
  });
});
