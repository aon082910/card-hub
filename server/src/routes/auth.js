const express = require('express');
const bcrypt = require('bcryptjs');
const { db, logAudit } = require('../db');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  req.session.userId = user.id;
  logAudit({ userId: user.id, username: user.username, action: 'login', entityType: 'user', entityId: user.id });
  res.json({ id: user.id, username: user.username, role: user.role, must_change_password: !!user.must_change_password });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.status(204).end());
});

router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'not logged in' });
  const user = db.prepare('SELECT id, username, role, must_change_password FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'not logged in' });
  res.json(user);
});

router.post('/change-password', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'not logged in' });
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'new password too short' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(401).json({ error: 'current password incorrect' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, user.id);
  res.status(204).end();
});

// User management (admin only)
router.get('/users', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT id, username, role, must_change_password, created_at FROM users ORDER BY id').all());
});

router.post('/users', requireAdmin, (req, res) => {
  const { username, password, role = 'member' } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare('INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?, ?, ?, 1)')
      .run(username, hash, role);
    logAudit({ userId: req.session.userId, action: 'create', entityType: 'user', entityId: info.lastInsertRowid, details: username });
    res.status(201).json({ id: info.lastInsertRowid, username, role });
  } catch (e) {
    res.status(400).json({ error: 'username already exists' });
  }
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  if (Number(req.params.id) === req.session.userId) return res.status(400).json({ error: 'cannot delete your own account' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logAudit({ userId: req.session.userId, action: 'delete', entityType: 'user', entityId: req.params.id });
  res.status(204).end();
});

function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'not logged in' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  next();
}

module.exports = router;
