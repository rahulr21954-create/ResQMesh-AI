const express = require('express');
const router = express.Router();
const db = require('../db');
const fusionEngine = require('../services/fusionEngine');

// POST /api/simulation/trigger - Trigger a disaster scenario
router.post('/trigger', async (req, res) => {
  const { scenario, custom_x, custom_y } = req.body;
  const nodes = db.getNodes();
  const io = req.app.get('io');

  if (scenario === 'SURVIVOR_TAPPING_B2') {
    // Implements Section 10 Example Data Flow from project specification:
    // Node A: elevated acoustic activity
    // Node B: elevated vibration + acoustic activity
    // Node C: moderate correlated activity
    // -> AI sensor fusion: persistent multi-node evidence
    // -> Dashboard: Priority Zone B2 — investigate area
    db.updateNode('node-alpha', {
      latest_telemetry: {
        audio_level: 68.4,
        vibration_rms: 0.082,
        vibration_peak: 0.28,
        temperature: 24.2,
        periodicity: 0.78,
        dominant_bpm: 104,
        pattern: "SURVIVOR_RHYTHMIC_TAPPING",
        evidence_index: 86
      }
    });

    db.updateNode('node-bravo', {
      latest_telemetry: {
        audio_level: 74.8,
        vibration_rms: 0.165,
        vibration_peak: 0.49,
        temperature: 24.0,
        periodicity: 0.88,
        dominant_bpm: 104,
        pattern: "SURVIVOR_RHYTHMIC_TAPPING",
        evidence_index: 94
      }
    });

    db.updateNode('node-charlie', {
      latest_telemetry: {
        audio_level: 51.2,
        vibration_rms: 0.046,
        vibration_peak: 0.12,
        temperature: 23.5,
        periodicity: 0.52,
        dominant_bpm: 104,
        pattern: "SURVIVOR_RHYTHMIC_TAPPING",
        evidence_index: 62
      }
    });
  } else if (scenario === 'STRUCTURAL_SETTLING') {
    // Low frequency rumble, high vibration, no rhythmic periodicity
    db.updateNode('node-alpha', {
      latest_telemetry: {
        audio_level: 44.0,
        vibration_rms: 0.24,
        vibration_peak: 0.35,
        temperature: 24.1,
        periodicity: 0.04,
        dominant_bpm: 0,
        pattern: "STRUCTURAL_SETTLING",
        evidence_index: 42
      }
    });

    db.updateNode('node-bravo', {
      latest_telemetry: {
        audio_level: 46.5,
        vibration_rms: 0.28,
        vibration_peak: 0.42,
        temperature: 23.9,
        periodicity: 0.02,
        dominant_bpm: 0,
        pattern: "STRUCTURAL_SETTLING",
        evidence_index: 48
      }
    });

    db.updateNode('node-charlie', {
      latest_telemetry: {
        audio_level: 42.0,
        vibration_rms: 0.19,
        vibration_peak: 0.29,
        temperature: 23.2,
        periodicity: 0.05,
        dominant_bpm: 0,
        pattern: "STRUCTURAL_SETTLING",
        evidence_index: 35
      }
    });
  } else if (scenario === 'SURVIVOR_VOCALIZATION') {
    // Human voice distress calls (high voice band ratio, high audio, low vibration)
    db.updateNode('node-alpha', {
      latest_telemetry: {
        audio_level: 64.0,
        vibration_rms: 0.022,
        vibration_peak: 0.04,
        temperature: 24.3,
        periodicity: 0.18,
        dominant_bpm: 0,
        pattern: "SURVIVOR_VOCALIZATION",
        evidence_index: 82
      }
    });

    db.updateNode('node-bravo', {
      latest_telemetry: {
        audio_level: 56.5,
        vibration_rms: 0.019,
        vibration_peak: 0.03,
        temperature: 24.1,
        periodicity: 0.12,
        dominant_bpm: 0,
        pattern: "SURVIVOR_VOCALIZATION",
        evidence_index: 68
      }
    });

    db.updateNode('node-charlie', {
      latest_telemetry: {
        audio_level: 41.2,
        vibration_rms: 0.015,
        vibration_peak: 0.02,
        temperature: 23.4,
        periodicity: 0.05,
        dominant_bpm: 0,
        pattern: "NORMAL_BACKGROUND",
        evidence_index: 15
      }
    });
  } else {
    // NORMAL_BASELINE reset
    db.updateNode('node-alpha', {
      latest_telemetry: {
        audio_level: 38.0 + (Math.random() * 3),
        vibration_rms: 0.021 + (Math.random() * 0.008),
        vibration_peak: 0.038,
        temperature: 24.2,
        periodicity: 0.04,
        dominant_bpm: 0,
        pattern: "NORMAL_BACKGROUND",
        evidence_index: 8
      }
    });

    db.updateNode('node-bravo', {
      latest_telemetry: {
        audio_level: 40.2 + (Math.random() * 3),
        vibration_rms: 0.025 + (Math.random() * 0.008),
        vibration_peak: 0.044,
        temperature: 23.9,
        periodicity: 0.05,
        dominant_bpm: 0,
        pattern: "NORMAL_BACKGROUND",
        evidence_index: 10
      }
    });

    db.updateNode('node-charlie', {
      latest_telemetry: {
        audio_level: 36.5 + (Math.random() * 3),
        vibration_rms: 0.018 + (Math.random() * 0.006),
        vibration_peak: 0.032,
        temperature: 23.1,
        periodicity: 0.02,
        dominant_bpm: 0,
        pattern: "NORMAL_BACKGROUND",
        evidence_index: 6
      }
    });
  }

  // Record telemetry points for history
  const updatedNodes = db.getNodes();
  updatedNodes.forEach(n => {
    db.addTelemetry({
      node_id: n.id,
      ...n.latest_telemetry,
      timestamp: new Date().toISOString()
    });
  });

  if (io) {
    io.emit('nodes_update', updatedNodes);
  }

  // Trigger fusion
  const fusionResult = await fusionEngine.runFusion();

  res.json({
    success: true,
    scenario,
    nodes: updatedNodes,
    fusion: fusionResult
  });
});

module.exports = router;
