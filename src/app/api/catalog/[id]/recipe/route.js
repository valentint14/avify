import { getRecipeForTemplate, replaceRecipe } from '../../../../../lib/recipes.js';
import { getById } from '../../../../../lib/productTemplates.js';

export async function GET(_req, { params }) {
  const { id } = await params;
  try {
    if (!getById(id)) {
      return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
    }
    return Response.json({ recipe: getRecipeForTemplate(id) });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    if (!getById(id)) {
      return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
    }
    const body = await request.json();
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const recipe = replaceRecipe(id, lines);
    return Response.json({ recipe });
  } catch (err) {
    if (err?.code === 'VALIDATION') {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
