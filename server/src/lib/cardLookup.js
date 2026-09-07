// Live card-database lookups for autofill and pricing. Both TCGdex and YGOPRODeck are
// free, public, keyless APIs (verified against their live endpoints) - no signup needed.
// PokéWallet is included too but requires a free API key the user must obtain themselves.

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en';
const YGOPRODECK_BASE = 'https://db.ygoprodeck.com/api/v7';
const POKEWALLET_BASE = 'https://api.pokewallet.io';
const SCRYFALL_BASE = 'https://api.scryfall.com';

// Scryfall requires (and every well-behaved API client should send) a descriptive
// User-Agent identifying the app - Node's default fetch UA gets a hard 400 from Scryfall.
const APP_HEADERS = { 'User-Agent': 'Card-Hub/1.0 (self-hosted collection manager)', Accept: 'application/json' };

async function searchPokemon(query) {
  const res = await fetch(`${TCGDEX_BASE}/cards?name=${encodeURIComponent(query)}`, { headers: APP_HEADERS });
  if (!res.ok) throw new Error(`TCGdex search failed (${res.status})`);
  const rows = await res.json();
  return rows.slice(0, 30).map((r) => ({
    source: 'tcgdex',
    id: r.id,
    name: r.name,
    number: r.localId,
    image: r.image ? `${r.image}/low.webp` : null,
  }));
}

async function getPokemonCard(id) {
  const res = await fetch(`${TCGDEX_BASE}/cards/${encodeURIComponent(id)}`, { headers: APP_HEADERS });
  if (!res.ok) throw new Error(`TCGdex card lookup failed (${res.status})`);
  const c = await res.json();
  return {
    source: 'tcgdex',
    id: c.id,
    name: c.name,
    number: c.localId,
    setName: c.set ? c.set.name : null,
    rarity: c.rarity || null,
    image: c.image ? `${c.image}/high.webp` : null,
    marketPriceUsd: extractTcgdexPrice(c),
  };
}

function extractTcgdexPrice(card) {
  const variants = card.variants_detailed || [];
  for (const v of variants) {
    const tp = v.pricing && v.pricing.tcgplayer;
    if (!tp) continue;
    for (const key of Object.keys(tp)) {
      if (key === 'unit' || key === 'updated') continue;
      const entry = tp[key];
      if (entry && typeof entry.marketPrice === 'number') return entry.marketPrice;
    }
  }
  return null;
}

async function searchYugioh(query) {
  const res = await fetch(`${YGOPRODECK_BASE}/cardinfo.php?fname=${encodeURIComponent(query)}`, { headers: APP_HEADERS });
  if (res.status === 400) return []; // API returns 400 when nothing matches
  if (!res.ok) throw new Error(`YGOPRODeck search failed (${res.status})`);
  const json = await res.json();
  return (json.data || []).slice(0, 30).map((c) => ({
    source: 'ygoprodeck',
    id: String(c.id),
    name: c.name,
    type: c.type,
    image: c.card_images && c.card_images[0] ? c.card_images[0].image_url : null,
    setName: c.card_sets && c.card_sets[0] ? c.card_sets[0].set_name : null,
    rarity: c.card_sets && c.card_sets[0] ? c.card_sets[0].set_rarity : null,
    marketPriceUsd: extractYugiohPrice(c),
  }));
}

function extractYugiohPrice(card) {
  const sets = card.card_sets || [];
  for (const s of sets) {
    const p = parseFloat(s.set_price);
    if (!Number.isNaN(p) && p > 0) return p;
  }
  return null;
}

async function pokewalletLookup(query, apiKey) {
  if (!apiKey) throw new Error('PokéWallet requires an API key - sign up free at pokewallet.io and add the key in Settings.');
  const res = await fetch(`${POKEWALLET_BASE}/search?q=${encodeURIComponent(query)}`, {
    headers: { ...APP_HEADERS, 'X-API-Key': apiKey },
  });
  if (!res.ok) throw new Error(`PokéWallet lookup failed (${res.status})`);
  return res.json();
}

async function searchMagic(query) {
  const res = await fetch(`${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(query)}`, { headers: APP_HEADERS });
  if (res.status === 404) return []; // Scryfall returns 404 when nothing matches
  if (!res.ok) throw new Error(`Scryfall search failed (${res.status})`);
  const json = await res.json();
  return (json.data || []).slice(0, 30).map((c) => ({
    source: 'scryfall',
    id: c.id,
    name: c.name,
    number: c.collector_number,
    setName: c.set_name,
    rarity: c.rarity,
    image: (c.image_uris && c.image_uris.normal) || (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris && c.card_faces[0].image_uris.normal) || null,
    marketPriceUsd: c.prices && c.prices.usd ? parseFloat(c.prices.usd) : null,
  }));
}

module.exports = { searchPokemon, getPokemonCard, searchYugioh, pokewalletLookup, searchMagic };
