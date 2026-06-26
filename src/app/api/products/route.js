import { getProductsByOrder, createProduct } from '../../../lib/products.js';
import { getAllWithStatus } from '../../../lib/orders.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      return Response.json({ error: 'Parametrul orderId este obligatoriu.' }, { status: 400 });
    }
    return Response.json({ products: getProductsByOrder(orderId) });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!orderId) {
      return Response.json({ error: 'Parametrul orderId este obligatoriu.' }, { status: 400 });
    }
    if (!name) {
      return Response.json({ error: 'Numele produsului este obligatoriu.' }, { status: 400 });
    }

    // Verify order exists
    const orders = getAllWithStatus();
    if (!orders.find((o) => o.id === orderId)) {
      return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    }

    const product = createProduct(orderId, name);
    return Response.json({ product }, { status: 201 });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
