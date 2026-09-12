const express = require('express');
const crypto = require('crypto');
const { db, logAudit } = require('../db');

const router = express.Router();

// Personal, read-only API tokens - scoped to the user who created them, listed under
// Settings -> Personal API Token. Same "plain random token, revoke by deleting" model
// as public share links (share.js), since the risk profile is equivalent (a bearer
// capability token, not a password).

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT id, label, token, created_at, last_used_at FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId));
});

router.post('/', (req, res) => {
  const token = crypto.randomBytes(24).toString('hex');
  const info = db.prepare('INSERT INTO api_tokens (user_id, token, label) VALUES (?, ?, ?)')
    .run(req.session.userId, token, req.body.label || null);
  logAudit({ userId: req.session.userId, action: 'create', entityType: 'api_token', entityId: info.lastInsertRowid });
  res.status(201).json(db.prepare('SELECT * FROM api_tokens WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM api_tokens WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  logAudit({ userId: req.session.userId, action: 'delete', entityType: 'api_token', entityId: Number(req.params.id) });
  res.status(204).end();
});

module.exports = router;
