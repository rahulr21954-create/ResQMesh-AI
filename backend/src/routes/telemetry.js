const express = require('express');
const router = express.Router();
const db = require('../db');
const fusionEngine = require('../services/fusionEngine');

// POST /api/telemetry - Receive sensor payload from ESP32 or simulator
router.post('/', async (req, res) => {
  const body = req.body || {};
  const node_id = body.node_id || body.nodeId || "RM-NODE-01";

  let existingNode = db.getNode(node_id);
  if (!existingNode) {
    existingNode = db.addNode({
      id: node_id,
      name: `Sensor Node (${node_id})`,
      x: +(25.0 + Math.random() * 15.0).toFixed(1),
      y: +(25.0 + Math.random() * 15.0).toFixed(1),
      status: "ONLINE",
      battery: body.battery !== undefined ? Number(body.battery) : 95,
      signal_rssi: body.signal_rssi !== undefined ? Number(body.signal_rssi) : -58,
      hardware: "ESP32 (Wokwi MPU6050 + KY038 + MLX90614)"
    });
  }

  // Calculate audio level: from audio_level or soundAnalog (0-4095)
  let soundDb = 35.0;
  if (body.audio_level !== undefined) {
    soundDb = Number(body.audio_level);
  } else if (body.soundAnalog !== undefined) {
    // Convert KY-038 ADC (0 - 4095) to approximate dB (35 dB - 92 dB)
    const rawMic = Number(body.soundAnalog);
    soundDb = +(35.0 + (rawMic / 4095.0) * 55.0).toFixed(1);
    if (body.soundDigital === 1 || body.soundDigital === true) {
      soundDb = Math.max(soundDb, 72.0);
    }
  }

  // Calculate vibration: from vibration_rms or acceleration {x, y, z}
  let vibRms = 0.02;
  let vibPeak = 0.035;
  if (body.vibration_rms !== undefined) {
    vibRms = Number(body.vibration_rms);
    vibPeak = Number(body.vibration_peak) || (vibRms * 1.5);
  } else if (body.acceleration) {
    const ax = Number(body.acceleration.x) || 0;
    const ay = Number(body.acceleration.y) || 0;
    const az = Number(body.acceleration.z) || 0;
    // Total magnitude minus 9.8 m/s² gravity
    const mag = Math.sqrt(ax * ax + ay * ay + az * az);
    const dynG = Math.abs(mag - 9.8) / 9.8; // Convert to Gs
    vibRms = +(Math.max(0.015, dynG)).toFixed(3);
    vibPeak = +(vibRms * 1.6).toFixed(3);
  }

  // Temperature from temperature, objectTemperature or ambientTemperature
  const temp = Number(body.temperature) || 
               Number(body.objectTemperature > -50 ? body.objectTemperature : body.ambientTemperature) || 
               24.0;

  const period = body.periodicity !== undefined 
    ? Number(body.periodicity) 
    : (body.soundDigital === 1 || soundDb > 65 ? 0.85 : 0.05);

  const bpm = body.dominant_bpm !== undefined 
    ? Number(body.dominant_bpm) 
    : (period > 0.4 ? 104 : 0);

  const crestFactor = vibPeak / Math.max(vibRms, 0.001);

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
    temperature: temp,
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
  if (body.battery !== undefined) nodeUpdate.battery = body.battery;
  if (body.signal_rssi !== undefined) nodeUpdate.signal_rssi = body.signal_rssi;

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
