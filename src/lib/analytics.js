'use strict';

const { getDb } = require('./db.js');

const RO_MONTHS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(isoMonth) {
  const [year, month] = isoMonth.split('-');
  return `${RO_MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

function getMonthlyProfitData(months = 12) {
  const db = getDb();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) AS month,
              COALESCE(SUM(profit), 0)       AS totalProfit,
              COUNT(*)                        AS orderCount
         FROM orders
        WHERE created_at >= ?
        GROUP BY month
        ORDER BY month ASC`
    )
    .all(startDate.toISOString());
  return rows.map((r) => ({
    month: r.month,
    label: monthLabel(r.month),
    totalProfit: Number(r.totalProfit),
    orderCount: Number(r.orderCount),
  }));
}

function getTopProducts(limit = 10) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pt.name,
              COUNT(DISTINCT p.order_id)     AS orderCount,
              SUM(p.quantity * p.unit_price) AS totalRevenue
         FROM products p
         JOIN product_templates pt ON p.template_id = pt.id
        GROUP BY pt.id, pt.name
        ORDER BY orderCount DESC
        LIMIT ?`
    )
    .all(limit);
  return rows.map((r) => ({
    name: r.name,
    orderCount: Number(r.orderCount),
    totalRevenue: Number(r.totalRevenue ?? 0),
  }));
}

function getDashboardKPIs() {
  const db = getDb();
  const { totalOrders, totalProfit } = db
    .prepare(
      `SELECT COUNT(*)                  AS totalOrders,
              COALESCE(SUM(profit), 0)  AS totalProfit
         FROM orders`
    )
    .get();
  const { totalRevenue } = db
    .prepare(
      `SELECT COALESCE(SUM(quantity * unit_price), 0) AS totalRevenue
         FROM products`
    )
    .get();
  return {
    totalOrders: Number(totalOrders),
    totalProfit: Number(totalProfit),
    totalRevenue: Number(totalRevenue),
  };
}

module.exports = { getMonthlyProfitData, getTopProducts, getDashboardKPIs };
