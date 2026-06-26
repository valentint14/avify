'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const { getProductsByOrder, createProduct, updateProductStatus, deleteProduct } = require('../../../src/lib/products.js');
const { createOrder } = require('../../../src/lib/orders.js');

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM orders');
});

// ── getProductsByOrder ───────────────────────────────────────────
describe('getProductsByOrder', () => {
  it('returns empty array for order with no products', () => {
    const order = createOrder('Empty');
    expect(getProductsByOrder(order.id)).toEqual([]);
  });

  it('returns products for the given order sorted by created_at ASC', () => {
    const order = createOrder('Nuntă');
    createProduct(order.id, 'Invitații');
    createProduct(order.id, 'Meniu');
    const products = getProductsByOrder(order.id);
    expect(products).toHaveLength(2);
    expect(products[0].name).toBe('Invitații');
    expect(products[1].name).toBe('Meniu');
  });

  it('response shape has all required fields', () => {
    const order = createOrder('Shape');
    createProduct(order.id, 'Program');
    const [p] = getProductsByOrder(order.id);
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('orderId', order.id);
    expect(p).toHaveProperty('name', 'Program');
    expect(p).toHaveProperty('status', 'de_facut');
    expect(p).toHaveProperty('createdAt');
  });

  it('does not return products from other orders', () => {
    const o1 = createOrder('Order 1');
    const o2 = createOrder('Order 2');
    createProduct(o1.id, 'P1');
    createProduct(o2.id, 'P2');
    const products = getProductsByOrder(o1.id);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('P1');
  });
});

// ── createProduct ────────────────────────────────────────────────
describe('createProduct', () => {
  it('creates product with de_facut as default status', () => {
    const order = createOrder('Create Test');
    const product = createProduct(order.id, 'Invitații');
    expect(product.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(product.orderId).toBe(order.id);
    expect(product.name).toBe('Invitații');
    expect(product.status).toBe('de_facut');
    expect(product.createdAt).toBeTruthy();
  });
});

// ── updateProductStatus ──────────────────────────────────────────
describe('updateProductStatus', () => {
  it('updates to a valid status', () => {
    const order = createOrder('Update Test');
    const product = createProduct(order.id, 'Meniu');
    const updated = updateProductStatus(product.id, 'printare');
    expect(updated.status).toBe('printare');
    expect(updated.id).toBe(product.id);
  });

  it('returns null for invalid status', () => {
    const order = createOrder('Invalid Status');
    const product = createProduct(order.id, 'Program');
    const result = updateProductStatus(product.id, 'invalid-status');
    expect(result).toBeNull();
  });

  it('returns null for unknown product id', () => {
    const result = updateProductStatus('nonexistent-id', 'gata');
    expect(result).toBeNull();
  });

  it('accepts all 6 valid statuses', () => {
    const order = createOrder('All Statuses');
    const validStatuses = ['de_facut', 'in_design', 'validare_client', 'printare', 'asamblare', 'gata'];
    for (const status of validStatuses) {
      const product = createProduct(order.id, `Produs ${status}`);
      const updated = updateProductStatus(product.id, status);
      expect(updated.status).toBe(status);
    }
  });
});

// ── deleteProduct ────────────────────────────────────────────────
describe('deleteProduct', () => {
  it('removes the product and returns true', () => {
    const order = createOrder('Delete Test');
    const product = createProduct(order.id, 'Invitații');
    expect(deleteProduct(product.id)).toBe(true);
    expect(getProductsByOrder(order.id)).toHaveLength(0);
  });

  it('returns false for unknown id', () => {
    expect(deleteProduct('nonexistent-id')).toBe(false);
  });
});
