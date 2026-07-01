import { getOrderById } from '../../../../../lib/orders.js';
import { getRevisionStatusForOrder } from '../../../../../lib/approvalTokens.js';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  try {
    const order = getOrderById(id);
    if (!order) {
      return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    }
    const revisions = getRevisionStatusForOrder(id);
    return Response.json({ revisions });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
