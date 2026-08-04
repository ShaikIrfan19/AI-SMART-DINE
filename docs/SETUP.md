# 🚀 AI Smart Dine — Complete Setup Guide

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| npm | v9+ | Included with Node |
| Git | Latest | https://git-scm.com |
| Android Studio | Latest | For mobile |
| MongoDB Compass | Optional | For DB browsing |

---

## 📦 Free Services You Need

### 1. MongoDB Atlas (Free Database)
1. Go to https://cloud.mongodb.com
2. Create free account → Create cluster (M0 Free)
3. Add database user & allow all IPs (0.0.0.0/0)
4. Copy connection string → paste into `backend/.env` as `MONGODB_URI`

### 2. Firebase (Free Auth + Realtime DB)
1. Go to https://console.firebase.google.com
2. Create new project
3. Enable Authentication → Email/Password, Google, Phone
4. Enable Realtime Database → Start in test mode
5. Project Settings → Service accounts → Generate new private key
6. Copy credentials to `backend/.env` (FIREBASE_*)
7. Copy web config to `web-dashboard/.env` (REACT_APP_FIREBASE_*)

### 3. Google Gemini AI (Free Tier)
1. Go to https://aistudio.google.com
2. Get API key (free)
3. Add to `backend/.env` as `GEMINI_API_KEY`

### 4. Razorpay (Free Sandbox)
1. Go to https://razorpay.com
2. Create account → Dashboard → API Keys
3. Generate Test API keys
4. Add to `backend/.env` (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
5. Add key_id to `web-dashboard/.env` (REACT_APP_RAZORPAY_KEY_ID)

### 5. Gmail SMTP (Free Email)
1. Use your Gmail account
2. Enable 2FA → Generate App Password
3. Add to `backend/.env` (EMAIL_USER, EMAIL_PASS)

---

## 🖥️ Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials

npm install
npm run dev
# ✅ Server starts on http://localhost:5000
```

### Verify Backend
```bash
curl http://localhost:5000/api/health
# Expected: {"status":"OK","message":"AI Smart Dine API is running"}
```

### Seed Demo Data (optional)
```bash
node scripts/seed.js
# Creates demo restaurants, tables, menu items, users
```

---

## 🌐 Web Dashboard Setup

```bash
cd web-dashboard
cp .env.example .env
# Edit .env with your credentials

npm install
npm start
# ✅ Dashboard opens at http://localhost:3000
```

### Build for Production
```bash
npm run build
# Outputs to build/ folder
# Deploy to Vercel/Netlify/AWS S3
```

---

## 📱 Mobile App Setup

### Android
```bash
cd mobile
cp .env.example .env
# Edit .env: API_URL=http://10.0.2.2:5000/api (emulator)
# For physical device: API_URL=http://YOUR_LAN_IP:5000/api

npm install

# Start Metro bundler
npm start

# In a new terminal:
npm run android
```

### Required Android Setup
1. Install Android Studio
2. Install Android SDK (API level 33+)
3. Create AVD (Android Virtual Device) or connect physical device
4. Enable USB Debugging on physical device

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────┐
│                 CLIENTS                     │
│  React Web Dashboard  │  React Native App   │
│  (Port 3000)         │  (Android/iOS)       │
└──────────┬───────────┴───────────┬──────────┘
           │ HTTP/REST             │ HTTP/REST
           │ Socket.IO            │ Socket.IO
           ▼                      ▼
┌─────────────────────────────────────────────┐
│          Node.js + Express Backend          │
│              (Port 5000)                    │
│                                             │
│  Routes → Controllers → Services           │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Auth    │  │ Orders   │  │   AI     │  │
│  │  Module  │  │  Module  │  │ (Gemini) │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Payments  │  │Analytics │  │ Socket   │  │
│  │(Razorpay)│  │ Module   │  │  .IO     │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└──────────┬────────────────────┬─────────────┘
           │                   │
           ▼                   ▼
┌──────────────────┐  ┌──────────────────────┐
│  MongoDB Atlas   │  │     Firebase         │
│  (Database)      │  │  (Auth + Realtime)   │
└──────────────────┘  └──────────────────────┘
```

---

## 👥 Default Test Accounts

After seeding, use these credentials:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@aismartdine.com | Admin@123 |
| Restaurant Admin | admin@restaurant.com | Admin@123 |
| Waiter | waiter@restaurant.com | Waiter@123 |
| Customer | customer@test.com | Customer@123 |

---

## 🧪 Testing Payment (Razorpay Sandbox)

```
Test Card Numbers:
Visa:        4111 1111 1111 1111
Mastercard:  5267 3181 8797 5449

Test UPI: success@razorpay
Test UPI (fail): failure@razorpay

CVV: Any 3 digits
Expiry: Any future date
OTP: 1234 (for 3D Secure)
```

---

## 🌍 Deployment

### Backend (Railway/Render — Free)
1. Push to GitHub
2. Connect Railway/Render to your repo
3. Add environment variables
4. Deploy automatically

### Web Dashboard (Vercel — Free)
1. Push web-dashboard to GitHub
2. Import to Vercel
3. Add environment variables
4. Auto-deploys on push

### Mobile (Google Play)
1. `cd android && ./gradlew bundleRelease`
2. Sign APK with your keystore
3. Upload to Google Play Console

---

## 🔧 Troubleshooting

### Backend won't start
- Check MongoDB URI is correct
- Ensure Node.js v18+
- Run `npm install` again

### Frontend can't connect to API
- Ensure backend is running on port 5000
- Check REACT_APP_API_URL in .env
- CORS: backend allows your frontend origin

### Mobile can't connect to API
- Emulator: use `10.0.2.2:5000` not `localhost`
- Physical device: use your LAN IP
- Ensure mobile and computer on same WiFi

### Payments not working
- Verify Razorpay test keys are correct
- Check browser console for errors
- Ensure you're using test mode keys (rzp_test_*)

### AI features not working
- Verify GEMINI_API_KEY is valid
- Check API quota at aistudio.google.com
- AI gracefully falls back to defaults if unavailable
