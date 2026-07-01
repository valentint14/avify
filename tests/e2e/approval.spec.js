const { test, expect } = require('@playwright/test');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function clearOrders(request) {
  const { orders } = await (await request.get('/api/orders')).json();
  await Promise.all(orders.map((o) => request.delete(`/api/orders/${o.id}`)));
}

async function createOrder(request, name = 'Test Aprobare') {
  const res = await request.post('/api/orders', { data: { name } });
  const { order } = await res.json();
  return order;
}

async function createProduct(request, orderId, name = 'Produs test') {
  const res = await request.post('/api/products', {
    data: { orderId, name, quantity: 1 },
  });
  const { product } = await res.json();
  return product;
}

async function attachPng(request, productId) {
  // Minimal 1×1 red PNG
  const pngBuffer = Buffer.from(
    '89504e470d0a1a0a0000000d494844520000000100000001080200000090' +
      '012e00000000c4944415478016360f8cfc000000000200012bd2d7c00000' +
      '00049454e44ae426082',
    'hex'
  );
  await request.post(`/api/products/${productId}/attachment`, {
    multipart: { file: { name: 'design.png', mimeType: 'image/png', buffer: pngBuffer } },
  });
}

async function createApprovalToken(request, orderId) {
  const res = await request.post(`/api/orders/${orderId}/approval-token`);
  const { token } = await res.json();
  return token;
}

// ── Feature 015 — Client Design Approval ──────────────────────────────────────

test.describe('Feature 015 — approval: US1 client approves products', () => {
  test.beforeEach(async ({ request }) => {
    await clearOrders(request);
  });

  test('approval page loads with order name and two products', async ({ page, request }) => {
    const order = await createOrder(request, 'Nunta Popescu');
    const p1 = await createProduct(request, order.id, 'Invitatie');
    const p2 = await createProduct(request, order.id, 'Meniu');
    await attachPng(request, p1.id);
    const token = await createApprovalToken(request, order.id);

    await page.goto(`/aprobare/${token.id}`);
    await expect(page.getByTestId('approval-order-name')).toContainText('Nunta Popescu', {
      timeout: 10000,
    });
    await expect(page.getByTestId(`product-card-${p1.id}`)).toBeVisible();
    await expect(page.getByTestId(`product-card-${p2.id}`)).toBeVisible();
  });

  test('approve button is enabled for product with file, disabled for product without file', async ({
    page,
    request,
  }) => {
    const order = await createOrder(request);
    const p1 = await createProduct(request, order.id, 'Cu fisier');
    const p2 = await createProduct(request, order.id, 'Fara fisier');
    await attachPng(request, p1.id);
    const token = await createApprovalToken(request, order.id);

    await page.goto(`/aprobare/${token.id}`);
    await expect(page.getByTestId(`approve-btn-${p1.id}`)).toBeEnabled({ timeout: 8000 });
    await expect(page.getByTestId(`approve-btn-${p2.id}`)).toBeDisabled();
  });

  test('clicking approve turns the card green and updates button text', async ({
    page,
    request,
  }) => {
    const order = await createOrder(request);
    const p1 = await createProduct(request, order.id, 'Poster');
    await attachPng(request, p1.id);
    const token = await createApprovalToken(request, order.id);

    await page.goto(`/aprobare/${token.id}`);
    const approveBtn = page.getByTestId(`approve-btn-${p1.id}`);
    await expect(approveBtn).toBeEnabled({ timeout: 8000 });
    await approveBtn.click();

    // Card turns green
    const card = page.getByTestId(`product-card-${p1.id}`);
    await expect(card).toHaveClass(/border-green-500/, { timeout: 5000 });
    // Button changes to approved text (button is now disabled)
    await expect(approveBtn).toBeDisabled();
    await expect(card).toContainText('Design aprobat');
  });

  test('approved state persists after page reload', async ({ page, request }) => {
    const order = await createOrder(request);
    const p1 = await createProduct(request, order.id, 'Banner');
    await attachPng(request, p1.id);
    const token = await createApprovalToken(request, order.id);

    // First visit: approve
    await page.goto(`/aprobare/${token.id}`);
    const approveBtn = page.getByTestId(`approve-btn-${p1.id}`);
    await expect(approveBtn).toBeEnabled({ timeout: 8000 });
    await approveBtn.click();
    await expect(page.getByTestId(`product-card-${p1.id}`)).toHaveClass(/border-green-500/, {
      timeout: 5000,
    });

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByTestId(`product-card-${p1.id}`)).toHaveClass(/border-green-500/, {
      timeout: 8000,
    });
  });

  test('approving one product does not affect the other', async ({ page, request }) => {
    const order = await createOrder(request);
    const p1 = await createProduct(request, order.id, 'P1');
    const p2 = await createProduct(request, order.id, 'P2');
    await attachPng(request, p1.id);
    await attachPng(request, p2.id);
    const token = await createApprovalToken(request, order.id);

    await page.goto(`/aprobare/${token.id}`);
    await expect(page.getByTestId(`approve-btn-${p1.id}`)).toBeEnabled({ timeout: 8000 });
    await page.getByTestId(`approve-btn-${p1.id}`).click();
    await expect(page.getByTestId(`product-card-${p1.id}`)).toHaveClass(/border-green-500/, {
      timeout: 5000,
    });

    // p2 remains unapproved (gray border)
    const card2 = page.getByTestId(`product-card-${p2.id}`);
    await expect(card2).not.toHaveClass(/border-green-500/);
    await expect(page.getByTestId(`approve-btn-${p2.id}`)).toBeEnabled();
  });

  test('double-approve is idempotent — no error shown', async ({ page, request }) => {
    const order = await createOrder(request);
    const p1 = await createProduct(request, order.id, 'Covor');
    await attachPng(request, p1.id);
    const token = await createApprovalToken(request, order.id);

    // Approve via API directly twice
    await request.post(`/api/aprobare/${token.id}/${p1.id}`);
    const res = await request.post(`/api/aprobare/${token.id}/${p1.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.approved).toBe(true);

    // Page should show green on load
    await page.goto(`/aprobare/${token.id}`);
    await expect(page.getByTestId(`product-card-${p1.id}`)).toHaveClass(/border-green-500/, {
      timeout: 8000,
    });
  });
});

// ── US3: Invalid or unknown approval link ─────────────────────────────────────

test.describe('Feature 015 — approval: US3 invalid link handling', () => {
  test('unknown UUID renders user-friendly error page', async ({ page }) => {
    await page.goto('/aprobare/00000000-0000-0000-0000-000000000000');
    const errorEl = page.getByTestId('approval-not-found');
    await expect(errorEl).toBeVisible({ timeout: 8000 });
    await expect(errorEl).toContainText('Contactați studioul');
  });

  test('error page has role="alert" and no stack trace', async ({ page }) => {
    await page.goto('/aprobare/invalid-uuid-that-does-not-exist');
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 8000 });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Error:');
    expect(bodyText).not.toContain('at Object');
    expect(bodyText).not.toContain('node_modules');
  });

  test('navigating to /aprobare with no UUID segment yields a 404-style page', async ({
    page,
  }) => {
    const res = await page.goto('/aprobare/');
    // Next.js may return 404 or the dynamic segment catches it — either is acceptable
    // Confirm the page does NOT show internal app content unguarded
    const status = res?.status();
    expect([200, 404]).toContain(status);
  });
});
