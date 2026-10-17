const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Import Mongoose Models
const NodeModel = require('./models/Node');
const TelemetryModel = require('./models/Telemetry');
const AlertModel = require('./models/Alert');
const IncidentModel = require('./models/Incident');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rescuemesh_ai';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data: RescueMesh AI 3-node architecture
const INITIAL_DATA = {
  nodes: [
    {
      id: 'node-alpha',
      name: 'Node A (North Rubble Pile)',
      x: 18,
      y: 45,
      status: 'ONLINE',
      battery: 94,
      signal_rssi: -58,
      hardware: 'ESP32 + MPU6050 + INMP441',
      last_seen: new Date().toISOString(),
      latest_telemetry: {
        audio_level: 38.2,
        vibration_rms: 0.024,
        vibration_peak: 0.041,
        temperature: 24.1,
        periodicity: 0.05,
        dominant_bpm: 0,
        pattern: 'NORMAL_BACKGROUND',
        evidence_index: 8
      }
    },
    {
      id: 'node-bravo',
      name: 'Node B (East Collapsed Beam)',
      x: 38,
      y: 35,
      status: 'ONLINE',
      battery: 88,
      signal_rssi: -64,
      hardware: 'ESP32 + MPU6050 + INMP441',
      last_seen: new Date().toISOString(),
      latest_telemetry: {
        audio_level: 41.5,
        vibration_rms: 0.031,
        vibration_peak: 0.055,
        temperature: 23.8,
        periodicity: 0.08,
        dominant_bpm: 0,
        pattern: 'NORMAL_BACKGROUND',
        evidence_index: 12
      }
    },
    {
      id: 'node-charlie',
      name: 'Node C (South Basement Void)',
      x: 25,
      y: 15,
      status: 'ONLINE',
      battery: 91,
      signal_rssi: -61,
      hardware: 'ESP32 + MPU6050 + INMP441',
      last_seen: new Date().toISOString(),
      latest_telemetry: {
        audio_level: 36.8,
        vibration_rms: 0.019,
        vibration_peak: 0.033,
        temperature: 22.9,
        periodicity: 0.02,
        dominant_bpm: 0,
        pattern: 'NORMAL_BACKGROUND',
        evidence_index: 5
      }
    }
  ],
  telemetry_history: [],
  alerts: [
    {
      id: 'alt-init-01',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      priority_level: 'ELEVATED',
      sector: 'Sector B2',
      coordinates: { x: 26.5, y: 38 },
      evidence_score: 78,
      detected_pattern: 'SURVIVOR_RHYTHMIC_TAPPING',
      multi_node_agreement: 'HIGH MULTI-NODE CORRELATION (2 nodes in consensus)',
      status: 'PENDING_REVIEW',
      involved_nodes: ['node-alpha', 'node-bravo'],
      estimated_depth_m: 1.4,
      notes: 'Awaiting SAR listening team confirmation. Correlated vibration confirmed.',
      reviewed_by: null,
      reviewed_at: null
    }
  ],
  incidents: [
    {
      id: 'inc-001',
      title: 'Commercial Complex Sector Collapse',
      site_name: 'Building 4 Rubble Zone',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      status: 'ACTIVE',
      active_nodes: 3,
      total_alerts: 1,
      unresolved_alerts: 1
    }
  ],
  fusion_state: {
    priority_level: 'NOMINAL',
    target_sector: 'Sector B2',
    estimated_coords: { x: 27, y: 32 },
    estimated_depth_m: 1.2,
    evidence_score: 18,
    correlation_score: 0.2,
    multi_node_agreement: 'BACKGROUND NOMINAL',
    num_elevated_nodes: 0,
    recommended_action: 'STANDBY: Nominal monitoring active across 3 nodes.',
    heatmap: []
  }
};

class Database {
  constructor() {
    this.data = this.loadLocalData();
    this.isMongoConnected = false;
    this._saveTimer = null;
  }

