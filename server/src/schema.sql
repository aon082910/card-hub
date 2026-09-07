-- Card-Hub database schema

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL DEFAULT 'sports',     -- sports | tcg | other
  sport_or_game TEXT,                          -- e.g. Basketball, Pokemon, Magic: The Gathering
  player_or_character TEXT,
  team_or_set TEXT,                            -- team (sports) or set name (tcg) - kept for quick display
  set_name TEXT,
  year TEXT,
  manufacturer TEXT,                           -- Panini, Topps, Pokemon Company, Wizards of the Coast...
  card_number TEXT,
  parallel_variant TEXT,                       -- e.g. Prizm Silver, Holo Rare
  rarity TEXT,
  is_graded INTEGER NOT NULL DEFAULT 0,
  grading_company TEXT,                        -- PSA, BGS, CGC, SGC...
  grade TEXT,
  cert_number TEXT,
  raw_condition TEXT,                          -- Near Mint, Lightly Played, etc (ungraded)
  serial_number TEXT,                          -- e.g. 12/99
  print_run INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  storage_location TEXT,
  tags TEXT,                                   -- comma-separated
  notes TEXT,
  cost_basis REAL,                             -- total cost for this line (quantity included)
  purchase_date TEXT,
  purchase_source TEXT,
  current_value REAL,                          -- latest known market value (per unit)
  raw_value REAL,                              -- estimated value if/as ungraded
  graded_value_estimate REAL,                  -- estimated value if graded (before submission)
  last_sold_value REAL,                        -- most recent observed comp/sold price
  is_consigned INTEGER NOT NULL DEFAULT 0,
  consignor_name TEXT,
  consignment_payout_pct REAL,                 -- % of sale price owed to the consignor
  status TEXT NOT NULL DEFAULT 'owned',         -- owned | listed | sold | archived
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS card_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  side TEXT DEFAULT 'front',                    -- front | back | other
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS value_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  value REAL NOT NULL,
  source TEXT,                                  -- manual | ebay | other
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quantity_sold INTEGER NOT NULL DEFAULT 1,
  sale_price REAL NOT NULL,
  fees REAL NOT NULL DEFAULT 0,
  shipping_cost REAL NOT NULL DEFAULT 0,
  platform TEXT,                                -- eBay, WhatNot, Local, COMC...
  buyer TEXT,
  sale_date TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,                       -- eBay, WhatNot, COMC, Facebook...
  list_price REAL,
  status TEXT NOT NULL DEFAULT 'draft',          -- draft | active | ended | sold
  external_url TEXT,
  external_id TEXT,
  listed_at TEXT,
  notes TEXT,
  ebay_offer_id TEXT,                            -- set when pushed live via the eBay Sell Inventory API
  ebay_sku TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',           -- admin | member
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username TEXT,
  action TEXT NOT NULL,                          -- create | update | delete | login | ...
  entity_type TEXT NOT NULL,                     -- card | sale | listing | user | set ...
  entity_id INTEGER,
  details TEXT,                                  -- free-text / JSON summary
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS card_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'sports',
  sport_or_game TEXT,
  year TEXT,
  manufacturer TEXT,
  total_cards INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total_value REAL NOT NULL,
  total_cost REAL NOT NULL,
  card_count INTEGER NOT NULL,
  taken_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grading_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  company TEXT NOT NULL,                         -- PSA | BGS | CGC | SGC ...
  service_level TEXT,                            -- e.g. Bulk, Regular, Express
  cost REAL,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',       -- submitted | in_progress | returned | cancelled
  submitted_at TEXT,
  expected_return_date TEXT,
  returned_at TEXT,
  resulting_grade TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tcg',
  sport_or_game TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deck_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,                        -- in (received) | out (given away)
  counterparty TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  value_estimate REAL,
  trade_date TEXT NOT NULL DEFAULT (date('now')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS share_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  label TEXT,
  kind TEXT NOT NULL DEFAULT 'selection',          -- selection | wanted
  card_ids TEXT,                                   -- JSON array, used when kind = 'selection'
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cards_category ON cards(category);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);
CREATE INDEX IF NOT EXISTS idx_card_images_card ON card_images(card_id);
CREATE INDEX IF NOT EXISTS idx_value_history_card ON value_history(card_id);
CREATE INDEX IF NOT EXISTS idx_sales_card ON sales(card_id);
CREATE INDEX IF NOT EXISTS idx_listings_card ON listings(card_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_taken_at ON portfolio_snapshots(taken_at);
