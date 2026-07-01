const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

// ─── Helpers ────────────────────────────────────────────────────────────────

async function clearOrders(request) {
  const res = await request.get('/api/orders');
  const { orders } = await res.json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

async function setupOrderWithProduct(request, opts = {}) {
  const orderRes = await request.post('/api/orders', { data: { name: opts.orderName ?? 'Attachment Test Order' } });
  const { order } = await orderRes.json();
  const productRes = await request.post('/api/products', {
    data: {
      orderId: order.id,
      name: opts.productName ?? 'Tricou grafică',
      quantity: 1,
      additionalInfo: opts.additionalInfo ?? null,
    },
  });
  const { product } = await productRes.json();
  return { order, product };
}

async function attachFile(request, productId, filename, content, mimeType) {
  return request.post(`/api/products/${productId}/attachment`, {
    multipart: {
      file: {
        name: filename,
        mimeType,
        buffer: Buffer.isBuffer(content) ? content : Buffer.from(content),
      },
    },
  });
}

function makePngBuffer() {
  // Minimal 1×1 red PNG (89 bytes)
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
    '2e00000000c4944415478016360f8cfc000000000200012bd2d7c0000000049454e44ae426082',
    'hex'
  );
}

function makePdfBuffer() {
  return Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n%%EOF');
}

function orderRow(page, name) {
  return page.getByTestId('order-row').filter({ hasText: name });
}

async function openBoard(page, orderName) {
  await page.goto('/');
  const row = orderRow(page, orderName);
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.click();
  await expect(page.getByTestId('product-board')).toBeVisible({ timeout: 10000 });
}

// ─── Phase 3 / US1: Attach graphic file to product ─────────────────────────

test.describe('US1 - attach graphic file', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('POST attachment with valid PNG sets graphicFilePath', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US1-PNG Order' });
    const res = await attachFile(request, product.id, 'banner.png', makePngBuffer(), 'image/png');
    expect(res.status()).toBe(200);
    const { product: updated } = await res.json();
    expect(updated.graphicFilePath).toMatch(/^attachments\/.+\/banner\.png$/);
  });

  test('POST attachment with valid PDF sets graphicFilePath', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US1-PDF Order' });
    const res = await attachFile(request, product.id, 'flyer.pdf', makePdfBuffer(), 'application/pdf');
    expect(res.status()).toBe(200);
    const { product: updated } = await res.json();
    expect(updated.graphicFilePath).toMatch(/^attachments\/.+\/flyer\.pdf$/);
  });

  test('POST attachment with unsupported extension returns 400', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US1-Bad Ext Order' });
    const res = await attachFile(request, product.id, 'data.xlsx', Buffer.from('dummy'), 'application/vnd.openxmlformats');
    expect(res.status()).toBe(400);
    const { error } = await res.json();
    expect(error).toContain('neacceptat');
    expect(error).toContain('PDF');
  });

  test('second POST replaces first file and graphicFilePath updates', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US1-Replace Order' });
    await attachFile(request, product.id, 'first.png', makePngBuffer(), 'image/png');
    const res = await attachFile(request, product.id, 'second.png', makePngBuffer(), 'image/png');
    expect(res.status()).toBe(200);
    const { product: updated } = await res.json();
    expect(updated.graphicFilePath).toMatch(/second\.png$/);

    // Only one file on disk
    const attachDir = path.join(process.cwd(), 'data', 'attachments', product.id);
    const files = fs.readdirSync(attachDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe('second.png');
  });

  test('GET /products returns graphicFilePath after attach', async ({ request }) => {
    const { order, product } = await setupOrderWithProduct(request, { orderName: 'US1-GetList Order' });
    await attachFile(request, product.id, 'logo.png', makePngBuffer(), 'image/png');

    const listRes = await request.get(`/api/products?orderId=${order.id}`);
    const { products } = await listRes.json();
    const found = products.find((p) => p.id === product.id);
    expect(found.graphicFilePath).toMatch(/logo\.png$/);
  });
});

// ─── Phase 4 / US2: View graphic on mini-board card ────────────────────────

test.describe('US2 - file indicator on product card', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('card shows PDF icon for PDF attachment', async ({ page, request }) => {
    const { order, product } = await setupOrderWithProduct(request, { orderName: 'US2-PDF Card Order' });
    await attachFile(request, product.id, 'print.pdf', makePdfBuffer(), 'application/pdf');

    await openBoard(page, 'US2-PDF Card Order');
    const card = page.getByTestId('product-card').first();
    const indicator = card.getByTestId('product-file-indicator');
    await expect(indicator).toBeVisible();
    // PDF indicator contains an svg (lucide FileText), not an img
    await expect(indicator.locator('svg')).toBeVisible();
    await expect(indicator.locator('img')).toHaveCount(0);
  });

  test('card shows thumbnail img for image attachment', async ({ page, request }) => {
    const { order, product } = await setupOrderWithProduct(request, { orderName: 'US2-IMG Card Order' });
    await attachFile(request, product.id, 'thumb.png', makePngBuffer(), 'image/png');

    await openBoard(page, 'US2-IMG Card Order');
    const card = page.getByTestId('product-card').first();
    const indicator = card.getByTestId('product-file-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator.locator('img')).toBeVisible();
  });

  test('card shows no indicator when no attachment', async ({ page, request }) => {
    await setupOrderWithProduct(request, { orderName: 'US2-No File Order' });

    await openBoard(page, 'US2-No File Order');
    const card = page.getByTestId('product-card').first();
    await expect(card.getByTestId('product-file-indicator')).toHaveCount(0);
  });

  test('GET /api/products/{id}/attachment serves file bytes', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US2-Serve Order' });
    await attachFile(request, product.id, 'img.png', makePngBuffer(), 'image/png');

    const res = await request.get(`/api/products/${product.id}/attachment`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  });

  test('GET /api/products/{id}/attachment returns 404 when no file attached', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US2-No Attach Serve Order' });
    const res = await request.get(`/api/products/${product.id}/attachment`);
    expect(res.status()).toBe(404);
  });
});

