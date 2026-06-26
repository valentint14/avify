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

async function createTemplate(request, name) {
  const res = await request.post('/api/catalog', { data: { name } });
  return (await res.json()).template;
}

function orderRow(page, name) {
  return page.locator('.order-row', { has: page.locator('.order-row-name', { hasText: name }) });
}

test.describe('US2 — Catalog selector in order creation', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
  });

  test('catalog selector visible in AddOrderForm', async ({ page, request }) => {
    await createTemplate(request, 'Invitație clasică');
    await page.goto('/');
    await expect(page.locator('.catalog-selector-input').first()).toBeVisible();
  });

  test('selector filters templates by query', async ({ page, request }) => {
    await createTemplate(request, 'Invitație clasică');
    await createTemplate(request, 'Meniu nuntă');

    await page.goto('/');
    await page.locator('.catalog-selector-input').first().fill('invit');
    await page.locator('.catalog-selector-input').first().click();

    await expect(page.locator('.catalog-selector-dropdown').first()).toBeVisible({ timeout: 3000 });
    const options = page.locator('.catalog-selector-dropdown').first().locator('.catalog-selector-option');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText('Invitație clasică');
  });

  test('selecting templates creates chips', async ({ page, request }) => {
    await createTemplate(request, 'Meniu nuntă');
    await createTemplate(request, 'Place card');

    await page.goto('/');
    const selectorInput = page.locator('.catalog-selector-input').first();

    await selectorInput.click();
    await page.locator('.catalog-selector-dropdown').first().locator('.catalog-selector-option', { hasText: 'Meniu nuntă' }).click();

    await expect(page.locator('.catalog-chip', { hasText: 'Meniu nuntă' }).first()).toBeVisible({ timeout: 2000 });

    await selectorInput.click();
    await page.locator('.catalog-selector-dropdown').first().locator('.catalog-selector-option', { hasText: 'Place card' }).click();

    const chips = page.locator('.catalog-chip');
    await expect(chips).toHaveCount(2, { timeout: 2000 });
  });

  test('create order with catalog products — products appear in mini-board', async ({ page, request }) => {
    await createTemplate(request, 'Invitație clasică');
    await createTemplate(request, 'Meniu nuntă');

    await page.goto('/');

    await page.locator('.add-form-input').first().fill('Nuntă Catalog Test');

    const selectorInput = page.locator('.catalog-selector-input').first();
    await selectorInput.click();
    await page.locator('.catalog-selector-dropdown').first().locator('.catalog-selector-option', { hasText: 'Invitație clasică' }).click();

    await selectorInput.click();
    await page.locator('.catalog-selector-dropdown').first().locator('.catalog-selector-option', { hasText: 'Meniu nuntă' }).click();

    await page.locator('.add-form-btn').first().click();

    const row = orderRow(page, 'Nuntă Catalog Test');
    await expect(row).toBeVisible({ timeout: 3000 });
    await row.click();

    await expect(page.locator('.product-board')).toBeVisible({ timeout: 3000 });
    const deFacutColumn = page.locator('.product-column').first();
    await expect(deFacutColumn.locator('.product-card')).toHaveCount(2, { timeout: 3000 });
  });

  test('empty catalog shows guidance message in selector', async ({ page }) => {
    await page.goto('/');
    await page.locator('.catalog-selector-input').first().click();
    await expect(page.locator('.catalog-selector-empty').first()).toBeVisible({ timeout: 2000 });
    await expect(page.locator('.catalog-selector-empty').first()).toContainText('Catalogul este gol');
  });

  test('remove chip deselects template', async ({ page, request }) => {
    await createTemplate(request, 'Place card');

    await page.goto('/');
    const selectorInput = page.locator('.catalog-selector-input').first();
    await selectorInput.click();
    await page.locator('.catalog-selector-dropdown').first().locator('.catalog-selector-option', { hasText: 'Place card' }).click();

    await expect(page.locator('.catalog-chip').first()).toBeVisible({ timeout: 2000 });
    await page.locator('.catalog-chip-remove').first().click();
    await expect(page.locator('.catalog-chip')).toHaveCount(0);
  });
});
