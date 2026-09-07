const express = require('express');
const { getSetting, setSetting } = require('../db');

const router = express.Router();

// eBay OAuth2 "Authorization Code" flow scaffold, per eBay's published developer docs.
// Untested against a live eBay app (this project has no eBay developer credentials to
// test with) - wiring is implemented as documented, but verify against your own app
// before relying on it. Register an app at developer.ebay.com to get a Client ID,
// Client Secret, and a RuName (redirect URI) first, then paste them into Settings.

router.get('/ebay/connect', (req, res) => {
  const clientId = getSetting('ebay_client_id');
  const redirectUri = getSetting('ebay_redirect_uri');
  if (!clientId || !redirectUri) {
    return res.status(400).json({ error: 'Set ebay_client_id and ebay_redirect_uri in Settings first.' });
  }
  const scope = encodeURIComponent('https://api.ebay.com/oauth/api_scope/sell.inventory');
  const url = `https://auth.ebay.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
  res.json({ url });
});

router.get('/ebay/callback', async (req, res) => {
  const { code } = req.query;
  const clientId = getSetting('ebay_client_id');
  const clientSecret = getSetting('ebay_client_secret');
  const redirectUri = getSetting('ebay_redirect_uri');
  if (!code || !clientId || !clientSecret || !redirectUri) {
    return res.status(400).send('Missing authorization code or eBay credentials in Settings.');
  }
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
    const tokenRes = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basicAuth}` },
      body: body.toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenJson.error_description || 'token exchange failed');
    setSetting('ebay_access_token', tokenJson.access_token);
    setSetting('ebay_refresh_token', tokenJson.refresh_token);
    setSetting('ebay_connected', true);
    res.send('<html><body>eBay connected. You can close this window.</body></html>');
  } catch (e) {
    res.status(500).send(`eBay connection failed: ${e.message}`);
  }
});

module.exports = router;
