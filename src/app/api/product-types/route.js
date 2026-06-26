import { getAllProductTypes, createProductType } from '../../../lib/orders.js';

export async function GET() {
  try {
    const productTypes = getAllProductTypes();
    return Response.json({ productTypes });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return Response.json({ error: 'Numele tipului de produs este obligatoriu.' }, { status: 400 });
    }

    const existing = getAllProductTypes();
    if (existing.some((pt) => pt.name.toLowerCase() === name.toLowerCase())) {
      return Response.json({ error: 'Tipul de produs există deja.' }, { status: 400 });
    }

    const productType = createProductType(name);
    return Response.json({ productType }, { status: 201 });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
