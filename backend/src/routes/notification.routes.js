const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification.model');
const { protect } = require('../middleware/auth.middleware');

const SHARED_RESTAURANT_ID = '60d0fe4f5311236168a109ca';

// POST /api/notifications/call-waiter — Customer calls waiter
router.post('/call-waiter', protect, async (req, res) => {
  try {
    let { restaurantId, tableNumber, message, type } = req.body;
    if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
      restaurantId = req.user.restaurantId || SHARED_RESTAURANT_ID;
    }

    const notification = await Notification.create({
      restaurantId,
      tableNumber: tableNumber || 'Table 1',
      type: type || 'call_waiter',
      customerName: req.user.name || 'Customer',
      message: message || `${req.user.name || 'Customer'} called for a waiter`,
      status: 'pending',
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('waiter-call-alert', notification);
    }

    res.status(201).json({ success: true, data: notification, message: 'Waiter notified' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/notifications/calls — Waiter fetches active call alerts
router.get('/calls', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ success: true, data: notifications });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PATCH /api/notifications/:id/acknowledge — Waiter responds/resolves alert
router.patch('/:id/acknowledge', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'acknowledged' },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('waiter-call-resolved', notification);
    }

    res.json({ success: true, data: notification });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/notifications — Default notification list
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: notifications });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;
