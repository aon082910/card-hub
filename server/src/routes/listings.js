const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Marketplace listings module.
// NOTE: This stores draft/active listing records and generates export data
// (CSV templates for eBay bulk-upload, etc). Live OAuth sync to eBay/WhatNot/etc
// is not implemented - each marketplace has its own developer API + OAuth flow
// that needs API keys registered by the account owner. This module is built so
// that a sync adapter per-platform can be dropped in later without schema changes.

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT l.*, c.player_or_character, c.team_or_set, c.set_name, c.year, c.category
    FROM listings l JOIN cards c ON c.id = l.card_id
    ORDER BY l.created_at DESC
  `).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { card_id, platform, list_price, status = 'draft', external_url, external_id, listed_at, notes } = req.body;
  if (!card_id || !platform) return res.status(400).json({ error: 'card_id and platform required' });
  const info = db.prepare(`
    INSERT INTO listings (card_id, platform, list_price, status, external_url, external_id, listed_at, notes)
    VALUES (@card_id, @platform, @list_price, @status, @external_url, @external_id, @listed_at, @notes)
  `).run({ card_id, platform, list_price, status, external_url, external_id, listed_at, notes });
  const row = db.prepare('SELECT * FROM listings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const fields = ['platform', 'list_price', 'status', 'external_url', 'external_id', 'listed_at', 'notes'];
  const data = {};
  for (const f of fields) if (f in req.body) data[f] = req.body[f];
  const cols = Object.keys(data);
  if (cols.length) {
    db.prepare(`UPDATE listings SET ${cols.map(c => `${c} = @${c}`).join(',')}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...data, id: req.params.id });
  }
  res.json(db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
