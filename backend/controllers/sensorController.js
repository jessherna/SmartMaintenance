// Using in-memory data instead of InfluxDB for testing
const { SENSOR_TYPES } = require('../services/sensorSimulator');

// Store latest readings in memory
let latestReadings = {};
let readingsHistory = [];

// Maximum number of historical readings to keep - increased for better visualization
const MAX_HISTORY_SIZE = 300;

// How often to store a reading in history (1 = every reading, 2 = every other reading, etc.)
// This helps reduce memory usage and processing load
const HISTORY_SAMPLING_RATE = 2; 

// Counter to track readings for sampling
let readingsCounter = 0;

// Update latest readings (called by sensorSimulator)
const updateLatestReadings = (readings) => {
  // Always update latest readings
  latestReadings = readings;
  
  // Only store in history at the specified sampling rate
  readingsCounter++;
  if (readingsCounter % HISTORY_SAMPLING_RATE !== 0) {
    return;
  }
  
  // Add to history with timestamp
  const historyEntry = {
    timestamp: new Date().toISOString(),
    ...readings
  };
  
  // Add to beginning of array for faster access to recent data
  readingsHistory.unshift(historyEntry);
  
  // Limit history size - more efficient by removing a batch of items when threshold is exceeded
  if (readingsHistory.length > MAX_HISTORY_SIZE + 50) {
    // Remove a batch of oldest entries (50) to avoid frequent array operations
    readingsHistory = readingsHistory.slice(0, MAX_HISTORY_SIZE);
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
    const { sensorType, limit = 60 } = req.query;
    
    // Limit the number of readings returned to avoid large responses
    const maxLimit = Math.min(parseInt(limit), 100);
    
    // Filter by sensor type if provided
    let filteredHistory;
    
    if (sensorType) {
      // More efficient filtering by creating new objects with only the requested data
      filteredHistory = readingsHistory
        .slice(0, maxLimit)
        .map(entry => {
          const { timestamp, [sensorType]: sensorData } = entry;
          if (!sensorData) return null; // Skip entries without data for this sensor
          return { timestamp, [sensorType]: sensorData };
        })
        .filter(Boolean); // Remove null entries
    } else {
      // Just limit the size of the returned array
      filteredHistory = readingsHistory.slice(0, maxLimit);
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