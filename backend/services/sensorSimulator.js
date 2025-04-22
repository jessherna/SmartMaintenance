// Import controller's updateLatestReadings function (will be added after controller is updated)
const sensorController = require('../controllers/sensorController');
const safetyThresholdService = require('./safetyThresholdService');
const safetyController = require('../controllers/safetyController');

// Configuration for sensor simulation
const SENSOR_TYPES = {
  VIBRATION: {
    min: 0,
    max: 15,
    safeMax: 10,
    unit: 'mm/s'
  },
  TEMPERATURE: {
    min: 20,
    max: 100,
    safeMax: 80,
    unit: '°C'
  },
  CURRENT: {
    min: 0,
    max: 50,
    safeMax: 40,
    unit: 'A'
  }
};

// Variable to store latest readings
let latestReadings = {};

/**
 * Generate a random sensor reading within the specified range
 * @param {String} sensorType - The type of sensor
 * @returns {Object} - Generated sensor reading
 */
const generateReading = (sensorType) => {
  const config = SENSOR_TYPES[sensorType];
  const value = Math.random() * (config.max - config.min) + config.min;
  const timestamp = new Date().toISOString();
  
  return {
    value: parseFloat(value.toFixed(2)),
    unit: config.unit,
    timestamp: timestamp
  };
};

/**
 * Generate readings for all sensor types
 * @returns {Object} - Generated readings for all sensors
 */
const generateAllReadings = () => {
  const readings = {};
  
  Object.keys(SENSOR_TYPES).forEach(type => {
    readings[type] = generateReading(type);
  });
  
  return readings;
};

/**
 * Start the sensor simulator
 * @param {Object} socketService - Socket.IO service instance
 * @param {Number} interval - Interval in milliseconds between readings
 */
const startSimulator = (socketService, interval = 1000) => {
  console.log(`Starting sensor simulator with interval: ${interval}ms`);
  
  // Generate and send sensor readings at regular intervals
  const simulatorInterval = setInterval(async () => {
    try {
      // Generate new readings
      const readings = generateAllReadings();
      latestReadings = readings;
      
      // Update controller with latest readings for API access
      sensorController.updateLatestReadings(readings);
      
      // Check for safety alerts using the safety threshold service
      const safetyAlerts = await safetyThresholdService.checkReadings(readings);
      
      // Emit all readings via Socket.IO
      socketService.emitSensorReadings(readings);
      
      // If there are safety alerts, emit them and process them
      if (safetyAlerts.length > 0) {
        socketService.emitMultipleSafetyAlerts(safetyAlerts);
        safetyController.processAlerts(safetyAlerts);
      }
      
    } catch (error) {
      console.error('Error in sensor simulator:', error);
    }
  }, interval);
  
  return {
    stop: () => clearInterval(simulatorInterval),
    getLatestReadings: () => latestReadings
  };
};

module.exports = {
  startSimulator,
  SENSOR_TYPES
}; 