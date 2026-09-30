require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Database ────────────────────────────────────────────────────────────────
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     process.env.DB_PORT     || 5432,
      database: process.env.DB_NAME     || 'noonguru',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });

pool.connect()
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch(err => { console.error('❌ DB connection failed:', err.message); process.exit(1); });

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' })); // large because of base64 product images
app.use(express.static(path.join(__dirname, 'public')));

// ── Helper ──────────────────────────────────────────────────────────────────
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, l => '_' + l.toLowerCase());
}

// ── CLIENTS ─────────────────────────────────────────────────────────────────
app.get('/api/clients', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
    // Map snake_case → camelCase for frontend
    const clients = rows.map(r => ({
      id: r.id, name: r.name, contact: r.contact,
      email: r.email, phone: r.phone,
      platforms: r.platforms || []
    }));
    res.json(clients);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clients', async (req, res) => {
  const { id, name, contact, email, phone, platforms } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO clients (id, name, contact, email, phone, platforms)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE
       SET name=$2, contact=$3, email=$4, phone=$5, platforms=$6
       RETURNING *`,
      [id, name, contact||'', email||'', phone||'', JSON.stringify(platforms||[])]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clients WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PRODUCTS ─────────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    const products = rows.map(r => ({
      id: r.id, name: r.name, sku: r.sku, asin: r.asin,
      fnsku: r.fnsku, variation: r.variation, specification: r.specification,
      category: r.category, platform: r.platform, imageUrl: r.image_url
    }));
    res.json(products);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', async (req, res) => {
  const { id, name, sku, asin, fnsku, variation, specification, category, platform, imageUrl } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO products (id, name, sku, asin, fnsku, variation, specification, category, platform, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE
       SET name=$2, sku=$3, asin=$4, fnsku=$5, variation=$6,
           specification=$7, category=$8, platform=$9, image_url=$10
       RETURNING *`,
      [id, name, sku||'', asin||'', fnsku||'', variation||'', specification||'', category||'', platform||'', imageUrl||'']
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PURCHASE ORDERS ──────────────────────────────────────────────────────────
app.get('/api/orders', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM purchase_orders ORDER BY created_at DESC');
    const orders = rows.map(r => ({
      id: r.id, poName: r.po_name, clientId: r.client_id,
      platform: r.platform, status: r.status,
      poDate: r.po_date ? r.po_date.toISOString().slice(0,10) : '',
      sellingPrice: r.selling_price, shippingMode: r.shipping_mode,
      totalShipping: r.total_shipping, threePl: r.three_pl,
      customs: r.customs, forwarder: r.forwarder, trackingId: r.tracking_id,
      eta: r.eta ? r.eta.toISOString().slice(0,10) : '',
      origin: r.origin, invoiceUrl: r.invoice_url, packingUrl: r.packing_url,
      bolUrl: r.bol_url, otherUrl: r.other_url, notes: r.notes,
      items: r.items || []
    }));
    res.json(orders);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders', async (req, res) => {
  const o = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO purchase_orders
        (id, po_name, client_id, platform, status, po_date, selling_price,
         shipping_mode, total_shipping, three_pl, customs, forwarder, tracking_id,
         eta, origin, invoice_url, packing_url, bol_url, other_url, notes, items)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (id) DO UPDATE SET
         po_name=$2, client_id=$3, platform=$4, status=$5, po_date=$6,
         selling_price=$7, shipping_mode=$8, total_shipping=$9, three_pl=$10,
         customs=$11, forwarder=$12, tracking_id=$13, eta=$14, origin=$15,
         invoice_url=$16, packing_url=$17, bol_url=$18, other_url=$19,
         notes=$20, items=$21
       RETURNING *`,
      [
        o.id, o.poName||'', o.clientId||null, o.platform||'', o.status||'Pending',
        o.poDate||null, o.sellingPrice||null,
        o.shippingMode||'Sea', o.totalShipping||null, o.threePl||null,
        o.customs||null, o.forwarder||'', o.trackingId||'',
        o.eta||null, o.origin||'',
        o.invoiceUrl||'', o.packingUrl||'', o.bolUrl||'', o.otherUrl||'',
        o.notes||'', JSON.stringify(o.items||[])
      ]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM purchase_orders WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SHIPMENTS ────────────────────────────────────────────────────────────────
app.get('/api/shipments', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM shipments ORDER BY created_at DESC');
    const shipments = rows.map(r => ({
      id: r.id, clientId: r.client_id, linkedPoId: r.linked_po_id,
      platform: r.platform, mode: r.mode, status: r.status,
      trackingId: r.tracking_id,
      expectedDelivery: r.expected_delivery ? r.expected_delivery.toISOString().slice(0,10) : '',
      origin: r.origin, destination: r.destination,
      notes: r.notes, items: r.items || []
    }));
    res.json(shipments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/shipments', async (req, res) => {
  const s = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO shipments
        (id, client_id, linked_po_id, platform, mode, status,
         tracking_id, expected_delivery, origin, destination, notes, items)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         client_id=$2, linked_po_id=$3, platform=$4, mode=$5, status=$6,
         tracking_id=$7, expected_delivery=$8, origin=$9, destination=$10,
         notes=$11, items=$12
       RETURNING *`,
      [
        s.id, s.clientId||null, s.linkedPoId||null,
        s.platform||'', s.mode||'Sea', s.status||'Preparing',
        s.trackingId||'', s.expectedDelivery||null,
        s.origin||'', s.destination||'',
        s.notes||'', JSON.stringify(s.items||[])
      ]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/shipments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM shipments WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BULK EXPORT / IMPORT ─────────────────────────────────────────────────────
app.get('/api/export', async (req, res) => {
  try {
    const [cl, pr, or, sh] = await Promise.all([
      pool.query('SELECT * FROM clients'),
      pool.query('SELECT * FROM products'),
      pool.query('SELECT * FROM purchase_orders'),
      pool.query('SELECT * FROM shipments'),
    ]);
    res.json({
      _version: 6, _exported: new Date().toISOString(),
      clients: cl.rows, products: pr.rows,
      orders: or.rows, shipments: sh.rows
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Fallback: serve index.html for all non-API routes ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌙 NoonGuru Supply Chain Pro running at http://localhost:${PORT}`);
});
