const express = require('express');
const { db, logAudit } = require('../db');

const router = express.Router();

function areFriends(a, b) {
  const f = db.prepare(`
    SELECT status FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).get(a, b, b, a);
  return !!f && f.status === 'accepted';
}

function cardsByIds(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  return db.prepare(`SELECT id, player_or_character, set_name, card_number, user_id FROM cards WHERE id IN (${placeholders})`).all(...ids);
}

function hydrate(tr) {
  return {
    ...tr,
    offered_cards: cardsByIds(JSON.parse(tr.offered_card_ids || '[]')),
    requested_cards: cardsByIds(JSON.parse(tr.requested_card_ids || '[]')),
  };
}

router.get('/', (req, res) => {
  const me = req.session.userId;
  const rows = db.prepare(`
    SELECT tr.*, ru.username as requester_username, au.username as recipient_username
    FROM trade_requests tr
    JOIN users ru ON ru.id = tr.requester_id
    JOIN users au ON au.id = tr.recipient_id
    WHERE tr.requester_id = ? OR tr.recipient_id = ?
    ORDER BY tr.created_at DESC
  `).all(me, me);
  res.json(rows.map(hydrate));
});

router.post('/', (req, res) => {
  const me = req.session.userId;
  const { recipientId, offered_card_ids = [], requested_card_ids = [], notes } = req.body;
  const recipient = Number(recipientId);
  if (!recipient) return res.status(400).json({ error: 'recipientId required' });
  if (!areFriends(me, recipient)) return res.status(403).json({ error: 'You can only propose trades with friends.' });
  if (!offered_card_ids.length && !requested_card_ids.length) return res.status(400).json({ error: 'Offer or request at least one card.' });

  const offeredOwned = offered_card_ids.length
    ? db.prepare(`SELECT id FROM cards WHERE id IN (${offered_card_ids.map(() => '?').join(',')}) AND user_id = ?`).all(...offered_card_ids, me)
    : [];
  if (offeredOwned.length !== offered_card_ids.length) return res.status(400).json({ error: 'One or more offered cards are not yours.' });

  const requestedOwned = requested_card_ids.length
    ? db.prepare(`SELECT id FROM cards WHERE id IN (${requested_card_ids.map(() => '?').join(',')}) AND user_id = ?`).all(...requested_card_ids, recipient)
    : [];
  if (requestedOwned.length !== requested_card_ids.length) return res.status(400).json({ error: "One or more requested cards aren't theirs." });

  const info = db.prepare(`
    INSERT INTO trade_requests (requester_id, recipient_id, offered_card_ids, requested_card_ids, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(me, recipient, JSON.stringify(offered_card_ids), JSON.stringify(requested_card_ids), notes || null);

  db.prepare('INSERT INTO messages (sender_id, recipient_id, body, trade_request_id) VALUES (?, ?, ?, ?)')
    .run(me, recipient, notes && notes.trim() ? notes.trim() : 'Proposed a trade.', info.lastInsertRowid);

  logAudit({ userId: me, action: 'create', entityType: 'trade_request', entityId: info.lastInsertRowid });
  res.status(201).json(hydrate(db.prepare('SELECT * FROM trade_requests WHERE id = ?').get(info.lastInsertRowid)));
});

router.post('/:id/accept', (req, res) => {
  const tr = db.prepare(`SELECT * FROM trade_requests WHERE id = ? AND recipient_id = ? AND status = 'pending'`).get(req.params.id, req.session.userId);
  if (!tr) return res.status(404).json({ error: 'not found' });
  db.prepare(`UPDATE trade_requests SET status = 'accepted', responded_at = datetime('now') WHERE id = ?`).run(tr.id);
  res.json(hydrate(db.prepare('SELECT * FROM trade_requests WHERE id = ?').get(tr.id)));
});

router.post('/:id/decline', (req, res) => {
  const tr = db.prepare(`SELECT * FROM trade_requests WHERE id = ? AND recipient_id = ? AND status = 'pending'`).get(req.params.id, req.session.userId);
  if (!tr) return res.status(404).json({ error: 'not found' });
  db.prepare(`UPDATE trade_requests SET status = 'declined', responded_at = datetime('now') WHERE id = ?`).run(tr.id);
  res.json(hydrate(db.prepare('SELECT * FROM trade_requests WHERE id = ?').get(tr.id)));
});

router.post('/:id/cancel', (req, res) => {
  const tr = db.prepare(`
    SELECT * FROM trade_requests WHERE id = ? AND requester_id = ? AND status IN ('pending', 'accepted')
  `).get(req.params.id, req.session.userId);
  if (!tr) return res.status(404).json({ error: 'not found' });
  db.prepare(`UPDATE trade_requests SET status = 'cancelled', responded_at = datetime('now') WHERE id = ?`).run(tr.id);
  res.json(hydrate(db.prepare('SELECT * FROM trade_requests WHERE id = ?').get(tr.id)));
});

// Both parties agreed in real life (cards mailed, handed over, etc.) - this is the step
// that actually reassigns ownership of the agreed cards between the two collections.
router.post('/:id/complete', (req, res) => {
  const me = req.session.userId;
  const tr = db.prepare(`
    SELECT * FROM trade_requests WHERE id = ? AND (requester_id = ? OR recipient_id = ?) AND status = 'accepted'
  `).get(req.params.id, me, me);
  if (!tr) return res.status(404).json({ error: 'not found, or not yet accepted' });

  const offeredIds = JSON.parse(tr.offered_card_ids || '[]');
  const requestedIds = JSON.parse(tr.requested_card_ids || '[]');

  const tx = db.transaction(() => {
    if (offeredIds.length) {
      db.prepare(`UPDATE cards SET user_id = ?, updated_at = datetime('now') WHERE id IN (${offeredIds.map(() => '?').join(',')}) AND user_id = ?`)
        .run(tr.recipient_id, ...offeredIds, tr.requester_id);
    }
    if (requestedIds.length) {
      db.prepare(`UPDATE cards SET user_id = ?, updated_at = datetime('now') WHERE id IN (${requestedIds.map(() => '?').join(',')}) AND user_id = ?`)
        .run(tr.requester_id, ...requestedIds, tr.recipient_id);
    }
    db.prepare(`UPDATE trade_requests SET status = 'completed', completed_at = datetime('now') WHERE id = ?`).run(tr.id);
  });
  tx();

  logAudit({ userId: me, action: 'update', entityType: 'trade_request', entityId: tr.id, details: 'completed - cards transferred' });
  res.json(hydrate(db.prepare('SELECT * FROM trade_requests WHERE id = ?').get(tr.id)));
});

module.exports = router;
