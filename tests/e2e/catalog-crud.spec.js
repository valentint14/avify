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

function catalogItem(page, name) {
  return page.getByTestId('catalog-item').filter({ hasText: name });
}

// The add form (not an item) lives in the catalog-add section.
function addName(page) {
  return page.getByTestId('catalog-add').getByLabel('Denumire produs');
}
function addSubmit(page) {
  return page.getByTestId('catalog-add').getByRole('button', { name: 'Adaugă' });
}
// The single editing item's name input (items in display mode have no input).
function editName(page) {
  return page.getByTestId('catalog-item').getByLabel('Denumire produs');
}

test.describe('US1 — Catalog Produse CRUD', () => {
  test.beforeEach(async ({ request }) => {
    await clearCatalog(request);
    await clearOrders(request);
  });

  test('empty state message shown when catalog is empty', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.getByTestId('catalog-empty')).toBeVisible();
    await expect(page.getByTestId('catalog-empty')).toContainText('Catalogul este gol');
  });

  test('add a product — appears in list', async ({ page }) => {
    await page.goto('/catalog');
    await addName(page).fill('Invitație clasică');
    await addSubmit(page).click();

    await expect(catalogItem(page, 'Invitație clasică')).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId('catalog-empty')).not.toBeVisible();
  });

  test('add product with description — description shown in list', async ({ page }) => {
    await page.goto('/catalog');
    await addName(page).fill('Meniu nuntă');
    await page.getByTestId('catalog-add').getByLabel('Descriere produs').fill('Meniu tipărit A5');
    await addSubmit(page).click();

    const item = catalogItem(page, 'Meniu nuntă');
    await expect(item).toBeVisible({ timeout: 3000 });
    await expect(item).toContainText('Meniu tipărit A5');
  });

  test('submit with empty name shows error — product not added', async ({ page }) => {
    await page.goto('/catalog');
    await addSubmit(page).click();
    await expect(page.getByText('Denumirea produsului este obligatorie.')).toBeVisible({ timeout: 2000 });
    await expect(page.getByTestId('catalog-item')).toHaveCount(0);
  });

  test('edit a product — updated name shown', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Meniu nuntă' } });
    await page.goto('/catalog');

    await expect(catalogItem(page, 'Meniu nuntă')).toBeVisible();
    await catalogItem(page, 'Meniu nuntă').getByRole('button', { name: 'Editează' }).click();

    await editName(page).clear();
    await editName(page).fill('Meniu de nuntă elegantă');
    await page.getByTestId('catalog-item').getByRole('button', { name: 'Salvează' }).click();

    await expect(catalogItem(page, 'Meniu de nuntă elegantă')).toBeVisible({ timeout: 3000 });
    await expect(catalogItem(page, 'Meniu nuntă')).toHaveCount(0);
  });

  test('cancel edit — original name unchanged', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Place card' } });
    await page.goto('/catalog');

    await catalogItem(page, 'Place card').getByRole('button', { name: 'Editează' }).click();
    await editName(page).fill('Modified');
    await page.getByTestId('catalog-item').getByRole('button', { name: 'Anulează' }).click();

    await expect(catalogItem(page, 'Place card')).toBeVisible();
    await expect(editName(page)).toHaveCount(0);
  });

  test('delete a product with confirm — product removed from list', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Mărturie' } });
    await request.post('/api/catalog', { data: { name: 'Program' } });
    await page.goto('/catalog');

    await expect(page.getByTestId('catalog-item')).toHaveCount(2);

    await catalogItem(page, 'Mărturie').getByRole('button', { name: 'Șterge' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Șterge' }).click();

    await expect(catalogItem(page, 'Mărturie')).toHaveCount(0, { timeout: 3000 });
    await expect(page.getByTestId('catalog-item')).toHaveCount(1);
  });

  test('delete confirm — cancel keeps product in list', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Inel' } });
    await page.goto('/catalog');

    await catalogItem(page, 'Inel').getByRole('button', { name: 'Șterge' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Anulează' }).click();

    await expect(catalogItem(page, 'Inel')).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('products persist after page reload', async ({ page, request }) => {
    await request.post('/api/catalog', { data: { name: 'Invitație clasică' } });
    await page.goto('/catalog');
    await expect(catalogItem(page, 'Invitație clasică')).toBeVisible();

    await page.reload();
    await expect(catalogItem(page, 'Invitație clasică')).toBeVisible({ timeout: 3000 });
  });
});
