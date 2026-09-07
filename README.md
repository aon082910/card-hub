# Card-Hub (self-hosted)

[![tests](https://github.com/aon082910/card-hub/actions/workflows/tests.yml/badge.svg)](https://github.com/aon082910/card-hub/actions/workflows/tests.yml)

Source: [github.com/aon082910/card-hub](https://github.com/aon082910/card-hub) ·
Image: [hub.docker.com/r/allornothing/card-hub](https://hub.docker.com/r/allornothing/card-hub)

A self-hosted trading card / sports card collection manager modeled after [Ludex](https://www.ludex.com/), built to run on Docker / Unraid with a local SQLite database and no cloud dependency. Built independently as its own implementation; no Ludex code, assets, or branding are used.

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
- Barcode/QR scanner (on a card's detail page) to read a PSA/BGS/CGC cert barcode straight into the Cert Number field.
- On-device OCR ("Extract Text") pulls raw text off a card photo so you can copy player name / set text / card number into the form. This is text extraction, not a card-identification database — there's no licensed card catalog wired in to auto-identify a card from a photo.
- Offline scan queueing: if a photo capture fails because you're offline (e.g. scanning on your phone with a flaky connection), it's queued in the browser and retried automatically once you're back online.

**Sets & checklists**
- Define a set (name/year/manufacturer/total card count) and track completion against your actual collection.

**Want List & sharing**
- Mark a card's status as "Wanted" and it shows up on the dedicated **Want List** page.
- **Share links**: generate a public, read-only, no-login-required link for your want list, a single card, or any selection of cards from Collection (bulk-select → Share Selected). Shared data is deliberately limited to non-sensitive fields (no cost basis, purchase source, or storage location).

**Decks & binders**
- Group cards from your collection into a named **Deck** (a deck you play, or a binder page you're curating) without duplicating card records — a deck just references existing cards and a quantity.

**Grading**
- **Grading submission tracker**: log a card sent to PSA/BGS/CGC/SGC — service level, cost, tracking number, status (submitted/in progress/returned/cancelled), expected return date. Marking one "returned" with a grade updates the card itself.
- **Grading ROI calculator**: enter a card's raw value, grading cost, and estimated value at each grade tier, and see net profit/ROI per tier before you submit — no data saved, just a quick what-if tool.
- Three-tier value tracking per card: raw (ungraded) estimate, graded estimate, and last-sold price, alongside the existing single "current value."

**Consignment tracking**
- Flag a card as consigned (not fully owned) with the consignor's name and your payout percentage, so it's clearly distinguished from cards you own outright.

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
- Per-card value history, plus automated daily portfolio-value snapshots (configurable time-of-day, or trigger one manually) feeding the dashboard's value-over-time data.
- Pluggable price-lookup architecture (Settings → Automatic Price Lookup):
  - **TCGdex** (Pokemon), **YGOPRODeck** (Yu-Gi-Oh), and **Scryfall** (Magic) are real, working, free, keyless providers — "Refresh Value" on a card pulls a live price.
  - **[PokéWallet](https://www.pokewallet.io/)** (Pokemon) is also wired up but needs a free API key you register yourself at pokewallet.io.
  - eBay/TCGplayer-direct adapters are wired to real, documented APIs but require your own developer credentials — until you provide those they return a clear "not configured" message rather than fabricating a price.
  - "Manual" (default) means you enter values yourself.

**Marketplace listings**
- Track draft/active/sold listings per platform (eBay, WhatNot, COMC, Facebook, etc.) with price and link.
- eBay OAuth connection scaffold in Settings, implemented per eBay's published developer docs — **untested against a live eBay app** (this project has no eBay developer credentials to test with). Register your own app at developer.ebay.com, paste in the Client ID/Secret/redirect URI, and verify before relying on it.

**Export & import**
- Excel (.xlsx), CSV, and PDF export of the full collection or a filtered subset, with selectable presets: full columns, an insurance-report column set (grading, location, value), or a tax/cost-basis column set.
- Photo Catalog PDF — each card's front photo next to its details.
- Printable label sheets — a QR code (linking back to the card) plus name/set/number, for storage bins/binders/boxes. Print all filtered cards or just your current selection from Collection.
- Re-import an exported (or edited) Excel/CSV file to bulk-add cards.
- **Import from another app** (Reports → Import From Another App): [TCDB](https://www.tcdb.com/), [CollX](https://collx.app/), [Slabfy](https://slabfy.com/), [ManaBox](https://manabox.app/), and [Eyevo](https://eyevotcg.com/) don't publish a public developer API, so there's no automatic sync for them (verified directly against each site — none document API access as of this writing). If one of them can export your collection to CSV/Excel, upload it here and map its columns to Card-Hub's fields yourself — no fixed format assumed.

**Multi-user & activity**
- Simple login (session-based). A default admin account is created on first run — see below.
- Admins can add/remove additional user accounts.
- Every create/update/delete is recorded to an activity/audit log (Settings → Activity Log), including who did it.

**Appearance & installability**
- Dark/light theme toggle (defaults to your OS preference, remembered per-browser).
- Installable as a PWA (Add to Home Screen) with an offline-capable app shell.
- Multi-language UI: English, Spanish, and French. Covers navigation and common action labels; page-internal form field labels are still English-only — the dictionary structure (`client/src/i18n.jsx`) is set up so more strings/languages can be added incrementally.

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
