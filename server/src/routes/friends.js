const express = require('express');
const { db, logAudit } = require('../db');

const router = express.Router();

function friendshipBetween(a, b) {
  return db.prepare(`
    SELECT * FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).get(a, b, b, a);
}

function areFriends(a, b) {
  const f = friendshipBetween(a, b);
  return !!f && f.status === 'accepted';
}

// Accepted friends, with their id/username.
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT f.*, u.id as friend_id, u.username as friend_username
    FROM friendships f
    JOIN users u ON u.id = (CASE WHEN f.requester_id = @me THEN f.addressee_id ELSE f.requester_id END)
    WHERE (f.requester_id = @me OR f.addressee_id = @me) AND f.status = 'accepted'
    ORDER BY u.username
  `).all({ me: req.session.userId });
  res.json(rows);
});

// Pending requests, split into incoming (need my response) and outgoing (waiting on them).
router.get('/requests', (req, res) => {
  const incoming = db.prepare(`
    SELECT f.*, u.username as requester_username FROM friendships f
    JOIN users u ON u.id = f.requester_id
    WHERE f.addressee_id = ? AND f.status = 'pending' ORDER BY f.created_at DESC
  `).all(req.session.userId);
  const outgoing = db.prepare(`
    SELECT f.*, u.username as addressee_username FROM friendships f
    JOIN users u ON u.id = f.addressee_id
    WHERE f.requester_id = ? AND f.status = 'pending' ORDER BY f.created_at DESC
  `).all(req.session.userId);
  res.json({ incoming, outgoing });
});

router.post('/', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  const target = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
  if (!target) return res.status(404).json({ error: 'no such user' });
  if (target.id === req.session.userId) return res.status(400).json({ error: "You can't friend yourself." });
  const existing = friendshipBetween(req.session.userId, target.id);
  if (existing) return res.status(409).json({ error: `A friend request already exists (${existing.status}).` });
  const info = db.prepare('INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)').run(req.session.userId, target.id);
  logAudit({ userId: req.session.userId, action: 'create', entityType: 'friendship', entityId: info.lastInsertRowid, details: `requested ${target.username}` });
  res.status(201).json(db.prepare('SELECT * FROM friendships WHERE id = ?').get(info.lastInsertRowid));
});

router.post('/:id/accept', (req, res) => {
  const f = db.prepare(`SELECT * FROM friendships WHERE id = ? AND addressee_id = ? AND status = 'pending'`).get(req.params.id, req.session.userId);
  if (!f) return res.status(404).json({ error: 'not found' });
  db.prepare(`UPDATE friendships SET status = 'accepted', responded_at = datetime('now') WHERE id = ?`).run(f.id);
  res.json(db.prepare('SELECT * FROM friendships WHERE id = ?').get(f.id));
});

router.post('/:id/decline', (req, res) => {
  const f = db.prepare(`SELECT * FROM friendships WHERE id = ? AND addressee_id = ? AND status = 'pending'`).get(req.params.id, req.session.userId);
  if (!f) return res.status(404).json({ error: 'not found' });
  db.prepare(`UPDATE friendships SET status = 'declined', responded_at = datetime('now') WHERE id = ?`).run(f.id);
  res.json(db.prepare('SELECT * FROM friendships WHERE id = ?').get(f.id));
});

// Cancel a pending outgoing request, or remove an existing friendship - either party can do it.
router.delete('/:id', (req, res) => {
  const f = db.prepare(`
    SELECT * FROM friendships WHERE id = ? AND (requester_id = ? OR addressee_id = ?)
  `).get(req.params.id, req.session.userId, req.session.userId);
  if (!f) return res.status(404).json({ error: 'not found' });
  db.prepare('DELETE FROM friendships WHERE id = ?').run(f.id);
  res.status(204).end();
});

// A friend's collection, read-only, same safe field set as public share links.
router.get('/:userId/collection', (req, res) => {
  const friendId = Number(req.params.userId);
  if (!areFriends(req.session.userId, friendId)) return res.status(403).json({ error: 'not friends' });
  const friend = db.prepare('SELECT id, username FROM users WHERE id = ?').get(friendId);
  if (!friend) return res.status(404).json({ error: 'not found' });
  const SAFE_FIELDS = `id, category, sport_or_game, player_or_character, team_or_set, set_name, year,
    manufacturer, card_number, parallel_variant, rarity, is_graded, grading_company, grade,
    raw_condition, current_value, status, for_trade`;
  const cards = db.prepare(`SELECT ${SAFE_FIELDS} FROM cards WHERE user_id = ? AND status != 'sold' ORDER BY player_or_character`).all(friendId);
  const images = db.prepare(`
    SELECT card_id, filename FROM card_images WHERE side = 'front' AND card_id IN (${cards.map(() => '?').join(',') || 'NULL'})
  `).all(...cards.map((c) => c.id));
  const imageByCard = new Map(images.map((i) => [i.card_id, i.filename]));
  res.json({
    friend,
    cards: cards.map((c) => ({ ...c, image: imageByCard.has(c.id) ? `/images/${imageByCard.get(c.id)}` : null })),
  });
});

module.exports = router;
