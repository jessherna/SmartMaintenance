const {
  getThresholds,
  updateThreshold,
  checkReadings
} = require('../services/safetyThresholdService');

// Store alerts in memory for quick access
const alertsHistory = [];
const MAX_ALERTS_HISTORY = 100;

/**
 * Store a new safety alert in memory
 * @param {Object} alert - The safety alert to store
 */
const storeAlert = (alert) => {
  alertsHistory.unshift(alert);
  
  // Limit history size
  if (alertsHistory.length > MAX_ALERTS_HISTORY) {
    alertsHistory.pop();
  }
};

/**
 * Get current safety thresholds
 * @route GET /api/safety/thresholds
 */
exports.getThresholds = async (req, res) => {
  try {
    const { sensorType } = req.query;
    const thresholds = getThresholds(sensorType);
    
    res.status(200).json({
      status: 'success',
      data: thresholds
    });
  } catch (err) {
    console.error('Error fetching safety thresholds:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Error fetching safety thresholds'
    });
  }
};

/**
 * Update safety threshold for a sensor type
 * @route PUT /api/safety/thresholds/:sensorType
 */
exports.updateThreshold = async (req, res) => {
  try {
    const { sensorType } = req.params;
    const { min, max } = req.body;
    
    if (!sensorType) {
      return res.status(400).json({
        status: 'error',
        message: 'Sensor type is required'
      });
    }
    
    if (min === undefined && max === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'At least one threshold value (min or max) is required'
      });
    }
    
    const thresholds = {};
    if (min !== undefined) thresholds.min = parseFloat(min);
    if (max !== undefined) thresholds.max = parseFloat(max);
    
    const updatedThreshold = updateThreshold(sensorType, thresholds);
    
    res.status(200).json({
      status: 'success',
      data: updatedThreshold
    });
  } catch (err) {
    console.error('Error updating safety threshold:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Error updating safety threshold'
    });
  }
};

/**
 * Get safety alerts history
 * @route GET /api/safety/alerts
 */
exports.getAlerts = async (req, res) => {
  try {
    const { sensorType } = req.query;
    
    // Filter by sensor type if provided
    let filteredAlerts = alertsHistory;
    if (sensorType) {
      filteredAlerts = alertsHistory.filter(alert => alert.type === sensorType);
    }
    
    res.status(200).json({
      status: 'success',
      data: filteredAlerts
    });
  } catch (err) {
    console.error('Error fetching safety alerts:', err);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching safety alerts'
    });
  }
};

/**
 * Process a new safety alert
 * @param {Object} alert - The safety alert to process
 */
exports.processAlert = (alert) => {
  storeAlert(alert);
};

/**
 * Process and store multiple alerts
 * @param {Array} alerts - Array of safety alerts
 */
exports.processAlerts = (alerts) => {
  alerts.forEach(alert => storeAlert(alert));
};

// Export for use in other modules
exports.storeAlert = storeAlert; 