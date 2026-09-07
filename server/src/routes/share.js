const express = require('express');
const crypto = require('crypto');
const { db, logAudit } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM share_links ORDER BY created_at DESC').all());
});

router.post('/', (req, res) => {
  const { label, kind = 'selection', card_ids } = req.body;
  const token = crypto.randomBytes(12).toString('hex');
  const info = db.prepare('INSERT INTO share_links (token, label, kind, card_ids, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(token, label || null, kind, kind === 'selection' ? JSON.stringify(card_ids || []) : null, req.session.userId || null);
  logAudit({ userId: req.session.userId, action: 'create', entityType: 'share_link', entityId: info.lastInsertRowid, details: label });
  res.status(201).json(db.prepare('SELECT * FROM share_links WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM share_links WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
