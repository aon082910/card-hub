const express = require('express');
const crypto = require('crypto');
const { db, logAudit } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM share_links WHERE created_by = ? ORDER BY created_at DESC').all(req.session.userId));
});

router.post('/', (req, res) => {
  const { label, kind = 'selection', card_ids } = req.body;
  let safeCardIds = [];
  if (kind === 'selection' && Array.isArray(card_ids) && card_ids.length) {
    const placeholders = card_ids.map(() => '?').join(',');
    const owned = db.prepare(`SELECT id FROM cards WHERE id IN (${placeholders}) AND user_id = ?`).all(...card_ids, req.session.userId);
    safeCardIds = owned.map((r) => r.id);
  }
  const token = crypto.randomBytes(12).toString('hex');
  const info = db.prepare('INSERT INTO share_links (token, label, kind, card_ids, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(token, label || null, kind, kind === 'selection' ? JSON.stringify(safeCardIds) : null, req.session.userId);
  logAudit({ userId: req.session.userId, action: 'create', entityType: 'share_link', entityId: info.lastInsertRowid, details: label });
  res.status(201).json(db.prepare('SELECT * FROM share_links WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  const owned = db.prepare('SELECT id FROM share_links WHERE id = ? AND created_by = ?').get(req.params.id, req.session.userId);
  if (!owned) return res.status(404).json({ error: 'not found' });
  db.prepare('DELETE FROM share_links WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
