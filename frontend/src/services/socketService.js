import { io } from 'socket.io-client';

let socket = null;

/**
 * Initialize Socket.IO connection
 * @returns {Object} Socket.IO instance
 */
export const initSocket = () => {
  if (!socket) {
    socket = io('http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });
  }

  return socket;
};

/**
 * Get the current Socket.IO instance
 * @returns {Object|null} Socket.IO instance or null if not initialized
 */
export const getSocket = () => socket;

/**
 * Close Socket.IO connection
 */
export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket.IO connection closed');
  }
}; 