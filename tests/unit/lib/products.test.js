'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

const { getProductsByOrder, createProduct, updateProductStatus, updateProduct, deleteProduct, createProductFromTemplate } = require('../../../src/lib/products.js');
const { createOrder } = require('../../../src/lib/orders.js');
const { create: createTemplate } = require('../../../src/lib/productTemplates.js');

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM product_templates');
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
    expect(p).toHaveProperty('status', 'de_realizat');
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
    expect(product.status).toBe('de_realizat');
    expect(product.createdAt).toBeTruthy();
  });

  it('response shape includes templateId field (null when not provided)', () => {
    const order = createOrder('TemplateId Shape');
    const product = createProduct(order.id, 'Meniu');
    expect(product).toHaveProperty('templateId', null);
  });

  it('stores templateId when provided', () => {
    const order = createOrder('With Template');
    const template = createTemplate('Invitație clasică', null);
    const product = createProduct(order.id, 'Invitație clasică', template.id);
    expect(product.templateId).toBe(template.id);
  });
});

// ── createProductFromTemplate ─────────────────────────────────────
describe('createProductFromTemplate', () => {
  it('creates product copying name from template', () => {
    const order = createOrder('From Template');
    const template = createTemplate('Meniu nuntă', 'Desc');
    const product = createProductFromTemplate(order.id, template.id);
    expect(product.name).toBe('Meniu nuntă');
    expect(product.templateId).toBe(template.id);
    expect(product.orderId).toBe(order.id);
    expect(product.status).toBe('de_realizat');
  });

  it('returns null for unknown template id', () => {
    const order = createOrder('Unknown Template');
    expect(createProductFromTemplate(order.id, 'nonexistent-id')).toBeNull();
  });
});

// ── updateProductStatus ──────────────────────────────────────────
describe('updateProductStatus', () => {
  it('updates to a valid status', () => {
    const order = createOrder('Update Test');
    const product = createProduct(order.id, 'Meniu');
    const updated = updateProductStatus(product.id, 'in_realizare');
    expect(updated.status).toBe('in_realizare');
    expect(updated.id).toBe(product.id);
  });

  it('returns null for invalid status', () => {
    const order = createOrder('Invalid Status');
    const product = createProduct(order.id, 'Program');
    const result = updateProductStatus(product.id, 'invalid-status');
    expect(result).toBeNull();
  });

  it('returns null for unknown product id', () => {
    const result = updateProductStatus('nonexistent-id', 'realizat');
    expect(result).toBeNull();
  });

  it('accepts all 3 valid statuses', () => {
    const order = createOrder('All Statuses');
    const validStatuses = ['de_realizat', 'in_realizare', 'realizat'];
    for (const status of validStatuses) {
      const product = createProduct(order.id, `Produs ${status}`);
      const updated = updateProductStatus(product.id, status);
      expect(updated.status).toBe(status);
    }
  });
});

// ── quantity & additionalInfo on createProduct ───────────────────
describe('createProduct quantity and additionalInfo', () => {
  it('persists quantity and additionalInfo when provided', () => {
    const order = createOrder('Qty Test');
    const product = createProduct(order.id, 'Tricou', null, 3, 'Font Arial');
    expect(product.quantity).toBe(3);
    expect(product.additionalInfo).toBe('Font Arial');
  });

  it('defaults quantity to 1 and additionalInfo to null', () => {
    const order = createOrder('Default Qty');
    const product = createProduct(order.id, 'Meniu');
    expect(product.quantity).toBe(1);
    expect(product.additionalInfo).toBeNull();
  });

  it('parseRow returns quantity as number and additionalInfo as null when missing', () => {
    const order = createOrder('ParseRow Test');
    const product = createProduct(order.id, 'Program');
    expect(typeof product.quantity).toBe('number');
    expect(product.additionalInfo).toBeNull();
  });
});

// ── updateProduct ────────────────────────────────────────────────
describe('updateProduct', () => {
  it('updates quantity only', () => {
    const order = createOrder('Update Qty');
    const product = createProduct(order.id, 'Invitații');
    const updated = updateProduct(product.id, { quantity: 5 });
    expect(updated.quantity).toBe(5);
    expect(updated.additionalInfo).toBeNull();
  });

  it('updates additionalInfo only', () => {
    const order = createOrder('Update Info');
    const product = createProduct(order.id, 'Meniu');
    const updated = updateProduct(product.id, { additionalInfo: 'culoare roșu' });
    expect(updated.additionalInfo).toBe('culoare roșu');
    expect(updated.quantity).toBe(1);
  });

  it('updates both quantity and additionalInfo', () => {
    const order = createOrder('Update Both');
    const product = createProduct(order.id, 'Program');
    const updated = updateProduct(product.id, { quantity: 7, additionalInfo: 'Font Bold' });
    expect(updated.quantity).toBe(7);
    expect(updated.additionalInfo).toBe('Font Bold');
  });

  it('returns null for unknown productId', () => {
    const result = updateProduct('nonexistent-id', { quantity: 2 });
    expect(result).toBeNull();
  });

  it('returns null when no recognized fields provided', () => {
    const order = createOrder('No Fields');
    const product = createProduct(order.id, 'Test');
    const result = updateProduct(product.id, {});
    expect(result).toBeNull();
  });
});

// ── UNIQUE constraint on (order_id, template_id) ─────────────────
describe('UNIQUE constraint on template per order', () => {
  it('throws when inserting same templateId twice for same order', () => {
    const order = createOrder('Unique Test');
    const template = createTemplate('Tricou', null);
    createProduct(order.id, 'Tricou', template.id);
    expect(() => createProduct(order.id, 'Tricou', template.id)).toThrow();
  });

  it('allows same templateId in different orders', () => {
    const o1 = createOrder('Order A');
    const o2 = createOrder('Order B');
    const template = createTemplate('Meniu', null);
    createProduct(o1.id, 'Meniu', template.id);
    expect(() => createProduct(o2.id, 'Meniu', template.id)).not.toThrow();
  });

  it('allows multiple products with null templateId in same order', () => {
    const order = createOrder('Null Templates');
    expect(() => {
      createProduct(order.id, 'Manual A', null);
      createProduct(order.id, 'Manual B', null);
    }).not.toThrow();
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
