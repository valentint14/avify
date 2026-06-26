import { update, deleteById } from '../../../../lib/productTemplates.js';

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const fields = {};

    if ('name' in body) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) {
        return Response.json({ error: 'Numele produsului nu poate fi gol.' }, { status: 400 });
      }
      fields.name = name;
    }

    if ('description' in body) {
      fields.description = typeof body.description === 'string' ? body.description.trim() || null : null;
    }

    const template = update(params.id, fields);
    if (!template) return Response.json({ error: 'Produsul șablon nu a fost găsit.' }, { status: 404 });
    return Response.json({ template });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const deleted = deleteById(params.id);
    if (!deleted) return Response.json({ error: 'Produsul șablon nu a fost găsit.' }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
