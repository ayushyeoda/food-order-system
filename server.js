const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-Memory Database (For production, use MongoDB/PostgreSQL)
let database = {
  tables: [],
  menu: [],
  orders: [],
  orderHistory: [],
  settings: {
    restaurantName: "My Restaurant",
    currency: "₹"
  }
};

// Initialize default data
function initializeDefaultData() {
  // Create 15 tables
  for (let i = 1; i <= 15; i++) {
    database.tables.push({
      id: i,
      tableNumber: i,
      qrCode: `TABLE-${i}`,
      status: 'available' // available, occupied
    });
  }

  // Default Menu with Images
  database.menu = [
    // Starters
    { id: uuidv4(), name: 'Paneer Tikka', category: 'Starters', price: 180, veg: true, available: true, image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=400', description: 'Grilled cottage cheese marinated in spices' },
    { id: uuidv4(), name: 'Chicken Tikka', category: 'Starters', price: 220, veg: false, available: true, image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400', description: 'Tender chicken pieces marinated and grilled' },
    { id: uuidv4(), name: 'Veg Spring Roll', category: 'Starters', price: 140, veg: true, available: true, image: 'https://images.unsplash.com/photo-1625398407796-82650a8c135f?w=400', description: 'Crispy rolls filled with fresh vegetables' },
    { id: uuidv4(), name: 'Chicken Wings', category: 'Starters', price: 200, veg: false, available: true, image: 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400', description: 'Spicy and juicy chicken wings' },
    
    // Main Course
    { id: uuidv4(), name: 'Butter Chicken', category: 'Main Course', price: 280, veg: false, available: true, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', description: 'Creamy tomato-based chicken curry' },
    { id: uuidv4(), name: 'Dal Makhani', category: 'Main Course', price: 180, veg: true, available: true, image: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=400', description: 'Rich and creamy black lentil curry' },
    { id: uuidv4(), name: 'Paneer Butter Masala', category: 'Main Course', price: 240, veg: true, available: true, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400', description: 'Cottage cheese in rich tomato gravy' },
    { id: uuidv4(), name: 'Chicken Curry', category: 'Main Course', price: 260, veg: false, available: true, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400', description: 'Traditional chicken curry with spices' },
    { id: uuidv4(), name: 'Veg Biryani', category: 'Main Course', price: 220, veg: true, available: true, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', description: 'Fragrant rice with mixed vegetables' },
    { id: uuidv4(), name: 'Chicken Biryani', category: 'Main Course', price: 280, veg: false, available: true, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', description: 'Aromatic rice with tender chicken' },
    
    // Breads
    { id: uuidv4(), name: 'Tandoori Roti', category: 'Breads', price: 20, veg: true, available: true, image: 'https://images.unsplash.com/photo-1619466234386-daea30c4c728?w=400', description: 'Traditional clay oven baked bread' },
    { id: uuidv4(), name: 'Butter Naan', category: 'Breads', price: 35, veg: true, available: true, image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=400', description: 'Soft flatbread with butter' },
    { id: uuidv4(), name: 'Garlic Naan', category: 'Breads', price: 45, veg: true, available: true, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400', description: 'Naan topped with garlic and herbs' },
    { id: uuidv4(), name: 'Missi Roti', category: 'Breads', price: 30, veg: true, available: true, image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400', description: 'Spiced gram flour flatbread' },
    
    // Rice
    { id: uuidv4(), name: 'Jeera Rice', category: 'Rice', price: 120, veg: true, available: true, image: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400', description: 'Fragrant basmati rice with cumin' },
    { id: uuidv4(), name: 'Plain Rice', category: 'Rice', price: 80, veg: true, available: true, image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400', description: 'Steamed basmati rice' },
    
    // Beverages
    { id: uuidv4(), name: 'Sweet Lassi', category: 'Beverages', price: 60, veg: true, available: true, image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', description: 'Sweet yogurt-based drink' },
    { id: uuidv4(), name: 'Salted Lassi', category: 'Beverages', price: 60, veg: true, available: true, image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', description: 'Refreshing salted yogurt drink' },
    { id: uuidv4(), name: 'Cold Drink', category: 'Beverages', price: 40, veg: true, available: true, image: 'https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=400', description: 'Chilled soft drink' },
    { id: uuidv4(), name: 'Mineral Water', category: 'Beverages', price: 20, veg: true, available: true, image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400', description: 'Purified bottled water' },
    
    // Desserts
    { id: uuidv4(), name: 'Gulab Jamun', category: 'Desserts', price: 80, veg: true, available: true, image: 'https://images.unsplash.com/photo-1589647363585-f4a7d3877b10?w=400', description: 'Sweet milk balls in sugar syrup' },
    { id: uuidv4(), name: 'Ice Cream', category: 'Desserts', price: 90, veg: true, available: true, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400', description: 'Assorted flavors' },
    { id: uuidv4(), name: 'Rasgulla', category: 'Desserts', price: 70, veg: true, available: true, image: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=400', description: 'Soft cottage cheese balls in syrup' }
  ];
}

initializeDefaultData();

// ==================== SOCKET.IO CONNECTION ====================
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Send initial data to kitchen/admin when they connect
  socket.on('join-kitchen', () => {
    socket.join('kitchen');
    socket.emit('orders-update', database.orders);
  });

  socket.on('join-admin', () => {
    socket.join('admin');
    socket.emit('admin-data', {
      orders: database.orders,
      orderHistory: database.orderHistory,
      menu: database.menu,
      tables: database.tables
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ==================== API ENDPOINTS ====================

// Get all tables
app.get('/api/tables', (req, res) => {
  res.json(database.tables);
});

// Get specific table info
app.get('/api/table/:tableNumber', (req, res) => {
  const tableNumber = parseInt(req.params.tableNumber);
  const table = database.tables.find(t => t.tableNumber === tableNumber);
  
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  res.json(table);
});

// Get menu
app.get('/api/menu', (req, res) => {
  res.json(database.menu.filter(item => item.available));
});

// Get menu by category
app.get('/api/menu/category/:category', (req, res) => {
  const items = database.menu.filter(item => 
    item.category === req.params.category && item.available
  );
  res.json(items);
});

// Place Order
app.post('/api/order', (req, res) => {
  const { tableNumber, items, isUrgent } = req.body;
  
  if (!tableNumber || !items || items.length === 0) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  // Calculate total
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Check if table has ACTIVE orders (not completed)
  const activeOrdersForTable = database.orders.filter(o => 
    o.tableNumber === tableNumber && 
    o.status !== 'completed'
  );
  
  // Mark as urgent if table already has active orders
  const shouldBeUrgent = activeOrdersForTable.length > 0;

  const newOrder = {
    id: uuidv4(),
    orderNumber: database.orders.length + database.orderHistory.length + 1,
    tableNumber: tableNumber,
    items: items,
    total: total,
    status: 'pending', // pending, preparing, ready, completed
    isUrgent: shouldBeUrgent,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  };

  database.orders.push(newOrder);

  // Update table status
  const table = database.tables.find(t => t.tableNumber === tableNumber);
  if (table) {
    table.status = 'occupied';
  }

  // Emit to kitchen in real-time
  io.to('kitchen').emit('new-order', newOrder);
  io.to('admin').emit('new-order', newOrder);

  res.status(201).json({
    success: true,
    order: newOrder,
    message: shouldBeUrgent ? 'Urgent order placed! Customer is already eating.' : 'Order placed successfully!'
  });
});

// Get all orders (for kitchen)
app.get('/api/orders', (req, res) => {
  res.json(database.orders);
});

// Get orders by table
app.get('/api/orders/table/:tableNumber', (req, res) => {
  const tableNumber = parseInt(req.params.tableNumber);
  const orders = database.orders.filter(o => o.tableNumber === tableNumber);
  res.json(orders);
});

// Update order status
app.put('/api/order/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = database.orders.find(o => o.id === orderId);
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  order.status = status;

  // If completed, move to history
  if (status === 'completed') {
    database.orderHistory.push({
      ...order,
      completedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });
    database.orders = database.orders.filter(o => o.id !== orderId);
  }

  // Emit update to all clients
  io.to('kitchen').emit('order-status-update', { orderId, status });
  io.to('admin').emit('order-status-update', { orderId, status });

  res.json({
    success: true,
    order: order
  });
});

// Get order history
app.get('/api/orders/history', (req, res) => {
  res.json(database.orderHistory);
});

// Get today's sales report
app.get('/api/reports/today', (req, res) => {
  const today = new Date().toLocaleDateString('en-IN');
  
  const todayOrders = database.orderHistory.filter(order => {
    const orderDate = new Date(order.timestamp).toLocaleDateString('en-IN');
    return orderDate === today;
  });

  const totalSales = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = todayOrders.length;

  res.json({
    date: today,
    totalOrders,
    totalSales,
    orders: todayOrders
  });
});

// ==================== MENU MANAGEMENT ====================

// Add menu item
app.post('/api/menu', (req, res) => {
  const { name, category, price, veg } = req.body;
  
  const newItem = {
    id: uuidv4(),
    name,
    category,
    price,
    veg,
    available: true
  };

  database.menu.push(newItem);
  
  // Notify all clients
  io.emit('menu-update', database.menu);
  
  res.status(201).json({ success: true, item: newItem });
});

// Update menu item
app.put('/api/menu/:itemId', (req, res) => {
  const { itemId } = req.params;
  const updates = req.body;

  const itemIndex = database.menu.findIndex(item => item.id === itemId);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  database.menu[itemIndex] = { ...database.menu[itemIndex], ...updates };
  
  io.emit('menu-update', database.menu);
  
  res.json({ success: true, item: database.menu[itemIndex] });
});

// Delete menu item
app.delete('/api/menu/:itemId', (req, res) => {
  const { itemId } = req.params;
  
  database.menu = database.menu.filter(item => item.id !== itemId);
  
  io.emit('menu-update', database.menu);
  
  res.json({ success: true });
});

// ==================== QR CODE GENERATION ====================

// Generate QR code for a table
app.get('/api/qr/:tableNumber', async (req, res) => {
  const tableNumber = parseInt(req.params.tableNumber);
  const table = database.tables.find(t => t.tableNumber === tableNumber);
  
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }

  try {
    // Generate URL that customer will scan
    const orderUrl = `${req.protocol}://${req.get('host')}/order?table=${tableNumber}`;
    
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(orderUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      tableNumber,
      qrCode: qrCodeDataUrl,
      url: orderUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Generate all QR codes (for printing)
app.get('/api/qr/generate/all', async (req, res) => {
  try {
    const qrCodes = await Promise.all(
      database.tables.map(async (table) => {
        const orderUrl = `${req.protocol}://${req.get('host')}/order?table=${table.tableNumber}`;
        const qrCodeDataUrl = await QRCode.toDataURL(orderUrl, {
          width: 300,
          margin: 2
        });
        
        return {
          tableNumber: table.tableNumber,
          qrCode: qrCodeDataUrl,
          url: orderUrl
        };
      })
    );

    res.json(qrCodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR codes' });
  }
});

// ==================== SETTINGS ====================

// Get settings
app.get('/api/settings', (req, res) => {
  res.json(database.settings);
});

// Update settings
app.put('/api/settings', (req, res) => {
  database.settings = { ...database.settings, ...req.body };
  res.json({ success: true, settings: database.settings });
});

// ==================== SERVE FRONTEND ====================

// Customer order page
app.get('/order', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

// Kitchen display page
app.get('/kitchen', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'kitchen.html'));
});

// Admin dashboard page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Root page - Show options
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   🍽️  RESTAURANT ORDERING SYSTEM STARTED 🍽️            ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║   Server running on: http://localhost:${PORT}            ║
║                                                        ║
║   Access Points:                                       ║
║   • Customer Order: http://localhost:${PORT}/order       ║
║   • Kitchen Display: http://localhost:${PORT}/kitchen    ║
║   • Admin Panel: http://localhost:${PORT}/admin          ║
║                                                        ║
║   Total Tables: ${database.tables.length}                                      ║
║   Menu Items: ${database.menu.length}                                       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
