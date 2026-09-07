// Pluggable market-value lookup.
//
// 'manual' - no automatic lookup, you enter values by hand.
// 'tcgdex' - free, keyless, live Pokemon TCG pricing (TCGplayer USD via api.tcgdex.net).
//            Works automatically for any card with category=tcg and a recognizable name.
// 'ygoprodeck' - free, keyless, live Yu-Gi-Oh pricing (TCGplayer via db.ygoprodeck.com).
// 'pokewallet' - Pokemon TCG pricing via pokewallet.io - requires a free API key you
//            register yourself and paste into Settings.
// 'ebay' / 'tcgplayer' - documented extension points requiring your own developer
//            credentials; not implemented (see below).

const { getSetting } = require('../db');
const { searchPokemon, getPokemonCard, searchYugioh, pokewalletLookup, searchMagic } = require('./cardLookup');

async function manualProvider() {
  throw new Error('Manual pricing is selected - no automatic lookup is available. Enter a value directly on the card.');
}

function cardSearchTerm(card) {
  return card.player_or_character || card.set_name || null;
}

async function tcgdexProvider(card) {
  const term = cardSearchTerm(card);
  if (!term) throw new Error('Card needs a Player/Character or Set Name to look up a price.');
  const results = await searchPokemon(term);
  if (!results.length) throw new Error(`No TCGdex match found for "${term}".`);
  const byNumber = card.card_number ? results.find((r) => r.number === String(card.card_number)) : null;
  const pick = byNumber || results[0];
  const detail = await getPokemonCard(pick.id);
  if (detail.marketPriceUsd == null) throw new Error(`Found "${detail.name}" on TCGdex, but no TCGplayer price is available for it.`);
  return detail.marketPriceUsd;
}

async function ygoprodeckProvider(card) {
  const term = cardSearchTerm(card);
  if (!term) throw new Error('Card needs a Player/Character or Set Name to look up a price.');
  const results = await searchYugioh(term);
  if (!results.length) throw new Error(`No YGOPRODeck match found for "${term}".`);
  const pick = results[0];
  if (pick.marketPriceUsd == null) throw new Error(`Found "${pick.name}" on YGOPRODeck, but no set price is available for it.`);
  return pick.marketPriceUsd;
}

async function pokewalletProvider(card) {
  const term = cardSearchTerm(card);
  if (!term) throw new Error('Card needs a Player/Character or Set Name to look up a price.');
  const apiKey = getSetting('pokewallet_api_key');
  const result = await pokewalletLookup(term, apiKey);
  const price = result && (result.market_price ?? result.mid_price);
  if (price == null) throw new Error(`No PokéWallet price found for "${term}".`);
  return price;
}

async function scryfallProvider(card) {
  const term = cardSearchTerm(card);
  if (!term) throw new Error('Card needs a Player/Character or Set Name to look up a price.');
  const results = await searchMagic(term);
  if (!results.length) throw new Error(`No Scryfall match found for "${term}".`);
  const byNumber = card.card_number ? results.find((r) => r.number === String(card.card_number)) : null;
  const pick = byNumber || results[0];
  if (pick.marketPriceUsd == null) throw new Error(`Found "${pick.name}" on Scryfall, but no USD price is available for it (may be foil-only or a digital-only printing).`);
  return pick.marketPriceUsd;
}

async function ebayProvider() {
  const clientId = getSetting('ebay_client_id');
  const clientSecret = getSetting('ebay_client_secret');
  if (!clientId || !clientSecret) {
    throw new Error('eBay price lookup requires a Client ID and Client Secret in Settings (register a developer app at developer.ebay.com).');
  }
  throw new Error('eBay credentials are set, but live lookup is not yet implemented - see server/src/lib/priceProviders.js');
}

async function tcgplayerProvider() {
  const apiKey = getSetting('price_provider_api_key');
  if (!apiKey) {
    throw new Error('TCGplayer price lookup requires an API key in Settings (register at docs.tcgplayer.com).');
  }
  throw new Error('TCGplayer credentials are set, but live lookup is not yet implemented - see server/src/lib/priceProviders.js');
}

const PROVIDERS = {
  manual: manualProvider,
  tcgdex: tcgdexProvider,
  ygoprodeck: ygoprodeckProvider,
  pokewallet: pokewalletProvider,
  scryfall: scryfallProvider,
  ebay: ebayProvider,
  tcgplayer: tcgplayerProvider,
};

async function lookupPrice(card) {
  const providerKey = getSetting('price_provider', 'manual');
  const provider = PROVIDERS[providerKey] || manualProvider;
  return provider(card);
}

module.exports = { lookupPrice, PROVIDERS };
