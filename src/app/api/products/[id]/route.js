import { updateProductStatus, deleteProduct } from '../../../../lib/products.js';
import { VALID_STAGES } from '../../../../lib/constants.js';

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const status = typeof body.status === 'string' ? body.status.trim() : '';

    if (!VALID_STAGES.includes(status)) {
      return Response.json({ error: 'Status invalid.' }, { status: 400 });
    }

    const product = updateProductStatus(params.id, status);
    if (!product) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
    return Response.json({ product });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const deleted = deleteProduct(params.id);
    if (!deleted) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
