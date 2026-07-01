'use strict';

const { getDb } = require('./db.js');

const SHOPPING_LIST_SQL = `
  SELECT
    m.id            AS material_id,
    m.name          AS material_name,
    m.unit,
    m.current_stock,
    SUM(rl.qty_per_piece * CAST(p.quantity AS REAL)) AS total_required
  FROM orders o
  JOIN products p      ON p.order_id    = o.id
  JOIN recipe_lines rl ON rl.template_id = p.template_id
  JOIN materials m     ON m.id           = rl.material_id
  WHERE (
    (o.event_date    >= :today AND o.event_date    <= :cutoff)
    OR
    (o.delivery_date >= :today AND o.delivery_date <= :cutoff)
  )
  AND p.status IN ('de_realizat', 'in_realizare')
  AND rl.qty_per_piece > 0
  GROUP BY m.id
  ORDER BY m.name ASC
`;

const EXCLUDED_COUNT_SQL = `
  SELECT COUNT(*) AS excluded_count
  FROM orders o
  JOIN products p ON p.order_id = o.id
  WHERE (
    (o.event_date    >= :today AND o.event_date    <= :cutoff)
    OR
    (o.delivery_date >= :today AND o.delivery_date <= :cutoff)
  )
  AND p.status IN ('de_realizat', 'in_realizare')
  AND (
    p.template_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM recipe_lines rl
      WHERE rl.template_id = p.template_id AND rl.qty_per_piece > 0
    )
  )
`;

function getShoppingList() {
  const db    = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows               = db.prepare(SHOPPING_LIST_SQL).all({ today, cutoff });
  const { excluded_count } = db.prepare(EXCLUDED_COUNT_SQL).get({ today, cutoff });

  return {
    rows: rows.map((r) => ({
      materialId:    r.material_id,
      materialName:  r.material_name,
      unit:          r.unit ?? null,
      totalRequired: Number(r.total_required),
      currentStock:  Number(r.current_stock),
      toBuy:         Math.max(0, Number(r.total_required) - Number(r.current_stock)),
    })),
    excludedCount: Number(excluded_count ?? 0),
    generatedAt:   new Date().toISOString(),
  };
}

module.exports = { getShoppingList };
