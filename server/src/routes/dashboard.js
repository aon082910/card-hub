const express = require('express');
const { db } = require('../db');
const { takeSnapshot } = require('../lib/snapshotJob');

const router = express.Router();

router.get('/', (req, res) => {
  const userId = req.session.userId;
  const totals = db.prepare(`
    SELECT
      COUNT(*) as card_lines,
      COALESCE(SUM(quantity), 0) as total_quantity,
      COALESCE(SUM(cost_basis), 0) as total_cost,
      COALESCE(SUM(current_value * quantity), 0) as total_value
    FROM cards WHERE status != 'sold' AND user_id = ?
  `).get(userId);

  const salesTotals = db.prepare(`
    SELECT
      COALESCE(SUM(s.sale_price), 0) as total_revenue,
      COALESCE(SUM(s.fees + s.shipping_cost), 0) as total_costs,
      COUNT(*) as total_sales
    FROM sales s JOIN cards c ON c.id = s.card_id WHERE c.user_id = ?
  `).get(userId);

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count, COALESCE(SUM(current_value * quantity), 0) as value
    FROM cards WHERE status != 'sold' AND user_id = ? GROUP BY category
  `).all(userId);

  const recentSales = db.prepare(`
    SELECT s.*, c.player_or_character, c.set_name FROM sales s
    JOIN cards c ON c.id = s.card_id WHERE c.user_id = ? ORDER BY s.sale_date DESC LIMIT 10
  `).all(userId);

  const snapshots = db.prepare(`
    SELECT date(taken_at) as day, total_value, total_cost FROM portfolio_snapshots WHERE user_id = ? ORDER BY taken_at
  `).all(userId);

  res.json({
    totals,
    profit: salesTotals.total_revenue - salesTotals.total_costs,
    salesTotals,
    byCategory,
    recentSales,
    valueOverTime: snapshots.map((s) => ({ day: s.day, value: s.total_value })),
  });
});

router.post('/snapshot', (req, res) => {
  const totals = takeSnapshot(req.session.userId);
  res.json(totals);
});

module.exports = router;
