const express = require('express');
const { db, logAudit } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const sets = db.prepare('SELECT * FROM card_sets ORDER BY year DESC, name').all();
  const withProgress = sets.map((s) => {
    const owned = db.prepare(`
      SELECT COUNT(DISTINCT card_number) as n FROM cards
      WHERE set_name = ? AND year = ? AND manufacturer = ? AND card_number IS NOT NULL AND card_number != '' AND status != 'sold'
    `).get(s.name, s.year, s.manufacturer);
    return { ...s, owned_count: owned.n, percent: s.total_cards > 0 ? Math.round((owned.n / s.total_cards) * 100) : null };
  });
  res.json(withProgress);
});

router.get('/:id', (req, res) => {
  const set = db.prepare('SELECT * FROM card_sets WHERE id = ?').get(req.params.id);
  if (!set) return res.status(404).json({ error: 'not found' });
  const owned = db.prepare(`
    SELECT * FROM cards WHERE set_name = ? AND year = ? AND manufacturer = ? ORDER BY CAST(card_number AS INTEGER), card_number
  `).all(set.name, set.year, set.manufacturer);
  res.json({ ...set, cards: owned });
});

router.post('/', (req, res) => {
  const { name, category = 'sports', sport_or_game, year, manufacturer, total_cards = 0, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const info = db.prepare(`
    INSERT INTO card_sets (name, category, sport_or_game, year, manufacturer, total_cards, notes)
    VALUES (@name, @category, @sport_or_game, @year, @manufacturer, @total_cards, @notes)
  `).run({ name, category, sport_or_game, year, manufacturer, total_cards, notes });
  logAudit({ action: 'create', entityType: 'set', entityId: info.lastInsertRowid, details: name });
  res.status(201).json(db.prepare('SELECT * FROM card_sets WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const fields = ['name', 'category', 'sport_or_game', 'year', 'manufacturer', 'total_cards', 'notes'];
  const data = {};
  for (const f of fields) if (f in req.body) data[f] = req.body[f];
  const cols = Object.keys(data);
  if (!cols.length) return res.status(400).json({ error: 'no fields' });
  db.prepare(`UPDATE card_sets SET ${cols.map(c => `${c} = @${c}`).join(',')} WHERE id = @id`).run({ ...data, id: req.params.id });
  res.json(db.prepare('SELECT * FROM card_sets WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM card_sets WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
