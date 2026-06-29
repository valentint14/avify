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
    const fieldKeys = [
      'client',
      'receptionDate',
      'advance',
      'county',
      'contactPlatform',
      'eventDate',
      'deliveryDate',
      'profit',
      'collected',
      'delivered',
    ];
    const fields = {};
    for (const key of fieldKeys) {
      if (body[key] !== undefined) fields[key] = body[key];
    }
    const { order, products } = createOrderWithProducts(name, templateIds, fields);
    return Response.json({ order, products }, { status: 201 });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
