# 🍽️ AI Smart Dine — Restaurant Management Ecosystem

> A premium, production-ready SaaS Restaurant Management Platform with AI-powered features, real-time monitoring, and multi-branch support.

---

## 🏗️ Project Structure

```
ai-smart-dine/
├── web-dashboard/        # React.js Web Dashboard (connects to shared Render Backend)
├── backend/              # Node.js + Express.js REST API + MongoDB Database
├── mobile/               # React Native Mobile App (connects to shared Render Backend)
└── docs/                 # API Documentation & Guides
```

> **Unified Backend & Shared Database**: Both the Web Dashboard and Mobile App connect to the same central Node.js REST API (`https://ai-smart-dine-backend.onrender.com/api`) and WebSocket server (`https://ai-smart-dine-backend.onrender.com`), sharing the exact same MongoDB database state in real-time.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas (free tier)
- Firebase project (free)
- Razorpay account (free sandbox)

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your environment variables
npm install
npm run dev
```

### 2. Web Dashboard Setup
```bash
cd web-dashboard
cp .env.example .env
npm install
npm start
```

### 3. Mobile App Setup
```bash
cd mobile
cp .env.example .env
npm install
npx react-native run-android
```

---

## 🔐 Free APIs Used

| Service | Free Tier | Usage |
|---------|-----------|-------|
| MongoDB Atlas | 512MB free | Database |
| Firebase Auth | Free | Authentication |
| Firebase Realtime DB | 1GB free | Real-time sync |
| Razorpay | Sandbox free | Payments |
| Google Gemini API | Free tier | AI features |
| Cloudinary | 25GB free | Image storage |

---

## 👥 Default Roles & Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@aismartdine.com | Admin@123 |
| Restaurant Admin | admin@restaurant.com | Admin@123 |
| Waiter | waiter@restaurant.com | Waiter@123 |
| Customer | customer@test.com | Customer@123 |

---

## 🌟 Features

- ✅ Role-based authentication (Super Admin, Admin, Waiter, Customer)
- ✅ AI-powered food recommendations (Gemini API)
- ✅ Real-time table monitoring (Firebase)
- ✅ Smart billing with GST
- ✅ Reservation management
- ✅ Online payments (Razorpay)
- ✅ Analytics dashboards with charts
- ✅ Multi-restaurant management
- ✅ Live order tracking
- ✅ AI chatbot assistant
- ✅ QR code table scanning
- ✅ Receipt generation & sharing
- ✅ Dark theme with green accents

---

## 📱 Mobile App Screens

### Authentication
- Splash Screen
- Welcome Screen  
- Login / Register
- Phone OTP Login
- Forgot Password / Reset

### Customer Flow
- Menu Browse
- QR Table Scan
- Order Placement
- Live Order Tracking
- Payment
- Receipt

### Waiter Flow
- Table Overview
- Take Orders
- Kitchen Updates
- Billing

### Admin Flow
- Dashboard
- Table Management
- Menu Management
- Staff Management
- Analytics

---

## 🖥️ Web Dashboard Pages

- `/` — Login
- `/dashboard` — Main Dashboard
- `/tables` — Table Management
- `/menu` — Menu & Dishes
- `/orders` — Live Orders
- `/reservations` — Reservations
- `/billing` — Billing & Payments
- `/staff` — Staff Management
- `/analytics` — Analytics & Reports
- `/restaurants` — Multi-Restaurant (Super Admin)
- `/settings` — System Settings

---

## 🤖 AI Features (Gemini API — Free)

1. **Smart Recommendations** — "Customers who ordered Biryani also liked Coke"
2. **Combo Suggestions** — Auto-generate combo deals
3. **Peak Hour Prediction** — ML-based forecasting
4. **Chatbot Assistant** — Customer-facing AI chat
5. **Performance Insights** — Restaurant analytics insights

---

## 💳 Payment Integration

```
Razorpay Sandbox (Free):
- Test Key: rzp_test_xxxxx
- Supports: UPI, Cards, Net Banking, Wallets
- Currency: INR ₹
```

---

## 📡 Real-time Architecture

```
Client → Firebase Realtime DB → All connected clients
         ↕
      Socket.IO (fallback)
         ↕
      Backend API (Express.js)
```
