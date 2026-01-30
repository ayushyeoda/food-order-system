# 🚀 RESTAURANT ORDERING SYSTEM - INSTALLATION GUIDE

## ⚡ QUICKEST WAY TO START (Windows Users)

### Step 1: Download & Extract
1. Download the `restaurant-ordering-system.zip` file
2. Right-click → Extract All
3. Choose a location (e.g., Desktop)

### Step 2: Install Node.js (If not installed)
1. Go to: https://nodejs.org/
2. Download the LTS version (green button)
3. Run the installer → Click Next → Next → Install
4. Restart your computer

### Step 3: Start the System
1. Open the extracted folder
2. **Double-click `START.bat`** 
3. Wait for "Server running" message
4. Open browser: http://localhost:3000

**✅ DONE! System is running!**

---

## 🖥️ DETAILED VS CODE METHOD

### Prerequisites
- **Node.js** installed (download from https://nodejs.org/)
- **VS Code** installed (download from https://code.visualstudio.com/)

### Step-by-Step Instructions

#### 1️⃣ Extract the Project
- Extract `restaurant-ordering-system.zip` to a folder
- Remember the location

#### 2️⃣ Open in VS Code
1. Open VS Code
2. File → Open Folder
3. Select the `restaurant-ordering-system` folder
4. Click "Select Folder"

#### 3️⃣ Open Terminal
- Press: **Ctrl + `** (backtick key, next to 1)
- Or: Menu → Terminal → New Terminal

#### 4️⃣ Install Dependencies
Type in terminal:
```bash
npm install
```
Press Enter and wait 1-2 minutes.

#### 5️⃣ Start Server
Type in terminal:
```bash
npm start
```

You'll see:
```
╔════════════════════════════════════════════╗
║   🍽️  RESTAURANT ORDERING SYSTEM STARTED   ║
║   Server running on: http://localhost:3000 ║
╚════════════════════════════════════════════╝
```

#### 6️⃣ Access the System
Open browser: **http://localhost:3000**

---

## 📱 ACCESSING ON MOBILE/OTHER DEVICES

### Find Your Computer IP Address

**Windows:**
1. Open Command Prompt
2. Type: `ipconfig`
3. Look for "IPv4 Address" (e.g., 192.168.1.100)

**Mac:**
1. System Preferences → Network
2. Look for IP address

### Access from Phone/Tablet
Make sure device is on **same WiFi** as computer.

Then open: `http://YOUR_IP:3000`

Example: `http://192.168.1.100:3000`

---

## 🧪 TESTING THE SYSTEM

### Test 1: Customer Order
1. Go to: `http://localhost:3000/order?table=1`
2. Add items to cart
3. Place order
4. See success message ✅

### Test 2: Kitchen Display
1. Open new tab: `http://localhost:3000/kitchen`
2. See your order appear instantly
3. Update status: Preparing → Ready → Complete

### Test 3: Admin Panel
1. Open: `http://localhost:3000/admin`
2. View dashboard stats
3. Try adding a menu item
4. Generate QR codes

### Test 4: Urgent Order
1. Place order from Table 5
2. Place another order from Table 5
3. Second order shows as URGENT (red) in kitchen

---

## 🎯 FOR RESTAURANT DEPLOYMENT

### Local Installation (Single Restaurant)

#### Option A: Dedicated Computer
1. Use an old laptop/PC as server
2. Install Node.js
3. Copy project folder
4. Create START.bat shortcut on desktop
5. Set to auto-start on boot

**Access:**
- Kitchen tablet: `http://[COMPUTER-IP]:3000/kitchen`
- Customers scan QR: `http://[COMPUTER-IP]:3000/order?table=X`

#### Option B: Shared Computer
1. Install on main restaurant computer
2. Start server when restaurant opens
3. Stop when closing

### Configuration for Restaurant

#### Change Restaurant Name
Edit `server.js` line 21:
```javascript
restaurantName: "ABC Restaurant",
```

#### Add More Tables
Edit `server.js` line 28:
```javascript
for (let i = 1; i <= 25; i++) {  // Change 15 to 25
```

#### Print QR Codes
1. Go to: `http://localhost:3000/admin`
2. Click "QR Codes" tab
3. Click "Print All"
4. Print on sticker paper
5. Stick on tables

---

## 🌐 CLOUD DEPLOYMENT (Multiple Restaurants)

### Deploy on Heroku (Free)

1. Create account: https://heroku.com
2. Install Heroku CLI
3. In terminal:
```bash
cd restaurant-ordering-system
heroku login
heroku create restaurant-yourname
git init
git add .
git commit -m "Initial"
git push heroku master
```

Your app: `https://restaurant-yourname.herokuapp.com`

### Other Cloud Options
- **Railway.app** - Free tier, easy
- **DigitalOcean** - ₹400/month
- **AWS EC2** - Free 1 year
- **Google Cloud** - Free tier

---

## 🔧 CUSTOMIZATION

### Change Colors
Edit CSS in HTML files:
```css
/* Find this line */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Change to your colors */
background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
```

### Add Logo
Add to top of each HTML file:
```html
<img src="logo.png" style="height: 50px;">
```

### Change Currency
Edit `server.js`:
```javascript
currency: "$"  // or "€" or "£"
```

---

## 🛠️ TROUBLESHOOTING

### "npm not found" error
**Fix:** Install Node.js from https://nodejs.org/

### Port 3000 already in use
**Fix:** 
- Close other programs
- Or change port in `.env`: `PORT=3001`

### Cannot access from phone
**Fix:**
- Ensure same WiFi network
- Check firewall settings
- Use computer IP, not localhost

### Orders not appearing in kitchen
**Fix:**
- Refresh kitchen page
- Check console for errors (F12)
- Restart server

### QR codes not working
**Fix:**
- Use correct IP address
- Check WiFi connection
- Regenerate QR codes

---

## 📞 SUPPORT & HELP

1. **Read guides:**
   - QUICK_START.md
   - SETUP_GUIDE.md
   - FILE_STRUCTURE.md

2. **Check online:**
   - Google error messages
   - YouTube: "Node.js tutorial"
   - Stack Overflow

3. **Verify:**
   - Node.js version: `node --version`
   - npm version: `npm --version`

---

## ✅ INSTALLATION CHECKLIST

Before giving to restaurant:

- [ ] Tested on your computer
- [ ] All features working
- [ ] QR codes generated
- [ ] Printed QR codes
- [ ] Changed restaurant name
- [ ] Set correct table count
- [ ] Tested on phone/tablet
- [ ] Kitchen display tested
- [ ] Admin panel tested
- [ ] Staff training done

---

## 💼 HANDOVER TO RESTAURANT

### Files to Give:
1. Extracted folder (not zip)
2. START.bat shortcut
3. Printed QR codes
4. Quick reference guide

### Training (30 minutes):
1. **5 min:** Show how to start/stop
2. **10 min:** Customer ordering demo
3. **10 min:** Kitchen display training
4. **5 min:** Admin panel basics

### Support Package:
- Your phone number (WhatsApp)
- Remote desktop access (TeamViewer)
- Weekly check-in for first month

---

## 📈 SYSTEM REQUIREMENTS

**Minimum:**
- Processor: Dual Core 2GHz
- RAM: 2GB
- Storage: 500MB
- OS: Windows 7+, Mac, Linux
- Internet: Not required (local network only)

**Recommended:**
- Processor: Quad Core 2.5GHz+
- RAM: 4GB+
- Storage: 1GB+
- OS: Windows 10+
- Internet: For cloud deployment

---

## 🎓 TRAINING MATERIALS

### For Restaurant Owner:
- Start/Stop system
- View daily reports
- Add/edit menu items
- Print QR codes

### For Kitchen Staff:
- Keep display open
- Update order status
- Priority: Red (urgent) orders first

### For Waiters:
- Help customers scan QR
- Deliver food when marked "Ready"
- Less work taking orders!

### For Customers:
- Scan QR code on table
- Browse menu
- Add items, order
- No app needed!

---

## 🌟 SUCCESS TIPS

1. **Start Small:** Demo to 1 restaurant first
2. **Free Trial:** Offer 1 month free
3. **Be Available:** Quick support builds trust
4. **Get Feedback:** Improve based on real use
5. **Document Everything:** Take photos/videos
6. **Before/After:** Show time saved
7. **Testimonials:** Video testimonials powerful

---

## 🎉 CONGRATULATIONS!

You now have a **complete, production-ready restaurant ordering system**!

**Next Steps:**
1. Test thoroughly
2. Demo to 2-3 restaurants
3. Gather feedback
4. Start selling! 💰

**Remember:** Your value proposition is:
- "Save ₹12,500/month in waiter costs"
- "Faster service = More customers"
- "Zero order mistakes"
- "Professional modern image"

---

**Good luck with your business! 🚀**

For detailed selling strategies, see **SETUP_GUIDE.md**
