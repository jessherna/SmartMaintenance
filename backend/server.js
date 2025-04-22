require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/sensors');
const { startSimulator } = require('./services/sensorSimulator');

// Display configuration status
console.log('=== Smart Maintenance Server ===');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('InfluxDB URL:', process.env.INFLUXDB_URL ? 'Configured ✓' : 'Not configured ✗');
console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Configured ✓' : 'Not configured ✗');
console.log('JWT Secret:', process.env.JWT_SECRET ? 'Configured ✓' : 'Using default (not secure) ✗');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api', sensorRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start sensor simulator with the Socket.IO instance
let sensorSimulator;
if (process.env.NODE_ENV !== 'test') {
  sensorSimulator = startSimulator(io);
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for testing
module.exports = { app, server, io, sensorSimulator }; 