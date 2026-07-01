import { getShoppingList } from '../../../lib/shoppingList.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(getShoppingList());
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
