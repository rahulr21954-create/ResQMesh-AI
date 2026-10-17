const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  x: { 
    type: Number, 
    required: true 
  }, // Grid X position in meters (0-60m)
  y: { 
    type: Number, 
    required: true 
  }, // Grid Y position in meters (0-60m)
  status: { 
    type: String, 
    enum: ['ONLINE', 'OFFLINE', 'ALERT'], 
    default: 'ONLINE' 
  },
  battery: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 100 
  },
  signal_rssi: { 
    type: Number, 
    default: -60 
  }, // Signal RSSI in dBm
  hardware: { 
    type: String, 
    default: 'ESP32 + MPU6050 + INMP441' 
  },
  last_seen: { 
    type: Date, 
    default: Date.now 
  },
  latest_telemetry: {
    audio_level: { type: Number, default: 35.0 },
    vibration_rms: { type: Number, default: 0.02 },
    vibration_peak: { type: Number, default: 0.03 },
    temperature: { type: Number, default: 24.0 },
    periodicity: { type: Number, default: 0.0 },
    dominant_bpm: { type: Number, default: 0 },
    pattern: { type: String, default: 'NORMAL_BACKGROUND' },
    evidence_index: { type: Number, default: 5 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Node', NodeSchema);
