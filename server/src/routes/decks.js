const express = require('express');
const { db, logAudit } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const decks = db.prepare('SELECT * FROM decks ORDER BY updated_at DESC').all();
  const withCounts = decks.map((d) => {
    const { n } = db.prepare('SELECT COALESCE(SUM(quantity),0) as n FROM deck_cards WHERE deck_id = ?').get(d.id);
    return { ...d, card_count: n };
  });
  res.json(withCounts);
});

router.get('/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'not found' });
  const cards = db.prepare(`
    SELECT dc.id as deck_card_id, dc.quantity as deck_quantity, c.*
    FROM deck_cards dc JOIN cards c ON c.id = dc.card_id
    WHERE dc.deck_id = ? ORDER BY c.player_or_character
  `).all(req.params.id);
  res.json({ ...deck, cards });
});

router.post('/', (req, res) => {
  const { name, category = 'tcg', sport_or_game, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = db.prepare('INSERT INTO decks (name, category, sport_or_game, notes) VALUES (?, ?, ?, ?)')
    .run(name, category, sport_or_game, notes);
  logAudit({ action: 'create', entityType: 'deck', entityId: info.lastInsertRowid, details: name });
  res.status(201).json(db.prepare('SELECT * FROM decks WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const fields = ['name', 'category', 'sport_or_game', 'notes'];
  const data = {};
  for (const f of fields) if (f in req.body) data[f] = req.body[f];
  const cols = Object.keys(data);
  if (!cols.length) return res.status(400).json({ error: 'no fields' });
  db.prepare(`UPDATE decks SET ${cols.map((c) => `${c} = @${c}`).join(',')}, updated_at = datetime('now') WHERE id = @id`)
    .run({ ...data, id: req.params.id });
  res.json(db.prepare('SELECT * FROM decks WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM decks WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.post('/:id/cards', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'not found' });
  const { card_id, quantity = 1 } = req.body;
  if (!card_id) return res.status(400).json({ error: 'card_id required' });
  const existing = db.prepare('SELECT * FROM deck_cards WHERE deck_id = ? AND card_id = ?').get(req.params.id, card_id);
  if (existing) {
    db.prepare('UPDATE deck_cards SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
  } else {
    db.prepare('INSERT INTO deck_cards (deck_id, card_id, quantity) VALUES (?, ?, ?)').run(req.params.id, card_id, quantity);
  }
  db.prepare(`UPDATE decks SET updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.status(201).end();
});

router.delete('/:id/cards/:deckCardId', (req, res) => {
  db.prepare('DELETE FROM deck_cards WHERE id = ? AND deck_id = ?').run(req.params.deckCardId, req.params.id);
  res.status(204).end();
});

module.exports = router;
