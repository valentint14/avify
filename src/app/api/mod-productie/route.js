import { getProductionQueue } from '../../../lib/productionQueue.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json({
      groups:    getProductionQueue(),
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
