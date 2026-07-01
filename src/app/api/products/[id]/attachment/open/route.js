import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getDb } from '../../../../../../lib/db.js';

function getProductById(id) {
  const row = getDb().prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!row) return null;
  return { id: row.id, graphicFilePath: row.graphic_file_path ?? null };
}

export async function POST(_req, { params }) {
  try {
    const product = getProductById(params.id);
    if (!product) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
    if (!product.graphicFilePath) return Response.json({ error: 'Niciun fișier atașat.' }, { status: 404 });

    const absPath = path.join(process.cwd(), 'data', product.graphicFilePath);
    if (!fs.existsSync(absPath)) {
      return Response.json(
        { error: 'Fișierul nu a fost găsit la calea stocată. Re-atașați fișierul.' },
        { status: 404 }
      );
    }

    const child = spawn('cmd', ['/c', 'start', '', absPath], { detached: true, stdio: 'ignore', shell: false });
    child.unref();

    return Response.json({ opened: true });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
