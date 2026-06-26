const { test, expect, request } = require('@playwright/test');

test.describe('User Story 2 — Move Orders Through the Workflow', () => {
  let orderId;

  test.beforeEach(async ({ page }) => {
    // Seed an order via API
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    const res = await ctx.post('/api/orders', {
      data: {
        primaryName: 'Move Test',
        eventDate: '2026-08-20',
        eventType: 'nunta',
        productTypes: ['Invitații'],
        paymentStatus: 'neachitat',
      },
    });
    const { order } = await res.json();
    orderId = order.id;
    await ctx.dispose();
    await page.goto('/');
  });

  test.afterEach(async () => {
    if (orderId) {
      const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
      await ctx.delete(`/api/orders/${orderId}`);
      await ctx.dispose();
    }
  });

  test('card appears in De făcut column on load', async ({ page }) => {
    const deFacut = page.locator('.column').first();
    await expect(deFacut.locator('.card').filter({ hasText: 'Move Test' })).toBeVisible();
  });

  test('move card forward via keyboard select', async ({ page }) => {
    const card = page.locator('.card').filter({ hasText: 'Move Test' });
    await expect(card).toBeVisible();

    // Use the keyboard move select inside the card
    await card.locator('select[aria-label="Mută în etapa"]').selectOption('in_design');

    // Card should now be in the 'În design' column
    const inDesign = page.locator('.column').nth(1);
    await expect(inDesign.locator('.card').filter({ hasText: 'Move Test' })).toBeVisible();

    // And absent from De făcut
    const deFacut = page.locator('.column').first();
    await expect(deFacut.locator('.card').filter({ hasText: 'Move Test' })).not.toBeVisible();
  });

  test('move persists after page refresh', async ({ page }) => {
    // Move via API directly for reliability
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    await ctx.put(`/api/orders/${orderId}`, { data: { stage: 'printare' } });
    await ctx.dispose();

    await page.reload();

    const printare = page.locator('.column').nth(3);
    await expect(printare.locator('.card').filter({ hasText: 'Move Test' })).toBeVisible();
  });

  test('backward move is allowed', async ({ page }) => {
    // First move forward
    const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });
    await ctx.put(`/api/orders/${orderId}`, { data: { stage: 'validare_client' } });
    await ctx.dispose();
    await page.reload();

    const card = page.locator('.card').filter({ hasText: 'Move Test' });
    await card.locator('select[aria-label="Mută în etapa"]').selectOption('in_design');

    const inDesign = page.locator('.column').nth(1);
    await expect(inDesign.locator('.card').filter({ hasText: 'Move Test' })).toBeVisible();
  });
});
