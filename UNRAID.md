# Card-Hub on Unraid

Self-hosted trading card / sports card collection manager, modeled after
[Ludex](https://www.ludex.com/).

## Setup

1. **Apps** tab -> search "Card-Hub" -> Install (or add the template manually
   -- see the [AoN-Unraid-Apps](https://github.com/aon082910/AoN-Unraid-Apps)
   repo README).
2. Set the **App Data** path (default `/mnt/user/appdata/card-hub`) -- this
   holds the SQLite database and every scanned card image. Back this up like
   you would any other app's config.
3. Set a **Session Secret** to a random string of your own (signs login
   sessions) -- required, especially if you expose this beyond your own LAN.
4. Start the container and open the WebUI. Sign in with the default admin
   account (`admin` / `admin`) and change the password immediately from
   **Settings -> Your Account**.

## Camera & barcode scanning over HTTPS

Browsers only allow camera access in a secure context (`https://` or
`http://localhost`). Plain `http://<unraid-ip>:8080` works for the camera in
some desktop browsers but will likely be blocked on your phone. For reliable
phone scanning, put Card-Hub behind a reverse proxy with a certificate (Nginx
Proxy Manager, SWAG, or Unraid's built-in reverse proxy all work fine with a
self-signed cert for LAN-only use) -- or just use the **Upload File** button
instead of the live camera, which works everywhere with no HTTPS needed.

## API keys (all optional)

Card-Hub works fully out of the box -- Pokemon (TCGdex), Yu-Gi-Oh (YGOPRODeck),
and Magic: The Gathering (Scryfall) card lookup and live pricing are free and
keyless. From **Settings -> API Keys** (admin only) you can optionally add:

- **PokéWallet** -- an alternative Pokemon pricing source, needs a free API
  key from pokewallet.io.
- **eBay** -- marketplace OAuth connection, needs your own developer app from
  developer.ebay.com. Implemented per eBay's published docs but untested
  against a live app.
- **TCGplayer (direct)** -- an alternative pricing source; the connection
  setting exists but live lookup isn't implemented yet.

## Notes

- All data lives under the App Data path -- deleting the container and
  reinstalling with the same App Data path keeps your collection intact.
- The daily portfolio-value snapshot (Settings -> Automated Portfolio
  Snapshots) uses the container's clock for its "hour of day" setting; set
  Unraid's timezone as usual if you want it to land at a specific local time.
