// Live eBay listing sync via the Sell Inventory API - push a Card-Hub listing to eBay
// as a real fixed-price listing, and check it back for sold status. Implemented per
// eBay's published Sell API docs; UNVERIFIED against a live eBay seller account (this
// project has no eBay developer/seller credentials to test against). Before relying on
// this, publish one test listing and confirm it appears correctly on eBay.
//
// Requires (all set in Settings -> API Keys / Marketplace Connections):
//  - eBay connected via OAuth (sell.inventory + sell.fulfillment scopes)
//  - ebay_payment_policy_id, ebay_return_policy_id, ebay_fulfillment_policy_id
//    (business policies configured in your eBay seller account - Account -> Business Policies)
//  - ebay_merchant_location_key (a shipping location configured in your eBay account)
//  - ebay_default_category_id (a valid eBay leaf category ID for trading cards - this
//    varies a lot by game/sport, so it's a single fallback rather than guessed per-card)

const { getSetting, setSetting } = require('../db');

const APP_HEADERS = { 'User-Agent': 'Card-Hub/1.0 (self-hosted collection manager)', Accept: 'application/json' };
const EBAY_BASE = 'https://api.ebay.com';

async function getValidUserToken() {
  const expiresAt = getSetting('ebay_token_expires_at', 0);
  if (Date.now() < Number(expiresAt)) return getSetting('ebay_access_token');

  const refreshToken = getSetting('ebay_refresh_token');
  const clientId = getSetting('ebay_client_id');
  const clientSecret = getSetting('ebay_client_secret');
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('eBay is not connected - go to Settings and click Connect eBay first.');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${EBAY_BASE}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basicAuth}`, ...APP_HEADERS },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment',
    }).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || 'eBay token refresh failed - reconnect eBay in Settings.');
  setSetting('ebay_access_token', json.access_token);
  setSetting('ebay_token_expires_at', Date.now() + (json.expires_in - 60) * 1000);
  return json.access_token;
}

function requireSetting(key, label) {
  const val = getSetting(key);
  if (!val) throw new Error(`${label} is not set - configure it in Settings -> Marketplace Connections.`);
  return val;
}

function cardTitle(card) {
  const parts = [card.year, card.manufacturer, card.set_name, card.player_or_character, card.card_number ? `#${card.card_number}` : null, card.parallel_variant].filter(Boolean);
  return parts.join(' ').slice(0, 80) || `Card #${card.id}`;
}

// Pushes a card to eBay as a new fixed-price listing: inventory item -> offer -> publish.
// Returns { listingId, offerId, sku, url }.
async function pushListing(card, listPrice, imageUrls) {
  const token = await getValidUserToken();
  const paymentPolicyId = requireSetting('ebay_payment_policy_id', 'Payment Policy ID');
  const returnPolicyId = requireSetting('ebay_return_policy_id', 'Return Policy ID');
  const fulfillmentPolicyId = requireSetting('ebay_fulfillment_policy_id', 'Fulfillment Policy ID');
  const merchantLocationKey = requireSetting('ebay_merchant_location_key', 'Merchant Location Key');
  const categoryId = requireSetting('ebay_default_category_id', 'Default Category ID');

  const sku = `cardhub-${card.id}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Language': 'en-US', ...APP_HEADERS };

  const invRes = await fetch(`${EBAY_BASE}/sell/inventory/v1/inventory_item/${sku}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      product: {
        title: cardTitle(card),
        description: card.notes || cardTitle(card),
        imageUrls: imageUrls && imageUrls.length ? imageUrls : undefined,
        aspects: card.card_number ? { 'Card Number': [String(card.card_number)] } : undefined,
      },
      condition: card.is_graded ? 'CERTIFIED_REFURBISHED' : (card.raw_condition ? undefined : 'USED_EXCELLENT'),
      availability: { shipToLocationAvailability: { quantity: Math.max(1, card.quantity || 1) } },
    }),
  });
  if (!invRes.ok) throw new Error(`eBay inventory item creation failed (${invRes.status}): ${await invRes.text()}`);

  const offerRes = await fetch(`${EBAY_BASE}/sell/inventory/v1/offer`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sku,
      marketplaceId: 'EBAY_US',
      format: 'FIXED_PRICE',
      availableQuantity: Math.max(1, card.quantity || 1),
      categoryId,
      merchantLocationKey,
      listingDescription: card.notes || cardTitle(card),
      listingPolicies: { paymentPolicyId, returnPolicyId, fulfillmentPolicyId },
      pricingSummary: { price: { value: String(listPrice), currency: 'USD' } },
    }),
  });
  const offerJson = await offerRes.json();
  if (!offerRes.ok) throw new Error(`eBay offer creation failed (${offerRes.status}): ${JSON.stringify(offerJson)}`);
  const offerId = offerJson.offerId;

  const publishRes = await fetch(`${EBAY_BASE}/sell/inventory/v1/offer/${offerId}/publish/`, { method: 'POST', headers });
  const publishJson = await publishRes.json();
  if (!publishRes.ok) throw new Error(`eBay publish failed (${publishRes.status}): ${JSON.stringify(publishJson)}`);
  const listingId = publishJson.listingId;

  return { listingId, offerId, sku, url: listingId ? `https://www.ebay.com/itm/${listingId}` : null };
}

// Checks an existing offer's status on eBay and whether it has sold (via the
// Fulfillment API's orders, matched by SKU).
async function checkListingStatus(offerId, sku) {
  const token = await getValidUserToken();
  const headers = { Authorization: `Bearer ${token}`, ...APP_HEADERS };

  const offerRes = await fetch(`${EBAY_BASE}/sell/inventory/v1/offer/${offerId}`, { headers });
  const offerJson = await offerRes.json();
  if (!offerRes.ok) throw new Error(`eBay offer lookup failed (${offerRes.status}): ${JSON.stringify(offerJson)}`);

  const ordersRes = await fetch(`${EBAY_BASE}/sell/fulfillment/v1/order?filter=${encodeURIComponent(`lineitem.sku:{${sku}}`)}`, { headers });
  let sold = false;
  if (ordersRes.ok) {
    const ordersJson = await ordersRes.json();
    sold = (ordersJson.orders || []).length > 0;
  }

  return { status: offerJson.status, sold };
}

module.exports = { pushListing, checkListingStatus, getValidUserToken };
