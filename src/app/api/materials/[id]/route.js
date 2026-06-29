import { update, deleteById } from '../../../../lib/materials.js';

const FIELDS = ['name', 'currentStock', 'minStock', 'unit'];

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const fields = {};
    for (const key of FIELDS) {
      if (body[key] !== undefined) fields[key] = body[key];
    }
    if (Object.keys(fields).length === 0) {
      return Response.json({ error: 'Cel puțin un câmp trebuie furnizat.' }, { status: 400 });
    }
    if (fields.name !== undefined && String(fields.name).trim() === '') {
      return Response.json({ error: 'Numele materialului este obligatoriu.' }, { status: 400 });
    }
    for (const key of ['currentStock', 'minStock']) {
      if (fields[key] !== undefined && !(Number.isFinite(Number(fields[key])) && Number(fields[key]) >= 0)) {
        return Response.json({ error: 'Stocul trebuie să fie un număr pozitiv.' }, { status: 400 });
      }
    }
    const material = update(params.id, fields);
    if (!material) return Response.json({ error: 'Materialul nu a fost găsit.' }, { status: 404 });
    return Response.json({ material });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const deleted = deleteById(params.id);
    if (!deleted) return Response.json({ error: 'Materialul nu a fost găsit.' }, { status: 404 });
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
