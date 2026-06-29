'use strict';

const { getDb } = require('./db.js');

function validationError(message) {
  const err = new Error(message);
  err.code = 'VALIDATION';
  return err;
}

function parseRow(row) {
  return {
    id: row.id,
    templateId: row.template_id,
    materialId: row.material_id,
    qtyPerPiece: Number(row.qty_per_piece),
    createdAt: row.created_at,
  };
}

// Recipe lines for a template, enriched with material name + unit for display.
function getRecipeForTemplate(templateId) {
  return getDb()
    .prepare(
      `SELECT r.*, m.name AS material_name, m.unit AS material_unit
         FROM recipe_lines r
         JOIN materials m ON m.id = r.material_id
        WHERE r.template_id = ?
        ORDER BY m.name ASC`
    )
    .all(templateId)
    .map((row) => ({
      id: row.id,
      materialId: row.material_id,
      materialName: row.material_name,
      unit: row.material_unit ?? null,
      qtyPerPiece: Number(row.qty_per_piece),
    }));
}

// Replace the entire recipe for a template with the supplied set of lines,
// in a single transaction. Validates positive quantities, existing materials,
// and no duplicate material within the set.
function replaceRecipe(templateId, lines = []) {
  const db = getDb();
  const seen = new Set();
  for (const line of lines) {
    const qty = Number(line.qtyPerPiece);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw validationError('Consumul per bucată trebuie să fie un număr pozitiv.');
    }
    if (seen.has(line.materialId)) {
      throw validationError('Un material nu poate apărea de două ori în rețetă.');
    }
    seen.add(line.materialId);
    const material = db.prepare('SELECT id FROM materials WHERE id = ?').get(line.materialId);
    if (!material) throw validationError('Material inexistent.');
  }

  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM recipe_lines WHERE template_id = ?').run(templateId);
    const now = new Date().toISOString();
    const insert = db.prepare(
      'INSERT INTO recipe_lines (id, template_id, material_id, qty_per_piece, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    for (const line of lines) {
      insert.run(crypto.randomUUID(), templateId, line.materialId, Number(line.qtyPerPiece), now);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return getRecipeForTemplate(templateId);
}

// Build a { [templateId]: [{ materialId, qtyPerPiece }] } map for the given
// template ids — used by the stock-deduction step.
function getRecipesByTemplateIds(ids) {
  const unique = [...new Set(ids.filter((id) => id != null))];
  const map = {};
  if (unique.length === 0) return map;
  const placeholders = unique.map(() => '?').join(', ');
  const rows = getDb()
    .prepare(`SELECT * FROM recipe_lines WHERE template_id IN (${placeholders})`)
    .all(...unique)
    .map(parseRow);
  for (const row of rows) {
    (map[row.templateId] ||= []).push({ materialId: row.materialId, qtyPerPiece: row.qtyPerPiece });
  }
  return map;
}

module.exports = { getRecipeForTemplate, replaceRecipe, getRecipesByTemplateIds };
