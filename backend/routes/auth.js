const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

/**
 * @route POST /auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route POST /auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', authController.login);

module.exports = router; 