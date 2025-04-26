const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const deviceService = require('./services/deviceService');
const Device = require('./models/Device');

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB with proper options
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4 // Force IPv4
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/devices', require('./routes/deviceRoutes'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  let intervalIds = new Map();

  // Listen for start monitoring request
  socket.on('startMonitoring', async (deviceId) => {
    if (intervalIds.has(deviceId)) {
      clearInterval(intervalIds.get(deviceId));
    }

    // Start monitoring device
    const intervalId = setInterval(async () => {
      try {
        const device = await Device.findById(deviceId);
        if (!device) {
          clearInterval(intervalId);
          return;
        }

        const status = await deviceService.checkDeviceStatus(device);
        socket.emit('deviceUpdate', { deviceId, ...status });
      } catch (error) {
        console.error(`Error monitoring device ${deviceId}:`, error);
      }
    }, 5000); // Update every 5 seconds

    intervalIds.set(deviceId, intervalId);
  });

  // Listen for stop monitoring request
  socket.on('stopMonitoring', (deviceId) => {
    if (intervalIds.has(deviceId)) {
      clearInterval(intervalIds.get(deviceId));
      intervalIds.delete(deviceId);
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    for (const intervalId of intervalIds.values()) {
      clearInterval(intervalId);
    }
    intervalIds.clear();
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});