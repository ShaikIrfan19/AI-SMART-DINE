const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: false },
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', default: null },
  tableNumber: { type: String, default: 'Table 1' },
  type: { type: String, enum: ['call_waiter', 'order_status', 'bill_request', 'custom'], default: 'call_waiter' },
  customerName: { type: String, default: 'Customer' },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'acknowledged', 'resolved'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
