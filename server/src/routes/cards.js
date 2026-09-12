const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, IMAGES_DIR, logAudit } = require('../db');
const { lookupPrice } = require('../lib/priceProviders');

const router = express.Router();

function actor(req) {
  const user = req.session && req.session.userId ? db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) : null;
  return { userId: user ? user.id : null, username: user ? user.username : null };
}

// Every card belongs to exactly one account - fetch-and-check-owner is used everywhere
// below instead of a plain SELECT, so one user's card ids never resolve against another's.
function ownedCard(id, userId) {
  return db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(id, userId);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGES_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const CARD_FIELDS = [
  'category', 'sport_or_game', 'player_or_character', 'team_or_set', 'set_name',
  'year', 'manufacturer', 'card_number', 'parallel_variant', 'rarity',
  'is_graded', 'grading_company', 'grade', 'cert_number', 'raw_condition',
  'serial_number', 'print_run', 'quantity', 'storage_location', 'tags', 'notes',
  'cost_basis', 'purchase_date', 'purchase_source', 'current_value', 'status',
  'raw_value', 'graded_value_estimate', 'last_sold_value',
  'is_consigned', 'consignor_name', 'consignment_payout_pct', 'for_trade',
];

function pickCardFields(body) {
  const out = {};
  for (const f of CARD_FIELDS) if (f in body) out[f] = body[f];
  return out;
}

// List cards with search/filter
router.get('/', (req, res) => {
  const { q, category, status, sort = 'updated_at', dir = 'desc', limit = 500, offset = 0 } = req.query;
  const where = ['user_id = @userId'];
  const params = { userId: req.session.userId };
  if (q) {
    where.push(`(player_or_character LIKE @q OR team_or_set LIKE @q OR set_name LIKE @q OR sport_or_game LIKE @q OR notes LIKE @q OR tags LIKE @q)`);
    params.q = `%${q}%`;
  }
  if (category) { where.push('category = @category'); params.category = category; }
  if (status) { where.push('status = @status'); params.status = status; }
  const allowedSort = new Set(['updated_at', 'created_at', 'current_value', 'cost_basis', 'year', 'player_or_character']);
  const sortCol = allowedSort.has(sort) ? sort : 'updated_at';
  const sortDir = dir === 'asc' ? 'ASC' : 'DESC';
  const sql = `SELECT * FROM cards WHERE ${where.join(' AND ')} ORDER BY ${sortCol} ${sortDir} LIMIT @limit OFFSET @offset`;
  params.limit = Number(limit);
  params.offset = Number(offset);
  const rows = db.prepare(sql).all(params);
  const countSql = `SELECT COUNT(*) as total FROM cards WHERE ${where.join(' AND ')}`;
  const { total } = db.prepare(countSql).get(params);
  res.json({ rows, total });
});

// Registered before '/:id' so it doesn't get swallowed as an id param. Used by Add Card
// to warn before creating what looks like a second entry for a card already owned.
router.get('/check-duplicate', (req, res) => {
  const { set_name, card_number, year, player_or_character } = req.query;
  if (!set_name && !player_or_character) return res.json([]);
  const where = [`status != 'sold'`, 'user_id = @userId'];
  const params = { userId: req.session.userId };
  if (set_name) { where.push('set_name = @set_name'); params.set_name = set_name; }
  if (card_number) { where.push('card_number = @card_number'); params.card_number = card_number; }
  if (year) { where.push('year = @year'); params.year = year; }
  if (player_or_character) { where.push('player_or_character = @player_or_character'); params.player_or_character = player_or_character; }
  // Require at least a set or a number as an anchor - name alone matches too loosely.
  if (!set_name && !card_number) return res.json([]);
  const rows = db.prepare(`
    SELECT id, player_or_character, set_name, card_number, year, quantity, status FROM cards
    WHERE ${where.join(' AND ')} LIMIT 10
  `).all(params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const card = ownedCard(req.params.id, req.session.userId);
  if (!card) return res.status(404).json({ error: 'not found' });
  const images = db.prepare('SELECT * FROM card_images WHERE card_id = ? ORDER BY id').all(req.params.id);
  const values = db.prepare('SELECT * FROM value_history WHERE card_id = ? ORDER BY recorded_at').all(req.params.id);
  const sales = db.prepare('SELECT * FROM sales WHERE card_id = ? ORDER BY sale_date').all(req.params.id);
  const listings = db.prepare('SELECT * FROM listings WHERE card_id = ? ORDER BY created_at').all(req.params.id);
  res.json({ ...card, images, values, sales, listings });
});

router.get('/:id/similar', (req, res) => {
  const card = ownedCard(req.params.id, req.session.userId);
  if (!card) return res.status(404).json({ error: 'not found' });
  const rows = db.prepare(`
    SELECT * FROM cards
    WHERE id != @id AND user_id = @userId AND (
      (player_or_character IS NOT NULL AND player_or_character = @player) OR
      (set_name IS NOT NULL AND set_name = @set_name AND year = @year AND manufacturer = @manufacturer)
    )
    ORDER BY updated_at DESC LIMIT 20
  `).all({ id: card.id, userId: req.session.userId, player: card.player_or_character, set_name: card.set_name, year: card.year, manufacturer: card.manufacturer });
  res.json(rows);
});

router.post('/', (req, res) => {
  const data = pickCardFields(req.body);
  data.user_id = req.session.userId;
  const cols = Object.keys(data);
  if (cols.length === 0) return res.status(400).json({ error: 'no fields' });
  const sql = `INSERT INTO cards (${cols.join(',')}) VALUES (${cols.map(c => '@' + c).join(',')})`;
  const info = db.prepare(sql).run(data);
  if (data.current_value !== undefined && data.current_value !== null && data.current_value !== '') {
    db.prepare('INSERT INTO value_history (card_id, value, source) VALUES (?, ?, ?)')
      .run(info.lastInsertRowid, data.current_value, 'manual');
  }
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(info.lastInsertRowid);
  logAudit({ ...actor(req), action: 'create', entityType: 'card', entityId: card.id, details: card.player_or_character || card.set_name });
  res.status(201).json(card);
});

// Bulk operations - must be registered before the '/:id' routes below.
router.post('/bulk', (req, res) => {
  const { ids, action, value } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
  // Only ever act on ids the caller actually owns, regardless of what was sent.
  const placeholders = ids.map(() => '?').join(',');
  const owned = db.prepare(`SELECT id FROM cards WHERE id IN (${placeholders}) AND user_id = ?`).all(...ids, req.session.userId);
  const ownedIds = owned.map((r) => r.id);
  if (ownedIds.length === 0) return res.json({ affected: 0 });
  const ownedPlaceholders = ownedIds.map(() => '?').join(',');

  if (action === 'delete') {
    const images = db.prepare(`SELECT * FROM card_images WHERE card_id IN (${ownedPlaceholders})`).all(...ownedIds);
    for (const img of images) {
      const p = path.join(IMAGES_DIR, img.filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    db.prepare(`DELETE FROM cards WHERE id IN (${ownedPlaceholders})`).run(...ownedIds);
    logAudit({ ...actor(req), action: 'delete', entityType: 'card', details: `bulk delete: ${ownedIds.join(',')}` });
    return res.json({ affected: ownedIds.length });
  }

  if (action === 'set_status') {
    if (!value) return res.status(400).json({ error: 'value required for set_status' });
    db.prepare(`UPDATE cards SET status = ?, updated_at = datetime('now') WHERE id IN (${ownedPlaceholders})`).run(value, ...ownedIds);
    logAudit({ ...actor(req), action: 'update', entityType: 'card', details: `bulk status=${value}: ${ownedIds.join(',')}` });
    return res.json({ affected: ownedIds.length });
  }

  if (action === 'add_tag') {
    if (!value) return res.status(400).json({ error: 'value required for add_tag' });
    const rows = db.prepare(`SELECT id, tags FROM cards WHERE id IN (${ownedPlaceholders})`).all(...ownedIds);
    const upd = db.prepare(`UPDATE cards SET tags = ?, updated_at = datetime('now') WHERE id = ?`);
    const tx = db.transaction((rows) => {
      for (const r of rows) {
        const existing = (r.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
        if (!existing.includes(value)) existing.push(value);
        upd.run(existing.join(', '), r.id);
      }
    });
    tx(rows);
    logAudit({ ...actor(req), action: 'update', entityType: 'card', details: `bulk add_tag=${value}: ${ownedIds.join(',')}` });
    return res.json({ affected: rows.length });
  }

  res.status(400).json({ error: 'unknown action' });
});

router.post('/:id/clone', (req, res) => {
  const existing = ownedCard(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const data = pickCardFields(existing);
  data.user_id = req.session.userId;
  const cols = Object.keys(data);
  const sql = `INSERT INTO cards (${cols.join(',')}) VALUES (${cols.map(c => '@' + c).join(',')})`;
  const info = db.prepare(sql).run(data);
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(info.lastInsertRowid);
  logAudit({ ...actor(req), action: 'create', entityType: 'card', entityId: card.id, details: `cloned from #${existing.id}` });
  res.status(201).json(card);
});

router.put('/:id', (req, res) => {
  const data = pickCardFields(req.body);
  const cols = Object.keys(data);
  if (cols.length === 0) return res.status(400).json({ error: 'no fields' });
  const existing = ownedCard(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const sql = `UPDATE cards SET ${cols.map(c => `${c} = @${c}`).join(',')}, updated_at = datetime('now') WHERE id = @id`;
  db.prepare(sql).run({ ...data, id: req.params.id });
  if (
    data.current_value !== undefined && data.current_value !== null && data.current_value !== '' &&
    Number(data.current_value) !== Number(existing.current_value)
  ) {
    db.prepare('INSERT INTO value_history (card_id, value, source) VALUES (?, ?, ?)')
      .run(req.params.id, data.current_value, 'manual');
  }
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  logAudit({ ...actor(req), action: 'update', entityType: 'card', entityId: card.id, details: card.player_or_character || card.set_name });
  res.json(card);
});

router.delete('/:id', (req, res) => {
  const existing = ownedCard(req.params.id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const images = db.prepare('SELECT * FROM card_images WHERE card_id = ?').all(req.params.id);
  for (const img of images) {
    const p = path.join(IMAGES_DIR, img.filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
  logAudit({ ...actor(req), action: 'delete', entityType: 'card', entityId: Number(req.params.id) });
  res.status(204).end();
});

// Image upload (from USB webcam capture or phone camera - both send a JPEG blob from the browser)
router.post('/:id/images', upload.single('image'), (req, res) => {
  const card = ownedCard(req.params.id, req.session.userId);
  if (!card) return res.status(404).json({ error: 'not found' });
  if (!req.file) return res.status(400).json({ error: 'no image' });
  const side = req.body.side === 'back' ? 'back' : (req.body.side === 'other' ? 'other' : 'front');
  const info = db.prepare('INSERT INTO card_images (card_id, filename, side) VALUES (?, ?, ?)')
    .run(req.params.id, req.file.filename, side);
  const image = db.prepare('SELECT * FROM card_images WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(image);
});

// Pulls an image from an external URL (e.g. a card lookup result) server-side and
// attaches it like an upload - avoids CORS issues fetching third-party images from the browser.
router.post('/:id/import-image', async (req, res) => {
  const card = ownedCard(req.params.id, req.session.userId);
  if (!card) return res.status(404).json({ error: 'not found' });
  const { url, side = 'front' } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`fetch failed (${resp.status})`);
    const contentType = resp.headers.get('content-type') || '';
    const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const buffer = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);
    const info = db.prepare('INSERT INTO card_images (card_id, filename, side) VALUES (?, ?, ?)')
      .run(card.id, filename, side === 'back' ? 'back' : side === 'other' ? 'other' : 'front');
    res.status(201).json(db.prepare('SELECT * FROM card_images WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/:id/refresh-value', async (req, res) => {
  const card = ownedCard(req.params.id, req.session.userId);
  if (!card) return res.status(404).json({ error: 'not found' });
  try {
    const value = await lookupPrice(card);
    db.prepare(`UPDATE cards SET current_value = ?, updated_at = datetime('now') WHERE id = ?`).run(value, card.id);
    db.prepare('INSERT INTO value_history (card_id, value, source) VALUES (?, ?, ?)').run(card.id, value, 'auto');
    res.json({ value });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id/images/:imageId', (req, res) => {
  const card = ownedCard(req.params.id, req.session.userId);
  if (!card) return res.status(404).json({ error: 'not found' });
  const img = db.prepare('SELECT * FROM card_images WHERE id = ? AND card_id = ?').get(req.params.imageId, req.params.id);
  if (!img) return res.status(404).json({ error: 'not found' });
  const p = path.join(IMAGES_DIR, img.filename);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  db.prepare('DELETE FROM card_images WHERE id = ?').run(req.params.imageId);
  res.status(204).end();
});

module.exports = router;
