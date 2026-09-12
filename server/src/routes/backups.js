const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { db, DATA_DIR, logAudit } = require('../db');
const { BACKUPS_DIR, listBackups, takeBackup } = require('../lib/backupJob');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

const SQLITE_MAGIC = 'SQLite format 3\0';

function requireAdmin(req, res, next) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  next();
}

router.use(requireAdmin);

router.get('/', (req, res) => {
  res.json(listBackups());
});

router.post('/', async (req, res) => {
  try {
    const result = await takeBackup();
    logAudit({ userId: req.session.userId, action: 'create', entityType: 'backup', details: result.filename });
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function safeBackupPath(filename) {
  // Reject anything that isn't a bare filename inside BACKUPS_DIR (no path traversal).
  if (!/^[\w.-]+\.db$/.test(filename)) return null;
  const resolved = path.join(BACKUPS_DIR, filename);
  if (!resolved.startsWith(BACKUPS_DIR)) return null;
  return fs.existsSync(resolved) ? resolved : null;
}

router.get('/:filename/download', (req, res) => {
  const filePath = safeBackupPath(req.params.filename);
  if (!filePath) return res.status(404).json({ error: 'not found' });
  res.download(filePath, req.params.filename);
});

router.delete('/:filename', (req, res) => {
  const filePath = safeBackupPath(req.params.filename);
  if (!filePath) return res.status(404).json({ error: 'not found' });
  fs.unlinkSync(filePath);
  logAudit({ userId: req.session.userId, action: 'delete', entityType: 'backup', details: req.params.filename });
  res.status(204).end();
});

// Stages a restore for the next server start (see db.js) - doesn't touch the live,
// open database file directly, since swapping it out from under an active connection
// risks corruption. A container restart is required to actually apply it.
function stageRestore(buffer, sourceLabel, req, res) {
  if (buffer.length < 16 || buffer.toString('utf8', 0, 16) !== SQLITE_MAGIC) {
    return res.status(400).json({ error: 'That file does not look like a SQLite database.' });
  }
  fs.writeFileSync(path.join(DATA_DIR, 'restore-pending.db'), buffer);
  logAudit({ userId: req.session.userId, action: 'update', entityType: 'backup', details: `staged restore from ${sourceLabel}` });
  res.json({ staged: true, message: 'Restore staged - restart the Card-Hub container to apply it.' });
}

router.post('/:filename/restore', (req, res) => {
  const filePath = safeBackupPath(req.params.filename);
  if (!filePath) return res.status(404).json({ error: 'not found' });
  stageRestore(fs.readFileSync(filePath), req.params.filename, req, res);
});

router.post('/restore-upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  stageRestore(req.file.buffer, req.file.originalname, req, res);
});

module.exports = router;
