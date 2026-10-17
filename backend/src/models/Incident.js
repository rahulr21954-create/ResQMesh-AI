const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  site_name: { 
    type: String, 
    required: true 
  }, // e.g. "Commercial Complex Building 4 Collapse"
  status: { 
    type: String, 
    enum: ['ACTIVE', 'RESOLVED', 'ARCHIVED'], 
    default: 'ACTIVE' 
  },
  active_nodes: { 
    type: Number, 
    default: 3 
  },
  total_alerts: { 
    type: Number, 
    default: 0 
  },
  unresolved_alerts: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true });

module.exports = mongoose.model('Incident', IncidentSchema);
