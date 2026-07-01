import { approveProduct } from '../../../../../lib/approvalTokens.js';

export const dynamic = 'force-dynamic';

export async function POST(_req, { params }) {
  const { uuid, productId } = await params;
  try {
    const result = approveProduct(uuid, productId);
    if (!result) {
      return Response.json({ error: 'Link de aprobare sau produs negăsit.' }, { status: 404 });
    }
    if (result.noFile) {
      return Response.json({ error: 'Produsul nu are un fișier grafic atașat.' }, { status: 400 });
    }
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
