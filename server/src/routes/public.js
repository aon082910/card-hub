const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Deliberately unauthenticated - this is what a share link resolves to. Only
// non-sensitive fields are returned (no cost basis, purchase source, storage location).
router.get('/share/:token', (req, res) => {
  const link = db.prepare('SELECT * FROM share_links WHERE token = ?').get(req.params.token);
  if (!link) return res.status(404).json({ error: 'not found' });
  if (link.expires_at && new Date(link.expires_at) < new Date()) return res.status(410).json({ error: 'expired' });

  const SAFE_FIELDS = `id, category, sport_or_game, player_or_character, team_or_set, set_name, year,
    manufacturer, card_number, parallel_variant, rarity, is_graded, grading_company, grade,
    raw_condition, current_value, status`;

  // Every card belongs to one account now (Card-Hub is multi-tenant) - a link only ever
  // resolves against its creator's own cards, never the whole instance.
  let cards;
  if (link.kind === 'wanted') {
    cards = db.prepare(`SELECT ${SAFE_FIELDS} FROM cards WHERE status = 'wanted' AND user_id = ? ORDER BY player_or_character`).all(link.created_by);
  } else if (link.kind === 'for_trade') {
    cards = db.prepare(`SELECT ${SAFE_FIELDS} FROM cards WHERE for_trade = 1 AND status != 'sold' AND user_id = ? ORDER BY player_or_character`).all(link.created_by);
  } else if (link.kind === 'collection') {
    cards = db.prepare(`SELECT ${SAFE_FIELDS} FROM cards WHERE status != 'sold' AND user_id = ? ORDER BY player_or_character`).all(link.created_by);
  } else {
    const ids = JSON.parse(link.card_ids || '[]');
    if (!ids.length) cards = [];
    else {
      const placeholders = ids.map(() => '?').join(',');
      cards = db.prepare(`SELECT ${SAFE_FIELDS} FROM cards WHERE id IN (${placeholders}) AND user_id = ?`).all(...ids, link.created_by);
    }
  }

  const images = db.prepare(`
    SELECT card_id, filename FROM card_images WHERE side = 'front' AND card_id IN (${cards.map(() => '?').join(',') || 'NULL'})
  `).all(...cards.map((c) => c.id));
  const imageByCard = new Map(images.map((i) => [i.card_id, i.filename]));

  res.json({
    label: link.label,
    kind: link.kind,
    cards: cards.map((c) => ({ ...c, image: imageByCard.has(c.id) ? `/images/${imageByCard.get(c.id)}` : null })),
  });
});

module.exports = router;
