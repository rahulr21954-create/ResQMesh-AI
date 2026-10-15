const express = require('express');
const router = express.Router();
const db = require('../db');
const fusionEngine = require('../services/fusionEngine');

// POST /api/telemetry - Receive sensor payload from ESP32 or simulator
router.post('/', async (req, res) => {
  const {
    node_id,
    audio_level,
    vibration_rms,
    vibration_peak,
    temperature,
    periodicity,
    dominant_bpm,
    battery,
    signal_rssi
  } = req.body;

  if (!node_id) {
    return res.status(400).json({ success: false, error: 'node_id is required' });
  }

  const existingNode = db.getNode(node_id);
  if (!existingNode) {
    return res.status(404).json({ success: false, error: `Node ${node_id} is not registered` });
  }

  // Calculate local signal pattern & evidence index
  const soundDb = Number(audio_level) || 35.0;
  const vibRms = Number(vibration_rms) || 0.02;
  const vibPeak = Number(vibration_peak) || (vibRms * 1.5);
  const crestFactor = vibPeak / Math.max(vibRms, 0.001);
  const period = Number(periodicity) || 0.0;
  const bpm = Number(dominant_bpm) || 0;

  let pattern = "NORMAL_BACKGROUND";
  let evidence = 5;

  if (period > 0.35 && (soundDb > 45 || crestFactor > 2.5)) {
    pattern = "SURVIVOR_RHYTHMIC_TAPPING";
    evidence = Math.min(98, Math.round(45 + period * 40 + Math.min(15, crestFactor * 2)));
  } else if (vibRms > 0.16 && soundDb < 60) {
    pattern = "STRUCTURAL_SETTLING";
    evidence = Math.min(65, Math.round(vibRms * 250));
  } else if (soundDb > 55 && vibRms < 0.1) {
    pattern = "SURVIVOR_VOCALIZATION";
    evidence = Math.min(90, Math.round((soundDb - 45) * 2.2));
  } else if (soundDb > 70 && vibRms > 0.25) {
    pattern = "EXTERIOR_INTERFERENCE";
    evidence = 20;
  } else {
    pattern = "NORMAL_BACKGROUND";
    evidence = Math.max(2, Math.min(25, Math.round((soundDb - 30) * 1.5)));
  }

  const telemetryReading = {
    node_id,
    timestamp: new Date().toISOString(),
    audio_level: soundDb,
    vibration_rms: vibRms,
    vibration_peak: vibPeak,
    temperature: Number(temperature) || 24.0,
    periodicity: period,
    dominant_bpm: bpm,
    pattern,
    evidence_index: evidence
  };

  // Record telemetry
  db.addTelemetry(telemetryReading);

  // Update Node latest snapshot
  const nodeUpdate = {
    latest_telemetry: telemetryReading,
    status: "ONLINE"
  };
  if (battery !== undefined) nodeUpdate.battery = battery;
  if (signal_rssi !== undefined) nodeUpdate.signal_rssi = signal_rssi;

  const updatedNode = db.updateNode(node_id, nodeUpdate);

  // Broadcast live telemetry reading
  const io = req.app.get('io');
  if (io) {
    io.emit('telemetry_stream', telemetryReading);
    io.emit('nodes_update', db.getNodes());
  }

  // Trigger sensor fusion
  const fusionResult = await fusionEngine.runFusion();

  res.json({
    success: true,
    data: {
      telemetry: telemetryReading,
      node: updatedNode,
      fusion: fusionResult
    }
  });
});

// GET /api/telemetry/history - Get time-series history
router.get('/history', (req, res) => {
  const { node_id, limit } = req.query;
  const history = db.getTelemetryHistory(node_id, limit ? parseInt(limit) : 60);
  res.json({ success: true, count: history.length, data: history });
});

module.exports = router;
