import { deleteOrder } from '../../../../lib/orders.js';

export async function DELETE(_req, { params }) {
  try {
    const deleted = deleteOrder(params.id);
    if (!deleted) return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
