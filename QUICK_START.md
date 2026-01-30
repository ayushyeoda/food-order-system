# ⚡ QUICK VS CODE SETUP GUIDE

## Step 1: Check if Node.js is Installed

Open **Command Prompt** (Windows) or **Terminal** (Mac) and type:
```
node --version
```

If you see a version number (like v18.x.x), you're good! ✅

If you see an error, **download Node.js from:** https://nodejs.org/  
(Choose the LTS version - green button)

---

## Step 2: Open Project in VS Code

1. Download/Copy the `restaurant-ordering-system` folder to your computer
2. Open **VS Code**
3. Click **File** → **Open Folder**
4. Select the `restaurant-ordering-system` folder
5. Click **Select Folder**

---

## Step 3: Open Terminal in VS Code

**Method 1:**  
Press `Ctrl + ` ` (backtick key, usually next to number 1)

**Method 2:**  
Top menu → **Terminal** → **New Terminal**

You'll see a terminal window at the bottom of VS Code.

---

## Step 4: Install Dependencies

In the terminal, type:
```bash
npm install
```

Press **Enter** and wait 1-2 minutes.

You should see something like:
```
added 150 packages
✓ All packages installed
```

---

## Step 5: Start the Server

In the terminal, type:
```bash
npm start
```

Press **Enter**.

You should see:
```
╔════════════════════════════════════════════╗
║   🍽️  RESTAURANT ORDERING SYSTEM STARTED   ║
║   Server running on: http://localhost:3000 ║
╚════════════════════════════════════════════╝
```

✅ **Server is running!** Do NOT close VS Code or terminal.

---

## Step 6: Open in Browser

Open your web browser (Chrome/Firefox/Edge) and go to:
```
http://localhost:3000
```

You should see the main page with three options:
- 📱 Customer Order
- 👨‍🍳 Kitchen Display
- ⚙️ Admin Panel

---

## Step 7: Test the System

### Test 1: Place an Order
1. Click "Customer Order" or go to: `http://localhost:3000/order?table=1`
2. Browse menu
3. Add items to cart (click "Add to Cart")
4. Click cart icon 🛒 at top right
5. Click "Place Order"

### Test 2: View in Kitchen
1. Open new tab: `http://localhost:3000/kitchen`
2. You should see your order appear!
3. Try clicking "Start Preparing" → "Mark as Ready" → "Complete Order"

### Test 3: Admin Panel
1. Open new tab: `http://localhost:3000/admin`
2. See dashboard with sales
3. Click "Menu" tab to add/remove items
4. Click "QR Codes" tab to see QR codes for all tables

---

## ✅ DONE! Your system is working!

---

## 🛑 How to Stop the Server

In VS Code terminal, press: **Ctrl + C**

Type `Y` and press Enter.

---

## 🔄 How to Restart

Just type `npm start` again in the terminal!

---

## 🎯 Next Steps

1. Read **SETUP_GUIDE.md** for:
   - How to deploy to real restaurant
   - Pricing strategies
   - Selling tips
   - Customization guide

2. Test all features thoroughly

3. Show demo to restaurants!

---

## 🆘 Common Problems

### Problem: "npm: command not found"
**Fix:** Install Node.js from https://nodejs.org/

### Problem: "Port 3000 already in use"
**Fix:** 
- Close other programs using port 3000
- Or change port in `.env` file: `PORT=3001`

### Problem: Cannot access from phone
**Fix:**
1. Computer and phone must be on same WiFi
2. Find your computer IP:
   - Windows: Open CMD, type `ipconfig`
   - Mac: System Preferences → Network
3. Use IP instead of localhost: `http://192.168.1.X:3000`

---

## 📞 Need Help?

1. Check SETUP_GUIDE.md (detailed troubleshooting)
2. Check README.md (technical details)
3. Google the error message
4. Make sure Node.js is latest version

---

**Good luck! 🚀**
