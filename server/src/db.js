const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'cardhub.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// CREATE TABLE IF NOT EXISTS won't add new columns to a `cards` table that already
// existed before these fields were introduced - patch them in for upgrades.
const NEW_CARD_COLUMNS = {
  raw_value: 'REAL',
  graded_value_estimate: 'REAL',
  last_sold_value: 'REAL',
  is_consigned: 'INTEGER NOT NULL DEFAULT 0',
  consignor_name: 'TEXT',
  consignment_payout_pct: 'REAL',
};
const existingCardCols = new Set(db.prepare('PRAGMA table_info(cards)').all().map((c) => c.name));
for (const [col, type] of Object.entries(NEW_CARD_COLUMNS)) {
  if (!existingCardCols.has(col)) db.exec(`ALTER TABLE cards ADD COLUMN ${col} ${type}`);
}

// Seed a default admin account on first run so the app is usable out of the box.
const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
if (userCount === 0) {
  const hash = bcrypt.hashSync('admin', 10);
  db.prepare('INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)')
    .run('admin', hash, 'admin');
  console.log('Card-Hub: created default admin account (username: admin, password: admin) - please change the password after logging in.');
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
