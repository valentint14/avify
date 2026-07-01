import fs from 'node:fs';
import path from 'node:path';
import { updateProduct } from '../../../../../lib/products.js';
import { ATTACHMENT_EXTENSIONS, ATTACHMENT_MAX_BYTES } from '../../../../../lib/constants.js';
import { getDb } from '../../../../../lib/db.js';

function getProductById(id) {
  const row = getDb().prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!row) return null;
  return { id: row.id, graphicFilePath: row.graphic_file_path ?? null };
}

const MIME_MAP = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export async function GET(_req, { params }) {
  const { id } = await params;
  try {
    const product = getProductById(id);
    if (!product) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
    if (!product.graphicFilePath) return Response.json({ error: 'Niciun fișier atașat.' }, { status: 404 });

    const absPath = path.join(process.cwd(), 'data', product.graphicFilePath);
    if (!fs.existsSync(absPath)) {
      return Response.json({ error: 'Fișierul nu a fost găsit pe disc.' }, { status: 404 });
    }

    const ext = product.graphicFilePath.split('.').pop().toLowerCase();
    const mime = MIME_MAP[ext] ?? 'application/octet-stream';
    const bytes = fs.readFileSync(absPath);

    return new Response(bytes, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  try {
    const product = getProductById(id);
    if (!product) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: 'Niciun fișier furnizat.' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'Niciun fișier furnizat.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!ATTACHMENT_EXTENSIONS.includes(ext)) {
      return Response.json(
        { error: `Tip de fișier neacceptat. Tipuri acceptate: ${ATTACHMENT_EXTENSIONS.map((e) => e.toUpperCase()).join(', ')}.` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > ATTACHMENT_MAX_BYTES) {
      return Response.json({ error: 'Fișierul depășește limita de 20 MB.' }, { status: 413 });
    }

    const attachDir = path.join(process.cwd(), 'data', 'attachments', id);
    fs.mkdirSync(attachDir, { recursive: true });

    for (const existing of fs.readdirSync(attachDir)) {
      fs.unlinkSync(path.join(attachDir, existing));
    }

    const safeName = path.basename(file.name).replace(/[/\\]/g, '_');
    const dest = path.join(attachDir, safeName);
    fs.writeFileSync(dest, Buffer.from(bytes));

    const relPath = `attachments/${id}/${safeName}`;
    const updated = updateProduct(id, { graphicFilePath: relPath });
    if (!updated) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });

    // New file uploaded — reset approval so client reviews the new design; keep revision history
    const db = getDb();
    db.prepare('DELETE FROM product_approvals WHERE product_id = ?').run(id);

    return Response.json({ product: updated });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  try {
    const product = getProductById(id);
    if (!product) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });
    if (!product.graphicFilePath) return Response.json({ error: 'Niciun fișier atașat.' }, { status: 404 });

    const absPath = path.join(process.cwd(), 'data', product.graphicFilePath);
    fs.rmSync(absPath, { force: true });

    const updated = updateProduct(id, { graphicFilePath: null });
    if (!updated) return Response.json({ error: 'Produsul nu a fost găsit.' }, { status: 404 });

    return Response.json({ product: updated });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
