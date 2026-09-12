const { db, getSetting, setSetting } = require('../db');
const { ebaySearchActiveListings } = require('./cardLookup');

// Generic webhook - a plain JSON POST with a "content" field works as-is for Discord and
// Slack incoming webhooks, and most generic receivers (ntfy.sh, Home Assistant, n8n, etc.)
// can read either "content" or "text". No SMTP/email setup required.
async function sendWebhook(text) {
  const url = getSetting('notify_webhook_url');
  if (!url) return false;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text, text }),
  });
  return res.ok;
}

async function buildDigestLines() {
  const lines = [];

  if (getSetting('notify_watches_enabled', true)) {
    const clientId = getSetting('ebay_client_id');
    const clientSecret = getSetting('ebay_client_secret');
    if (clientId && clientSecret) {
      const watches = db.prepare('SELECT * FROM ebay_watches').all();
      for (const w of watches) {
        try {
          const { items } = await ebaySearchActiveListings(w.query, clientId, clientSecret);
          const matches = w.target_price ? items.filter((i) => i.price != null && i.price <= w.target_price) : items;
          db.prepare(`UPDATE ebay_watches SET last_checked_at = datetime('now'), last_result_count = ? WHERE id = ?`)
            .run(matches.length, w.id);
          if (matches.length > 0) {
            lines.push(`eBay watch "${w.query}": ${matches.length} listing(s) at/under $${w.target_price ?? '(any price)'}`);
          }
        } catch {
          // One watch failing (bad query, rate limit) shouldn't block the rest of the digest.
        }
      }
    }
  }

  if (getSetting('notify_grading_enabled', true)) {
    const today = new Date().toISOString().slice(0, 10);
    const overdue = db.prepare(`
      SELECT g.*, c.player_or_character, c.set_name FROM grading_submissions g
      JOIN cards c ON c.id = g.card_id
      WHERE g.status IN ('submitted', 'in_progress') AND g.expected_return_date IS NOT NULL AND g.expected_return_date <= ?
    `).all(today);
    for (const g of overdue) {
      lines.push(`Grading: ${g.player_or_character || g.set_name} (${g.company}) was expected back ${g.expected_return_date}`);
    }
  }

  return lines;
}

async function runDigest() {
  const lines = await buildDigestLines();
  let sent = false;
  if (lines.length > 0) sent = await sendWebhook(`Card-Hub daily digest:\n${lines.map((l) => `- ${l}`).join('\n')}`);
  return { sent, lines };
}

function startScheduler() {
  const checkAndRun = () => {
    if (!getSetting('notify_enabled', false)) return;
    if (!getSetting('notify_webhook_url')) return;
    const targetHour = Number(getSetting('notify_hour', 8));
    const now = new Date();
    if (now.getHours() !== targetHour) return;
    const today = now.toISOString().slice(0, 10);
    if (getSetting('notify_last_run_date') === today) return;
    runDigest()
      .then(() => setSetting('notify_last_run_date', today))
      .catch((e) => console.error('Card-Hub: notification digest failed', e));
  };
  checkAndRun();
  setInterval(checkAndRun, 60 * 60 * 1000);
}

module.exports = { sendWebhook, runDigest, startScheduler };
