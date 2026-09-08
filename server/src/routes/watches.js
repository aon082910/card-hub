const express = require('express');
const { db, getSetting } = require('../db');
const { ebaySearchActiveListings } = require('../lib/cardLookup');

const router = express.Router();

// eBay "deal watch": save a search + target price, then check current active listings
// against it on demand. Approximates Slabfy's eBay-monitoring-for-underpriced-cards
// feature using the same Browse API integration as the eBay price provider - active
// listings only, not sold comps (see priceProviders.js for why).

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM ebay_watches ORDER BY created_at DESC').all());
});

router.post('/', (req, res) => {
  const { query, target_price, notes } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });
  const info = db.prepare('INSERT INTO ebay_watches (query, target_price, notes) VALUES (?, ?, ?)').run(query, target_price || null, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM ebay_watches WHERE id = ?').get(info.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM ebay_watches WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

router.post('/:id/check', async (req, res) => {
  const watch = db.prepare('SELECT * FROM ebay_watches WHERE id = ?').get(req.params.id);
  if (!watch) return res.status(404).json({ error: 'not found' });
  const clientId = getSetting('ebay_client_id');
  const clientSecret = getSetting('ebay_client_secret');
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'eBay Client ID/Secret required in Settings -> API Keys to check watches.' });
  }
  try {
    const { items } = await ebaySearchActiveListings(watch.query, clientId, clientSecret);
    const matches = watch.target_price
      ? items.filter((i) => i.price != null && i.price <= watch.target_price)
      : items;
    db.prepare(`UPDATE ebay_watches SET last_checked_at = datetime('now'), last_result_count = ? WHERE id = ?`)
      .run(matches.length, req.params.id);
    res.json({ matches, watch: db.prepare('SELECT * FROM ebay_watches WHERE id = ?').get(req.params.id) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

module.exports = router;
