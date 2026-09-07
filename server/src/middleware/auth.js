function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'not logged in' });
  next();
}

module.exports = { requireAuth };
