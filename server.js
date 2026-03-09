const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const Database = require('better-sqlite3');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'smartorder-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

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
      banner TEXT DEFAULT '',
      admin_password TEXT DEFAULT 'admin123',
      kitchen_password TEXT DEFAULT 'kitchen123',
      cgst REAL DEFAULT 2.5,
      sgst REAL DEFAULT 2.5
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

  // add new columns if upgrading from old DB
  const cols = db.prepare("PRAGMA table_info(config)").all().map(c => c.name);
  if (!cols.includes('admin_password')) db.prepare("ALTER TABLE config ADD COLUMN admin_password TEXT DEFAULT 'admin123'").run();
  if (!cols.includes('kitchen_password')) db.prepare("ALTER TABLE config ADD COLUMN kitchen_password TEXT DEFAULT 'kitchen123'").run();
  if (!cols.includes('cgst')) db.prepare("ALTER TABLE config ADD COLUMN cgst REAL DEFAULT 2.5").run();
  if (!cols.includes('sgst')) db.prepare("ALTER TABLE config ADD COLUMN sgst REAL DEFAULT 2.5").run();
  if (!cols.includes('wifi_ip')) db.prepare("ALTER TABLE config ADD COLUMN wifi_ip TEXT DEFAULT ''").run();
  if (!cols.includes('logo')) db.prepare("ALTER TABLE config ADD COLUMN logo TEXT DEFAULT ''").run();
  if (!cols.includes('banner')) db.prepare("ALTER TABLE config ADD COLUMN banner TEXT DEFAULT ''").run();

  const cfgExists = db.prepare('SELECT id FROM config WHERE id=1').get();
  if (!cfgExists) db.prepare("INSERT INTO config (id,restaurant_name,currency,wifi_name,wifi_ip,logo,banner,admin_password,kitchen_password,cgst,sgst) VALUES (1,'My Restaurant','₹','','','','','admin123','kitchen123',2.5,2.5)").run();

  for (let i = 1; i <= 15; i++) db.prepare('INSERT OR IGNORE INTO tables (table_number,status) VALUES (?,?)').run(i, 'available');

  if (db.prepare('SELECT COUNT(*) as c FROM menu_items').get().c === 0) {
    const ins = db.prepare('INSERT INTO menu_items (id,name,category,price,veg,available,image,description) VALUES (?,?,?,?,?,1,?,?)');
    [
      [uuidv4(),'Paneer Tikka','Starters',180,1,'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400','Grilled cottage cheese marinated in spices'],
      [uuidv4(),'Chicken Tikka','Starters',220,0,'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400','Tender chicken pieces marinated and grilled'],
      [uuidv4(),'Veg Spring Roll','Starters',140,1,'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400','Crispy rolls filled with fresh vegetables'],
      [uuidv4(),'Chicken Wings','Starters',200,0,'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400','Spicy and juicy chicken wings'],
      [uuidv4(),'Butter Chicken','Main Course',280,0,'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400','Creamy tomato-based chicken curry'],
      [uuidv4(),'Dal Makhani','Main Course',180,1,'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400','Rich and creamy black lentil curry'],
      [uuidv4(),'Paneer Butter Masala','Main Course',240,1,'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400','Cottage cheese in rich tomato gravy'],
      [uuidv4(),'Chicken Biryani','Main Course',280,0,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400','Aromatic rice with tender chicken'],
      [uuidv4(),'Veg Biryani','Main Course',220,1,'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400','Fragrant rice with mixed vegetables'],
      [uuidv4(),'Butter Naan','Breads',35,1,'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400','Soft flatbread with butter'],
      [uuidv4(),'Garlic Naan','Breads',45,1,'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400','Naan topped with garlic and herbs'],
      [uuidv4(),'Tandoori Roti','Breads',20,1,'https://images.unsplash.com/photo-1619466234386-daea30c4c728?w=400','Traditional clay oven baked bread'],
      [uuidv4(),'Jeera Rice','Rice',120,1,'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400','Fragrant basmati rice with cumin'],
      [uuidv4(),'Plain Rice','Rice',80,1,'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400','Steamed basmati rice'],
      [uuidv4(),'Sweet Lassi','Beverages',60,1,'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400','Sweet yogurt-based drink'],
      [uuidv4(),'Cold Drink','Beverages',40,1,'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400','Chilled soft drink'],
      [uuidv4(),'Mineral Water','Beverages',20,1,'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400','Purified bottled water'],
      [uuidv4(),'Gulab Jamun','Desserts',80,1,'https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?w=400','Sweet milk balls in sugar syrup'],
      [uuidv4(),'Ice Cream','Desserts',90,1,'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400','Assorted flavors'],
    ].forEach(i => ins.run(...i));
  }
  console.log('✅ DB ready at', DB_PATH);
}
initDatabase();

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getConfig() {
  const c = db.prepare('SELECT * FROM config WHERE id=1').get();
  return { restaurantName:c.restaurant_name, currency:c.currency, wifiName:c.wifi_name, wifiIp:c.wifi_ip, logo:c.logo, banner:c.banner, cgst:c.cgst||2.5, sgst:c.sgst||2.5, adminPassword:c.admin_password, kitchenPassword:c.kitchen_password };
}
function getNextOrderNumber() {
  return db.prepare('SELECT COUNT(*) as c FROM orders').get().c + db.prepare('SELECT COUNT(*) as c FROM order_history').get().c + 1;
}
function normItem(item) { return { ...item, veg: item.veg===1, available: item.available===1 }; }
function getActiveOrders() {
  return db.prepare('SELECT * FROM orders ORDER BY is_urgent DESC, timestamp ASC').all().map(o => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id);
    return { ...o, isUrgent:o.is_urgent===1, orderNumber:o.order_number, tableNumber:o.table_number, createdAt:o.created_at, items:items.map(i=>({...i,id:i.item_id,name:i.item_name})) };
  });
}
function getHistory() {
  return db.prepare('SELECT * FROM order_history ORDER BY completed_at DESC').all().map(o => {
    const items = db.prepare('SELECT * FROM order_history_items WHERE order_id=?').all(o.id);
    return { ...o, isUrgent:false, orderNumber:o.order_number, tableNumber:o.table_number, createdAt:o.created_at, completedAt:o.completed_at, items:items.map(i=>({name:i.item_name,quantity:i.quantity,price:i.price})) };
  });
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') return next();
  res.redirect('/login?role=admin&next=' + encodeURIComponent(req.path));
}
function requireKitchen(req, res, next) {
  if (req.session && (req.session.role === 'admin' || req.session.role === 'kitchen')) return next();
  res.redirect('/login?role=kitchen&next=' + encodeURIComponent(req.path));
}

