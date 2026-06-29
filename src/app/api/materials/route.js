import { listAll, create } from '../../../lib/materials.js';

function validateStock(body) {
  for (const key of ['currentStock', 'minStock']) {
    if (body[key] !== undefined && !(Number.isFinite(Number(body[key])) && Number(body[key]) >= 0)) {
      return 'Stocul trebuie să fie un număr pozitiv.';
    }
  }
  return null;
}

export async function GET() {
  try {
    return Response.json({ materials: listAll() });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return Response.json({ error: 'Numele materialului este obligatoriu.' }, { status: 400 });
    }
    const stockError = validateStock(body);
    if (stockError) return Response.json({ error: stockError }, { status: 400 });

    const material = create({
      name,
      currentStock: body.currentStock,
      minStock: body.minStock,
      unit: body.unit,
    });
    return Response.json({ material }, { status: 201 });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
