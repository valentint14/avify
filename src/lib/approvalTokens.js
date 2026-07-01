'use strict';

const { getDb } = require('./db.js');

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

function fileExtFrom(filePath) {
  if (!filePath) return null;
  return filePath.split('.').pop().toLowerCase();
}

function fileTypeFrom(ext) {
  if (!ext) return null;
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

function createApprovalToken(orderId) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO approval_tokens (id, order_id, created_at) VALUES (?, ?, ?)').run(
    id,
    orderId,
    now
  );
  return { id, orderId, createdAt: now };
}

function getApprovalPageData(tokenId) {
  const db = getDb();
  const tokenRow = db
    .prepare(
      `SELECT at.id AS token_id, o.id AS order_id, o.name AS order_name, o.client
       FROM approval_tokens at
       JOIN orders o ON o.id = at.order_id
       WHERE at.id = ?`
    )
    .get(tokenId);
  if (!tokenRow) return null;

  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.quantity, p.graphic_file_path,
              CASE WHEN pa.id IS NOT NULL THEN 1 ELSE 0 END AS approved
       FROM products p
       LEFT JOIN product_approvals pa ON pa.product_id = p.id AND pa.token_id = ?
       WHERE p.order_id = ?
       ORDER BY p.created_at ASC`
    )
    .all(tokenId, tokenRow.order_id);

  const revisionRows = db
    .prepare('SELECT product_id, feedback, file_name FROM product_revisions WHERE token_id = ? ORDER BY created_at ASC')
    .all(tokenId);
  const revisionMap = {};
  for (const r of revisionRows) {
    revisionMap[r.product_id] = { feedback: r.feedback, fileName: r.file_name ?? null };
  }

  return {
    order: {
      id: tokenRow.order_id,
      name: tokenRow.order_name,
      client: tokenRow.client ?? null,
    },
    products: rows.map((p) => {
      const ext = fileExtFrom(p.graphic_file_path);
      const currentFileName = p.graphic_file_path ? p.graphic_file_path.split('/').pop() : null;
      const latestRevision = revisionMap[p.id] ?? null;
      return {
        id: p.id,
        name: p.name,
        quantity: Number(p.quantity ?? 1),
        hasFile: p.graphic_file_path != null,
        fileType: fileTypeFrom(ext),
        approved: Boolean(p.approved),
        hasRevision: latestRevision !== null && latestRevision.fileName === currentFileName,
      };
    }),
  };
}

function approveProduct(tokenId, productId) {
  const db = getDb();
  const token = db
    .prepare('SELECT id, order_id FROM approval_tokens WHERE id = ?')
    .get(tokenId);
  if (!token) return null;

  const product = db
    .prepare('SELECT id, graphic_file_path FROM products WHERE id = ? AND order_id = ?')
    .get(productId, token.order_id);
  if (!product) return null;
  if (!product.graphic_file_path) return { noFile: true };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT OR IGNORE INTO product_approvals (id, token_id, product_id, approved_at) VALUES (?, ?, ?, ?)'
  ).run(id, tokenId, productId, now);
  return { approved: true, productId };
}

function requestRevision(tokenId, productId, feedback) {
  const db = getDb();
  const token = db
    .prepare('SELECT id, order_id FROM approval_tokens WHERE id = ?')
    .get(tokenId);
  if (!token) return null;

  const product = db
    .prepare('SELECT id, graphic_file_path FROM products WHERE id = ? AND order_id = ?')
    .get(productId, token.order_id);
  if (!product) return null;

  const fileName = product.graphic_file_path
    ? product.graphic_file_path.split('/').pop()
    : null;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO product_revisions (id, token_id, product_id, feedback, file_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, tokenId, productId, feedback.trim(), fileName, now);

  db.prepare("UPDATE products SET status = 'de_realizat' WHERE id = ?").run(productId);

  return { requested: true, productId };
}

function getApprovalStatusForOrder(orderId) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pa.product_id
       FROM product_approvals pa
       JOIN approval_tokens at ON at.id = pa.token_id
       WHERE at.order_id = ?`
    )
    .all(orderId);
  return rows.map((r) => r.product_id);
}

function getRevisionStatusForOrder(orderId) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pr.product_id, pr.feedback, pr.file_name, pr.created_at
       FROM product_revisions pr
       JOIN approval_tokens at ON at.id = pr.token_id
       WHERE at.order_id = ?
       ORDER BY pr.created_at ASC`
    )
    .all(orderId);
  const map = {};
  for (const r of rows) {
    if (!map[r.product_id]) map[r.product_id] = [];
    map[r.product_id].push({ feedback: r.feedback, fileName: r.file_name ?? null, createdAt: r.created_at });
  }
  return map;
}

module.exports = {
  createApprovalToken,
  getApprovalPageData,
  approveProduct,
  requestRevision,
  getApprovalStatusForOrder,
  getRevisionStatusForOrder,
};
