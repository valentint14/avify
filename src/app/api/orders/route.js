import { getAllWithStatus, createOrderWithProducts } from '../../../lib/orders.js';

export async function GET() {
  try {
    return Response.json({ orders: getAllWithStatus() });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return Response.json({ error: 'Numele comenzii este obligatoriu.' }, { status: 400 });
    }
    const templateIds = Array.isArray(body.templateIds) ? body.templateIds : [];
    const { order, products } = createOrderWithProducts(name, templateIds);
    return Response.json({ order, products }, { status: 201 });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
