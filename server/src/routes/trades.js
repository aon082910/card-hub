const express = require('express');
const { db, logAudit } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, c.player_or_character, c.set_name, c.year
    FROM trades t JOIN cards c ON c.id = t.card_id
    ORDER BY t.trade_date DESC, t.id DESC
  `).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { card_id, direction, counterparty, quantity = 1, value_estimate, trade_date, notes } = req.body;
  if (!card_id || !direction) return res.status(400).json({ error: 'card_id and direction required' });
  if (!['in', 'out'].includes(direction)) return res.status(400).json({ error: 'direction must be in or out' });

  const info = db.prepare(`
    INSERT INTO trades (card_id, direction, counterparty, quantity, value_estimate, trade_date, notes)
    VALUES (@card_id, @direction, @counterparty, @quantity, @value_estimate, COALESCE(@trade_date, date('now')), @notes)
  `).run({ card_id, direction, counterparty, quantity, value_estimate, trade_date, notes });

  // 'out' reduces quantity owned (traded away); 'in' just logs how the card was acquired.
  if (direction === 'out') {
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(card_id);
    if (card) {
      const remaining = Math.max(0, (card.quantity || 0) - Number(quantity));
      db.prepare(`UPDATE cards SET quantity = ?, updated_at = datetime('now') WHERE id = ?`).run(remaining, card_id);
    }
  }

  logAudit({ action: 'create', entityType: 'trade', entityId: info.lastInsertRowid, details: `${direction} card #${card_id}` });
  res.status(201).json(db.prepare('SELECT * FROM trades WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM trades WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
