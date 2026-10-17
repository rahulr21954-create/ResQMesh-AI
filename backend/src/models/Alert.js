const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  priority_level: { 
    type: String, 
    enum: ['CRITICAL', 'ELEVATED', 'MONITORING', 'NOMINAL'], 
    default: 'NOMINAL' 
  },
  sector: { 
    type: String, 
    required: true 
  }, // e.g. "Sector B2"
  coordinates: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  evidence_score: { 
    type: Number, 
    min: 0, 
    max: 100, 
    required: true 
  },
  detected_pattern: { 
    type: String, 
    default: 'SURVIVOR_RHYTHMIC_TAPPING' 
  },
  multi_node_agreement: { 
    type: String 
  }, // e.g. "HIGH MULTI-NODE CORRELATION (3 nodes in consensus)"
  involved_nodes: [{ 
    type: String 
  }], // e.g. ["node-alpha", "node-bravo"]
  estimated_depth_m: { 
    type: Number, 
    default: 1.2 
  }, // Estimated survivor depth under debris (meters)
  status: { 
    type: String, 
    enum: [
      'PENDING_REVIEW', 
      'DISPATCHED_SAR', 
      'INVESTIGATING', 
      'CONFIRMED_SURVIVOR', 
      'FALSE_ALARM', 
      'RESOLVED'
    ], 
    default: 'PENDING_REVIEW',
    index: true
  },
  notes: { 
    type: String, 
    default: '' 
  }, // Decision support notes or rescuer feedback
  reviewed_by: { 
    type: String, 
    default: null 
  }, // Incident Commander / Rescuer Call Sign
  reviewed_at: { 
    type: Date, 
    default: null 
  }
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
