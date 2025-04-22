/**
 * Socket.IO service for handling real-time communication
 */

// Store active connections for managing subscriptions
const activeConnections = new Map();

// Socket.IO instance (will be set during initialization)
let io = null;

/**
 * Initialize the Socket.IO service with the IO instance
 * @param {Object} ioInstance - Socket.IO server instance
 */
const initialize = (ioInstance) => {
  if (!ioInstance) {
    throw new Error('Socket.IO instance is required');
  }
  
  io = ioInstance;
  setupEventHandlers();
  console.log('Socket.IO service initialized');
  
  return {
    io,
    emitSensorReadings,
    emitSafetyAlert,
    emitMultipleSafetyAlerts,
    getActiveConnections: () => activeConnections.size
  };
};

/**
 * Set up Socket.IO event handlers
 */
const setupEventHandlers = () => {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Store connection with default subscriptions
    activeConnections.set(socket.id, {
      id: socket.id,
      subscriptions: {
        sensorReadings: true,
        safetyAlerts: true
      },
      user: null
    });
    
    // Handle subscription management
    socket.on('subscribe', (channel) => {
      console.log(`Client ${socket.id} subscribed to ${channel}`);
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.subscriptions[channel] = true;
      }
    });
    
    socket.on('unsubscribe', (channel) => {
      console.log(`Client ${socket.id} unsubscribed from ${channel}`);
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.subscriptions[channel] = false;
      }
    });
    
    // Handle authentication
    socket.on('authenticate', (userData) => {
      console.log(`Client ${socket.id} authenticated as ${userData.name || userData.email}`);
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.user = userData;
      }
      
      // Acknowledge authentication
      socket.emit('authenticated', { success: true });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      activeConnections.delete(socket.id);
    });
  });
};

/**
 * Emit sensor readings to subscribed clients
 * @param {Object} readings - Sensor readings data
 */
const emitSensorReadings = (readings) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  // Emit to all clients subscribed to sensorReadings
  for (const [socketId, connection] of activeConnections.entries()) {
    if (connection.subscriptions.sensorReadings) {
      io.to(socketId).emit('sensorReadings', readings);
    }
  }
};

/**
 * Emit a safety alert to subscribed clients
 * @param {Object} alert - Safety alert data
 */
const emitSafetyAlert = (alert) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  // Emit to all clients subscribed to safetyAlerts
  for (const [socketId, connection] of activeConnections.entries()) {
    if (connection.subscriptions.safetyAlerts) {
      io.to(socketId).emit('safetyAlert', alert);
    }
  }
};

/**
 * Emit multiple safety alerts to subscribed clients
 * @param {Array} alerts - Array of safety alert data
 */
const emitMultipleSafetyAlerts = (alerts) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  if (alerts.length > 0) {
    // Emit to all clients subscribed to safetyAlerts
    for (const [socketId, connection] of activeConnections.entries()) {
      if (connection.subscriptions.safetyAlerts) {
        io.to(socketId).emit('safetyAlerts', alerts);
      }
    }
  }
};

module.exports = {
  initialize,
  emitSensorReadings,
  emitSafetyAlert,
  emitMultipleSafetyAlerts
}; 