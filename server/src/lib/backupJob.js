const fs = require('fs');
const path = require('path');
const { db, DATA_DIR, getSetting } = require('../db');

const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

function listBackups() {
  return fs.readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.db'))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, f));
      return { filename: f, size: stat.size, created_at: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function pruneOldBackups() {
  const retention = Number(getSetting('backup_retention', 14)) || 14;
  const backups = listBackups();
  for (const b of backups.slice(retention)) {
    fs.unlinkSync(path.join(BACKUPS_DIR, b.filename));
  }
}

// Uses better-sqlite3's online backup API (safe to run against a live, open database -
// unlike copying the .db file directly, which can race the WAL).
async function takeBackup() {
  const filename = `cardhub-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
  const dest = path.join(BACKUPS_DIR, filename);
  await db.backup(dest);
  pruneOldBackups();
  return { filename, size: fs.statSync(dest).size };
}

function startScheduler() {
  const checkAndRun = () => {
    const enabled = getSetting('backup_enabled', true);
    if (!enabled) return;
    const targetHour = Number(getSetting('backup_hour', 4));
    const now = new Date();
    if (now.getHours() !== targetHour) return;
    const today = now.toISOString().slice(0, 10);
    const last = listBackups()[0];
    if (last && last.created_at.slice(0, 10) === today) return;
    takeBackup()
      .then(() => console.log('Card-Hub: took daily database backup'))
      .catch((e) => console.error('Card-Hub: daily backup failed', e));
  };
  checkAndRun();
  setInterval(checkAndRun, 60 * 60 * 1000);
}

module.exports = { BACKUPS_DIR, listBackups, takeBackup, pruneOldBackups, startScheduler };
