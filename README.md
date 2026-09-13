# Card-Hub (self-hosted)

[![tests](https://github.com/aon082910/card-hub/actions/workflows/tests.yml/badge.svg)](https://github.com/aon082910/card-hub/actions/workflows/tests.yml)

Source: [github.com/aon082910/card-hub](https://github.com/aon082910/card-hub) ·
Image: [hub.docker.com/r/allornothing/card-hub](https://hub.docker.com/r/allornothing/card-hub)

A self-hosted trading card / sports card collection manager modeled after [Ludex](https://www.ludex.com/), built to run on Docker / Unraid with a local SQLite database and no cloud dependency. Built independently as its own implementation; no Ludex code, assets, or branding are used.

**Multi-tenant**: every account is self-registered from the login page and gets its own private collection — Card-Hub is meant to be hosted centrally (one server, many users), not just a single-household shared instance. See **Accounts & community** below for friends, messaging, and trading between accounts on the same server.

## Features

**Collection management**
- Generic schema covers both sports cards and TCG (Pokemon, Magic, etc.): player/character, team/set, year, manufacturer, card number, parallel/variant, rarity, grading (PSA/BGS/CGC/SGC), serial numbers, condition, storage location, tags, notes.
- Statuses: owned, wanted (wishlist), listed, sold, archived.
- Bulk actions in the Collection view: multi-select cards to bulk-change status, bulk-add a tag, bulk-delete, or bulk-print labels.
- Clone/duplicate a card entry — fast for entering parallels/variants of a base card.
- "Similar cards" links on a card's detail page (same player, or same set/year/manufacturer).
- Sortable table columns and savable filter views (stored per-browser).

**Camera scanning & recognition**
- Capture front/back photos using a USB webcam plugged into the machine you're browsing from, or your phone's camera by opening the same web app on your phone (same LAN as the server).
- Dedicated **Scan** page for high-volume batch scanning: live camera preview with an adjustable capture-zone overlay, and an auto-capture mode that detects a card sliding through the zone (e.g. via a [USB webcam card scanner stand](https://makerworld.com/en/models/1110574-ultimate-card-scanner-stand-for-pokemon-mtg#profileId-1287136)) and snaps the photo automatically — no button-pressing per card. Captures alternate front/back automatically, and each pair can be turned straight into a new card record.
- Barcode/QR scanner (on a card's detail page) to read a PSA/BGS/CGC cert barcode straight into the Cert Number field.
- OCR ("Extract Text") pulls raw text off a card photo, then each extracted line can be searched directly against the live Pokemon/Yu-Gi-Oh/Magic databases (🔍 buttons next to each line) — picking a real match autofills the form and pulls in the official image, the same as the manual 🔍 Look Up buttons. This is OCR + name-search, not true visual card recognition (no licensed card-image dataset or trained model is involved), but it gets you from "photo of an unknown card" to a filled-in record in two clicks for supported games.
  - **Two OCR providers** (Settings → OCR Provider, admin-only): **Tesseract** (default) runs entirely in-browser, free, no setup — reads the card's name band first (Pokemon/Magic/Yu-Gi-Oh all put the name in a band across the top) before falling back to the full image. **Surya** is a vision-language OCR model that reads stylized card text over artwork far more reliably than classic OCR; point it at your own self-hosted endpoint or use [Datalab's](https://www.datalab.to/) hosted API with a key. Falls back to Tesseract automatically if Surya is selected but unreachable.
  - **Manual crop** ("✂️ Crop & Extract Text") — draw a box around exactly the text you want read instead of relying on auto-detection, for cases neither provider gets right on its own. Always uses local Tesseract regardless of the provider setting.
- Offline scan queueing: if a photo capture fails because you're offline (e.g. scanning on your phone with a flaky connection), it's queued in the browser and retried automatically once you're back online.

**Sets & checklists**
- Define a set (name/year/manufacturer/total card count) and track completion against your actual collection.
- Visual checklist grid: every card number 1..N in the set as a clickable cell — green and linked to the card if you own it, muted and linked straight to a pre-filled Add Card form (set/year/manufacturer/number already in) if you don't.

**Want List & sharing**
- Mark a card's status as "Wanted" and it shows up on the dedicated **Want List** page.
- **Share links**: generate a public, read-only, no-login-required link for your want list, a single card, your whole collection (Collection → Share My Collection), or any selection of cards from Collection (bulk-select → Share Selected). Shared data is deliberately limited to non-sensitive fields (no cost basis, purchase source, or storage location).

**Decks & binders**
- Group cards from your collection into a named **Deck** (a deck you play, or a binder page you're curating) without duplicating card records — a deck just references existing cards and a quantity.

**Grading**
- **Grading submission tracker**: log a card sent to PSA/BGS/CGC/SGC — service level, cost, tracking number, status (submitted/in progress/returned/cancelled), expected return date. Marking one "returned" with a grade updates the card itself.
- **Grading ROI calculator**: enter a card's raw value, grading cost, and estimated value at each grade tier, and see net profit/ROI per tier before you submit — no data saved, just a quick what-if tool.
- Three-tier value tracking per card: raw (ungraded) estimate, graded estimate, and last-sold price, alongside the existing single "current value."

**Consignment tracking**
- Flag a card as consigned (not fully owned) with the consignor's name and your payout percentage, so it's clearly distinguished from cards you own outright.

**For Trade list**
- Flag any card "For Trade" (distinct from just owning a duplicate) and it shows up on a dedicated **For Trade** page, with its own shareable public link — mirrors TCDB's have-list/trade-list split.

**Deck value & composition**
- A Deck's page shows a summary: total card count, total value, and a breakdown by category — computed from the cards already in the deck, no extra setup.

**eBay deal watches**
- Save a search query + target price (Watches page); "Check Now" lists current active eBay listings under that price. Reuses the same eBay Browse API integration as the eBay price provider — needs your eBay API key, and again, active listings only (not sold comps). Approximates Slabfy's eBay-monitoring-for-deals feature.

**Trade Match**
- Paste another Card-Hub instance's public share link (their For Trade list, Want List, or collection) and see what overlaps with your own lists — if they shared a want list, you're shown what of yours (marked For Trade) matches it; otherwise you're shown what of theirs matches your Want List. Matching is by set/number/name, best-effort.

**Notifications**
- An optional daily digest posted to a webhook URL (Settings → Notifications, admin-only) — works as-is with Discord/Slack incoming webhooks or any generic receiver (ntfy.sh, Home Assistant, n8n...). No SMTP/email setup. Covers eBay watch hits and grading submissions past their expected return date. "Send Test Webhook" and "Send Digest Now" for on-demand checks.

**Duplicate warning**
- Adding a card that matches an existing entry's set + number (or player/character) warns you before creating a second row, so accidental double-entries are easier to catch — you can still proceed on purpose (e.g. a genuine second copy).

**Personal API Token**
- Settings → Personal API Token: generate a read-only bearer token for your own scripts/dashboards outside the browser (`GET /api/v1/cards`, `/api/v1/cards/:id`, `/api/v1/dashboard`). No session/cookie needed — just an `Authorization: Bearer <token>` header (or `?token=`).

**Trades**
- A simple ledger for cards traded with other collectors (no money involved) — separate from Sales, which assumes a cash transaction. Trading a card away reduces its quantity, same as a sale.

**Live card lookup (Pokemon, Yu-Gi-Oh & Magic: The Gathering)**
- 🔍 Look Up buttons (on Add Card and a card's detail page) search real, free, keyless public APIs and autofill the form:
  - **[TCGdex](https://tcgdex.dev/)** for Pokemon — card name/set/number/rarity, official card image, and live TCGplayer USD pricing.
  - **[YGOPRODeck](https://ygoprodeck.com/)** for Yu-Gi-Oh — card name/type/set/rarity, official image, and TCGplayer-sourced set pricing.
  - **[Scryfall](https://scryfall.com/)** for Magic: The Gathering — card name/set/number/rarity, official image, and live USD pricing.
- The picked card's image is pulled in server-side and attached automatically — no manual photo needed for these three games (you can still scan/upload your own if you prefer, e.g. to show the actual condition or grading label).

**Purchase, sales & value tracking**
- Cost basis, purchase source/date, sale price, fees, shipping, platform, buyer, automatic quantity/status updates, realized profit reporting.
- Per-card value history, plus automated daily portfolio-value snapshots (configurable time-of-day, or trigger one manually) feeding the dashboard's value-over-time data — both charted with a lightweight built-in line chart (no external charting library).
- Pluggable price-lookup architecture (Settings → Automatic Price Lookup), all real implementations (none are stubs):
  - **TCGdex** (Pokemon), **YGOPRODeck** (Yu-Gi-Oh), **Scryfall** (Magic USD), **Cardhoarder** (Magic Online tickets, via Scryfall's aggregated data), and **Card Kingdom** (Magic retail, via their public bulk pricelist, cached 12h) — all free, keyless, work immediately.
  - **[PokéWallet](https://www.pokewallet.io/)** (Pokemon) needs a free API key from pokewallet.io.
  - **eBay** returns the median price of currently *active* listings via the Browse API (client-credentials app token) — an asking-price estimate, not sold comps (eBay's sold-comps API needs separate limited approval most developer accounts don't have). Needs a developer app Client ID/Secret.
  - **TCGplayer (direct)** calls their Catalog + Pricing APIs — needs a TCGplayer partner-program app (Client ID/Secret from a separate approval process).
  - Both eBay and TCGplayer are implemented against their published API contracts and make real network calls, but are **unverified against a live account** (no partner credentials available to test with) — expect to debug against your own real credentials.
  - "Manual" (default) means you enter values yourself.

**Marketplace listings**
- Track draft/active/sold listings per platform (eBay, WhatNot, COMC, Facebook, etc.) with price and link.
- **Live eBay sync**: push a listing to eBay as a real fixed-price listing (Sell Inventory API: creates an inventory item, an offer, and publishes it) and sync its status back (checks for a sale via the Fulfillment API). Requires eBay OAuth connected plus your eBay account's business policy IDs and a shipping location key (Settings → API Keys → eBay Business Policies). Implemented per eBay's published docs; **untested against a live seller account** — publish one test listing and confirm it looks right on eBay before relying on it for real inventory.
- Other platforms remain tracking-only (no public listing-creation API exists for most of them).

**Export & import**
- Excel (.xlsx), CSV, and PDF export of the full collection or a filtered subset, with selectable presets: full columns, an insurance-report column set (grading, location, value), or a tax/cost-basis column set.
- Photo Catalog PDF — each card's front photo next to its details.
- Printable label sheets — a QR code (linking back to the card) plus name/set/number, for storage bins/binders/boxes. Print all filtered cards or just your current selection from Collection.
- Re-import an exported (or edited) Excel/CSV file to bulk-add cards.
- **Import from another app** (Reports → Import From Another App): [TCDB](https://www.tcdb.com/), [CollX](https://collx.app/), [Slabfy](https://slabfy.com/), [ManaBox](https://manabox.app/), and [Eyevo](https://eyevotcg.com/) don't publish a public developer API, so there's no automatic sync for them (verified directly against each site — none document API access as of this writing). If one of them can export your collection to CSV/Excel, upload it here and map its columns to Card-Hub's fields yourself — no fixed format assumed.

**Accounts & community**
- Multi-tenant: anyone can create their own account from the login page (Settings → Users → "Allow self-registration" to turn this off), and every account's collection, decks, sets, watches, etc. are private to that account. A default admin account is created on first run — see below. Admins can also add/remove accounts directly and see every account's activity in the audit log.
- **Friends**: search for another account by username and send a friend request (Friends page); once accepted, you can message each other and see each other's collection.
- **Messages**: a simple inbox per friend, with an unread-count badge in the nav.
- **Trade requests**: from a friend's collection page, check cards of theirs you want and cards of yours to offer, add a note, and send a trade proposal — it lands as a message they can accept or decline. Once accepted, either side can mark it "Completed," which transfers ownership of the agreed cards between the two collections.
- Every create/update/delete is recorded to an activity/audit log (Settings → Activity Log, admin-only), including who did it.

**Automated backups** (admin-only, Settings → Automated Backups)
- Daily database backup using SQLite's online backup API (safe to run while the app is in use, unlike copying the `.db` file directly), with configurable time-of-day and how many backups to keep — plus a "Take Backup Now" button.
- Download or delete any backup; restore from an existing backup or an uploaded `.db` file. Restoring is staged rather than applied immediately (swapping a live, open database file is unsafe) — it takes effect on the next container restart.

**Appearance & installability**
- Dark/light theme toggle (defaults to your OS preference, remembered per-browser).
- Installable as a PWA (Add to Home Screen) with an offline-capable app shell.
- Multi-language UI: English, Spanish, and French — covers navigation, common actions, the Dashboard, the Collection table, the full card form, and every page listed in this README (titles, table headers, form labels, buttons). The long technical explanation paragraphs in Settings/Reports (API/OAuth setup instructions) stay in English by design — those terms don't really benefit from translation. The dictionary structure (`client/src/i18n.jsx`) is set up so more strings/languages can be added incrementally.

**Admin: API Keys panel**
- Settings → 🔑 API Keys (admin-only) consolidates every external service credential Card-Hub uses in one place: PokéWallet, eBay (Client ID/Secret/Redirect URI), and TCGplayer-direct — with a description, signup link, and (for eBay) the Connect button, right next to each key field. TCGdex, YGOPRODeck, and Scryfall need no key at all.

## First login

On first run, Card-Hub creates a default admin account:

- **Username:** `admin`
- **Password:** `admin`

Sign in and change the password immediately from **Settings → Your Account**.

## Running with Docker Compose

```bash
docker compose up -d --build
```

Set a real `SESSION_SECRET` in `docker-compose.yml` (a random string) before exposing this beyond your own LAN — it signs login sessions. The app will be available at `http://<server-ip>:8080`. Data (SQLite DB + card images) is stored in `./data`, which is bind-mounted so it survives container rebuilds.

## Running on Unraid

The image is published to Docker Hub as [`allornothing/card-hub`](https://hub.docker.com/r/allornothing/card-hub) — no local build needed.

1. Add [aon082910/AoN-Unraid-Apps](https://github.com/aon082910/AoN-Unraid-Apps) as a template repository in Community Applications (**Apps → Settings → Template Repositories**), then search "Card-Hub" and install — or import [`unraid/card-hub.xml`](unraid/card-hub.xml) directly via **Docker → Add Container → Template**.
2. Map **App Data** to `/mnt/user/appdata/card-hub` (or your preferred appdata share), set a **Session Secret**, and expose port 8080 (or remap it).
3. Open the WebUI from the Unraid dashboard.

See [UNRAID.md](UNRAID.md) for more (camera/HTTPS notes, optional API keys).

## Camera, barcode scanning & OCR notes

Browsers only allow camera access (`getUserMedia`) in a **secure context** — `https://` or `http://localhost`. Accessing Card-Hub over plain `http://<lan-ip>:8080` will work for camera capture in some desktop browsers (Chrome treats private LAN IPs leniently) but **iOS Safari and most mobile browsers will block it**. This applies to both the photo-capture camera and the barcode/QR scanner. For reliable phone scanning:

- Put Card-Hub behind a reverse proxy (e.g. Nginx Proxy Manager, SWAG, or Unraid's built-in reverse proxy) with a certificate — a self-signed cert works fine for LAN-only use, or use a service like Tailscale/Let's Encrypt DNS challenge for a real cert without exposing the server to the internet.
- Alternatively, use the **Upload File** button on a card's detail page instead of the live camera — this works over plain HTTP everywhere, since it uses your phone's existing camera app / photo picker rather than in-browser camera access.

The on-device OCR ("Extract Text") feature downloads a language model the first time it runs, in-browser, from a public CDN — it needs outbound internet access on whatever device is running the scan (once cached by that browser, it works offline after).

## Tech stack

- **Backend**: Node.js + Express + better-sqlite3 (single-file SQLite database), express-session for auth
- **Frontend**: React + Vite, served as static files by the same Express server in production
- **Export**: `exceljs` (Excel), `pdfkit` (PDF), `qrcode` (label QR codes)
- **Scanning**: browser `getUserMedia` (camera), `@zxing/browser` (barcode/QR decode), `tesseract.js` (OCR)
- **Container**: single multi-stage Dockerfile, one container, one bind-mounted data volume

## Project layout

```
Card-Hub/
  server/            Express API + SQLite schema/migrations
  client/            React frontend (Vite)
  data/              SQLite DB + uploaded card images (gitignored, created at runtime)
  unraid/
    card-hub.xml     Unraid Community Applications template
    icon.png         app icon
  .github/workflows/ CI (build check) + release (tag -> build & push to Docker Hub)
  Dockerfile
  docker-compose.yml
  UNRAID.md
```

## Releasing a new version

Push a `v*` tag (or run the `release` workflow manually from the Actions tab with a version
input) — this builds the image for `linux/amd64`, pushes `allornothing/card-hub:latest` and
`:<version>` to Docker Hub, and cuts a GitHub release with auto-generated notes. Requires a
`DOCKERHUB_TOKEN` repository secret (a Docker Hub access token with Read & Write) and, optionally,
a `DOCKERHUB_USERNAME` repository variable (defaults to `allornothing`).
