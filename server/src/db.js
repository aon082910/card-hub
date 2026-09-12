const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'cardhub.db');

// A restore staged via Settings -> Automated Backups writes the chosen backup here rather
// than swapping the live file while it's open (unsafe with an active WAL). Swap it in now,
// before anything opens the database - this only takes effect after a container restart.
const pendingRestorePath = path.join(DATA_DIR, 'restore-pending.db');
if (fs.existsSync(pendingRestorePath)) {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  fs.renameSync(pendingRestorePath, dbPath);
  console.log('Card-Hub: restored database from a staged backup');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// CREATE TABLE IF NOT EXISTS won't add new columns to a table that already existed
// before these fields were introduced - patch them in for upgrades.
function addColumnsIfMissing(table, columns) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const [col, type] of Object.entries(columns)) {
    if (!existing.has(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
  }
}

addColumnsIfMissing('cards', {
  raw_value: 'REAL',
  graded_value_estimate: 'REAL',
  last_sold_value: 'REAL',
  is_consigned: 'INTEGER NOT NULL DEFAULT 0',
  consignor_name: 'TEXT',
  consignment_payout_pct: 'REAL',
  for_trade: 'INTEGER NOT NULL DEFAULT 0',
});

addColumnsIfMissing('listings', {
  ebay_offer_id: 'TEXT',
  ebay_sku: 'TEXT',
});

addColumnsIfMissing('cards', { user_id: 'INTEGER REFERENCES users(id) ON DELETE CASCADE' });
addColumnsIfMissing('card_sets', { user_id: 'INTEGER REFERENCES users(id) ON DELETE CASCADE' });
addColumnsIfMissing('decks', { user_id: 'INTEGER REFERENCES users(id) ON DELETE CASCADE' });
addColumnsIfMissing('ebay_watches', { user_id: 'INTEGER REFERENCES users(id) ON DELETE CASCADE' });
addColumnsIfMissing('portfolio_snapshots', { user_id: 'INTEGER REFERENCES users(id) ON DELETE CASCADE' });

// Seed a default admin account on first run so the app is usable out of the box.
const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare('INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)')
    .run('admin', hash, 'admin');
  console.log('Card-Hub: created default admin account (username: admin, password: admin) - please change the password after logging in.');
}

// Card-Hub used to be a single shared collection per install. Now every card/deck/set/
// watch/snapshot belongs to an account - anything left over from before this change
// (user_id IS NULL) is assigned to the original admin account so nothing is orphaned.
const firstAdmin = db.prepare(`SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`).get();
if (firstAdmin) {
  for (const table of ['cards', 'card_sets', 'decks', 'ebay_watches', 'portfolio_snapshots']) {
    const { n } = db.prepare(`SELECT COUNT(*) as n FROM ${table} WHERE user_id IS NULL`).get();
    if (n > 0) {
      db.prepare(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL`).run(firstAdmin.id);
      console.log(`Card-Hub: assigned ${n} pre-existing ${table} row(s) to the admin account (#${firstAdmin.id})`);
    }
  }
}

function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

function setSetting(key, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, serialized);
}

function logAudit({ userId, username, action, entityType, entityId, details }) {
  db.prepare(`
    INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId || null, username || null, action, entityType, entityId || null, details || null);
}

module.exports = { db, DATA_DIR, IMAGES_DIR, getSetting, setSetting, logAudit };
