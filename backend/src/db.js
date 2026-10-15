const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Seed Data matching the Hackathon 3-Node Architecture
const INITIAL_DATA = {
  nodes: [
    {
      id: "node-alpha",
      name: "Node A (North Rubble Pile)",
      x: 18.0,
      y: 45.0,
      status: "ONLINE",
      battery: 94,
      signal_rssi: -58,
      hardware: "ESP32 + MPU6050 + INMP441",
      last_seen: new Date().toISOString(),
      latest_telemetry: {
        audio_level: 38.2,
        vibration_rms: 0.024,
        vibration_peak: 0.041,
        temperature: 24.1,
        periodicity: 0.05,
        dominant_bpm: 0,
        pattern: "NORMAL_BACKGROUND",
        evidence_index: 8
      }
    },
    {
      id: "node-bravo",
      name: "Node B (East Collapsed Beam)",
      x: 38.0,
      y: 35.0,
      status: "ONLINE",
      battery: 88,
      signal_rssi: -64,
      hardware: "ESP32 + MPU6050 + INMP441",
      last_seen: new Date().toISOString(),
      latest_telemetry: {
        audio_level: 41.5,
        vibration_rms: 0.031,
        vibration_peak: 0.055,
        temperature: 23.8,
        periodicity: 0.08,
        dominant_bpm: 0,
        pattern: "NORMAL_BACKGROUND",
        evidence_index: 12
      }
    },
    {
      id: "node-charlie",
      name: "Node C (South Basement Void)",
      x: 25.0,
      y: 15.0,
      status: "ONLINE",
      battery: 91,
      signal_rssi: -61,
      hardware: "ESP32 + MPU6050 + INMP441",
      last_seen: new Date().toISOString(),
      latest_telemetry: {
        audio_level: 36.8,
        vibration_rms: 0.019,
        vibration_peak: 0.033,
        temperature: 22.9,
        periodicity: 0.02,
        dominant_bpm: 0,
        pattern: "NORMAL_BACKGROUND",
        evidence_index: 5
      }
    }
  ],
  telemetry_history: [],
  alerts: [
    {
      id: "alt-init-01",
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      priority_level: "ELEVATED",
      sector: "Sector B2",
      coordinates: { x: 26.5, y: 38.0 },
      evidence_score: 78,
      detected_pattern: "SURVIVOR_RHYTHMIC_TAPPING",
      multi_node_agreement: "HIGH MULTI-NODE CORRELATION (2 nodes in consensus)",
      status: "PENDING_REVIEW",
      involved_nodes: ["node-alpha", "node-bravo"],
      estimated_depth_m: 1.4,
      notes: "Awaiting SAR listening team confirmation. Correlated vibration confirmed.",
      reviewed_by: null
    }
  ],
  incidents: [
    {
      id: "inc-001",
      title: "Commercial Complex Sector Collapse",
      site_name: "Building 4 Rubble Zone",
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      status: "ACTIVE",
      active_nodes: 3,
      total_alerts: 1,
      unresolved_alerts: 1
    }
  ],
  fusion_state: {
    priority_level: "NOMINAL",
    target_sector: "Sector B2",
    estimated_coords: { x: 27.0, y: 32.0 },
    estimated_depth_m: 1.2,
    evidence_score: 18,
    correlation_score: 0.2,
    multi_node_agreement: "BACKGROUND NOMINAL",
    num_elevated_nodes: 0,
    recommended_action: "STANDBY: Nominal monitoring active across 3 nodes.",
    heatmap: []
  }
};

class Database {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Could not read db file, initializing seed data:", e.message);
    }
    this.saveData(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveData(data) {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data || this.data, null, 2), 'utf-8');
      } catch (e) {
        // OneDrive background sync lock safe fallback
      }
    }, 300);
  }

  getNodes() {
    return this.data.nodes;
  }

  getNode(id) {
    return this.data.nodes.find(n => n.id === id);
  }

  updateNode(id, update) {
    const idx = this.data.nodes.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.data.nodes[idx] = { ...this.data.nodes[idx], ...update, last_seen: new Date().toISOString() };
      this.saveData();
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
    this.saveData();
    return node;
  }

  addTelemetry(reading) {
    const entry = {
      ...reading,
      timestamp: reading.timestamp || new Date().toISOString()
    };
    this.data.telemetry_history.push(entry);
    // Keep last 1500 telemetry records in memory
    if (this.data.telemetry_history.length > 1500) {
      this.data.telemetry_history.shift();
    }
    return entry;
  }

  getTelemetryHistory(nodeId, limit = 60) {
    let hist = this.data.telemetry_history;
    if (nodeId) {
      hist = hist.filter(h => h.node_id === nodeId);
    }
    return hist.slice(-limit);
  }

  getAlerts() {
    return this.data.alerts;
  }

  addAlert(alert) {
    const newAlert = {
      id: alert.id || `alt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: "PENDING_REVIEW",
      ...alert
    };
    this.data.alerts.unshift(newAlert);
    this.saveData();
    return newAlert;
  }

  updateAlert(id, update) {
    const idx = this.data.alerts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.alerts[idx] = { ...this.data.alerts[idx], ...update };
      this.saveData();
      return this.data.alerts[idx];
    }
    return null;
  }

  getIncidents() {
    return this.data.incidents;
  }

  getFusionState() {
    return this.data.fusion_state;
  }

  setFusionState(state) {
    this.data.fusion_state = state;
    return this.data.fusion_state;
  }
}

module.exports = new Database();
