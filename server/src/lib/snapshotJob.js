const { db, getSetting } = require('../db');

function takeSnapshot() {
  const totals = db.prepare(`
    SELECT COUNT(*) as card_count, COALESCE(SUM(cost_basis), 0) as total_cost, COALESCE(SUM(current_value * quantity), 0) as total_value
    FROM cards WHERE status != 'sold'
  `).get();
  db.prepare('INSERT INTO portfolio_snapshots (total_value, total_cost, card_count) VALUES (?, ?, ?)')
    .run(totals.total_value, totals.total_cost, totals.card_count);
  return totals;
}

// Simple daily scheduler (no external cron dependency): checks once an hour whether
// today's snapshot has already been taken, and if not, and we've passed the configured
// hour, takes one. Good enough for a single long-running container.
function startScheduler() {
  const checkAndRun = () => {
    const enabled = getSetting('snapshot_enabled', true);
    if (!enabled) return;
    const targetHour = Number(getSetting('snapshot_hour', 3));
    const now = new Date();
    if (now.getHours() !== targetHour) return;
    const today = now.toISOString().slice(0, 10);
    const last = db.prepare("SELECT taken_at FROM portfolio_snapshots ORDER BY id DESC LIMIT 1").get();
    if (last && last.taken_at.slice(0, 10) === today) return;
    takeSnapshot();
    console.log('Card-Hub: took daily portfolio snapshot');
  };
  checkAndRun();
  setInterval(checkAndRun, 60 * 60 * 1000);
}

module.exports = { takeSnapshot, startScheduler };
