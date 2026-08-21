const Table = require('../models/Table.model');
const QRCode = require('qrcode');

const createTable = async (req, res) => {
  try {
    const tableData = req.body;
    if (!tableData.restaurantId) tableData.restaurantId = req.user.restaurantId || req.user._id;
    const qrData = JSON.stringify({ restaurantId: tableData.restaurantId, tableNumber: tableData.tableNumber, tableId: 'pending' });
    const qrCode = await QRCode.toDataURL(qrData);

    const table = await Table.create({ ...tableData, qrCode });
    res.status(201).json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTables = async (req, res) => {
  try {
    const { restaurantId, status, floor } = req.query;
    const filter = {};
    if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
      filter.restaurantId = restaurantId;
    } else if (req.user.restaurantId) {
      filter.restaurantId = req.user.restaurantId;
    }
    if (status) filter.status = status;
    if (floor) filter.floor = floor;

    let tables = await Table.find(filter)
      .populate('assignedWaiterId', 'name avatar')
      .populate('currentOrderId', 'orderNumber totalAmount status')
      .sort({ tableNumber: 1 });

    // Fallback: If 0 tables found with filter, fetch all active tables in database
    if (tables.length === 0) {
      tables = await Table.find({})
        .populate('assignedWaiterId', 'name avatar')
        .populate('currentOrderId', 'orderNumber totalAmount status')
        .sort({ tableNumber: 1 });
    }

    res.json({ success: true, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTable = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    let table = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true });
    }
    if (!table) {
      const cleanNum = String(req.params.id).replace(/[^0-9]/g, '') || '1';
      table = await Table.findOneAndUpdate({ tableNumber: cleanNum }, req.body, { new: true });
    }
    if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${table.restaurantId}`).emit('table_updated', table);
      io.emit('table_updated', table);
    }
    res.json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTableStatus = async (req, res) => {
  try {
    const { status, waiterId, customerCount } = req.body;
    const update = { status };
    if (waiterId) update.assignedWaiterId = waiterId;
    if (customerCount !== undefined) update.currentCustomerCount = customerCount;
    if (status === 'occupied') update.occupiedSince = new Date();
    if (status === 'available') { update.occupiedSince = null; update.currentOrderId = null; update.currentCustomerCount = 0; }

    const mongoose = require('mongoose');
    let table = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      table = await Table.findByIdAndUpdate(req.params.id, update, { new: true });
    }

    if (!table) {
      const cleanNum = String(req.params.id).replace(/[^0-9]/g, '') || '1';
      table = await Table.findOneAndUpdate({ tableNumber: cleanNum }, update, { new: true });
    }

    if (!table) {
      const cleanNum = String(req.params.id).replace(/[^0-9]/g, '') || '1';
      const rid = req.user.restaurantId || '60d0fe4f5311236168a109ca';
      table = await Table.create({
        restaurantId: rid,
        tableNumber: cleanNum,
        seatingCapacity: 4,
        floor: 1,
        tableType: 'regular',
        ...update,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${table.restaurantId}`).emit('table_status_changed', { tableId: table._id, status, tableNumber: table.tableNumber });
      io.to(`restaurant:${table.restaurantId}`).emit('table_updated', table);
      io.emit('table_updated', table);
    }
    res.json({ success: true, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteTable = async (req, res) => {
  try {
    await Table.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Table deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const mergeTables = async (req, res) => {
  try {
    const { tableIds } = req.body;
    const primaryTable = await Table.findByIdAndUpdate(tableIds[0], { mergedWith: tableIds.slice(1) }, { new: true });
    await Table.updateMany({ _id: { $in: tableIds.slice(1) } }, { status: 'occupied' });
    res.json({ success: true, data: primaryTable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Routes
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);
router.post('/', authorize('restaurant_admin', 'super_admin'), createTable);
router.get('/', getTables);
router.put('/:id', authorize('restaurant_admin', 'waiter', 'super_admin'), updateTable);
router.patch('/:id/status', authorize('restaurant_admin', 'waiter', 'super_admin'), updateTableStatus);
router.delete('/:id', authorize('restaurant_admin', 'super_admin'), deleteTable);
router.post('/merge', authorize('restaurant_admin', 'super_admin'), mergeTables);

module.exports = router;