  // Load existing local JSON as a fallback and initial seed.
  loadLocalData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return { ...INITIAL_DATA, ...JSON.parse(raw) };
      }
    } catch (error) {
      console.warn('Could not read local backup file:', error.message);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  // Connect to MongoDB via Mongoose and sync initial collections
  async initialize() {
    try {
      console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 3000
      });

      this.isMongoConnected = true;
      console.log('✅ MongoDB connected successfully via Mongoose!');

      // Sync Nodes from MongoDB
      const existingNodes = await NodeModel.find({});
      if (existingNodes.length > 0) {
        this.data.nodes = existingNodes.map(doc => doc.toObject());
        console.log(`Loaded ${existingNodes.length} nodes from MongoDB.`);
      } else {
        // Seed initial nodes into MongoDB
        await NodeModel.insertMany(this.data.nodes);
        console.log('Seeded initial sensor nodes into MongoDB.');
      }

      // Sync Alerts from MongoDB
      const existingAlerts = await AlertModel.find({}).sort({ timestamp: -1 }).limit(100);
      if (existingAlerts.length > 0) {
        this.data.alerts = existingAlerts.map(doc => doc.toObject());
      } else if (this.data.alerts.length > 0) {
        await AlertModel.insertMany(this.data.alerts);
      }

      // Sync Incidents from MongoDB
      const existingIncidents = await IncidentModel.find({});
      if (existingIncidents.length > 0) {
        this.data.incidents = existingIncidents.map(doc => doc.toObject());
      } else if (this.data.incidents.length > 0) {
        await IncidentModel.insertMany(this.data.incidents);
      }

      // Sync recent Telemetry
      const recentTelemetry = await TelemetryModel.find({}).sort({ timestamp: -1 }).limit(200);
      if (recentTelemetry.length > 0) {
        this.data.telemetry_history = recentTelemetry.reverse().map(doc => doc.toObject());
      }

      return true;
    } catch (error) {
      this.isMongoConnected = false;
      console.warn('⚠️  MongoDB connection skipped/unavailable:', error.message);
      console.log('ℹ️  Running in Local Persistent Store mode (data/store.json). All features fully operational.');
      return false;
    }
  }

  // Save local JSON backup
  writeLocalBackup() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (err) {
        // Safe against temporary file lock
      }
    }, 300);
  }

  // --- NODES COLLECTION ---
  getNodes() {
    return this.data.nodes;
  }

  getNode(id) {
    return this.data.nodes.find(n => n.id === id);
  }

  updateNode(id, update) {
    const idx = this.data.nodes.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.data.nodes[idx] = {
        ...this.data.nodes[idx],
        ...update,
        last_seen: new Date().toISOString()
      };

      // Async write to MongoDB
      if (this.isMongoConnected) {
        NodeModel.findOneAndUpdate({ id }, this.data.nodes[idx], { upsert: true }).catch(err => {
          console.error('[MongoDB Error] Update Node failed:', err.message);
        });
      }

      this.writeLocalBackup();
      return this.data.nodes[idx];
    }
    return null;
  }

  addNode(node) {
    const existing = this.getNode(node.id);
    if (existing) {
      return this.updateNode(node.id, node);
    }

    this.data.nodes.push(node);

    if (this.isMongoConnected) {
      NodeModel.create(node).catch(err => {
        console.error('[MongoDB Error] Add Node failed:', err.message);
      });
    }

    this.writeLocalBackup();
    return node;
  }

  // --- TELEMETRY READINGS COLLECTION ---
  addTelemetry(reading) {
    const entry = {
      ...reading,
      timestamp: reading.timestamp || new Date().toISOString()
    };

    // In-memory ring buffer (keep last 1500 for live graphs)
    this.data.telemetry_history.push(entry);
    if (this.data.telemetry_history.length > 1500) {
      this.data.telemetry_history.shift();
    }

    // Persist reading in MongoDB Telemetry Collection
    if (this.isMongoConnected) {
      TelemetryModel.create(entry).catch(err => {
        console.error('[MongoDB Error] Save Telemetry failed:', err.message);
      });
    }

    this.writeLocalBackup();
    return entry;
  }

  getTelemetryHistory(nodeId, limit = 60) {
    let hist = this.data.telemetry_history;
    if (nodeId) {
      hist = hist.filter(h => h.node_id === nodeId);
    }
    return hist.slice(-limit);
  }

  // --- ALERTS COLLECTION ---
  getAlerts() {
    return this.data.alerts;
  }

  addAlert(alert) {
    const newAlert = {
      id: alert.id || `alt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'PENDING_REVIEW',
      ...alert
    };

    this.data.alerts.unshift(newAlert);

    if (this.isMongoConnected) {
      AlertModel.create(newAlert).catch(err => {
        console.error('[MongoDB Error] Create Alert failed:', err.message);
      });
    }

    this.writeLocalBackup();
    return newAlert;
  }

  updateAlert(id, update) {
    const idx = this.data.alerts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.alerts[idx] = { ...this.data.alerts[idx], ...update };

      if (this.isMongoConnected) {
        AlertModel.findOneAndUpdate({ id }, this.data.alerts[idx], { upsert: true }).catch(err => {
          console.error('[MongoDB Error] Update Alert failed:', err.message);
        });
      }

      this.writeLocalBackup();
      return this.data.alerts[idx];
    }
    return null;
  }

  // --- INCIDENTS COLLECTION ---
  getIncidents() {
    return this.data.incidents;
  }

  // --- FUSION STATE (EPHEMERAL / CACHED) ---
  getFusionState() {
    return this.data.fusion_state;
  }

  setFusionState(state) {
    this.data.fusion_state = state;
    return this.data.fusion_state;
  }
}

module.exports = new Database();
