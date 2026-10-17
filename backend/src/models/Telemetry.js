const mongoose = require('mongoose');

const TelemetrySchema = new mongoose.Schema({
  node_id: { 
    type: String, 
    required: true, 
    index: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  audio_level: { 
    type: Number, 
    required: true 
  }, // Acoustic Sound Pressure Level in dB SPL
  vibration_rms: { 
    type: Number, 
    required: true 
  }, // 3-Axis Accelerometer dynamic RMS in Gs
  vibration_peak: { 
    type: Number, 
    default: 0 
  }, // Peak impact spike in Gs
  temperature: { 
    type: Number, 
    default: 24.0 
  }, // Environmental temperature in °C
  periodicity: { 
    type: Number, 
    default: 0.0 
  }, // Autocorrelation rhythmic score (0.0 to 1.0)
  dominant_bpm: { 
    type: Number, 
    default: 0 
  }, // Detected human tapping cadence in BPM (e.g. 104 BPM)
  pattern: { 
    type: String, 
    default: 'NORMAL_BACKGROUND' 
  }, // Pattern classification (e.g. SURVIVOR_RHYTHMIC_TAPPING)
  evidence_index: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 0 
  } // Composite survivor likelihood score (0-100)
}, { timestamps: true });

// Time-series index for fast chart queries
TelemetrySchema.index({ node_id: 1, timestamp: -1 });

module.exports = mongoose.model('Telemetry', TelemetrySchema);
