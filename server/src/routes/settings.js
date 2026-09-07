const express = require('express');
const { db, getSetting, setSetting } = require('../db');

const router = express.Router();

// Keys that hold secrets - masked when read back, only ever overwritten (never displayed) once set.
const SECRET_KEYS = new Set([
  'ebay_client_secret', 'pokewallet_api_key', 'tcgplayer_client_secret',
]);

const PUBLIC_KEYS = [
  'site_title', 'default_theme', 'snapshot_enabled', 'snapshot_hour',
  'price_provider', 'pokewallet_api_key',
  'ebay_client_id', 'ebay_client_secret', 'ebay_redirect_uri', 'ebay_connected',
  'ebay_payment_policy_id', 'ebay_return_policy_id', 'ebay_fulfillment_policy_id',
  'ebay_merchant_location_key', 'ebay_default_category_id',
  'tcgplayer_client_id', 'tcgplayer_client_secret',
];

router.get('/', (req, res) => {
  const out = {};
  for (const key of PUBLIC_KEYS) {
    const val = getSetting(key);
    out[key] = SECRET_KEYS.has(key) && val ? '••••••••' : val;
  }
  res.json(out);
});

router.put('/', (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    if (!PUBLIC_KEYS.includes(key)) continue;
    if (SECRET_KEYS.has(key) && value === '••••••••') continue; // unchanged masked value
    setSetting(key, value);
  }
  res.status(204).end();
});

router.get('/audit-log', (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300').all();
  res.json(rows);
});

module.exports = router;
