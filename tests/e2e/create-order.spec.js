const { test, expect } = require('@playwright/test');

test.describe('User Story 1 — Create and Track a New Order', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('board loads with 6 columns', async ({ page }) => {
    await expect(page.locator('.column')).toHaveCount(6);
  });

  test('create a new order and see it appear in De făcut', async ({ page }) => {
    await page.getByRole('button', { name: /Comandă nouă/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Nume client').fill('Andrei Popescu');
    await dialog.getByLabel(/Partener/i).fill('Maria Popescu');
    await dialog.getByLabel('Dată eveniment').fill('2026-08-15');
    await dialog.getByLabel('Tip eveniment').selectOption('nunta');
    await dialog.locator('label').filter({ hasText: 'Invitații' }).locator('input[type=checkbox]').check();
    await dialog.locator('#paymentStatus').selectOption('neachitat');

    await dialog.getByRole('button', { name: 'Salvează' }).click();
    await expect(dialog).not.toBeVisible();

    const deFacut = page.locator('.column').first();
    await expect(deFacut).toContainText('Andrei Popescu');
    await expect(deFacut).toContainText('Maria Popescu');
    await expect(deFacut).toContainText('Neachitat');
  });

  test('edit an order and see the updated payment status on the card', async ({ page }) => {
    await page.getByRole('button', { name: /Comandă nouă/i }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByLabel('Nume client').fill('Edit Test');
    await dialog.getByLabel('Dată eveniment').fill('2026-09-01');
    await dialog.locator('label').filter({ hasText: 'Invitații' }).locator('input[type=checkbox]').check();
    await dialog.locator('#paymentStatus').selectOption('neachitat');
    await dialog.getByRole('button', { name: 'Salvează' }).click();
    await expect(dialog).not.toBeVisible();

    await page.locator('.card').filter({ hasText: 'Edit Test' }).click();
    await expect(dialog).toBeVisible();

    await dialog.locator('#paymentStatus').selectOption('achitat_integral');
    await dialog.getByRole('button', { name: 'Salvează' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.locator('.card').filter({ hasText: 'Edit Test' })).toContainText('Achitat integral');
  });

  test('data persists after page refresh', async ({ page }) => {
    await page.getByRole('button', { name: /Comandă nouă/i }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByLabel('Nume client').fill('Persisted Client');
    await dialog.getByLabel('Dată eveniment').fill('2026-10-01');
    await dialog.locator('label').filter({ hasText: 'Meniu' }).locator('input[type=checkbox]').check();
    await dialog.locator('#paymentStatus').selectOption('avans_achitat');
    await dialog.getByRole('button', { name: 'Salvează' }).click();
    await expect(dialog).not.toBeVisible();

    await page.reload();
    await expect(page.locator('.card').filter({ hasText: 'Persisted Client' })).toBeVisible();
  });

  test('unsaved changes warning when closing form with dismiss keeps form open', async ({ page }) => {
    await page.getByRole('button', { name: /Comandă nouă/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nume client').fill('Changed Name');

    page.on('dialog', (d) => d.dismiss());
    await dialog.getByRole('button', { name: 'Anulează' }).click();
    await expect(dialog).toBeVisible();
  });

  test('delete an order after confirmation', async ({ page }) => {
    await page.getByRole('button', { name: /Comandă nouă/i }).click();
    const dialog = page.getByRole('dialog');

    await dialog.getByLabel('Nume client').fill('To Delete');
    await dialog.getByLabel('Dată eveniment').fill('2026-07-15');
    await dialog.locator('label').filter({ hasText: 'Program' }).locator('input[type=checkbox]').check();
    await dialog.locator('#paymentStatus').selectOption('neachitat');
    await dialog.getByRole('button', { name: 'Salvează' }).click();
    await expect(dialog).not.toBeVisible();

    await page.locator('.card').filter({ hasText: 'To Delete' }).click();
    page.on('dialog', (d) => d.accept());
    await dialog.getByRole('button', { name: 'Șterge' }).click();

    await expect(page.locator('.card').filter({ hasText: 'To Delete' })).not.toBeVisible();
  });
});
