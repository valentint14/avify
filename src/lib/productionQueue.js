'use strict';

const { getDb } = require('./db.js');

const PRODUCTION_QUEUE_SQL = `
  SELECT
    COALESCE(pt.id, 'ad_hoc_' || p.name)   AS group_key,
    COALESCE(pt.name, p.name)               AS group_label,
    pt.id                                   AS template_id,
    SUM(p.quantity)                         AS total_quantity,
    json_group_array(
      json_object(
        'orderId',   o.id,
        'orderName', o.name,
        'client',    o.client,
        'quantity',  p.quantity
      )
    )                                       AS contributing_orders_json
  FROM products p
  LEFT JOIN product_templates pt ON p.template_id = pt.id
  JOIN       orders o            ON p.order_id   = o.id
  WHERE p.status = 'de_realizat'
  GROUP BY COALESCE(pt.id, p.name)
  ORDER BY SUM(p.quantity) DESC
`;

function getProductionQueue() {
  const rows = getDb().prepare(PRODUCTION_QUEUE_SQL).all();
  return rows.map((row) => ({
    key:           row.group_key,
    label:         row.group_label,
    templateId:    row.template_id ?? null,
    totalQuantity: Number(row.total_quantity),
    orders:        JSON.parse(row.contributing_orders_json),
  }));
}

module.exports = { getProductionQueue };
