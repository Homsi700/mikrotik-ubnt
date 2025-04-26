const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['mikrotik', 'ubnt', 'mimosa'],
    lowercase: true
  },
  ipAddress: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    default: 8728 // Default MikroTik API port
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'error'],
    default: 'offline'
  },
  statistics: {
    transmit: {
      bytesPerSecond: Number,
      packetsPerSecond: Number
    },
    receive: {
      bytesPerSecond: Number,
      packetsPerSecond: Number
    },
    users: {
      active: Number,
      inactive: Number
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  lastChecked: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Device', deviceSchema);