// ─── AUTH API ─────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password, role } = req.body;
  const cfg = getConfig();
  if (role === 'admin' && password === cfg.adminPassword) {
    req.session.role = 'admin'; req.session.save();
    return res.json({ success:true, role:'admin' });
  }
  if (role === 'kitchen' && (password === cfg.kitchenPassword || password === cfg.adminPassword)) {
    req.session.role = 'kitchen'; req.session.save();
    return res.json({ success:true, role:'kitchen' });
  }
  res.status(401).json({ error:'Wrong password' });
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success:true }); });
app.get('/api/auth-check', (req, res) => res.json({ loggedIn:!!(req.session && req.session.role), role:req.session?.role||null }));

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.on('connection', socket => {
  socket.on('join-kitchen', () => { socket.join('kitchen'); socket.emit('orders-update', getActiveOrders()); });
  socket.on('join-admin', () => {
    socket.join('admin');
    socket.emit('admin-data', { orders:getActiveOrders(), orderHistory:getHistory(), menu:db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normItem), tables:db.prepare('SELECT * FROM tables ORDER BY table_number').all() });
  });
});

// ─── CONFIG API ───────────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  const c = getConfig();
  // hide passwords from public config
  res.json({ restaurantName:c.restaurantName, currency:c.currency, wifiName:c.wifiName, wifiIp:c.wifiIp, logo:c.logo, banner:c.banner, cgst:c.cgst, sgst:c.sgst });
});
app.get('/api/config/full', requireAdmin, (req, res) => res.json(getConfig()));

