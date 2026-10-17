
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'rescuemesh_ai';

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
      multi_node_agreement:
        'HIGH MULTI-NODE CORRELATION (2 nodes in consensus)',
      status: 'PENDING_REVIEW',
      involved_nodes: ['node-alpha', 'node-bravo'],
      estimated_depth_m: 1.4,
      notes:
        'Awaiting SAR listening team confirmation. Correlated vibration confirmed.',
      reviewed_by: null
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
    recommended_action:
      'STANDBY: Nominal monitoring active across 3 nodes.',
    heatmap: []
  }
};

class Database {
  constructor() {
    this.data = this.loadData();
    this.client = null;
    this.collection = null;
    this._saveTimer = null;
    this._saveQueue = Promise.resolve();
    this._initialized = false;
  }

  // Load existing local JSON as a fallback and initial seed.
  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        return {
          ...INITIAL_DATA,
          ...parsed
        };
      }
    } catch (error) {
      console.warn(
        'Could not read local database:',
        error.message
      );
    }

    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  // Connect to MongoDB before starting the Express server.
  async initialize() {
    if (this._initialized) {
      return true;
    }

    if (!MONGODB_URI) {
      console.warn(
        'MONGODB_URI is missing. Using local JSON storage.'
      );
      return false;
    }

    const client = new MongoClient(MONGODB_URI);

    try {
      await client.connect();

      const db = client.db(DB_NAME);
      const collection = db.collection('app_state');

      const savedState = await collection.findOne({
        _id: 'main'
      });

      if (savedState) {
        const {
          _id,
          ...savedData
        } = savedState;

        this.data = {
          ...INITIAL_DATA,
          ...savedData
        };

        console.log('Loaded RescueMesh state from MongoDB.');
      } else {
        // Preserve local data when MongoDB is empty.
        await collection.insertOne({
          _id: 'main',
          ...this.data
        });

        console.log('Initial state saved to MongoDB.');
      }

      // Assign the connection only after initialization succeeds.
      this.client = client;
      this.collection = collection;
      this._initialized = true;

      this.writeLocalBackup(this.data);

      console.log(`MongoDB connected: ${DB_NAME}`);
      return true;
    } catch (error) {
      await client.close().catch(() => {});

      console.error('MongoDB initialization failed:', error.message);
      throw error;
    }
  }

  // Save a local backup without blocking API responses.
  writeLocalBackup(data) {
    try {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.warn('Local JSON backup failed:', error.message);
    }
  }

  // Debounced persistence to MongoDB and local JSON.
  saveData(data) {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }

    this._saveTimer = setTimeout(() => {
      const snapshot = JSON.parse(
        JSON.stringify(data || this.data)
      );

      this.writeLocalBackup(snapshot);

      if (!this.collection) {
        return;
      }

      // Serialize writes so older snapshots do not overwrite newer ones.
      this._saveQueue = this._saveQueue
        .then(() =>
          this.collection.replaceOne(
            { _id: 'main' },
            { _id: 'main', ...snapshot },
            { upsert: true }
          )
        )
        .catch(error => {
          console.error('MongoDB save failed:', error.message);
        });
    }, 300);
  }

  // Nodes
  getNodes() {
    return this.data.nodes;
  }

  getNode(id) {
    return this.data.nodes.find(node => node.id === id);
  }

  updateNode(id, update) {
    const index = this.data.nodes.findIndex(
      node => node.id === id
    );

    if (index === -1) {
      return null;
    }

    this.data.nodes[index] = {
      ...this.data.nodes[index],
      ...update,
      last_seen: new Date().toISOString()
    };

    this.saveData();
    return this.data.nodes[index];
  }

  addNode(node) {
    const existing = this.getNode(node.id);

    if (existing) {
      return this.updateNode(node.id, node);
    }

    this.data.nodes.push(node);
    this.saveData();

    return node;
  }

  // Telemetry
  addTelemetry(reading) {
    const entry = {
      ...reading,
      timestamp: reading.timestamp || new Date().toISOString()
    };

    this.data.telemetry_history.push(entry);

    if (this.data.telemetry_history.length > 1500) {
      this.data.telemetry_history.shift();
    }

    this.saveData();
    return entry;
  }

  getTelemetryHistory(nodeId, limit = 60) {
    let history = this.data.telemetry_history;

    if (nodeId) {
      history = history.filter(
        item => item.node_id === nodeId
      );
    }

    return history.slice(-limit);
  }

  // Alerts
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
    this.saveData();

    return newAlert;
  }

  updateAlert(id, update) {
    const index = this.data.alerts.findIndex(
      alert => alert.id === id
    );

    if (index === -1) {
      return null;
    }

    this.data.alerts[index] = {
      ...this.data.alerts[index],
      ...update
    };

    this.saveData();
    return this.data.alerts[index];
  }

  // Incidents
  getIncidents() {
    return this.data.incidents;
  }

  // Sensor fusion
  getFusionState() {
    return this.data.fusion_state;
  }

  setFusionState(state) {
    this.data.fusion_state = state;
    this.saveData();

    return this.data.fusion_state;
  }

  // Wait for queued writes before a graceful shutdown.
  async close() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;

      const snapshot = JSON.parse(
        JSON.stringify(this.data)
      );

      this.writeLocalBackup(snapshot);

      if (this.collection) {
        this._saveQueue = this._saveQueue
          .then(() =>
            this.collection.replaceOne(
              { _id: 'main' },
              { _id: 'main', ...snapshot },
              { upsert: true }
            )
          )
          .catch(error => {
            console.error('Final MongoDB save failed:', error.message);
          });
      }
    }

    await this._saveQueue;

    if (this.client) {
      await this.client.close();
      this.client = null;
      this.collection = null;
      this._initialized = false;
    }
  }
}

module.exports = new Database();
