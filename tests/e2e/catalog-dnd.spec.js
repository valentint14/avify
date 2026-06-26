const { test, expect } = require('@playwright/test');

async function clearCatalog(request) {
  const res = await request.get('/api/catalog');
  const { templates } = await res.json();
  await Promise.all(templates.map((t) => request.delete(`/api/catalog/${t.id}`)));
}

async function clearOrders(request) {
  const res = await request.get('/api/orders');
  const { orders } = await res.json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

async function dragToColumn(page, sourceSelector, targetSelector) {
  await page.evaluate(({ src, tgt }) => {
    const source = document.querySelector(src);
    const target = document.querySelector(tgt);
    if (!source || !target) throw new Error(`Cannot find '${src}' or '${tgt}'`);
    const dt = new DataTransfer();
    source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('dragover',  { bubbles: true, cancelable: true, dataTransfer: dt }));
    target.dispatchEvent(new DragEvent('drop',      { bubbles: true, cancelable: true, dataTransfer: dt }));
    source.dispatchEvent(new DragEvent('dragend',   { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, { src: sourceSelector, tgt: targetSelector });
}

function orderRow(page, name) {
  return page.locator('.order-row', { has: page.locator('.order-row-name', { hasText: name }) });
}

test.describe('US3 — DnD for catalog-sourced products', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
  });

  test('catalog product can be dragged between columns and persists', async ({ page, request }) => {
    const templateRes = await request.post('/api/catalog', { data: { name: 'Invitație DnD' } });
    const { template } = await templateRes.json();

    const orderRes = await request.post('/api/orders', {
      data: { name: 'Nuntă DnD Test', templateIds: [template.id] },
    });
    const { order } = await orderRes.json();
    expect(order.productCount).toBe(1);

    await page.goto('/');
    await orderRow(page, 'Nuntă DnD Test').click();

    const deFacutColumn = page.locator('.product-column').nth(0);
    const inDesignColumn = page.locator('.product-column').nth(1);

    await expect(deFacutColumn.locator('.product-card')).toHaveCount(1, { timeout: 5000 });

    await dragToColumn(page, '.product-column:nth-child(1) .product-card', '.product-column:nth-child(2)');

    await expect(inDesignColumn.locator('.product-card')).toHaveCount(1, { timeout: 3000 });
    await expect(deFacutColumn.locator('.product-card')).toHaveCount(0);

    await page.reload();
    await orderRow(page, 'Nuntă DnD Test').click();
    await expect(page.locator('.product-column').nth(1).locator('.product-card')).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator('.product-column').nth(0).locator('.product-card')).toHaveCount(0);
  });
});
