const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');

/**
 * @route GET /api/sensors
 * @desc Get latest sensor readings
 * @access Protected
 */
router.get('/sensors', protect, sensorController.getLatestReadings);

/**
 * @route GET /api/sensors/history
 * @desc Get sensor readings history
 * @access Protected
 */
router.get('/sensors/history', protect, sensorController.getReadingsHistory);

module.exports = router; 