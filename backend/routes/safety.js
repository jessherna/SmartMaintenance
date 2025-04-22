const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const { protect } = require('../middleware/auth');

/**
 * @route GET /api/safety/thresholds
 * @desc Get safety thresholds for all sensors or specific sensor
 * @access Protected
 */
router.get('/thresholds', protect, safetyController.getThresholds);

/**
 * @route PUT /api/safety/thresholds/:sensorType
 * @desc Update safety threshold for a specific sensor
 * @access Protected
 */
router.put('/thresholds/:sensorType', protect, safetyController.updateThreshold);

/**
 * @route GET /api/safety/alerts
 * @desc Get safety alerts history
 * @access Protected
 */
router.get('/alerts', protect, safetyController.getAlerts);

module.exports = router; 