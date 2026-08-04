# AI Smart Dine — API Documentation

Base URL: `http://localhost:5000/api`

All protected routes require: `Authorization: Bearer <token>`

---

## 🔐 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login with email/password | ❌ |
| POST | `/auth/verify-otp` | Verify email OTP | ❌ |
| POST | `/auth/forgot-password` | Send reset OTP | ❌ |
| POST | `/auth/reset-password` | Reset password with OTP | ❌ |
| POST | `/auth/firebase-login` | Login via Google/Phone | ❌ |
| POST | `/auth/refresh-token` | Refresh JWT token | ❌ |
| GET  | `/auth/me` | Get current user profile | ✅ |

### Register Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "password": "Pass@123",
  "role": "customer"
}
```

### Login Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "65a...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "restaurantId": "65b..."
    }
  }
}
```

---

## 🏢 Restaurants

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/restaurants` | Create restaurant | admin |
| GET  | `/restaurants` | List restaurants | all |
| GET  | `/restaurants/:id` | Get restaurant | all |
| PUT  | `/restaurants/:id` | Update restaurant | admin |
| PATCH | `/restaurants/:id/toggle` | Toggle open/closed | admin |

### Create Restaurant Body
```json
{
  "name": "The Spice Garden",
  "ownerName": "Rajesh Kumar",
  "address": "123 MG Road, Bangalore",
  "phone": "+918012345678",
  "email": "info@spicegarden.com",
  "restaurantType": "casual",
  "gstNumber": "29AABCT1332L1ZD",
  "floors": 2,
  "totalTables": 20,
  "seatingCapacity": 80,
  "openingTime": "09:00",
  "closingTime": "23:00"
}
```

---

## 🪑 Tables

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/tables` | Create table | admin |
| GET  | `/tables` | List tables | all |
| PUT  | `/tables/:id` | Update table | admin/waiter |
| PATCH | `/tables/:id/status` | Update status | admin/waiter |
| DELETE | `/tables/:id` | Delete table | admin |
| POST | `/tables/merge` | Merge tables | admin |

### Table Status Values
- `available` — Ready for customers
- `occupied` — Currently in use
- `reserved` — Pre-booked
- `cleaning` — Being cleaned
- `inactive` — Not in service

---

## 🍽️ Menu

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET  | `/menu` | List menu items | all |
| POST | `/menu` | Create menu item | admin |
| PUT  | `/menu/:id` | Update item | admin |
| PATCH | `/menu/:id/availability` | Toggle availability | admin |
| DELETE | `/menu/:id` | Delete item | admin |
| GET  | `/menu/categories` | Get categories | all |

### Query Params
- `restaurantId` — Filter by restaurant
- `category` — starters, main_course, desserts, drinks, combos
- `isVeg` — true/false
- `isAvailable` — true/false
- `search` — text search

---

## 📋 Orders

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/orders` | Place order | all |
| GET  | `/orders` | List orders | all |
| GET  | `/orders/live` | Live/active orders | all |
| PATCH | `/orders/:id/status` | Update status | admin/waiter |
| POST | `/orders/:id/items` | Add items to order | all |

### Order Status Flow
```
pending → confirmed → preparing → ready → served → completed
                                                  ↘ cancelled
```

### Place Order Body
```json
{
  "restaurantId": "65a...",
  "tableId": "65b...",
  "items": [
    {
      "menuItemId": "65c...",
      "name": "Chicken Biryani",
      "price": 280,
      "quantity": 2,
      "notes": "Extra spicy",
      "addons": []
    }
  ],
  "notes": "Birthday celebration",
  "orderType": "dine_in"
}
```

---

## 📅 Reservations

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/reservations` | Create reservation | customer |
| GET  | `/reservations` | List reservations | all |
| PATCH | `/reservations/:id/status` | Update status | admin |
| DELETE | `/reservations/:id` | Cancel reservation | all |

### Reservation Status Values
- `pending` → `confirmed` → `seated` → `completed`
- `cancelled`, `no_show`

---

## 💳 Payments

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/payments/create-order` | Create Razorpay order | all |
| POST | `/payments/verify` | Verify Razorpay payment | all |
| POST | `/payments/cash` | Record cash payment | admin/waiter |
| POST | `/payments/refund` | Initiate refund | admin |
| GET  | `/payments/history` | Payment history | admin |

### Razorpay Flow
1. Client calls `/payments/create-order` → gets `razorpayOrderId`
2. Client opens Razorpay checkout
3. On success, client calls `/payments/verify` with signature
4. Backend verifies & marks order as paid

---

## 🧾 Billing

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET  | `/billing/:orderId` | Get bill details | all |
| POST | `/billing/apply-coupon` | Apply coupon | all |

### Available Coupons (Demo)
| Code | Discount | Min Order |
|------|----------|-----------|
| WELCOME50 | ₹50 flat | ₹200 |
| SAVE10 | 10% | ₹100 |
| FEAST100 | ₹100 flat | ₹500 |

---

## 📊 Analytics

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET  | `/analytics/dashboard` | Restaurant analytics | admin |
| GET  | `/analytics/super-admin` | Platform analytics | super_admin |

### Query Params
- `period` — today, week, month, year
- `restaurantId` — Target restaurant

---

## 🤖 AI Features (Gemini)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/recommendations` | Food recommendations |
| POST | `/ai/chat` | AI chatbot message |
| GET  | `/ai/insights/:restaurantId` | Business insights |
| POST | `/ai/suggest-table` | Smart table suggestion |

### Chat Body
```json
{
  "message": "What's the best dish today?",
  "restaurantId": "65a...",
  "conversationHistory": [
    { "role": "user", "text": "Hi" },
    { "role": "model", "text": "Hello! How can I help?" }
  ]
}
```

---

## 👥 Staff

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET  | `/staff` | List staff | admin |
| POST | `/staff` | Add staff member | admin |
| PATCH | `/staff/:id/status` | Toggle active status | admin |

---

## 📡 Socket.IO Events

### Client → Server
```js
socket.emit('join_restaurant', restaurantId)
socket.emit('join_user', userId)
socket.emit('join_table', { restaurantId, tableId })
socket.emit('call_waiter', { restaurantId, tableId, tableNumber })
socket.emit('kitchen_update', { restaurantId, orderId, status })
socket.emit('table_status_update', { restaurantId, tableId, status })
```

### Server → Client
```js
socket.on('new_order', { order, table, message })
socket.on('order_status_updated', { orderId, status, tableId })
socket.on('table_updated', table)
socket.on('table_status_changed', { tableId, tableNumber, status })
socket.on('waiter_called', { tableId, tableNumber, message })
socket.on('payment_received', { orderId, amount, method })
socket.on('kitchen_status', { orderId, status, message })
```

---

## ❌ Error Responses

```json
{
  "success": false,
  "message": "Descriptive error message",
  "code": "TOKEN_EXPIRED"
}
```

### HTTP Status Codes
- `200` — Success
- `201` — Created
- `400` — Bad Request / Validation Error
- `401` — Unauthorized / Invalid token
- `403` — Forbidden / Insufficient permissions
- `404` — Not Found
- `429` — Rate limit exceeded
- `500` — Internal Server Error
