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
    // Cardhoarder trades in MTGO tickets, not USD - Scryfall already aggregates it per print.
    priceTixCardhoarder: c.prices && c.prices.tix ? parseFloat(c.prices.tix) : null,
  }));
}

// Card Kingdom publishes their full MTG buylist/retail pricelist as a single public JSON
// file (no key) - it's a ~45MB bulk dump meant for periodic sync, not a per-card lookup
// endpoint, so it's cached in memory and refreshed at most once every 12 hours.
const CARDKINGDOM_URL = 'https://api.cardkingdom.com/api/pricelist';
let ckCache = { data: null, fetchedAt: 0 };
const CK_TTL_MS = 12 * 60 * 60 * 1000;

async function getCardKingdomPricelist() {
  if (ckCache.data && Date.now() - ckCache.fetchedAt < CK_TTL_MS) return ckCache.data;
  const res = await fetch(CARDKINGDOM_URL, { headers: APP_HEADERS });
  if (!res.ok) throw new Error(`Card Kingdom pricelist fetch failed (${res.status})`);
  const json = await res.json();
  ckCache = { data: json.data || [], fetchedAt: Date.now() };
  return ckCache.data;
}

async function findCardKingdomPrice(name) {
  const list = await getCardKingdomPricelist();
  const needle = name.trim().toLowerCase();
  const matches = list.filter((c) => c.name && c.name.trim().toLowerCase() === needle && c.is_foil === 'false');
  if (!matches.length) return null;
  // Multiple printings/editions share a name - the cheapest in-stock listing is the
  // most representative "what would I pay for this card" figure.
  const inStock = matches.filter((m) => Number(m.qty_retail) > 0);
  const pool = inStock.length ? inStock : matches;
  const prices = pool.map((m) => parseFloat(m.price_retail)).filter((p) => !Number.isNaN(p) && p > 0);
  if (!prices.length) return null;
  return Math.min(...prices);
}

// --- eBay: application access token (client_credentials grant) for read-only Browse
// API search. This is a different, simpler OAuth flow than the user-authorization flow
// in oauth.js (which is needed for the "post listings on your behalf" scope). Cached
// per token lifetime (eBay tokens are typically valid ~2 hours).
let ebayAppToken = { token: null, expiresAt: 0 };

async function getEbayAppToken(clientId, clientSecret) {
  if (ebayAppToken.token && Date.now() < ebayAppToken.expiresAt) return ebayAppToken.token;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basicAuth}`, ...APP_HEADERS },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || `eBay token request failed (${res.status})`);
  ebayAppToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return ebayAppToken.token;
}

// eBay's Browse API only searches ACTIVE listings - true "sold comps" require the
// Marketplace Insights API, which needs separate limited-release approval from eBay
// that isn't available by default to a developer app. This returns the median price of
// current active listings instead, clearly labeled as an asking-price estimate.
async function ebaySearchActiveListings(query, clientId, clientSecret) {
  const token = await getEbayAppToken(clientId, clientSecret);
  const res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=20`, {
    headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US', ...APP_HEADERS },
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json.errors && json.errors[0] && json.errors[0].message) || `eBay search failed (${res.status})`);
  const items = json.itemSummaries || [];
  const prices = items
    .map((i) => i.price && parseFloat(i.price.value))
    .filter((p) => typeof p === 'number' && !Number.isNaN(p) && p > 0)
    .sort((a, b) => a - b);
  if (!prices.length) return { medianPrice: null, sampleSize: 0, items: [] };
  const mid = Math.floor(prices.length / 2);
  const medianPrice = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  return {
    medianPrice,
    sampleSize: prices.length,
    items: items.slice(0, 5).map((i) => ({ title: i.title, price: i.price ? parseFloat(i.price.value) : null, url: i.itemWebUrl })),
  };
}

// --- TCGplayer direct: requires a partner-program app (client_id/secret), approved by
// TCGplayer. Implemented per their published Catalog + Pricing API contracts; unverified
// against a live account since this project has no TCGplayer partner credentials.
let tcgplayerToken = { token: null, expiresAt: 0 };

async function getTcgplayerToken(clientId, clientSecret) {
  if (tcgplayerToken.token && Date.now() < tcgplayerToken.expiresAt) return tcgplayerToken.token;
  const res = await fetch('https://api.tcgplayer.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...APP_HEADERS },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || `TCGplayer token request failed (${res.status})`);
  tcgplayerToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return tcgplayerToken.token;
}

async function tcgplayerLookup(query, clientId, clientSecret) {
  const token = await getTcgplayerToken(clientId, clientSecret);
  const authHeader = { Authorization: `Bearer ${token}`, ...APP_HEADERS };

  const searchRes = await fetch(`https://api.tcgplayer.com/catalog/products?productName=${encodeURIComponent(query)}&limit=5`, { headers: authHeader });
  const searchJson = await searchRes.json();
  if (!searchRes.ok) throw new Error(`TCGplayer catalog search failed (${searchRes.status})`);
  const product = searchJson.results && searchJson.results[0];
  if (!product) throw new Error(`No TCGplayer product found for "${query}".`);

  const priceRes = await fetch(`https://api.tcgplayer.com/pricing/product/${product.productId}`, { headers: authHeader });
  const priceJson = await priceRes.json();
  if (!priceRes.ok) throw new Error(`TCGplayer pricing lookup failed (${priceRes.status})`);
  const priceRow = priceJson.results && priceJson.results.find((r) => r.marketPrice != null);
  if (!priceRow) throw new Error(`Found "${product.productName}" on TCGplayer, but no market price is listed for it.`);

  return { productName: product.productName, marketPrice: priceRow.marketPrice, productUrl: `https://www.tcgplayer.com/product/${product.productId}` };
}

module.exports = {
  searchPokemon, getPokemonCard, searchYugioh, pokewalletLookup, searchMagic, findCardKingdomPrice,
  ebaySearchActiveListings, tcgplayerLookup,
};