// ─── Phase 5 / US3: Open graphic file from product card ─────────────────────

test.describe('US3 - open file in OS', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('POST /attachment/open returns opened:true for valid file', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US3-Open Order' });
    await attachFile(request, product.id, 'artwork.pdf', makePdfBuffer(), 'application/pdf');

    const res = await request.post(`/api/products/${product.id}/attachment/open`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.opened).toBe(true);
  });

  test('POST /attachment/open returns 404 with re-attach message when file missing from disk', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US3-Missing File Order' });
    await attachFile(request, product.id, 'gone.pdf', makePdfBuffer(), 'application/pdf');

    // Delete the file from disk manually
    const attachDir = path.join(process.cwd(), 'data', 'attachments', product.id);
    fs.rmSync(attachDir, { recursive: true, force: true });

    const res = await request.post(`/api/products/${product.id}/attachment/open`);
    expect(res.status()).toBe(404);
    const { error } = await res.json();
    expect(error).toContain('Fișierul nu a fost găsit');
  });

  test('clicking indicator shows inline error when file missing from disk', async ({ page, request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US3-Card Error Order' });
    await attachFile(request, product.id, 'missing.pdf', makePdfBuffer(), 'application/pdf');

    // Remove file from disk so open fails
    const attachDir = path.join(process.cwd(), 'data', 'attachments', product.id);
    fs.rmSync(attachDir, { recursive: true, force: true });

    await openBoard(page, 'US3-Card Error Order');
    const card = page.getByTestId('product-card').first();
    await card.getByTestId('product-file-indicator').click();

    await expect(card.getByTestId('product-file-error')).toContainText('Fișierul nu a fost găsit');
  });
});

// ─── Phase 6 / US4: Remove or replace graphic file ──────────────────────────

test.describe('US4 - remove and replace attachment', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('DELETE /attachment clears graphicFilePath', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US4-Delete Order' });
    await attachFile(request, product.id, 'logo.pdf', makePdfBuffer(), 'application/pdf');

    const res = await request.delete(`/api/products/${product.id}/attachment`);
    expect(res.status()).toBe(200);
    const { product: updated } = await res.json();
    expect(updated.graphicFilePath).toBeNull();
  });

  test('DELETE /attachment removes file from disk', async ({ request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US4-DiskClean Order' });
    await attachFile(request, product.id, 'clean.png', makePngBuffer(), 'image/png');

    await request.delete(`/api/products/${product.id}/attachment`);

    const absPath = path.join(process.cwd(), 'data', 'attachments', product.id, 'clean.png');
    expect(fs.existsSync(absPath)).toBe(false);
  });

  test('card loses indicator after remove', async ({ page, request }) => {
    const { product } = await setupOrderWithProduct(request, { orderName: 'US4-Card Remove Order' });
    await attachFile(request, product.id, 'art.pdf', makePdfBuffer(), 'application/pdf');

    await openBoard(page, 'US4-Card Remove Order');
    const card = page.getByTestId('product-card').first();
    await expect(card.getByTestId('product-file-indicator')).toBeVisible();

    // Open modal and click Elimină
    await card.click();
    await expect(page.getByTestId('product-details-modal')).toBeVisible({ timeout: 1000 });
    await page.getByTestId('attachment-remove').click();
    await page.keyboard.press('Escape');

    await expect(card.getByTestId('product-file-indicator')).toHaveCount(0);
  });
});

// ─── Phase 7 / Polish: Persistence after reload ──────────────────────────────

test.describe('Persistence', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('indicator persists after page reload', async ({ page, request }) => {
    const { order, product } = await setupOrderWithProduct(request, { orderName: 'Persist Order' });
    await attachFile(request, product.id, 'persist.pdf', makePdfBuffer(), 'application/pdf');

    await openBoard(page, 'Persist Order');
    await expect(page.getByTestId('product-card').first().getByTestId('product-file-indicator')).toBeVisible();

    await page.reload();
    await orderRow(page, 'Persist Order').click();
    await expect(page.getByTestId('product-board')).toBeVisible();
    await expect(page.getByTestId('product-card').first().getByTestId('product-file-indicator')).toBeVisible();
  });
});
