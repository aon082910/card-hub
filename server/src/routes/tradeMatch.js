const express = require('express');
const { db } = require('../db');

const router = express.Router();

function normalize(s) {
  return String(s || '').trim().toLowerCase();
}
function cardKey(c) {
  return [normalize(c.set_name), normalize(c.card_number), normalize(c.player_or_character)].join('|');
}

// Compares another Card-Hub instance's public share link (their For Trade list, Want
// List, whole collection, or a selection) against this instance's own Want List / For
// Trade list. Direction is inferred from what kind of link they shared: if they shared
// a want list, we show what you could offer them; otherwise we show what of theirs
// matches what you're looking for.
router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).json({ error: 'That is not a valid URL.' });
  }
  const match = target.pathname.match(/\/share\/([^/]+)/);
  if (!match) return res.status(400).json({ error: 'That does not look like a Card-Hub share link (expected .../share/<token>).' });

  const apiUrl = `${target.origin}/api/public/share/${match[1]}`;
  let theirData;
  try {
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) throw new Error(`fetch failed (${resp.status})`);
    theirData = await resp.json();
  } catch (e) {
    return res.status(502).json({ error: `Could not fetch that share link: ${e.message}` });
  }

  const theirCards = Array.isArray(theirData.cards) ? theirData.cards : [];
  const theirByKey = new Map();
  for (const c of theirCards) {
    const k = cardKey(c);
    if (k !== '||' && !theirByKey.has(k)) theirByKey.set(k, c);
  }

  let ourCards;
  let direction;
  if (theirData.kind === 'wanted') {
    ourCards = db.prepare(`SELECT * FROM cards WHERE for_trade = 1 AND status != 'sold'`).all();
    direction = 'you_have_what_they_want';
  } else {
    ourCards = db.prepare(`SELECT * FROM cards WHERE status = 'wanted'`).all();
    direction = 'they_have_what_you_want';
  }

  const matches = ourCards
    .filter((c) => theirByKey.has(cardKey(c)))
    .map((c) => ({ card: c, theirs: theirByKey.get(cardKey(c)) }));

  res.json({ theirLabel: theirData.label, theirKind: theirData.kind, direction, matches });
});

module.exports = router;
