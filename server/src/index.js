const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { IMAGES_DIR } = require('./db');
const { requireAuth } = require('./middleware/auth');
const { startScheduler } = require('./lib/snapshotJob');

const app = express();
const PORT = process.env.PORT || 8080;
const SESSION_SECRET = process.env.SESSION_SECRET || 'card-hub-dev-secret-change-me';

app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 },
}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/oauth', require('./routes/oauth'));
app.use('/api/public', require('./routes/public'));

app.use('/api/cards', requireAuth, require('./routes/cards'));
app.use('/api/sales', requireAuth, require('./routes/sales'));
app.use('/api/listings', requireAuth, require('./routes/listings'));
app.use('/api/sets', requireAuth, require('./routes/sets'));
app.use('/api/dashboard', requireAuth, require('./routes/dashboard'));
app.use('/api/export', requireAuth, require('./routes/export'));
app.use('/api/import', requireAuth, require('./routes/import'));
app.use('/api/settings', requireAuth, require('./routes/settings'));
app.use('/api/lookup', requireAuth, require('./routes/lookup'));
app.use('/api/grading', requireAuth, require('./routes/grading'));
app.use('/api/decks', requireAuth, require('./routes/decks'));
app.use('/api/trades', requireAuth, require('./routes/trades'));
app.use('/api/share', requireAuth, require('./routes/share'));

// Not auth-gated: this is what a public share link resolves to (opted into by an admin/member
// generating the link), and share pages need to display the referenced card images.
app.use('/images', express.static(IMAGES_DIR));

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/images')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Card-Hub server listening on port ${PORT}`);
  startScheduler();
});
