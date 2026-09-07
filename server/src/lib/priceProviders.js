// Pluggable market-value lookup.
//
// 'manual' - no automatic lookup, you enter values by hand.
// 'tcgdex' - free, keyless, live Pokemon TCG pricing (TCGplayer USD via api.tcgdex.net).
// 'ygoprodeck' - free, keyless, live Yu-Gi-Oh pricing (TCGplayer via db.ygoprodeck.com).
// 'scryfall' - free, keyless, live Magic: The Gathering pricing (USD via Scryfall).
// 'cardhoarder' - free, keyless, Magic: The Gathering MTGO ticket pricing (Scryfall
//            already aggregates Cardhoarder's tix price per print - no separate API needed).
// 'cardkingdom' - free, keyless, Magic: The Gathering retail pricing from Card Kingdom's
//            public bulk pricelist (cached in-process, refreshed every 12h).
// 'pokewallet' - Pokemon TCG pricing via pokewallet.io - requires a free API key.
// 'ebay' - active-listing median price via eBay's Browse API (client_credentials app
//            token) - requires an eBay developer app Client ID/Secret. Note: this is
//            asking-price data from currently active listings, not sold comps - eBay's
//            sold-comps API (Marketplace Insights) requires separate limited approval
//            most developer accounts don't have.
// 'tcgplayer' - direct TCGplayer pricing - requires a TCGplayer partner-program app
//            (client_id/secret). Implemented per TCGplayer's published API contract;
//            unverified against a live account (no partner credentials available here).

const { getSetting } = require('../db');
const {
  searchPokemon, getPokemonCard, searchYugioh, pokewalletLookup, searchMagic,
  findCardKingdomPrice, ebaySearchActiveListings, tcgplayerLookup,
} = require('./cardLookup');

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

async function cardhoarderProvider(card) {
  const term = cardSearchTerm(card);
  if (!term) throw new Error('Card needs a Player/Character or Set Name to look up a price.');
  const results = await searchMagic(term);
  if (!results.length) throw new Error(`No Scryfall match found for "${term}".`);
  const byNumber = card.card_number ? results.find((r) => r.number === String(card.card_number)) : null;
  const pick = byNumber || results[0];
  if (pick.priceTixCardhoarder == null) throw new Error(`Found "${pick.name}", but no Cardhoarder (MTGO ticket) price is listed for it.`);
  return pick.priceTixCardhoarder;
}

async function cardkingdomProvider(card) {
  const term = cardSearchTerm(card);
  if (!term) throw new Error('Card needs a Player/Character or Set Name to look up a price.');
  const price = await findCardKingdomPrice(term);
  if (price == null) throw new Error(`No Card Kingdom listing found for "${term}".`);
  return price;
}

async function ebayProvider(card) {
  const clientId = getSetting('ebay_client_id');
  const clientSecret = getSetting('ebay_client_secret');
  if (!clientId || !clientSecret) {
    throw new Error('eBay price lookup requires a Client ID and Client Secret in Settings (register a developer app at developer.ebay.com).');
  }
  const term = cardSearchTerm(card);
  if (!term) throw new Error('Card needs a Player/Character or Set Name to look up a price.');
  const { medianPrice, sampleSize } = await ebaySearchActiveListings(term, clientId, clientSecret);
  if (medianPrice == null) throw new Error(`No active eBay listings found for "${term}".`);
  if (sampleSize < 3) throw new Error(`Only ${sampleSize} active eBay listing(s) found for "${term}" - too few for a reliable estimate.`);
  return medianPrice;
}

async function tcgplayerProvider(card) {
  const clientId = getSetting('tcgplayer_client_id');
  const clientSecret = getSetting('tcgplayer_client_secret');
  if (!clientId || !clientSecret) {
    throw new Error('TCGplayer price lookup requires a Client ID and Client Secret in Settings (apply for partner API access at docs.tcgplayer.com).');
  }
  const term = cardSearchTerm(card);
  if (!term) throw new Error('Card needs a Player/Character or Set Name to look up a price.');
  const { marketPrice } = await tcgplayerLookup(term, clientId, clientSecret);
  return marketPrice;
}

const PROVIDERS = {
  manual: manualProvider,
  tcgdex: tcgdexProvider,
  ygoprodeck: ygoprodeckProvider,
  pokewallet: pokewalletProvider,
  scryfall: scryfallProvider,
  cardhoarder: cardhoarderProvider,
  cardkingdom: cardkingdomProvider,
  ebay: ebayProvider,
  tcgplayer: tcgplayerProvider,
};

async function lookupPrice(card) {
  const providerKey = getSetting('price_provider', 'manual');
  const provider = PROVIDERS[providerKey] || manualProvider;
  return provider(card);
}

module.exports = { lookupPrice, PROVIDERS };
