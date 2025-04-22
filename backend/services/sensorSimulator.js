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
    baseValue: 6.5,       // Normal operating value
    normalVariation: 1.5, // Normal daily fluctuation
    unit: 'mm/s'
  },
  TEMPERATURE: {
    min: 20,
    max: 100,
    safeMax: 80,
    baseValue: 60,        // Normal operating value
    normalVariation: 8,   // Normal daily fluctuation
    unit: '°C'
  },
  CURRENT: {
    min: 0,
    max: 50,
    safeMax: 40,
    baseValue: 30,        // Normal operating value
    normalVariation: 5,   // Normal daily fluctuation 
    unit: 'A'
  }
};

// Variable to store latest readings
let latestReadings = {};

// Track anomaly state for each sensor
const anomalyState = {
  VIBRATION: { active: false, nextAnomalyTime: 0, duration: 0 },
  TEMPERATURE: { active: false, nextAnomalyTime: 0, duration: 0 },
  CURRENT: { active: false, nextAnomalyTime: 0, duration: 0 }
};

// Schedule the next anomaly for a sensor type
const scheduleNextAnomaly = (sensorType) => {
  // Random time between 2-3 hours in milliseconds
  const hoursUntilNextAnomaly = 2 + Math.random();
  const nextAnomalyTime = Date.now() + (hoursUntilNextAnomaly * 60 * 60 * 1000);
  
  // Duration of anomaly: 2-5 minutes
  const anomalyDuration = (2 + Math.random() * 3) * 60 * 1000;
  
  anomalyState[sensorType] = {
    active: false,
    nextAnomalyTime,
    duration: anomalyDuration
  };
  
  console.log(`Scheduled next ${sensorType} anomaly in ${hoursUntilNextAnomaly.toFixed(1)} hours, ` +
             `duration: ${(anomalyDuration/60000).toFixed(1)} minutes`);
};

// Initialize all anomaly schedules
Object.keys(SENSOR_TYPES).forEach(scheduleNextAnomaly);

/**
 * Generate a sensor reading using a more realistic pattern with occasional anomalies
 * @param {String} sensorType - The type of sensor
 * @returns {Object} - Generated sensor reading
 */
const generateReading = (sensorType) => {
  const config = SENSOR_TYPES[sensorType];
  const state = anomalyState[sensorType];
  const now = Date.now();
  const timestamp = new Date().toISOString();
  let value;
  
  // Check if it's time to start an anomaly
  if (!state.active && now >= state.nextAnomalyTime) {
    state.active = true;
    state.endTime = now + state.duration;
    console.log(`Starting ${sensorType} anomaly, duration: ${(state.duration/60000).toFixed(1)} minutes`);
  }
  
  // Check if current anomaly should end
  if (state.active && now >= state.endTime) {
    state.active = false;
    scheduleNextAnomaly(sensorType);
  }
  
  // Generate time-based sine wave pattern for natural variation (24 hour cycle)
  const hourOfDay = new Date().getHours() + (new Date().getMinutes() / 60);
  const dailyCyclePosition = (hourOfDay / 24) * 2 * Math.PI;
  const timeBasedVariation = Math.sin(dailyCyclePosition) * (config.normalVariation * 0.5);
  
  // Add some random noise
  const noise = (Math.random() * 2 - 1) * (config.normalVariation * 0.3);
  
  if (state.active) {
    // Gradual build-up to exceed threshold during anomaly
    const anomalyProgress = (now - (state.endTime - state.duration)) / state.duration;
    const anomalyShape = Math.sin(anomalyProgress * Math.PI); // 0 to 1 to 0 pattern
    
    // Peak anomaly value goes slightly above threshold
    const anomalyExcess = (config.safeMax - config.baseValue) * 1.2;
    const anomalyContribution = anomalyShape * anomalyExcess;
    
    value = config.baseValue + timeBasedVariation + noise + anomalyContribution;
  } else {
    // Normal operation - stay below threshold with natural variations
    value = config.baseValue + timeBasedVariation + noise;
  }
  
  // Ensure values stay within absolute min/max
  value = Math.max(config.min, Math.min(config.max, value));
  
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