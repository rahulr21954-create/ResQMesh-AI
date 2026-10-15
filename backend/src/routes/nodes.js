const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/nodes - Get all nodes with their latest telemetry
router.get('/', (req, res) => {
  const nodes = db.getNodes();
  res.json({ success: true, count: nodes.length, data: nodes });
});

// GET /api/nodes/:id - Get a single node
router.get('/:id', (req, res) => {
  const node = db.getNode(req.params.id);
  if (!node) {
    return res.status(404).json({ success: false, error: 'Node not found' });
  }
  res.json({ success: true, data: node });
});

// POST /api/nodes/register - Register or heartbeat a node
router.post('/register', (req, res) => {
  const { id, name, x, y, hardware, battery, signal_rssi } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Node ID is required' });
  }

  const existing = db.getNode(id);
  const updated = db.addNode({
    id,
    name: name || (existing ? existing.name : `Node ${id}`),
    x: x !== undefined ? x : (existing ? existing.x : 30.0),
    y: y !== undefined ? y : (existing ? existing.y : 30.0),
    status: "ONLINE",
    battery: battery !== undefined ? battery : (existing ? existing.battery : 100),
    signal_rssi: signal_rssi !== undefined ? signal_rssi : -60,
    hardware: hardware || (existing ? existing.hardware : "ESP32 Sensor Unit"),
    last_seen: new Date().toISOString(),
    latest_telemetry: existing ? existing.latest_telemetry : {
      audio_level: 35.0,
      vibration_rms: 0.02,
      vibration_peak: 0.03,
      temperature: 24.0,
      evidence_index: 5,
      pattern: "NORMAL_BACKGROUND"
    }
  });

  const io = req.app.get('io');
  if (io) io.emit('nodes_update', db.getNodes());

  res.json({ success: true, data: updated });
});

// PUT /api/nodes/:id/position - Update coordinates of deployed node
router.put('/:id/position', (req, res) => {
  const { x, y } = req.body;
  const updated = db.updateNode(req.params.id, { x: Number(x), y: Number(y) });
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Node not found' });
  }
  const io = req.app.get('io');
  if (io) io.emit('nodes_update', db.getNodes());
  res.json({ success: true, data: updated });
});

module.exports = router;
