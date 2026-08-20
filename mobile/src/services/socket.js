import { io } from 'socket.io-client';

const SOCKET_URL = process.env.SOCKET_URL || 'https://ai-smart-dine-backend.onrender.com';

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

socket.on('connect', () => {
  console.log(`🔌 Connected to Socket.IO server: ${socket.id}`);
  socket.emit('join_restaurant', '60d0fe4f5311236168a109ca');
});

socket.on('disconnect', (reason) => {
  console.log(`🔌 Disconnected from Socket.IO: ${reason}`);
});

export default socket;
