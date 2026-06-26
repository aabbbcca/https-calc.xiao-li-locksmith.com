CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  bill_name TEXT NOT NULL,
  payer TEXT NOT NULL,
  original_charged_twd INTEGER NOT NULL,
  charged_twd_with_fee INTEGER NOT NULL,
  subtotal_cad REAL NOT NULL,
  total_tax_cad REAL NOT NULL,
  total_cad REAL NOT NULL,
  exchange_rate REAL NOT NULL,
  people_json TEXT NOT NULL,
  settlements_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trips_code ON trips(code);
CREATE INDEX IF NOT EXISTS idx_bills_trip_id_created_at ON bills(trip_id, created_at DESC);
