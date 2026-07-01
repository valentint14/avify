'use strict';

jest.mock('../../../src/lib/db.js', () => {
  const { openDb } = jest.requireActual('../../../src/lib/db.js');
  const testDb = openDb(':memory:');
  return { getDb: () => testDb, openDb };
});

let db;
beforeAll(() => {
  db = require('../../../src/lib/db.js').getDb();
});

beforeEach(() => {
  db.exec('DELETE FROM product_approvals');
  db.exec('DELETE FROM approval_tokens');
  db.exec('DELETE FROM products');
  db.exec('DELETE FROM orders');
});

// ── helpers ───────────────────────────────────────────────────────────────────

function createOrder(name = 'Test Order') {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO orders (id, name, created_at) VALUES (?, ?, ?)').run(
    id,
    name,
    new Date().toISOString()
  );
  return id;
}

function createProduct(orderId, name = 'Test Product', filePath = null) {
  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO products (id, order_id, name, status, quantity, created_at, graphic_file_path) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, orderId, name, 'de_realizat', 1, new Date().toISOString(), filePath);
  return id;
}

// ── tests ─────────────────────────────────────────────────────────────────────

const {
  createApprovalToken,
  getApprovalPageData,
  approveProduct,
  getApprovalStatusForOrder,
} = require('../../../src/lib/approvalTokens.js');

describe('createApprovalToken()', () => {
  it('creates a row in approval_tokens and returns an object with id', () => {
    const orderId = createOrder();
    const token = createApprovalToken(orderId);
    expect(typeof token.id).toBe('string');
    expect(token.orderId).toBe(orderId);

    const row = db.prepare('SELECT * FROM approval_tokens WHERE id = ?').get(token.id);
    expect(row).toBeTruthy();
    expect(row.order_id).toBe(orderId);
  });
});

describe('getApprovalPageData()', () => {
  it('returns null for an unknown token', () => {
    expect(getApprovalPageData('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('returns order and empty products for a token on an empty order', () => {
    const orderId = createOrder('Nunta 2026');
    const token = createApprovalToken(orderId);
    const data = getApprovalPageData(token.id);
    expect(data).not.toBeNull();
    expect(data.order.name).toBe('Nunta 2026');
    expect(data.products).toEqual([]);
  });

  it('returns hasFile=false and fileType=null for a product without a file', () => {
    const orderId = createOrder();
    createProduct(orderId, 'Semn', null);
    const token = createApprovalToken(orderId);
    const data = getApprovalPageData(token.id);
    expect(data.products).toHaveLength(1);
    expect(data.products[0].hasFile).toBe(false);
    expect(data.products[0].fileType).toBeNull();
  });

  it('returns hasFile=true and fileType="image" for a PNG attachment', () => {
    const orderId = createOrder();
    createProduct(orderId, 'Banner', 'attachments/abc/banner.png');
    const token = createApprovalToken(orderId);
    const data = getApprovalPageData(token.id);
    expect(data.products[0].hasFile).toBe(true);
    expect(data.products[0].fileType).toBe('image');
  });

  it('returns fileType="pdf" for a PDF attachment', () => {
    const orderId = createOrder();
    createProduct(orderId, 'Pliant', 'attachments/abc/pliant.pdf');
    const token = createApprovalToken(orderId);
    const data = getApprovalPageData(token.id);
    expect(data.products[0].fileType).toBe('pdf');
  });

  it('returns approved=false for a product that has not been approved', () => {
    const orderId = createOrder();
    createProduct(orderId, 'Sticker', 'attachments/abc/sticker.jpg');
    const token = createApprovalToken(orderId);
    const data = getApprovalPageData(token.id);
    expect(data.products[0].approved).toBe(false);
  });

  it('returns approved=true for a product that was approved under this token', () => {
    const orderId = createOrder();
    const productId = createProduct(orderId, 'Sticker', 'attachments/abc/sticker.jpg');
    const token = createApprovalToken(orderId);
    approveProduct(token.id, productId);
    const data = getApprovalPageData(token.id);
    expect(data.products[0].approved).toBe(true);
  });

  it('returns approved=false for a product approved under a different token', () => {
    const orderId = createOrder();
    const productId = createProduct(orderId, 'Covor', 'attachments/abc/covor.png');
    const token1 = createApprovalToken(orderId);
    const token2 = createApprovalToken(orderId);
    approveProduct(token1.id, productId);
    const data = getApprovalPageData(token2.id);
    expect(data.products[0].approved).toBe(false);
  });
});

describe('approveProduct()', () => {
  it('returns null when the token does not exist', () => {
    expect(approveProduct('no-such-token', 'no-such-product')).toBeNull();
  });

  it('returns null when the product does not belong to the token order', () => {
    const orderId = createOrder();
    const otherOrderId = createOrder('Other Order');
    const token = createApprovalToken(orderId);
    const foreignProductId = createProduct(otherOrderId, 'Foreign', 'path/file.png');
    expect(approveProduct(token.id, foreignProductId)).toBeNull();
  });

  it('returns { noFile: true } when the product has no file attached', () => {
    const orderId = createOrder();
    const productId = createProduct(orderId, 'No File', null);
    const token = createApprovalToken(orderId);
    expect(approveProduct(token.id, productId)).toEqual({ noFile: true });
  });

  it('returns { approved: true, productId } on success', () => {
    const orderId = createOrder();
    const productId = createProduct(orderId, 'Poster', 'attachments/abc/poster.png');
    const token = createApprovalToken(orderId);
    const result = approveProduct(token.id, productId);
    expect(result).toEqual({ approved: true, productId });
  });

  it('is idempotent — second call returns same result, no duplicate row', () => {
    const orderId = createOrder();
    const productId = createProduct(orderId, 'Semn de carte', 'attachments/abc/semn.jpg');
    const token = createApprovalToken(orderId);
    approveProduct(token.id, productId);
    const result2 = approveProduct(token.id, productId);
    expect(result2).toEqual({ approved: true, productId });

    const count = db
      .prepare('SELECT COUNT(*) AS c FROM product_approvals WHERE token_id = ? AND product_id = ?')
      .get(token.id, productId);
    expect(count.c).toBe(1);
  });
});

describe('getApprovalStatusForOrder()', () => {
  it('returns an empty array when no approvals exist for the order', () => {
    const orderId = createOrder();
    createApprovalToken(orderId);
    expect(getApprovalStatusForOrder(orderId)).toEqual([]);
  });

  it('returns approved product IDs across all tokens for the order', () => {
    const orderId = createOrder();
    const p1 = createProduct(orderId, 'P1', 'a.png');
    const p2 = createProduct(orderId, 'P2', 'b.png');
    const token1 = createApprovalToken(orderId);
    const token2 = createApprovalToken(orderId);
    approveProduct(token1.id, p1);
    approveProduct(token2.id, p2);
    const approved = getApprovalStatusForOrder(orderId);
    expect(approved).toContain(p1);
    expect(approved).toContain(p2);
    expect(approved).toHaveLength(2);
  });

  it('does not include products from a different order', () => {
    const orderId = createOrder('Order A');
    const otherOrderId = createOrder('Order B');
    const productId = createProduct(otherOrderId, 'Other P', 'x.png');
    const tokenOther = createApprovalToken(otherOrderId);
    approveProduct(tokenOther.id, productId);
    expect(getApprovalStatusForOrder(orderId)).toEqual([]);
  });
});
