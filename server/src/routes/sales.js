const express = require('express');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, c.player_or_character, c.team_or_set, c.set_name, c.year, c.category
    FROM sales s JOIN cards c ON c.id = s.card_id
    ORDER BY s.sale_date DESC, s.id DESC
  `).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { card_id, quantity_sold = 1, sale_price, fees = 0, shipping_cost = 0, platform, buyer, sale_date, notes } = req.body;
  if (!card_id || sale_price === undefined) return res.status(400).json({ error: 'card_id and sale_price required' });
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(card_id);
  if (!card) return res.status(404).json({ error: 'card not found' });

  const info = db.prepare(`
    INSERT INTO sales (card_id, quantity_sold, sale_price, fees, shipping_cost, platform, buyer, sale_date, notes)
    VALUES (@card_id, @quantity_sold, @sale_price, @fees, @shipping_cost, @platform, @buyer, COALESCE(@sale_date, date('now')), @notes)
  `).run({ card_id, quantity_sold, sale_price, fees, shipping_cost, platform, buyer, sale_date, notes });

  const remaining = Math.max(0, (card.quantity || 0) - Number(quantity_sold));
  db.prepare(`UPDATE cards SET quantity = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(remaining, remaining === 0 ? 'sold' : card.status, card_id);

  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(sale);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
