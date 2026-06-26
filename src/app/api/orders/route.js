import { getAllWithStatus, createOrder } from '../../../lib/orders.js';

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
    const order = createOrder(name);
    return Response.json({ order }, { status: 201 });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
