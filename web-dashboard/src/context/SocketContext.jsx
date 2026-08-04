import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = io('https://ai-smart-dine-backend.onrender.com', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Join restaurant room if user has restaurantId
      const restaurantId = user?.restaurantId;
      if (restaurantId) {
        socket.emit('join_restaurant', restaurantId);
      }
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?.restaurantId]);

  const on = (event, handler) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, handler);
  };

  const off = (event, handler) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, handler);
  };

  const emit = (event, data) => {
    if (!socketRef.current) return;
    socketRef.current.emit(event, data);
  };

  return (
    <SocketContext.Provider value={{ connected, on, off, emit, socket: socketRef }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
