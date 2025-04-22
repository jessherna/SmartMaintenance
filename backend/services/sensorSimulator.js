// Import controller's updateLatestReadings function (will be added after controller is updated)
const sensorController = require('../controllers/sensorController');
const safetyThresholdService = require('./safetyThresholdService');
const safetyController = require('../controllers/safetyController');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');

// Configuration for sensor simulation
const SENSOR_TYPES = {
  VIBRATION: {
    min: 0,
    max: 15,
    safeMax: 10,
    baseValue: 5.0,       // Reduced from 6.5 to keep further from threshold
    normalVariation: 1.0, // Reduced from 1.5 to prevent values getting close to threshold
    unit: 'mm/s'
  },
  TEMPERATURE: {
    min: 20,
    max: 100,
    safeMax: 80,
    baseValue: 55.0,      // Reduced from 60 to keep further from threshold
    normalVariation: 5.0, // Reduced from 8 to prevent values getting close to threshold
    unit: '°C'
  },
  CURRENT: {
    min: 0,
    max: 50,
    safeMax: 40,
    baseValue: 28.0,      // Reduced from 30 to keep further from threshold
    normalVariation: 3.0, // Reduced from 5 to prevent values getting close to threshold
    unit: 'A'
  }
};

// Variable to store latest readings
let latestReadings = {};

// The interval between data generations in milliseconds
let sensorInterval = 1000;

// Flag to control the simulation frequency to reduce load
const REDUCE_FREQUENCY = true;
const UPDATE_INTERVAL = 3000; // Only update frontend every 3 seconds

// Check if this is a worker thread
if (!isMainThread && workerData) {
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

  // Generate a sensor reading with occasional anomalies
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

  // Generate readings for all sensor types
  const generateAllReadings = () => {
    const readings = {};
    
    Object.keys(SENSOR_TYPES).forEach(type => {
      readings[type] = generateReading(type);
    });
    
    return readings;
  };

  // Listen for messages from the main thread
  parentPort.on('message', (message) => {
    if (message.cmd === 'generate') {
      const readings = generateAllReadings();
      parentPort.postMessage({ type: 'readings', data: readings });
    }
  });

  // Notify main thread we're ready
  parentPort.postMessage({ type: 'ready' });
} else {
  // Main thread code

  // Worker to generate sensor data in a separate thread
  let worker = null;

  // Create a new worker thread for sensor simulation
  const createWorker = () => {
    // Create a worker script file path that references this same file
    const workerPath = path.resolve(__dirname, 'sensorSimulator.js');
    
    // Terminate existing worker if any
    if (worker) worker.terminate();
    
    // Create a new worker
    worker = new Worker(workerPath, { 
      workerData: { 
        sensorTypes: SENSOR_TYPES
      }
    });
    
    // Handle messages from the worker
    worker.on('message', (message) => {
      if (message.type === 'readings') {
        // Update local readings
        latestReadings = message.data;
      } else if (message.type === 'ready') {
        console.log('Sensor simulation worker is ready');
      }
    });
    
    // Handle worker errors
    worker.on('error', (error) => {
      console.error('Sensor simulation worker error:', error);
      createWorker(); // Recreate worker on error
    });
    
    // Handle worker exit
    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Sensor simulation worker stopped with exit code ${code}`);
        createWorker(); // Recreate worker on unexpected exit
      }
    });
    
    return worker;
  };

  /**
   * Start the sensor simulator
   * @param {Object} socketService - Socket.IO service instance
   * @param {Number} interval - Interval in milliseconds between readings
   */
  const startSimulator = (socketService, interval = 1000) => {
    // Store the interval value
    sensorInterval = interval;
    
    console.log(`Starting sensor simulator with interval: ${interval}ms`);
    
    // Create the worker for sensor data generation
    const worker = createWorker();
    
    // Track last time we sent data to the frontend
    let lastFrontendUpdate = 0;
    
    // Generate and send sensor readings at regular intervals
    const simulatorInterval = setInterval(async () => {
      try {
        // Request new readings from the worker
        worker.postMessage({ cmd: 'generate' });
        
        // Skip frontend updates if we're reducing frequency and it's not time yet
        const now = Date.now();
        if (REDUCE_FREQUENCY && (now - lastFrontendUpdate < UPDATE_INTERVAL)) {
          // Still update the controller for API access
          sensorController.updateLatestReadings(latestReadings);
          return;
        }
        
        // Update last frontend update time
        lastFrontendUpdate = now;
        
        // Update controller with latest readings for API access
        sensorController.updateLatestReadings(latestReadings);
        
        // Check for safety alerts using the safety threshold service
        const safetyAlerts = await safetyThresholdService.checkReadings(latestReadings);
        
        // Emit all readings via Socket.IO
        socketService.emitSensorReadings(latestReadings);
        
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
      stop: () => {
        clearInterval(simulatorInterval);
        if (worker) worker.terminate();
      },
      getLatestReadings: () => latestReadings
    };
  };

  // Export only in main thread
  module.exports = {
    startSimulator,
    SENSOR_TYPES
  };
} 