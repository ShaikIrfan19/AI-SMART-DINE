const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Make io available globally
app.set('io', io);

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Rate limiting (generous limit for live polling mobile app)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 10,000 requests per 15 mins to accommodate live polling
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disable Mongoose command buffering when DB is disconnected
mongoose.set('bufferCommands', false);

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aismartdine';
mongoose.connect(mongoURI, { family: 4 })
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// DB Connection Check Middleware
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database connection is currently initializing or unavailable. Please check your MongoDB URI or try again in a few seconds.',
    });
  }
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/restaurants', require('./routes/restaurant.routes'));
app.use('/api/tables', require('./routes/table.routes'));
app.use('/api/menu', require('./routes/menu.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/reservations', require('./routes/reservation.routes').reservationRouter);
app.use('/api/billing', require('./routes/billing.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/staff', require('./routes/staff.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI Smart Dine API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Database Wipe / Reset Endpoint
app.post('/api/admin/reset-database', async (req, res) => {
  try {
    const User = require('./models/User.model');
    const Order = require('./models/Order.model');
    const Table = require('./models/Table.model');
    const MenuItem = require('./models/MenuItem.model');
    const Reservation = require('./models/Reservation.model').Reservation;

    // Delete all documents from collections
    await Promise.all([
      User.deleteMany({}),
      Order.deleteMany({}),
      Table.deleteMany({}),
      MenuItem.deleteMany({}),
      Reservation ? Reservation.deleteMany({}) : Promise.resolve(),
    ]);

    // Create fresh default accounts for quick testing
    const defaultAdmin = await User.create({
      name: 'Restaurant Admin',
      email: 'admin@restaurant.com',
      password: 'Admin@123',
      role: 'restaurant_admin',
      isActive: true,
      isEmailVerified: true,
    });

    const defaultWaiter = await User.create({
      name: 'John Waiter',
      email: 'waiter@restaurant.com',
      password: 'Waiter@123',
      role: 'waiter',
      isActive: true,
      isEmailVerified: true,
    });

    const defaultCustomer = await User.create({
      name: 'Demo Customer',
      email: 'customer@test.com',
      password: 'Customer@123',
      role: 'customer',
      isActive: true,
      isEmailVerified: true,
    });

    res.json({
      success: true,
      message: '✅ All data in MongoDB has been completely wiped and reset!',
      defaultAccounts: [
        { email: defaultAdmin.email, role: defaultAdmin.role },
        { email: defaultWaiter.email, role: defaultWaiter.role },
        { email: defaultCustomer.email, role: defaultCustomer.role },
      ],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database reset failed', error: err.message });
  }
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Socket.IO Events
require('./services/socket.service')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 AI Smart Dine Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, io };
