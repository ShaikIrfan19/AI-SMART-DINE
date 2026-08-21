const mongoose = require('mongoose');

// @POST /api/orders
const createOrder = async (req, res) => {
  try {
    let { restaurantId, tableId, items, notes, orderType, tableNumber } = req.body;
    const io = req.app.get('io');

    // Auto-assign restaurantId from logged-in user if not provided by frontend
    if (!restaurantId || restaurantId === 'undefined' || restaurantId === 'null') {
      restaurantId = req.user.restaurantId || '60d0fe4f5311236168a109ca';
    }

    // Validate items and calculate prices
    let subtotal = 0;
    const processedItems = [];

    for (const item of (items || [])) {
      let menuItem = null;
      if (mongoose.Types.ObjectId.isValid(item.menuItemId)) {
        menuItem = await MenuItem.findById(item.menuItemId).catch(() => null);
      }
      if (!menuItem && item.name) {
        menuItem = await MenuItem.findOne({ name: new RegExp('^' + item.name + '$', 'i') }).catch(() => null);
      }
      if (!menuItem) {
        // Create placeholder item in DB dynamically so it has a valid ID
        menuItem = await MenuItem.create({
          restaurantId,
          name: item.name || 'Delicious Dish',
          price: Number(item.price) || 100,
          category: 'main_course',
          isVeg: item.isVeg !== undefined ? item.isVeg : true,
          isAvailable: true,
        }).catch(() => null);
      }

      const addonTotal = (item.addons || []).reduce((sum, a) => sum + (a.price || 0), 0);
      const itemPrice = (menuItem?.price || item.price || 100) + addonTotal;
      const quantity = Number(item.quantity) || 1;
      const totalPrice = itemPrice * quantity;
      subtotal += totalPrice;

      processedItems.push({
        menuItemId: menuItem?._id || new mongoose.Types.ObjectId(),
        name: menuItem?.name || item.name || 'Dish',
        price: itemPrice,
        quantity,
        totalPrice,
        notes: item.notes || '',
        addons: item.addons || [],
        isVeg: menuItem?.isVeg !== undefined ? menuItem.isVeg : (item.isVeg !== undefined ? item.isVeg : true),
        image: menuItem?.image,
      });

      if (menuItem?._id) {
        await MenuItem.findByIdAndUpdate(menuItem._id, { $inc: { totalOrders: quantity } }).catch(() => {});
      }
    }

    // Get restaurant GST (graceful — don't fail if restaurant doc not found)
    const Restaurant = require('../models/Restaurant.model');
    const restaurant = await Restaurant.findById(restaurantId).catch(() => null);
    const gstPercentage = restaurant?.gstPercentage || 0;
    const gstAmount = (subtotal * gstPercentage) / 100;
    const totalAmount = subtotal + gstAmount;

    // Resolve Table
    let table = null;
    if (mongoose.Types.ObjectId.isValid(tableId)) {
      table = await Table.findById(tableId).catch(() => null);
    }
    if (!table) {
      const cleanNum = String(tableNumber || tableId || '1').replace(/[^0-9]/g, '') || '1';
      table = await Table.findOne({ tableNumber: cleanNum }).catch(() => null);
    }
    if (!table) {
      const cleanNum = String(tableNumber || tableId || '1').replace(/[^0-9]/g, '') || '1';
      table = await Table.create({
        restaurantId,
        tableNumber: cleanNum,
        seatingCapacity: 4,
        floor: 1,
        tableType: 'regular',
        status: 'occupied',
      }).catch(() => null);
    }

    const orderTableId = table?._id || (mongoose.Types.ObjectId.isValid(tableId) ? tableId : new mongoose.Types.ObjectId());
    const finalTableNum = table?.tableNumber || tableNumber || '1';

    const order = await Order.create({
      restaurantId,
      tableId: orderTableId,
      tableNumber: finalTableNum,
      customerId: req.user.role === 'customer' ? req.user._id : null,
      waiterId: req.user.role === 'waiter' ? req.user._id : null,
      items: processedItems,
      subtotal,
      gstAmount,
      gstPercentage,
      totalAmount,
      notes,
      orderType: orderType || 'dine_in',
      estimatedTime: 15,
    });

    // Update table status
    if (table?._id) {
      await Table.findByIdAndUpdate(table._id, {
        status: 'occupied',
        currentOrderId: order._id,
        occupiedSince: new Date(),
      }).catch(() => {});
    }

    // Real-time notifications
    if (io) {
      io.to(`restaurant:${restaurantId}`).emit('new_order', {
        order,
        table: finalTableNum,
        message: `New order from Table ${finalTableNum}`,
      });
      io.to(`restaurant:${restaurantId}`).emit('order_placed', {
        order,
        table: finalTableNum,
      });
      io.emit('order_placed', { order, table: finalTableNum });
      if (table) {
        io.to(`restaurant:${restaurantId}`).emit('table_updated', table);
        io.emit('table_updated', table);
      }
    }

    const populated = await Order.findById(order._id)
      .populate('tableId', 'tableNumber')
      .populate('customerId', 'name')
      .catch(() => order);

    res.status(201).json({ success: true, message: 'Order placed successfully', data: populated || order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/orders?restaurantId=&status=&tableId=
const getOrders = async (req, res) => {
  try {
    const { restaurantId, status, tableId, date, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (restaurantId) {
      filter.restaurantId = restaurantId;
    } else if (req.user.role !== 'super_admin') {
      filter.restaurantId = req.user.restaurantId || req.user._id;
    }

    if (status) filter.status = status;
    if (tableId) filter.tableId = tableId;
    if (req.query.myOrders === 'true' && req.user.role === 'waiter') filter.waiterId = req.user._id;
    if (req.user.role === 'customer') filter.customerId = req.user._id;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const orders = await Order.find(filter)
      .populate('tableId', 'tableNumber floor')
      .populate('customerId', 'name phone')
      .populate('waiterId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({ success: true, data: orders, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const io = req.app.get('io');

    const order = await Order.findByIdAndUpdate(req.params.id, { status, ...(status === 'completed' ? { completedAt: new Date() } : {}) }, { new: true });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // If completed, free up the table
    if (status === 'completed' || status === 'cancelled') {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'cleaning',
        currentOrderId: null,
        currentCustomerCount: 0,
      });
    }

    // Real-time update
    io.to(`restaurant:${order.restaurantId}`).emit('order_status_updated', {
      orderId: order._id,
      status,
      tableId: order.tableId,
    });

    // Notify customer if applicable
    if (order.customerId) {
      io.to(`user:${order.customerId}`).emit('your_order_updated', { orderId: order._id, status });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @GET /api/orders/live
const getLiveOrders = async (req, res) => {
  try {
    let restaurantId = req.query.restaurantId || req.user.restaurantId || req.user._id;
    const filter = {
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
    };
    if (restaurantId) filter.restaurantId = restaurantId;

    const orders = await Order.find(filter)
      .populate('tableId', 'tableNumber')
      .populate('waiterId', 'name')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @POST /api/orders/:id/items — Add items to existing order
const addItemsToOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    let additionalTotal = 0;
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) continue;
      const totalPrice = menuItem.price * item.quantity;
      additionalTotal += totalPrice;
      order.items.push({ ...item, name: menuItem.name, price: menuItem.price, totalPrice, isVeg: menuItem.isVeg });
    }

    order.subtotal += additionalTotal;
    const gstAmount = (order.subtotal * order.gstPercentage) / 100;
    order.gstAmount = gstAmount;
    order.totalAmount = order.subtotal + gstAmount - order.discount;
    await order.save();

    req.app.get('io').to(`restaurant:${order.restaurantId}`).emit('order_updated', order);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createOrder, getOrders, updateOrderStatus, getLiveOrders, addItemsToOrder };
