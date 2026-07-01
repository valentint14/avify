import { getOrderById } from '../../../../../lib/orders.js';
import { getOrCreateApprovalToken, getApprovalToken } from '../../../../../lib/approvalTokens.js';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { id } = await params;
  try {
    const order = getOrderById(id);
    if (!order) return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    const token = getApprovalToken(id);
    return Response.json({ token });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function POST(_req, { params }) {
  const { id } = await params;
  try {
    const order = getOrderById(id);
    if (!order) return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    const token = getOrCreateApprovalToken(id);
    return Response.json({ token });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
