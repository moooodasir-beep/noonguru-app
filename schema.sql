-- NoonGuru Supply Chain Pro — PostgreSQL Schema
-- Run this once to set up your database

CREATE DATABASE noonguru;
\c noonguru;

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  platforms JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  asin TEXT,
  fnsku TEXT,
  variation TEXT,
  specification TEXT,
  category TEXT,
  platform TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Orders
-- items is stored as JSONB array (mirrors the React state structure exactly)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_name TEXT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  platform TEXT,
  status TEXT DEFAULT 'Pending',
  po_date DATE,
  selling_price NUMERIC(12,4),
  shipping_mode TEXT,
  total_shipping NUMERIC(12,4),
  three_pl NUMERIC(12,4),
  customs NUMERIC(12,4),
  forwarder TEXT,
  tracking_id TEXT,
  eta DATE,
  origin TEXT,
  invoice_url TEXT,
  packing_url TEXT,
  bol_url TEXT,
  other_url TEXT,
  notes TEXT,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipments
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  linked_po_id TEXT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  platform TEXT,
  mode TEXT DEFAULT 'Sea',
  status TEXT DEFAULT 'Preparing',
  tracking_id TEXT,
  expected_delivery DATE,
  origin TEXT,
  destination TEXT,
  notes TEXT,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at    BEFORE UPDATE ON clients         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_updated_at   BEFORE UPDATE ON products        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated_at     BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER shipments_updated_at  BEFORE UPDATE ON shipments       FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_orders_client    ON purchase_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_shipments_client ON shipments(client_id);
CREATE INDEX IF NOT EXISTS idx_shipments_po     ON shipments(linked_po_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
