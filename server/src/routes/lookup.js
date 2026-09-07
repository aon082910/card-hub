const express = require('express');
const { getSetting } = require('../db');
const { searchPokemon, getPokemonCard, searchYugioh, pokewalletLookup, searchMagic } = require('../lib/cardLookup');

const router = express.Router();

router.get('/pokemon', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    res.json(await searchPokemon(q));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/pokemon/:id', async (req, res) => {
  try {
    res.json(await getPokemonCard(req.params.id));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/yugioh', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    res.json(await searchYugioh(q));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/pokewallet', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    res.json(await pokewalletLookup(q, getSetting('pokewallet_api_key')));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

router.get('/magic', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    res.json(await searchMagic(q));
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

module.exports = router;
