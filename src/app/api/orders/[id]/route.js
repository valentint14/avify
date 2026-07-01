import { deleteOrder, updateOrder } from '../../../../lib/orders.js';

const ORDER_FIELDS = [
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

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const fields = {};
    for (const key of ORDER_FIELDS) {
      if (body[key] !== undefined) fields[key] = body[key];
    }
    if (Object.keys(fields).length === 0) {
      return Response.json({ error: 'Cel puțin un câmp trebuie furnizat.' }, { status: 400 });
    }
    if (fields.advance !== undefined && !Number.isFinite(Number(fields.advance))) {
      return Response.json({ error: 'Avansul trebuie să fie un număr.' }, { status: 400 });
    }
    if (fields.profit !== undefined && !Number.isFinite(Number(fields.profit))) {
      return Response.json({ error: 'Profitul trebuie să fie un număr.' }, { status: 400 });
    }
    const order = updateOrder(id, fields);
    if (!order) return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    return Response.json({ order });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  try {
    const deleted = deleteOrder(id);
    if (!deleted) return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
