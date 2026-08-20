module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join restaurant room
    socket.on('join_restaurant', (restaurantId) => {
      socket.join(`restaurant:${restaurantId}`);
      console.log(`📍 Socket ${socket.id} joined restaurant: ${restaurantId}`);
    });

    // Join user room (for personal notifications)
    socket.on('join_user', (userId) => {
      socket.join(`user:${userId}`);
    });

    // Join table room (for table-specific updates)
    socket.on('join_table', ({ restaurantId, tableId }) => {
      socket.join(`table:${restaurantId}:${tableId}`);
    });

    // Kitchen: mark item as ready
    socket.on('item_ready', ({ restaurantId, orderId, itemId, itemName }) => {
      const payload = { orderId, itemId, itemName, timestamp: new Date() };
      io.to(`restaurant:${restaurantId}`).emit('item_ready', payload);
      io.emit('item_ready', payload);
    });

    // Waiter: call from customer
    socket.on('call_waiter', (data) => {
      const payload = {
        _id: 'call_' + Date.now(),
        tableId: data?.tableId || 'table_1',
        tableNumber: data?.tableNumber || 'Table 1',
        customerName: data?.customerName || 'Customer',
        message: data?.message || 'Customer requested assistance at Table 1',
        status: 'pending',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      console.log('🔔 [Socket Server] Broadcasting waiter call alert globally:', payload);

      if (data?.restaurantId) {
        io.to(`restaurant:${data.restaurantId}`).emit('waiter_called', payload);
        io.to(`restaurant:${data.restaurantId}`).emit('waiter-call-alert', payload);
      }
      // Global broadcast so ALL waiters receive call alert instantly
      io.emit('waiter_called', payload);
      io.emit('waiter-call-alert', payload);
    });

    // Table status update
    socket.on('table_status_update', ({ restaurantId, tableId, status }) => {
      const payload = { tableId, status, timestamp: new Date() };
      if (restaurantId) io.to(`restaurant:${restaurantId}`).emit('table_updated', payload);
      io.emit('table_updated', payload);
    });

    // Kitchen display: order status
    socket.on('kitchen_update', ({ restaurantId, orderId, status, message }) => {
      const payload = { orderId, status, message, timestamp: new Date() };
      if (restaurantId) io.to(`restaurant:${restaurantId}`).emit('kitchen_status', payload);
      io.emit('kitchen_status', payload);
    });

    // Typing in chat
    socket.on('typing', ({ restaurantId, tableId }) => {
      socket.to(`restaurant:${restaurantId}`).emit('user_typing', { tableId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};
