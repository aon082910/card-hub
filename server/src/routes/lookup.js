const express = require('express');
const { getSetting } = require('../db');
const { searchPokemon, getPokemonCard, searchYugioh, pokewalletLookup, searchMagic } = require('../lib/cardLookup');

const router = express.Router();

function wrapLookup(searchFn) {
  return async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'q required' });
    try {
      const results = await searchFn(q);
      const truncated = results.length > 31;
      res.json({ results: results.slice(0, 31), truncated });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  };
}

router.get('/pokemon', wrapLookup(searchPokemon));

router.get('/pokemon/:id', async (req, res) => {
  try {
    res.json(await getPokemonCard(req.params.id));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/yugioh', wrapLookup(searchYugioh));

router.get('/pokewallet', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    res.json(await pokewalletLookup(q, getSetting('pokewallet_api_key')));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/magic', wrapLookup(searchMagic));

module.exports = router;
