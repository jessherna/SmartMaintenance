const { writePoint } = require('../config/influxdb');
const { SENSOR_TYPES } = require('./sensorSimulator');

// Default threshold configuration - can be overridden by environment variables
const DEFAULT_THRESHOLDS = {
  VIBRATION: {
    min: 0,
    max: 10, // mm/s
    unit: 'mm/s'
  },
  TEMPERATURE: {
    min: 20,
    max: 80, // °C
    unit: '°C'
  },
  CURRENT: {
    min: 0,
    max: 40, // A
    unit: 'A'
  }
};

// Store the current thresholds (initialized with defaults)
let safetyThresholds = { ...DEFAULT_THRESHOLDS };

/**
 * Update safety thresholds for a specific sensor type
 * @param {String} sensorType - The sensor type to update
 * @param {Object} thresholds - New threshold values
 */
const updateThreshold = (sensorType, thresholds) => {
  if (!safetyThresholds[sensorType]) {
    throw new Error(`Invalid sensor type: ${sensorType}`);
  }
  
  safetyThresholds[sensorType] = {
    ...safetyThresholds[sensorType],
    ...thresholds
  };
  
  console.log(`Updated safety thresholds for ${sensorType}:`, safetyThresholds[sensorType]);
  return safetyThresholds[sensorType];
};

/**
 * Get current safety thresholds for all sensors or a specific sensor
 * @param {String} sensorType - Optional sensor type to get thresholds for
 * @returns {Object} - Current thresholds
 */
const getThresholds = (sensorType) => {
  if (sensorType) {
    return safetyThresholds[sensorType] || null;
  }
  return safetyThresholds;
};

/**
 * Check if a sensor reading is within the safe range
 * @param {String} sensorType - The type of sensor
 * @param {Number} value - The sensor reading value
 * @returns {Boolean} - True if the reading is safe, false otherwise
 */
const isReadingSafe = (sensorType, value) => {
  const threshold = safetyThresholds[sensorType];
  if (!threshold) return true; // No threshold defined means it's safe
  
  return value >= threshold.min && value <= threshold.max;
};

/**
 * Check sensor readings against safety thresholds and generate alerts if needed
 * @param {Object} readings - Sensor readings
 * @returns {Array} - Array of safety alerts, empty if all readings are safe
 */
const checkReadings = async (readings) => {
  const alerts = [];
  
  // Check each sensor reading against its threshold
  for (const [sensorType, reading] of Object.entries(readings)) {
    if (!isReadingSafe(sensorType, reading.value)) {
      // Create alert object
      const alert = {
        type: sensorType,
        value: reading.value,
        unit: reading.unit || safetyThresholds[sensorType].unit,
        threshold: safetyThresholds[sensorType].max,
        timestamp: reading.timestamp || new Date().toISOString(),
        message: `${sensorType} exceeded safe level: ${reading.value} ${reading.unit || safetyThresholds[sensorType].unit}`
      };
      
      alerts.push(alert);
      
      // Log to console
      console.log(`SAFETY ALERT: ${alert.message}`);
      
      // Store in InfluxDB
      try {
        await writePoint('safety_alerts', 
          { type: sensorType }, 
          { 
            value: reading.value,
            threshold: safetyThresholds[sensorType].max,
            message: alert.message
          }
        );
      } catch (err) {
        console.error('Error storing safety alert in InfluxDB:', err);
      }
    }
  }
  
  return alerts;
};

// Initialize thresholds from environment variables if available
const initializeThresholds = () => {
  Object.keys(safetyThresholds).forEach(sensorType => {
    const minEnvVar = `${sensorType}_MIN_THRESHOLD`;
    const maxEnvVar = `${sensorType}_MAX_THRESHOLD`;
    
    if (process.env[minEnvVar]) {
      safetyThresholds[sensorType].min = parseFloat(process.env[minEnvVar]);
    }
    
    if (process.env[maxEnvVar]) {
      safetyThresholds[sensorType].max = parseFloat(process.env[maxEnvVar]);
    }
  });
  
  console.log('Safety thresholds initialized:', safetyThresholds);
};

// Initialize thresholds on module load
initializeThresholds();

module.exports = {
  checkReadings,
  updateThreshold,
  getThresholds,
  isReadingSafe
}; 