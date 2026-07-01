const { test, expect } = require('@playwright/test');

// ── Date helpers ──────────────────────────────────────────────────
function dateOffset(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ── API helpers ───────────────────────────────────────────────────
async function clearOrders(request) {
  const { orders } = await (await request.get('/api/orders')).json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

async function clearMaterials(request) {
  const { materials } = await (await request.get('/api/materials')).json();
  await Promise.all(materials.map((m) => request.delete(`/api/materials/${m.id}`)));
}

async function clearCatalog(request) {
  const { templates } = await (await request.get('/api/catalog')).json();
  await Promise.all(templates.map((t) => request.delete(`/api/catalog/${t.id}`)));
}

async function createMaterial(request, name, currentStock = 0, unit = null) {
  const res = await request.post('/api/materials', {
    data: { name, currentStock, unit },
  });
  const { material } = await res.json();
  return material;
}

async function createTemplate(request, name) {
  const res = await request.post('/api/catalog', { data: { name } });
  const { template } = await res.json();
  return template;
}

async function setRecipe(request, templateId, lines) {
  await request.put(`/api/catalog/${templateId}/recipe`, { data: { lines } });
}

async function createOrderWithDate(request, name, dates = {}) {
  const res = await request.post('/api/orders', { data: { name, ...dates } });
  const { order } = await res.json();
  return order;
}

async function addProductToOrder(request, orderId, productName, templateId, quantity = 1) {
  const res = await request.post('/api/products', {
    data: { orderId, name: productName, templateId, quantity },
  });
  const { product } = await res.json();
  return product;
}

// ── Shared button/modal helpers ───────────────────────────────────
async function openShoppingList(page) {
  await page.goto('/stoc-materiale');
  const btn = page.getByTestId('generate-shopping-list-btn');
  await expect(btn).toBeVisible({ timeout: 8000 });
  await btn.click();
  await expect(page.getByTestId('shopping-list-modal')).toBeVisible({ timeout: 8000 });
}

// ─────────────────────────────────────────────────────────────────
// US1: Generate and View Shopping List
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 014 — shopping-list: US1 generate and view', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
    await clearMaterials(request);
  });

  test('"Generează listă cumpărături" button is visible on Stoc materiale page', async ({
    page,
  }) => {
    await page.goto('/stoc-materiale');
    await expect(page.getByTestId('generate-shopping-list-btn')).toBeVisible({ timeout: 8000 });
  });

  test('clicking button opens the shopping list modal', async ({ page }) => {
    await openShoppingList(page);
    const modal = page.getByTestId('shopping-list-modal');
    await expect(modal).toBeVisible();
  });

  test('shows correct material row with proper to-buy quantity (Scenario 1)', async ({
    page,
    request,
  }) => {
    const material = await createMaterial(request, 'Satin alb E2E', 200, 'ml');
    const template = await createTemplate(request, 'Semn de carte E2E');
    await setRecipe(request, template.id, [{ materialId: material.id, qtyPerPiece: 50 }]);

    const orderA = await createOrderWithDate(request, 'Comanda A E2E', {
      eventDate: dateOffset(5),
    });
    const orderB = await createOrderWithDate(request, 'Comanda B E2E', {
      deliveryDate: dateOffset(15),
    });
    await addProductToOrder(request, orderA.id, 'Semn', template.id, 5);
    await addProductToOrder(request, orderB.id, 'Semn', template.id, 3);

    await openShoppingList(page);

    // total required = (5+3)*50 = 400; stock = 200; toBuy = 200
    const rows = page.getByTestId('shopping-list-row');
    await expect(rows).toHaveCount(1, { timeout: 8000 });
    await expect(rows.first()).toContainText('Satin alb E2E');
    await expect(rows.first()).toContainText('200');
  });

  test('shows "no orders" message when no orders are in 30-day window (Scenario 3)', async ({
    page,
    request,
  }) => {
    const material = await createMaterial(request, 'Material fara comanda', 0);
    const template = await createTemplate(request, 'Template fara comanda');
    await setRecipe(request, template.id, [{ materialId: material.id, qtyPerPiece: 10 }]);
    // create order outside the window
    const order = await createOrderWithDate(request, 'Comanda viitoare', {
      eventDate: dateOffset(31),
    });
    await addProductToOrder(request, order.id, 'Produs', template.id, 1);

    await openShoppingList(page);

    await expect(page.getByTestId('no-orders-message')).toBeVisible({ timeout: 8000 });
  });

  test('shows excluded warning for ad-hoc product in qualifying order (Scenario 4)', async ({
    page,
    request,
  }) => {
    const order = await createOrderWithDate(request, 'Comanda adhoc E2E', {
      eventDate: dateOffset(3),
    });
    // ad-hoc product: no templateId
    await request.post('/api/products', {
      data: { orderId: order.id, name: 'Produs adhoc E2E', quantity: 2 },
    });

    await openShoppingList(page);

    await expect(page.getByTestId('excluded-warning')).toBeVisible({ timeout: 8000 });
  });

  test('shows "all covered" message when stock covers all requirements (Scenario 2)', async ({
    page,
    request,
  }) => {
    const material = await createMaterial(request, 'Material acoperit E2E', 10000, 'buc');
    const template = await createTemplate(request, 'Produs acoperit E2E');
    await setRecipe(request, template.id, [{ materialId: material.id, qtyPerPiece: 1 }]);
    const order = await createOrderWithDate(request, 'Comanda acoperita E2E', {
      eventDate: dateOffset(2),
    });
    await addProductToOrder(request, order.id, 'Produs', template.id, 3); // requires 3; stock 10000

    await openShoppingList(page);

    // All rows have toBuy=0 — expect either all-covered message or no rows in to-buy section
    await expect(page.getByTestId('all-covered-message')).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────
// US2: Print the Shopping List
// ─────────────────────────────────────────────────────────────────

test.describe('Feature 014 — shopping-list: US2 print', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
    await clearCatalog(request);
    await clearMaterials(request);
  });

  test('"Printează lista" button is visible when shopping list has results (Scenario 6)', async ({
    page,
    request,
  }) => {
    const material = await createMaterial(request, 'Material print E2E', 0, 'buc');
    const template = await createTemplate(request, 'Produs print E2E');
    await setRecipe(request, template.id, [{ materialId: material.id, qtyPerPiece: 5 }]);
    const order = await createOrderWithDate(request, 'Comanda print E2E', {
      eventDate: dateOffset(3),
    });
    await addProductToOrder(request, order.id, 'Produs', template.id, 2);

    await openShoppingList(page);

    const printBtn = page.getByTestId('print-button');
    await expect(printBtn).toBeVisible({ timeout: 8000 });
  });

  test('clicking "Printează lista" calls window.print (Scenario 6)', async ({
    page,
    request,
  }) => {
    const material = await createMaterial(request, 'Material print call E2E', 0);
    const template = await createTemplate(request, 'Produs print call E2E');
    await setRecipe(request, template.id, [{ materialId: material.id, qtyPerPiece: 3 }]);
    const order = await createOrderWithDate(request, 'Comanda print call E2E', {
      deliveryDate: dateOffset(7),
    });
    await addProductToOrder(request, order.id, 'Produs', template.id, 1);

    await openShoppingList(page);
    await expect(page.getByTestId('print-button')).toBeVisible({ timeout: 8000 });

    // Spy on window.print before clicking
    await page.evaluate(() => {
      window._printCalled = false;
      window.print = () => {
        window._printCalled = true;
      };
    });

    await page.getByTestId('print-button').click();
    const printCalled = await page.evaluate(() => window._printCalled);
    expect(printCalled).toBe(true);
  });
});
