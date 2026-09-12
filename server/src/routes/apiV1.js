const express = require('express');
const { db } = require('../db');

const router = express.Router();

// A small read-only API for scripts/dashboards outside the browser, gated by a personal
// bearer token (Settings -> Personal API Token) instead of the session cookie the rest
// of the app uses. No write endpoints here by design - keep the blast radius of a leaked
// token small.
function requireApiToken(req, res, next) {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || req.query.token;
  if (!token) return res.status(401).json({ error: 'API token required (Authorization: Bearer <token>, or ?token=)' });
  const row = db.prepare('SELECT * FROM api_tokens WHERE token = ?').get(token);
  if (!row) return res.status(401).json({ error: 'invalid token' });
  db.prepare(`UPDATE api_tokens SET last_used_at = datetime('now') WHERE id = ?`).run(row.id);
  req.apiUserId = row.user_id;
  next();
}

router.use(requireApiToken);

router.get('/cards', (req, res) => {
  const { q, category, status, limit = 500, offset = 0 } = req.query;
  const where = [];
  const params = {};
  if (q) { where.push(`(player_or_character LIKE @q OR set_name LIKE @q OR team_or_set LIKE @q)`); params.q = `%${q}%`; }
  if (category) { where.push('category = @category'); params.category = category; }
  if (status) { where.push('status = @status'); params.status = status; }
  params.limit = Number(limit);
  params.offset = Number(offset);
  const sql = `SELECT * FROM cards ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY updated_at DESC LIMIT @limit OFFSET @offset`;
  res.json(db.prepare(sql).all(params));
});

router.get('/cards/:id', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'not found' });
  res.json(card);
});

router.get('/dashboard', (req, res) => {
  const totals = db.prepare(`
    SELECT COUNT(*) as card_lines, COALESCE(SUM(quantity), 0) as total_quantity,
      COALESCE(SUM(cost_basis), 0) as total_cost, COALESCE(SUM(current_value * quantity), 0) as total_value
    FROM cards WHERE status != 'sold'
  `).get();
  res.json(totals);
});

module.exports = router;