app.post('/api/config', requireAdmin, upload.fields([{name:'logo',maxCount:1},{name:'banner',maxCount:1}]), (req, res) => {
  try {
    const { restaurantName,currency,wifiName,wifiIp,adminPassword,kitchenPassword,cgst,sgst } = req.body;
    const cur = getConfig();
    let logo = cur.logo, banner = cur.banner;
    if (req.files?.logo?.[0]) { const f=req.files.logo[0]; logo=`data:${f.mimetype};base64,${f.buffer.toString('base64')}`; }
    else if (req.body.logoUrl !== undefined) logo = req.body.logoUrl || cur.logo;
    if (req.files?.banner?.[0]) { const f=req.files.banner[0]; banner=`data:${f.mimetype};base64,${f.buffer.toString('base64')}`; }
    else if (req.body.bannerUrl !== undefined) banner = req.body.bannerUrl || cur.banner;
    db.prepare('UPDATE config SET restaurant_name=?,currency=?,wifi_name=?,wifi_ip=?,logo=?,banner=?,admin_password=?,kitchen_password=?,cgst=?,sgst=? WHERE id=1')
      .run(restaurantName||cur.restaurantName, currency||'₹', wifiName||'', wifiIp||'', logo, banner,
           adminPassword||cur.adminPassword, kitchenPassword||cur.kitchenPassword, parseFloat(cgst)||2.5, parseFloat(sgst)||2.5);
    io.emit('config-update', getConfig());
    res.json({ success:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ─── WIFI CHECK ───────────────────────────────────────────────────────────────
app.get('/api/wifi-check', (req, res) => {
  const cfg = getConfig();
  if (!cfg.wifiIp || !cfg.wifiIp.trim()) return res.json({ allowed:true });
  const ip = (req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
  const allowed = ip.startsWith(cfg.wifiIp.trim()) || ip.includes('127.0.0.1') || ip==='::1';
  res.json({ allowed, wifiName:cfg.wifiName });
});

// ─── MENU API ─────────────────────────────────────────────────────────────────
app.get('/api/menu', (req, res) => res.json(db.prepare('SELECT * FROM menu_items WHERE available=1 ORDER BY category,name').all().map(normItem)));
app.get('/api/menu/all', requireAdmin, (req, res) => res.json(db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normItem)));

app.post('/api/menu', requireAdmin, (req, res) => {
  const { name,category,price,veg,description,image } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO menu_items (id,name,category,price,veg,available,image,description) VALUES (?,?,?,?,?,1,?,?)').run(id,name,category,price,veg?1:0,image||'',description||'');
  io.emit('menu-update', db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normItem));
  res.status(201).json({ success:true, item:normItem(db.prepare('SELECT * FROM menu_items WHERE id=?').get(id)) });
});

app.put('/api/menu/:id', requireAdmin, (req, res) => {
  const { name,category,price,veg,description,image,available } = req.body;
  db.prepare('UPDATE menu_items SET name=?,category=?,price=?,veg=?,description=?,image=?,available=? WHERE id=?')
    .run(name,category,price,veg?1:0,description||'',image||'',available!==undefined?(available?1:0):1,req.params.id);
  io.emit('menu-update', db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normItem));
  res.json({ success:true });
});

app.patch('/api/menu/:id/toggle', requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM menu_items WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error:'Not found' });
  db.prepare('UPDATE menu_items SET available=? WHERE id=?').run(item.available===1?0:1, req.params.id);
  io.emit('menu-update', db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normItem));
  res.json({ success:true, available:item.available!==1 });
});

app.delete('/api/menu/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM menu_items WHERE id=?').run(req.params.id);
  io.emit('menu-update', db.prepare('SELECT * FROM menu_items ORDER BY category,name').all().map(normItem));
  res.json({ success:true });
});

