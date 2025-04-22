// Import controller's updateLatestReadings function (will be added after controller is updated)
const sensorController = require('../controllers/sensorController');

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
  
  return {
    value: parseFloat(value.toFixed(2)),
    unit: config.unit,
    timestamp: new Date().toISOString(),
    isSafe: value <= config.safeMax
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
 * @param {Object} io - Socket.IO server instance
 * @param {Number} interval - Interval in milliseconds between readings
 */
const startSimulator = (io, interval = 1000) => {
  console.log(`Starting sensor simulator with interval: ${interval}ms`);
  
  // Generate and send sensor readings at regular intervals
  const simulatorInterval = setInterval(async () => {
    try {
      // Generate new readings
      const readings = generateAllReadings();
      latestReadings = readings;
      
      // Update controller with latest readings for API access
      sensorController.updateLatestReadings(readings);
      
      // Check for safety alerts
      const safetyAlerts = Object.entries(readings)
        .filter(([_, data]) => !data.isSafe)
        .map(([type, data]) => ({
          type,
          value: data.value,
          unit: data.unit,
          timestamp: data.timestamp,
          message: `${type} exceeded safe level: ${data.value} ${data.unit}`
        }));
      
      // Emit all readings via Socket.IO
      io.emit('sensorReadings', readings);
      
      // If there are safety alerts, emit them
      if (safetyAlerts.length > 0) {
        io.emit('safetyAlerts', safetyAlerts);
        
        // Log safety alerts to the console
        safetyAlerts.forEach(alert => {
          console.log(`SAFETY ALERT: ${alert.message}`);
        });
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