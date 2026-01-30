# 🍽️ SmartOrder - Restaurant Ordering System

A complete QR code-based restaurant ordering system that eliminates waiters for taking orders.

## ✨ Features

- **📱 Customer Ordering:** Scan QR code → Order food directly
- **👨‍🍳 Kitchen Display:** Real-time order notifications with urgent alerts
- **⚙️ Admin Panel:** Menu management, sales reports, QR code generation
- **🔴 Urgent Orders:** Automatically highlights orders from customers already eating
- **📊 Sales Reports:** Track daily revenue and popular items
- **🖨️ QR Code Generator:** Print QR codes for all tables

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server
```bash
npm start
```

### 3. Access System
- **Main Page:** http://localhost:3000
- **Customer Order:** http://localhost:3000/order?table=1
- **Kitchen Display:** http://localhost:3000/kitchen
- **Admin Panel:** http://localhost:3000/admin

## 📖 Documentation

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete setup, deployment, and selling guide.

## 💰 Pricing Recommendations

- **Small (5-10 tables):** ₹2,500/month
- **Medium (10-20 tables):** ₹4,500/month
- **Large (20+ tables):** ₹8,000+/month

## 🛠️ Tech Stack

- **Backend:** Node.js + Express + Socket.IO
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Real-time:** WebSocket for instant updates
- **Database:** In-memory (easily upgradeable to MongoDB/PostgreSQL)

## 📱 System Flow

1. Customer scans QR code on table
2. Menu opens automatically with table number
3. Customer adds items and places order
4. Order appears instantly in kitchen display
5. If customer orders more food while eating → marked URGENT (red)
6. Kitchen updates status → Customer notified when ready
7. All data tracked in admin panel

## 🎯 Benefits for Restaurants

✅ Reduce waiter costs  
✅ Faster order processing  
✅ Zero order mistakes  
✅ Professional modern image  
✅ Track sales and inventory  
✅ Easy menu updates  

## 📄 License

MIT License - Free to use and modify

## 👨‍💻 Developer

Created by [Your Name]
Contact: [Your Email/Phone]

---

**Ready to sell to restaurants? Read SETUP_GUIDE.md for complete selling strategy!**
