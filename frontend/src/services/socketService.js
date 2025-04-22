import { io } from 'socket.io-client';
import axios from 'axios';
import { Platform } from 'react-native';

// Get API URL from the same source as the main API service
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000'; // Android emulator
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:5000'; // iOS simulator
  } else {
    return 'http://localhost:5000'; // Web fallback
  }
};

const API_URL = getApiUrl();

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Initialize and connect to the Socket.IO server
   * @returns {Promise} - Resolves when connected
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.connected) {
        console.log('Socket already connected');
        resolve(this.socket);
        return;
      }

      console.log('Connecting to socket at:', API_URL);
      
      // Create Socket.IO connection to server
      this.socket = io(API_URL, {
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
        transports: ['websocket', 'polling']
      });

      // Handle connection events
      this.socket.on('connect', () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        console.log('Socket connected successfully');
        resolve(this.socket);
      });

      // Handle connection error
      this.socket.on('connect_error', (error) => {
        this.reconnectAttempts++;
        console.error('Socket connection error:', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`));
        }
      });

      // Handle disconnection
      this.socket.on('disconnect', (reason) => {
        this.connected = false;
        console.log('Socket disconnected:', reason);
      });
    });
  }

  /**
   * Authenticate the socket connection
   * @param {Object} userData - User data for authentication
   */
  authenticate(userData) {
    if (!this.socket || !this.connected) {
      console.error('Cannot authenticate: Socket not connected');
      return Promise.reject(new Error('Socket not connected'));
    }

    return new Promise((resolve) => {
      this.socket.emit('authenticate', userData);
      this.socket.once('authenticated', (response) => {
        console.log('Socket authenticated:', response);
        resolve(response);
      });
    });
  }

  /**
   * Subscribe to a specific channel
   * @param {String} channel - Channel to subscribe to
   */
  subscribe(channel) {
    if (!this.socket || !this.connected) {
      console.error(`Cannot subscribe to ${channel}: Socket not connected`);
      return;
    }

    this.socket.emit('subscribe', channel);
  }

  /**
   * Unsubscribe from a specific channel
   * @param {String} channel - Channel to unsubscribe from
   */
  unsubscribe(channel) {
    if (!this.socket || !this.connected) {
      console.error(`Cannot unsubscribe from ${channel}: Socket not connected`);
      return;
    }

    this.socket.emit('unsubscribe', channel);
  }

  /**
   * Add event listener
   * @param {String} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.socket) {
      console.error(`Cannot add listener for ${event}: Socket not initialized`);
      return;
    }

    // Store the callback to manage listeners
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Register the callback with Socket.IO
    this.socket.on(event, callback);
  }

  /**
   * Remove event listener
   * @param {String} event - Event name
   * @param {Function} callback - Event callback to remove (optional)
   */
  off(event, callback) {
    if (!this.socket) {
      console.error(`Cannot remove listener for ${event}: Socket not initialized`);
      return;
    }

    if (callback) {
      // Remove specific callback
      this.socket.off(event, callback);
      
      // Update our tracking
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    } else {
      // Remove all callbacks for this event
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

// Export both the singleton instance and backward compatibility methods
export default socketService;

// Add these for backward compatibility to prevent errors
export const initSocket = () => {
  console.warn('initSocket is deprecated, please use socketService.connect() instead');
  socketService.connect();
  return socketService.socket || { on: () => {}, off: () => {}, emit: () => {} };
};

export const closeSocket = () => {
  console.warn('closeSocket is deprecated, please use socketService.disconnect() instead');
  socketService.disconnect();
}; 