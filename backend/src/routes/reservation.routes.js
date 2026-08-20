const express = require('express');
const Reservation = require('../models/Reservation.model');
const User = require('../models/User.model');
const { protect, authorize } = require('../middleware/auth.middleware');

const reservationRouter = express.Router();
reservationRouter.use(protect);

const Table = require('../models/Table.model');

reservationRouter.post('/', async (req, res) => {
  try {
    let { restaurantId, date, timeSlot, guestCount, tableType, specialRequests } = req.body;
    if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
      restaurantId = req.user.restaurantId || '60d0fe4f5311236168a109ca';
    }

    // Try to find an available table to assign to this reservation
    let table = await Table.findOne({ status: 'available' });
    if (!table) {
      table = await Table.findOne({});
    }

    if (!table) {
      // If no table exists in database, automatically create/add a new table!
      const totalCount = await Table.countDocuments();
      table = await Table.create({
        restaurantId,
        tableNumber: String(totalCount + 1),
        seatingCapacity: Number(guestCount) || 4,
        tableType: tableType || 'regular',
        status: 'reserved',
        reservedFor: date ? new Date(date) : new Date(),
      });
    } else {
      table.status = 'reserved';
      table.reservedFor = date ? new Date(date) : new Date();
      await table.save();
    }

    const reservation = await Reservation.create({
      ...req.body,
      restaurantId,
      customerId: req.user._id,
      tableId: table ? table._id : null,
    });

    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitting reservation_created & table_updated for table ${table?.tableNumber}`);
      io.emit('reservation_created', reservation);
      if (table) {
        io.emit('table_updated', table);
      }
      io.emit('waiter-call-alert', {
        tableNumber: table?.tableNumber || 'Table 1',
        customerName: req.user.name || 'Customer',
        message: `🗓 Table ${table?.tableNumber || '1'} reserved by ${req.user.name || 'Customer'} (${timeSlot || 'Tonight'})`,
      });
    }

    res.status(201).json({ success: true, data: reservation });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

reservationRouter.get('/', async (req, res) => {
  try {
    const { restaurantId, status, date, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.user.role === 'customer') {
      filter.customerId = req.user._id;
    } else if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
      filter.restaurantId = restaurantId;
    } else if (req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date); d.setHours(0,0,0,0);
      const e = new Date(date); e.setHours(23,59,59,999);
      filter.date = { $gte: d, $lte: e };
    }
    const reservations = await Reservation.find(filter).populate('tableId', 'tableNumber').sort({ date: -1, createdAt: -1 }).limit(limit*1).skip((page-1)*limit);
    const total = await Reservation.countDocuments(filter);
    res.json({ success: true, data: reservations, total });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

reservationRouter.patch('/:id/status', authorize('restaurant_admin', 'super_admin'), async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, data: reservation });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

reservationRouter.delete('/:id', async (req, res) => {
  try {
    await Reservation.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Reservation cancelled' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Staff routes
const staffRouter = express.Router();
staffRouter.use(protect, authorize('restaurant_admin', 'super_admin'));

staffRouter.get('/', async (req, res) => {
  try {
    const restaurantId = req.query.restaurantId || req.user.restaurantId || req.user._id;
    let staff = await User.find({ restaurantId, role: { $in: ['waiter', 'restaurant_admin'] } }).select('-password');
    if (!staff.length) {
      // Fallback: return all registered waiters waiting for admin approval
      staff = await User.find({ role: 'waiter' }).select('-password');
    }
    res.json({ success: true, data: staff });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

staffRouter.post('/', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });
    
    // When created directly by Admin, mark active & verified so waiter can work immediately
    const staff = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'waiter',
      restaurantId: req.user.restaurantId || req.user._id,
      isActive: true,
      isEmailVerified: true,
    });
    res.status(201).json({ success: true, data: staff });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

staffRouter.patch('/:id/status', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true }).select('-password');
    res.json({ success: true, data: user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// User routes
const userRouter = express.Router();
userRouter.use(protect);
userRouter.get('/profile', async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json({ success: true, data: user });
});
userRouter.put('/profile', async (req, res) => {
  try {
    const { name, phone, avatar, preferences } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, phone, avatar, preferences }, { new: true }).select('-password');
    res.json({ success: true, data: user });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Notification routes (placeholder)
const notificationRouter = express.Router();
notificationRouter.use(protect);
notificationRouter.get('/', (req, res) => res.json({ success: true, data: [] }));

module.exports = { reservationRouter, staffRouter, userRouter, notificationRouter };
