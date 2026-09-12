const express = require('express');
const { db } = require('../db');

const router = express.Router();

function areFriends(a, b) {
  const f = db.prepare(`
    SELECT status FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).get(a, b, b, a);
  return !!f && f.status === 'accepted';
}

// One row per conversation partner, with the latest message and an unread count.
router.get('/conversations', (req, res) => {
  const me = req.session.userId;
  const partners = db.prepare(`
    SELECT DISTINCT CASE WHEN sender_id = @me THEN recipient_id ELSE sender_id END as other_id
    FROM messages WHERE sender_id = @me OR recipient_id = @me
  `).all({ me });
  const rows = partners.map(({ other_id }) => {
    const other = db.prepare('SELECT id, username FROM users WHERE id = ?').get(other_id);
    const last = db.prepare(`
      SELECT * FROM messages WHERE (sender_id = @me AND recipient_id = @other) OR (sender_id = @other AND recipient_id = @me)
      ORDER BY created_at DESC LIMIT 1
    `).get({ me, other: other_id });
    const { n } = db.prepare(`SELECT COUNT(*) as n FROM messages WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL`).get(other_id, me);
    return { user: other, lastMessage: last, unreadCount: n };
  }).filter((c) => c.user).sort((a, b) => (b.lastMessage?.created_at || '').localeCompare(a.lastMessage?.created_at || ''));
  res.json(rows);
});

router.get('/with/:userId', (req, res) => {
  const me = req.session.userId;
  const other = Number(req.params.userId);
  const rows = db.prepare(`
    SELECT * FROM messages WHERE (sender_id = @me AND recipient_id = @other) OR (sender_id = @other AND recipient_id = @me)
    ORDER BY created_at
  `).all({ me, other });
  db.prepare(`UPDATE messages SET read_at = datetime('now') WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL`).run(other, me);
  res.json(rows);
});

router.post('/with/:userId', (req, res) => {
  const me = req.session.userId;
  const other = Number(req.params.userId);
  const { body, trade_request_id } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'body required' });
  if (!areFriends(me, other)) return res.status(403).json({ error: 'You can only message friends.' });
  const info = db.prepare('INSERT INTO messages (sender_id, recipient_id, body, trade_request_id) VALUES (?, ?, ?, ?)')
    .run(me, other, body.trim(), trade_request_id || null);
  res.status(201).json(db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid));
});

router.get('/unread-count', (req, res) => {
  const { n } = db.prepare('SELECT COUNT(*) as n FROM messages WHERE recipient_id = ? AND read_at IS NULL').get(req.session.userId);
  res.json({ count: n });
});

module.exports = router;
