const express = require('express');
const { db, getSetting, setSetting } = require('../db');
const { sendWebhook, runDigest } = require('../lib/notifyJob');

const router = express.Router();

// Keys that hold secrets - masked when read back, only ever overwritten (never displayed) once set.
// A webhook URL counts as a secret too - most providers (Discord, Slack) treat the URL itself
// as a bearer credential that can post to your channel.
const SECRET_KEYS = new Set([
  'ebay_client_secret', 'pokewallet_api_key', 'tcgplayer_client_secret', 'notify_webhook_url', 'surya_api_key',
]);

const PUBLIC_KEYS = [
  'site_title', 'default_theme', 'registration_enabled', 'snapshot_enabled', 'snapshot_hour',
  'backup_enabled', 'backup_hour', 'backup_retention',
  'notify_enabled', 'notify_hour', 'notify_webhook_url', 'notify_watches_enabled', 'notify_grading_enabled',
  'price_provider', 'pokewallet_api_key',
  'ebay_client_id', 'ebay_client_secret', 'ebay_redirect_uri', 'ebay_connected',
  'ebay_payment_policy_id', 'ebay_return_policy_id', 'ebay_fulfillment_policy_id',
  'ebay_merchant_location_key', 'ebay_default_category_id',
  'tcgplayer_client_id', 'tcgplayer_client_secret',
  'ocr_provider', 'surya_endpoint_url', 'surya_api_key',
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

router.post('/test-webhook', async (req, res) => {
  if (!getSetting('notify_webhook_url')) return res.status(400).json({ error: 'Set a Webhook URL first.' });
  try {
    const ok = await sendWebhook('Card-Hub: this is a test notification.');
    if (!ok) return res.status(502).json({ error: 'Webhook responded with a non-2xx status.' });
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.post('/send-digest-now', async (req, res) => {
  if (!getSetting('notify_webhook_url')) return res.status(400).json({ error: 'Set a Webhook URL first.' });
  try {
    const result = await runDigest();
    res.json(result);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

module.exports = router;