// ─── ORDER API ────────────────────────────────────────────────────────────────
app.post('/api/order', (req, res) => {
  try {
    const { tableNumber, items } = req.body;
    if (!tableNumber || !items?.length) return res.status(400).json({ error:'Invalid order' });
    const total = items.reduce((s,i)=>s+i.price*i.quantity,0);
    const activeCount = db.prepare("SELECT COUNT(*) as c FROM orders WHERE table_number=? AND status!='completed'").get(tableNumber).c;
    const isUrgent = activeCount>0?1:0;
    const now = new Date();
    const orderId = uuidv4();
    const orderNumber = getNextOrderNumber();
    db.prepare('INSERT INTO orders (id,order_number,table_number,total,status,is_urgent,timestamp,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(orderId,orderNumber,tableNumber,total,'pending',isUrgent,now.toISOString(),now.toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}));
    items.forEach(i=>db.prepare('INSERT INTO order_items (order_id,item_id,item_name,quantity,price) VALUES (?,?,?,?,?)').run(orderId,i.id,i.name,i.quantity,i.price));
    db.prepare("UPDATE tables SET status='occupied' WHERE table_number=?").run(tableNumber);
    const newOrder = { id:orderId,orderNumber,tableNumber,total,status:'pending',isUrgent:isUrgent===1,timestamp:now.toISOString(),createdAt:now.toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}),items };
    io.to('kitchen').emit('new-order',newOrder);
    io.to('admin').emit('new-order',newOrder);
    res.status(201).json({ success:true, order:newOrder, message:isUrgent?'Additional order placed!':'Order placed successfully!' });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get('/api/orders', (req,res) => res.json(getActiveOrders()));
app.get('/api/orders/history', requireAdmin, (req,res) => res.json(getHistory()));
app.get('/api/orders/table/:n', (req,res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE table_number=?').all(parseInt(req.params.n));
  res.json(orders.map(o=>({...o,isUrgent:o.is_urgent===1,items:db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id).map(i=>({...i,name:i.item_name}))})));
});

app.put('/api/order/:id/status', (req,res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
    if (!order) return res.status(404).json({ error:'Not found' });
    const { status } = req.body;
    if (status==='completed') {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(req.params.id);
      const completedAt = new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
      db.prepare('INSERT INTO order_history (id,order_number,table_number,total,timestamp,created_at,completed_at) VALUES (?,?,?,?,?,?,?)')
        .run(order.id,order.order_number,order.table_number,order.total,order.timestamp,order.created_at,completedAt);
      items.forEach(i=>db.prepare('INSERT INTO order_history_items (order_id,item_name,quantity,price) VALUES (?,?,?,?)').run(order.id,i.item_name,i.quantity,i.price));
      db.prepare('DELETE FROM order_items WHERE order_id=?').run(req.params.id);
      db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
      if (!db.prepare('SELECT COUNT(*) as c FROM orders WHERE table_number=?').get(order.table_number).c)
        db.prepare("UPDATE tables SET status='available' WHERE table_number=?").run(order.table_number);
    } else {
      db.prepare('UPDATE orders SET status=? WHERE id=?').run(status,req.params.id);
    }
    io.to('kitchen').emit('order-status-update',{orderId:req.params.id,status});
    io.to('admin').emit('order-status-update',{orderId:req.params.id,status});
    res.json({ success:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// ─── BILL API ─────────────────────────────────────────────────────────────────
app.get('/api/bill/table/:n', requireAdmin, (req,res) => {
  const tNum = parseInt(req.params.n);
  const orders = db.prepare('SELECT * FROM orders WHERE table_number=?').all(tNum);
  const allItems = [];
  let subtotal = 0;
  orders.forEach(o => {
    db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id).forEach(i => {
      const ex = allItems.find(a=>a.item_name===i.item_name&&a.price===i.price);
      if (ex) ex.quantity+=i.quantity; else allItems.push({item_name:i.item_name,quantity:i.quantity,price:i.price});
    });
    subtotal+=o.total;
  });
  const cfg = getConfig();
  const cgstAmt = Math.round(subtotal*(cfg.cgst/100)*100)/100;
  const sgstAmt = Math.round(subtotal*(cfg.sgst/100)*100)/100;
  res.json({ tableNumber:tNum, orders:orders.map(o=>({...o,orderNumber:o.order_number,createdAt:o.created_at})), items:allItems, subtotal, cgst:cfg.cgst, sgst:cfg.sgst, cgstAmount:cgstAmt, sgstAmount:sgstAmt, grandTotal:Math.round((subtotal+cgstAmt+sgstAmt)*100)/100, currency:cfg.currency, restaurantName:cfg.restaurantName, logo:cfg.logo, generatedAt:new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}) });
});

app.post('/api/bill/table/:n/complete', requireAdmin, (req,res) => {
  const tNum = parseInt(req.params.n);
  const completedAt = new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'});
  db.prepare('SELECT * FROM orders WHERE table_number=?').all(tNum).forEach(order => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
    db.prepare('INSERT OR IGNORE INTO order_history (id,order_number,table_number,total,timestamp,created_at,completed_at) VALUES (?,?,?,?,?,?,?)').run(order.id,order.order_number,order.table_number,order.total,order.timestamp,order.created_at,completedAt);
    items.forEach(i=>db.prepare('INSERT INTO order_history_items (order_id,item_name,quantity,price) VALUES (?,?,?,?)').run(order.id,i.item_name,i.quantity,i.price));
    db.prepare('DELETE FROM order_items WHERE order_id=?').run(order.id);
    db.prepare('DELETE FROM orders WHERE id=?').run(order.id);
  });
  db.prepare("UPDATE tables SET status='available' WHERE table_number=?").run(tNum);
  io.emit('orders-update',getActiveOrders());
  res.json({ success:true });
});

// Table reset (without billing - just clear active orders)
app.post('/api/table/:n/reset', requireAdmin, (req,res) => {
  const tNum = parseInt(req.params.n);
  db.prepare('SELECT * FROM orders WHERE table_number=?').all(tNum).forEach(o => {
    db.prepare('DELETE FROM order_items WHERE order_id=?').run(o.id);
    db.prepare('DELETE FROM orders WHERE id=?').run(o.id);
  });
  db.prepare("UPDATE tables SET status='available' WHERE table_number=?").run(tNum);
  io.emit('orders-update',getActiveOrders());
  res.json({ success:true });
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────
app.get('/api/reports/today', requireAdmin, (req,res) => {
  const today = new Date().toLocaleDateString('en-IN');
  const h = getHistory().filter(o=>new Date(o.timestamp).toLocaleDateString('en-IN')===today);
  res.json({ date:today, totalOrders:h.length, totalSales:h.reduce((s,o)=>s+o.total,0), orders:h });
});

app.get('/api/reports/analytics', requireAdmin, (req,res) => {
  const today = new Date().toLocaleDateString('en-IN');
  const h = getHistory();
  const todayH = h.filter(o=>new Date(o.timestamp).toLocaleDateString('en-IN')===today);
  const active = getActiveOrders();
  const itemMap = {};
  todayH.forEach(o=>o.items.forEach(i=>{ if(!itemMap[i.name]) itemMap[i.name]={name:i.name,count:0}; itemMap[i.name].count+=i.quantity; }));
  const tableMap = {};
  active.forEach(o=>{ if(!tableMap[o.tableNumber]) tableMap[o.tableNumber]={tableNumber:o.tableNumber,orderCount:0,total:0}; tableMap[o.tableNumber].orderCount++; tableMap[o.tableNumber].total+=o.total; });
  const todaySales = todayH.reduce((s,o)=>s+o.total,0);
  const cfg = getConfig();
  res.json({ todayOrders:todayH.length, todaySales, activeOrders:active.length, tableWise:Object.values(tableMap), topItems:Object.values(itemMap).sort((a,b)=>b.count-a.count).slice(0,8), cgst:cfg.cgst, sgst:cfg.sgst, totalTax:Math.round(todaySales*((cfg.cgst+cfg.sgst)/100)*100)/100 });
});

app.get('/api/reports/dayclose', requireAdmin, (req,res) => {
  const today = new Date().toLocaleDateString('en-IN');
  const h = getHistory().filter(o=>new Date(o.timestamp).toLocaleDateString('en-IN')===today);
  const subtotal = h.reduce((s,o)=>s+o.total,0);
  const cfg = getConfig();
  const cgstAmt = Math.round(subtotal*(cfg.cgst/100)*100)/100;
  const sgstAmt = Math.round(subtotal*(cfg.sgst/100)*100)/100;
  const itemMap = {};
  h.forEach(o=>o.items.forEach(i=>{ if(!itemMap[i.name]) itemMap[i.name]={name:i.name,quantity:0,revenue:0}; itemMap[i.name].quantity+=i.quantity; itemMap[i.name].revenue+=i.price*i.quantity; }));
  res.json({ date:today, totalOrders:h.length, subtotal, cgstAmount:cgstAmt, sgstAmount:sgstAmt, grandTotal:Math.round((subtotal+cgstAmt+sgstAmt)*100)/100, currency:cfg.currency, restaurantName:cfg.restaurantName, logo:cfg.logo, cgst:cfg.cgst, sgst:cfg.sgst, itemSummary:Object.values(itemMap).sort((a,b)=>b.revenue-a.revenue), orders:h });
});

// ─── QR CODES ─────────────────────────────────────────────────────────────────
app.get('/api/qr/:n', async (req,res) => { const url=`${req.protocol}://${req.get('host')}/order?table=${req.params.n}`; res.json({ tableNumber:req.params.n, qrCode:await QRCode.toDataURL(url,{width:300,margin:2}), url }); });
app.get('/api/qr/generate/all', async (req,res) => {
  const tables = db.prepare('SELECT * FROM tables ORDER BY table_number').all();
  res.json(await Promise.all(tables.map(async t=>{ const url=`${req.protocol}://${req.get('host')}/order?table=${t.table_number}`; return { tableNumber:t.table_number, qrCode:await QRCode.toDataURL(url,{width:300,margin:2}), url }; })));
});

// ─── PAGES ────────────────────────────────────────────────────────────────────
app.get('/login', (req,res) => res.sendFile(path.join(__dirname,'public','login.html')));
app.get('/admin', requireAdmin, (req,res) => res.sendFile(path.join(__dirname,'public','admin.html')));
app.get('/kitchen', requireKitchen, (req,res) => res.sendFile(path.join(__dirname,'public','kitchen.html')));
app.get('/system-config', requireAdmin, (req,res) => res.sendFile(path.join(__dirname,'public','system-config.html')));
app.get('/order', (req,res) => res.sendFile(path.join(__dirname,'public','customer.html')));
app.get('/', (req,res) => res.sendFile(path.join(__dirname,'public','index.html')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🍽️  Running on http://localhost:${PORT} | DB: ${DB_PATH}`));
module.exports = { app, server };
