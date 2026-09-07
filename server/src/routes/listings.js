const express = require('express');
const { db } = require('../db');
const { pushListing, checkListingStatus } = require('../lib/ebaySync');

const router = express.Router();

// Marketplace listings module. Draft/active listing records for any platform, plus
// live push/sync to eBay via the Sell Inventory API (see lib/ebaySync.js) - untested
// against a live eBay seller account, verify with a real test listing before relying on it.
// Other platforms (WhatNot, COMC, Facebook...) remain tracking-only; there's no public
// listing-creation API for most of them.

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

// Pushes an existing eBay-platform listing record live via the Sell Inventory API.
router.post('/:id/push-ebay', async (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'not found' });
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(listing.card_id);
  if (!card) return res.status(404).json({ error: 'card not found' });
  if (!listing.list_price) return res.status(400).json({ error: 'listing needs a list_price set first' });

  try {
    const images = db.prepare("SELECT filename FROM card_images WHERE card_id = ? ORDER BY (side = 'front') DESC").all(card.id);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrls = images.map((i) => `${baseUrl}/images/${i.filename}`);
    const result = await pushListing(card, listing.list_price, imageUrls);
    db.prepare(`
      UPDATE listings SET status = 'active', external_id = ?, external_url = ?, ebay_offer_id = ?, ebay_sku = ?, listed_at = date('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(result.listingId, result.url, result.offerId, result.sku, req.params.id);
    res.json(db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// Refreshes a live eBay listing's status (checks for a sale via the Fulfillment API).
router.post('/:id/sync-ebay', async (req, res) => {
  const listing = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
  if (!listing) return res.status(404).json({ error: 'not found' });
  if (!listing.ebay_offer_id) return res.status(400).json({ error: 'this listing was not pushed to eBay yet' });

  try {
    const { status, sold } = await checkListingStatus(listing.ebay_offer_id, listing.ebay_sku);
    const newStatus = sold ? 'sold' : (status === 'PUBLISHED' ? 'active' : 'ended');
    db.prepare(`UPDATE listings SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, req.params.id);
    res.json(db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

module.exports = router;
