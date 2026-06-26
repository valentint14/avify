import { listAll, search, create } from '../../../lib/productTemplates.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') ?? '';
    const templates = q ? search(q) : listAll();
    return Response.json({ templates });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() || null : null;

    if (!name) {
      return Response.json({ error: 'Numele produsului este obligatoriu.' }, { status: 400 });
    }

    const template = create(name, description);
    return Response.json({ template }, { status: 201 });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
