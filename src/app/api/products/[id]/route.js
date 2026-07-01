import { updateProductStatus, updateProduct, deleteProduct } from '../../../../lib/products.js';
import { VALID_STAGES } from '../../../../lib/constants.js';
import { deductStockForOrder } from '../../../../lib/stock.js';

export async function PATCH(request, { params }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const hasStatus = typeof body.status === 'string' && body.status.trim() !== '';
    const hasQuantity = body.quantity !== undefined;
    const hasAdditionalInfo = body.additionalInfo !== undefined;
    const hasUnitPrice = body.unitPrice !== undefined;

    if (!hasStatus && !hasQuantity && !hasAdditionalInfo && !hasUnitPrice) {
      return Response.json({ error: 'Cel puțin un câmp trebuie furnizat.' }, { status: 400 });
    }

    let product = null;

    if (hasStatus) {
      const status = body.status.trim();
      if (!VALID_STAGES.includes(status)) {
        return Response.json({ error: 'Status invalid.' }, { status: 400 });
      }
      product = updateProductStatus(id, status);
      if (!product) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
      try {
        deductStockForOrder(product.orderId);
      } catch {
        // Intentionally swallowed: stock deduction is a side effect of the
        // status change; surface the successful status update regardless.
      }
    }

    if (hasQuantity || hasAdditionalInfo || hasUnitPrice) {
      if (hasQuantity) {
        const quantity = Math.trunc(Number(body.quantity));
        if (!Number.isFinite(quantity) || quantity < 1) {
          return Response.json({ error: 'Cantitatea trebuie să fie un număr întreg pozitiv.' }, { status: 400 });
        }
      }
      if (hasUnitPrice) {
        const unitPrice = Number(body.unitPrice);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          return Response.json({ error: 'Prețul unitar trebuie să fie un număr pozitiv.' }, { status: 400 });
        }
      }
      const fields = {};
      if (hasQuantity) fields.quantity = Math.trunc(Number(body.quantity));
      if (hasAdditionalInfo) fields.additionalInfo = body.additionalInfo;
      if (hasUnitPrice) fields.unitPrice = Number(body.unitPrice);
      product = updateProduct(id, fields);
      if (!product) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
    }

    return Response.json({ product });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  try {
    const deleted = deleteProduct(id);
    if (!deleted) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
