const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const multer = require('multer');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// multer — store uploads as base64 in DB (no disk dependency on Render)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// ─── DATABASE ────────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || 'restaurant.db';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      restaurant_name TEXT DEFAULT 'My Restaurant',
      currency TEXT DEFAULT '₹',
      wifi_name TEXT DEFAULT '',
      wifi_ip TEXT DEFAULT '',
      logo TEXT DEFAULT '',
      banner TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER UNIQUE NOT NULL,
      status TEXT DEFAULT 'available'
    );
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      veg INTEGER DEFAULT 1,
      available INTEGER DEFAULT 1,
      image TEXT,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number INTEGER NOT NULL,
      table_number INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      is_urgent INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      item_id TEXT,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS order_history (
      id TEXT PRIMARY KEY,
      order_number INTEGER NOT NULL,
      table_number INTEGER NOT NULL,
      total REAL NOT NULL,
      timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS order_history_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES order_history(id)
    );
  `);

  // Migrate old settings table → config if needed
  const oldSettings = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get();
  if (oldSettings) {
    const old = db.prepare('SELECT * FROM settings WHERE id=1').get();
    if (old) {
      const configExists = db.prepare('SELECT id FROM config WHERE id=1').get();
      if (!configExists) {
        db.prepare('INSERT INTO config (id,restaurant_name,currency,wifi_name,wifi_ip,logo,banner) VALUES (1,?,?,?,?,?,?)')
          .run(old.restaurant_name || 'My Restaurant', old.currency || '₹', old.wifi_name || '', '', '', '');
      }
    }
  }

  const configExists = db.prepare('SELECT id FROM config WHERE id=1').get();
  if (!configExists) {
    db.prepare('INSERT INTO config (id,restaurant_name,currency,wifi_name,wifi_ip,logo,banner) VALUES (1,?,?,?,?,?,?)')
      .run('My Restaurant', '₹', '', '', '', '');
  }

  for (let i = 1; i <= 15; i++) {
    db.prepare('INSERT OR IGNORE INTO tables (table_number,status) VALUES (?,?)').run(i, 'available');
  }

  const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
  if (menuCount.count === 0) {
    const ins = db.prepare('INSERT INTO menu_items (id,name,category,price,veg,available,image,description) VALUES (?,?,?,?,?,1,?,?)');
    [
      [uuidv4(),'Paneer Tikka','Starters',180,1,'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400','Grilled cottage cheese marinated in spices'],
      [uuidv4(),'Chicken Tikka','Starters',220,0,'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400','Tender chicken pieces marinated and grilled'],
      [uuidv4(),'Veg Spring Roll','Starters',140,1,'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400','Crispy rolls filled with fresh vegetables'],
      [uuidv4(),'Chicken Wings','Starters',200,0,'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400','Spicy and juicy chicken wings'],
      [uuidv4(),'Butter Chicken','Main Course',280,0,'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400','Creamy tomato-based chicken curry'],
      [uuidv4(),'Dal Makhani','Main Course',180,1,'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400','Rich and creamy black lentil curry'],
      [uuidv4(),'Paneer Butter Masala','Main Course',240,1,'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400','Cottage cheese in rich tomato gravy'],
      [uuidv4(),'Chicken Curry','Main Course',260,0,'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400','Traditional chicken curry with spices'],
      [uuidv4(),'Veg Biryani','Main Course',220,1,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400','Fragrant rice with mixed vegetables'],
      [uuidv4(),'Chicken Biryani','Main Course',280,0,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400','Aromatic rice with tender chicken'],
      [uuidv4(),'Tandoori Roti','Breads',20,1,'https://images.unsplash.com/photo-1619466234386-daea30c4c728?w=400','Traditional clay oven baked bread'],
      [uuidv4(),'Butter Naan','Breads',35,1,'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400','Soft flatbread with butter'],
      [uuidv4(),'Garlic Naan','Breads',45,1,'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400','Naan topped with garlic and herbs'],
      [uuidv4(),'Jeera Rice','Rice',120,1,'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400','Fragrant basmati rice with cumin'],
      [uuidv4(),'Plain Rice','Rice',80,1,'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400','Steamed basmati rice'],
      [uuidv4(),'Sweet Lassi','Beverages',60,1,'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400','Sweet yogurt-based drink'],
      [uuidv4(),'Cold Drink','Beverages',40,1,'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400','Chilled soft drink'],
      [uuidv4(),'Mineral Water','Beverages',20,1,'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400','Purified bottled water'],
      [uuidv4(),'Gulab Jamun','Desserts',80,1,'https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?w=400','Sweet milk balls in sugar syrup'],
      [uuidv4(),'Ice Cream','Desserts',90,1,'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400','Assorted flavors'],
    ].forEach(item => ins.run(...item));
  }
  console.log('✅ Database initialized');
}

initDatabase();

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getConfig() {
  const c = db.prepare('SELECT * FROM config WHERE id=1').get();
  return { restaurantName: c.restaurant_name, currency: c.currency, wifiName: c.wifi_name, wifiIp: c.wifi_ip, logo: c.logo, banner: c.banner };
}

function getNextOrderNumber() {
  const a = db.prepare('SELECT COUNT(*) as count FROM orders').get();
  const h = db.prepare('SELECT COUNT(*) as count FROM order_history').get();
  return a.count + h.count + 1;
}

function normalizeMenuItem(item) {
  return { ...item, veg: item.veg === 1, available: item.available === 1 };
}

function getActiveOrdersWithItems() {
  return db.prepare('SELECT * FROM orders ORDER BY is_urgent DESC, timestamp ASC').all().map(order => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
    return { ...order, isUrgent: order.is_urgent === 1, orderNumber: order.order_number, tableNumber: order.table_number, createdAt: order.created_at, items: items.map(i => ({ ...i, id: i.item_id, name: i.item_name })) };
  });
}

function getOrderHistory() {
  return db.prepare('SELECT * FROM order_history ORDER BY completed_at DESC').all().map(order => {
    const items = db.prepare('SELECT * FROM order_history_items WHERE order_id=?').all(order.id);
    return { ...order, isUrgent: false, orderNumber: order.order_number, tableNumber: order.table_number, createdAt: order.created_at, completedAt: order.completed_at, items: items.map(i => ({ name: i.item_name, quantity: i.quantity, price: i.price })) };
  });
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || req.ip || '';
}

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join-kitchen', () => {
    socket.join('kitchen');
    socket.emit('orders-update', getActiveOrdersWithItems());
  });
  socket.on('join-admin', () => {
    socket.join('admin');
    socket.emit('admin-data', {
      orders: getActiveOrdersWithItems(),
      orderHistory: getOrderHistory(),
      menu: db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normalizeMenuItem),
      tables: db.prepare('SELECT * FROM tables ORDER BY table_number').all()
    });
  });
});

// ─── API: CONFIG (system-config page) ─────────────────────────────────────────
app.get('/api/config', (req, res) => res.json(getConfig()));

app.post('/api/config', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), (req, res) => {
  try {
    const { restaurantName, currency, wifiName, wifiIp } = req.body;
    const current = getConfig();

    let logo = current.logo;
    let banner = current.banner;

    if (req.files && req.files['logo'] && req.files['logo'][0]) {
      const f = req.files['logo'][0];
      logo = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`;
    } else if (req.body.logoUrl !== undefined) {
      logo = req.body.logoUrl;
    }

    if (req.files && req.files['banner'] && req.files['banner'][0]) {
      const f = req.files['banner'][0];
      banner = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`;
    } else if (req.body.bannerUrl !== undefined) {
      banner = req.body.bannerUrl;
    }

    db.prepare('UPDATE config SET restaurant_name=?,currency=?,wifi_name=?,wifi_ip=?,logo=?,banner=? WHERE id=1')
      .run(restaurantName || 'My Restaurant', currency || '₹', wifiName || '', wifiIp || '', logo, banner);

    io.emit('config-update', getConfig());
    res.json({ success: true, config: getConfig() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: WIFI CHECK (server-side IP validation) ─────────────────────────────
app.get('/api/wifi-check', (req, res) => {
  const cfg = getConfig();
  const clientIp = getClientIp(req);

  // If no wifi_ip configured → always allow
  if (!cfg.wifiIp || cfg.wifiIp.trim() === '') {
    return res.json({ allowed: true, clientIp, reason: 'No restriction configured' });
  }

  // Check if clientIp starts with the configured prefix
  // e.g. wifiIp = "192.168.1" matches any "192.168.1.x"
  const prefix = cfg.wifiIp.trim();
  const allowed = clientIp.startsWith(prefix) || clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.includes('127.0.0.1');

  res.json({ allowed, clientIp, wifiName: cfg.wifiName, reason: allowed ? 'IP matched' : 'IP not in restaurant network' });
});

// ─── API: SETTINGS (kept for backward compat, proxies to config) ──────────────
app.get('/api/settings', (req, res) => {
  const c = getConfig();
  res.json({ restaurantName: c.restaurantName, currency: c.currency, wifiName: c.wifiName });
});

app.put('/api/settings', (req, res) => {
  const { restaurantName, currency, wifiName } = req.body;
  const c = getConfig();
  db.prepare('UPDATE config SET restaurant_name=?,currency=?,wifi_name=? WHERE id=1')
    .run(restaurantName || c.restaurantName, currency || c.currency, wifiName || '');
  res.json({ success: true });
});

// ─── API: TABLES ─────────────────────────────────────────────────────────────
app.get('/api/tables', (req, res) => res.json(db.prepare('SELECT * FROM tables ORDER BY table_number').all()));

// ─── API: MENU ────────────────────────────────────────────────────────────────
app.get('/api/menu', (req, res) => res.json(db.prepare('SELECT * FROM menu_items WHERE available=1 ORDER BY category,name').all().map(normalizeMenuItem)));
app.get('/api/menu/all', (req, res) => res.json(db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normalizeMenuItem)));

app.post('/api/menu', (req, res) => {
  try {
    const { name, category, price, veg, description, image } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO menu_items (id,name,category,price,veg,available,image,description) VALUES (?,?,?,?,?,1,?,?)').run(id, name, category, price, veg ? 1 : 0, image || '', description || '');
    io.emit('menu-update', db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normalizeMenuItem));
    res.status(201).json({ success: true, item: normalizeMenuItem(db.prepare('SELECT * FROM menu_items WHERE id=?').get(id)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/menu/:itemId', (req, res) => {
  try {
    const { name, category, price, veg, description, image, available } = req.body;
    db.prepare('UPDATE menu_items SET name=?,category=?,price=?,veg=?,description=?,image=?,available=? WHERE id=?')
      .run(name, category, price, veg ? 1 : 0, description || '', image || '', available !== undefined ? (available ? 1 : 0) : 1, req.params.itemId);
    io.emit('menu-update', db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normalizeMenuItem));
    res.json({ success: true, item: normalizeMenuItem(db.prepare('SELECT * FROM menu_items WHERE id=?').get(req.params.itemId)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/menu/:itemId', (req, res) => {
  try {
    db.prepare('DELETE FROM menu_items WHERE id=?').run(req.params.itemId);
    io.emit('menu-update', db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normalizeMenuItem));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: ORDERS ──────────────────────────────────────────────────────────────
app.post('/api/order', (req, res) => {
  try {
    const { tableNumber, items } = req.body;
    if (!tableNumber || !items || !items.length) return res.status(400).json({ error: 'Invalid order data' });
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const activeCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE table_number=? AND status!='completed'").get(tableNumber).count;
    const isUrgent = activeCount > 0 ? 1 : 0;
    const now = new Date();
    const orderId = uuidv4();
    const orderNumber = getNextOrderNumber();
    db.prepare('INSERT INTO orders (id,order_number,table_number,total,status,is_urgent,timestamp,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(orderId, orderNumber, tableNumber, total, 'pending', isUrgent, now.toISOString(), now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    items.forEach(item => db.prepare('INSERT INTO order_items (order_id,item_id,item_name,quantity,price) VALUES (?,?,?,?,?)').run(orderId, item.id, item.name, item.quantity, item.price));
    db.prepare("UPDATE tables SET status='occupied' WHERE table_number=?").run(tableNumber);
    const newOrder = { id: orderId, orderNumber, tableNumber, total, status: 'pending', isUrgent: isUrgent === 1, timestamp: now.toISOString(), createdAt: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), items };
    io.to('kitchen').emit('new-order', newOrder);
    io.to('admin').emit('new-order', newOrder);
    res.status(201).json({ success: true, order: newOrder, message: isUrgent ? 'Additional order placed!' : 'Order placed successfully!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders', (req, res) => res.json(getActiveOrdersWithItems()));
app.get('/api/orders/history', (req, res) => res.json(getOrderHistory()));

app.get('/api/orders/table/:tableNumber', (req, res) => {
  const tNum = parseInt(req.params.tableNumber);
  const orders = db.prepare('SELECT * FROM orders WHERE table_number=?').all(tNum);
  res.json(orders.map(o => ({ ...o, isUrgent: o.is_urgent === 1, orderNumber: o.order_number, tableNumber: o.table_number, items: db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id).map(i => ({ ...i, name: i.item_name })) })));
});

// Bill for a table (all active orders aggregated)
app.get('/api/bill/table/:tableNumber', (req, res) => {
  try {
    const tNum = parseInt(req.params.tableNumber);
    const orders = db.prepare('SELECT * FROM orders WHERE table_number=?').all(tNum);
    const allItems = [];
    let grandTotal = 0;
    orders.forEach(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
      items.forEach(i => {
        const existing = allItems.find(a => a.item_name === i.item_name && a.price === i.price);
        if (existing) existing.quantity += i.quantity;
        else allItems.push({ item_name: i.item_name, quantity: i.quantity, price: i.price });
      });
      grandTotal += order.total;
    });
    const cfg = getConfig();
    res.json({
      tableNumber: tNum,
      orders: orders.map(o => ({ ...o, orderNumber: o.order_number, createdAt: o.created_at })),
      items: allItems,
      grandTotal,
      currency: cfg.currency,
      restaurantName: cfg.restaurantName,
      generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/order/:orderId/status', (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (status === 'completed') {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(orderId);
      const completedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      db.prepare('INSERT INTO order_history (id,order_number,table_number,total,timestamp,created_at,completed_at) VALUES (?,?,?,?,?,?,?)')
        .run(order.id, order.order_number, order.table_number, order.total, order.timestamp, order.created_at, completedAt);
      items.forEach(i => db.prepare('INSERT INTO order_history_items (order_id,item_name,quantity,price) VALUES (?,?,?,?)').run(orderId, i.item_name, i.quantity, i.price));
      db.prepare('DELETE FROM order_items WHERE order_id=?').run(orderId);
      db.prepare('DELETE FROM orders WHERE id=?').run(orderId);
      if (db.prepare('SELECT COUNT(*) as count FROM orders WHERE table_number=?').get(order.table_number).count === 0)
        db.prepare("UPDATE tables SET status='available' WHERE table_number=?").run(order.table_number);
    } else {
      db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, orderId);
    }
    io.to('kitchen').emit('order-status-update', { orderId, status });
    io.to('admin').emit('order-status-update', { orderId, status });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Complete all orders for a table at once (bill payment)
app.post('/api/bill/table/:tableNumber/complete', (req, res) => {
  try {
    const tNum = parseInt(req.params.tableNumber);
    const orders = db.prepare('SELECT * FROM orders WHERE table_number=?').all(tNum);
    const completedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    orders.forEach(order => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
      db.prepare('INSERT OR IGNORE INTO order_history (id,order_number,table_number,total,timestamp,created_at,completed_at) VALUES (?,?,?,?,?,?,?)')
        .run(order.id, order.order_number, order.table_number, order.total, order.timestamp, order.created_at, completedAt);
      items.forEach(i => db.prepare('INSERT INTO order_history_items (order_id,item_name,quantity,price) VALUES (?,?,?,?)').run(order.id, i.item_name, i.quantity, i.price));
      db.prepare('DELETE FROM order_items WHERE order_id=?').run(order.id);
      db.prepare('DELETE FROM orders WHERE id=?').run(order.id);
    });
    db.prepare("UPDATE tables SET status='available' WHERE table_number=?").run(tNum);
    io.to('kitchen').emit('orders-update', getActiveOrdersWithItems());
    io.to('admin').emit('orders-update', getActiveOrdersWithItems());
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: REPORTS ─────────────────────────────────────────────────────────────
app.get('/api/reports/today', (req, res) => {
  const today = new Date().toLocaleDateString('en-IN');
  const history = getOrderHistory();
  const todayOrders = history.filter(o => new Date(o.timestamp).toLocaleDateString('en-IN') === today);
  res.json({ date: today, totalOrders: todayOrders.length, totalSales: todayOrders.reduce((s, o) => s + o.total, 0), orders: todayOrders });
});

app.get('/api/reports/analytics', (req, res) => {
  try {
    const today = new Date().toLocaleDateString('en-IN');
    const history = getOrderHistory();
    const todayOrders = history.filter(o => new Date(o.timestamp).toLocaleDateString('en-IN') === today);
    const totalSales = todayOrders.reduce((s, o) => s + o.total, 0);

    // Table-wise orders (active)
    const activeOrders = getActiveOrdersWithItems();
    const tableMap = {};
    activeOrders.forEach(o => {
      if (!tableMap[o.tableNumber]) tableMap[o.tableNumber] = { tableNumber: o.tableNumber, orderCount: 0, total: 0 };
      tableMap[o.tableNumber].orderCount++;
      tableMap[o.tableNumber].total += o.total;
    });

    // Most ordered items today
    const itemMap = {};
    todayOrders.forEach(o => o.items.forEach(i => {
      if (!itemMap[i.name]) itemMap[i.name] = { name: i.name, count: 0 };
      itemMap[i.name].count += i.quantity;
    }));
    const topItems = Object.values(itemMap).sort((a, b) => b.count - a.count).slice(0, 5);

    res.json({
      todayOrders: todayOrders.length,
      todaySales: totalSales,
      activeOrders: activeOrders.length,
      tableWise: Object.values(tableMap),
      topItems
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API: QR CODES ────────────────────────────────────────────────────────────
app.get('/api/qr/:tableNumber', async (req, res) => {
  const url = `${req.protocol}://${req.get('host')}/order?table=${req.params.tableNumber}`;
  res.json({ tableNumber: req.params.tableNumber, qrCode: await QRCode.toDataURL(url, { width: 300, margin: 2 }), url });
});

app.get('/api/qr/generate/all', async (req, res) => {
  const tables = db.prepare('SELECT * FROM tables ORDER BY table_number').all();
  const qrCodes = await Promise.all(tables.map(async t => {
    const url = `${req.protocol}://${req.get('host')}/order?table=${t.table_number}`;
    return { tableNumber: t.table_number, qrCode: await QRCode.toDataURL(url, { width: 300, margin: 2 }), url };
  }));
  res.json(qrCodes);
});

// ─── PAGES ────────────────────────────────────────────────────────────────────
app.get('/order', (req, res) => res.sendFile(path.join(__dirname, 'public', 'customer.html')));
app.get('/kitchen', (req, res) => res.sendFile(path.join(__dirname, 'public', 'kitchen.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/system-config', (req, res) => res.sendFile(path.join(__dirname, 'public', 'system-config.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🍽️  Server running on http://localhost:${PORT}`));
module.exports = { app, server };
