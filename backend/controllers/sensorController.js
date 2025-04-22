// Using in-memory data instead of InfluxDB for testing
const { SENSOR_TYPES } = require('../services/sensorSimulator');

// Store latest readings in memory
let latestReadings = {};
let readingsHistory = [];

// Maximum number of historical readings to keep
const MAX_HISTORY_SIZE = 100;

// Update latest readings (called by sensorSimulator)
const updateLatestReadings = (readings) => {
  latestReadings = readings;
  
  // Add to history with timestamp
  const historyEntry = {
    timestamp: new Date().toISOString(),
    ...readings
  };
  
  readingsHistory.unshift(historyEntry);
  
  // Limit history size
  if (readingsHistory.length > MAX_HISTORY_SIZE) {
    readingsHistory.pop();
  }
};

/**
 * Get latest sensor readings
 * @route GET /api/sensors
 */
exports.getLatestReadings = async (req, res) => {
  try {
    // If no readings yet, generate some dummy ones
    if (Object.keys(latestReadings).length === 0) {
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
      
      Object.keys(SENSOR_TYPES).forEach(type => {
        latestReadings[type] = generateReading(type);
      });
    }

    res.status(200).json({
      status: 'success',
      data: latestReadings
    });
  } catch (err) {
    console.error('Error fetching sensor readings:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching sensor readings'
    });
  }
};

/**
 * Get sensor readings history
 * @route GET /api/sensors/history
 */
exports.getReadingsHistory = async (req, res) => {
  try {
    const { sensorType } = req.query;
    
    // Filter by sensor type if provided
    let filteredHistory = readingsHistory;
    
    if (sensorType) {
      filteredHistory = readingsHistory.map(entry => {
        const { timestamp, [sensorType]: sensorData } = entry;
        return { timestamp, [sensorType]: sensorData };
      });
    }

    res.status(200).json({
      status: 'success',
      data: filteredHistory
    });
  } catch (err) {
    console.error('Error fetching sensor history:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching sensor history'
    });
  }
};

// Export the updateLatestReadings function so it can be called from the simulator
exports.updateLatestReadings = updateLatestReadings; 