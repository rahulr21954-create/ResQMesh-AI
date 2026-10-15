const db = require('../db');

class FusionEngineService {
  constructor(io) {
    this.io = io;
    this.lastAlertTime = 0;
  }

  setIO(io) {
    this.io = io;
  }

  // Pure JavaScript fallback fusion calculation if Python service is offline
  calculateFusionFallback(nodes) {
    const activeNodes = nodes.filter(n => n.status === "ONLINE");
    if (!activeNodes.length) {
      return {
        priority_level: "NOMINAL",
        target_sector: "Sector None",
        estimated_coords: { x: 30.0, y: 30.0 },
        estimated_depth_m: 0.0,
        evidence_score: 0,
        correlation_score: 0.0,
        multi_node_agreement: "NO ACTIVE NODES",
        num_elevated_nodes: 0,
        recommended_action: "Ensure ESP32 nodes are powered on.",
        heatmap: []
      };
    }

    let elevatedNodes = [];
    let sumWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    activeNodes.forEach(n => {
      const tel = n.latest_telemetry || {};
      const ev = tel.evidence_index || 0;
      const sound = tel.audio_level || 35;
      const vib = tel.vibration_rms || 0.02;

      if (ev > 40) elevatedNodes.push(n);

      const weight = (ev / 100) * 0.6 + (Math.min(1, Math.max(0, (sound - 35) / 45))) * 0.2 + (Math.min(1, vib / 0.3)) * 0.2;
      sumWeight += weight;
      weightedX += (n.x || 30) * weight;
      weightedY += (n.y || 30) * weight;
    });

    const estX = sumWeight > 0.05 ? +(weightedX / sumWeight).toFixed(1) : 30.0;
    const estY = sumWeight > 0.05 ? +(weightedY / sumWeight).toFixed(1) : 30.0;

    // Sector mapping: 60x60m grid, Tactical North (top: Row A, bottom: Row D), Cols 1-4
    const rowNames = ['A', 'B', 'C', 'D'];
    const colIdx = Math.min(3, Math.max(0, Math.floor(estX / 15)));
    const rowIdx = Math.min(3, Math.max(0, Math.floor((60 - estY) / 15)));
    const targetSector = `Sector ${rowNames[rowIdx]}${colIdx + 1}`;

    const numElevated = elevatedNodes.length;
    let correlationScore = 0.15;
    let agreementStatus = "BACKGROUND NOMINAL (Baseline ambient)";

    if (numElevated >= 2) {
      correlationScore = Math.min(0.96, 0.55 + numElevated * 0.15);
      agreementStatus = `HIGH MULTI-NODE CORRELATION (${numElevated} nodes confirmed)`;
    } else if (numElevated === 1) {
      correlationScore = 0.45;
      agreementStatus = "SINGLE NODE ISOLATED ELEVATION (Cross-checking)";
    }

    const maxNodeEv = Math.max(...activeNodes.map(n => (n.latest_telemetry && n.latest_telemetry.evidence_index) || 0));
    const evidenceScore = Math.min(100, Math.round(maxNodeEv * 0.7 + correlationScore * 100 * 0.3));

    let priorityLevel = "NOMINAL";
    let recommendedAction = "STANDBY: No distress signatures detected across mesh.";

    if (evidenceScore >= 75 && numElevated >= 2) {
      priorityLevel = "CRITICAL";
      recommendedAction = `PRIORITY RESCUE DISPATCH: Investigate ${targetSector} immediately at (${estX}m, ${estY}m).`;
    } else if (evidenceScore >= 50) {
      priorityLevel = "ELEVATED";
      recommendedAction = `FOCUSED SEARCH: Deploy acoustic listening team to ${targetSector}.`;
    } else if (evidenceScore >= 30) {
      priorityLevel = "MONITORING";
      recommendedAction = `CONTINUED MONITORING: Anomaly detected in ${targetSector}.`;
    }

    // Generate heatmap array
    const heatmap = [];
    for (let gy = 0; gy <= 60; gy += 4) {
      for (let gx = 0; gx <= 60; gx += 4) {
        let intensity = 0;
        activeNodes.forEach(n => {
          const tel = n.latest_telemetry || {};
          const ev = tel.evidence_index || 0;
          const dist = Math.sqrt((gx - n.x) ** 2 + (gy - n.y) ** 2) + 2.0;
          intensity += (ev / (dist ** 1.8)) * 12;
        });
        if (intensity > 5) {
          heatmap.push({ x: gx, y: gy, intensity: Math.min(100, Math.round(intensity)) });
        }
      }
    }

    return {
      priority_level: priorityLevel,
      target_sector: targetSector,
      estimated_coords: { x: estX, y: estY },
      estimated_depth_m: +(Math.max(0.6, 3.2 - (evidenceScore / 40))).toFixed(1),
      evidence_score: evidenceScore,
      correlation_score: +(correlationScore).toFixed(2),
      multi_node_agreement: agreementStatus,
      num_elevated_nodes: numElevated,
      recommended_action: recommendedAction,
      heatmap: heatmap
    };
  }

  async runFusion() {
    const nodes = db.getNodes();
    let fusionResult = null;

    // Try calling Python AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';
    try {
      const response = await fetch(`${aiServiceUrl}/api/ai/fuse_mesh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes })
      });
      if (response.ok) {
        fusionResult = await response.json();
      }
    } catch (err) {
      // Python AI service not running or restarting, seamlessly use pure JS fallback
      fusionResult = this.calculateFusionFallback(nodes);
    }

    if (!fusionResult) {
      fusionResult = this.calculateFusionFallback(nodes);
    }

    db.setFusionState(fusionResult);

    // Auto-create alert if evidence is CRITICAL or ELEVATED
    const now = Date.now();
    if (fusionResult.evidence_score >= 60 && (now - this.lastAlertTime > 1000 * 45)) {
      this.lastAlertTime = now;
      const elevatedNodeIds = nodes
        .filter(n => n.latest_telemetry && n.latest_telemetry.evidence_index > 45)
        .map(n => n.id);

      const topPattern = nodes
        .map(n => n.latest_telemetry && n.latest_telemetry.pattern)
        .filter(p => p && p !== "NORMAL_BACKGROUND")[0] || "SURVIVOR_RHYTHMIC_TAPPING";

      const alert = db.addAlert({
        priority_level: fusionResult.priority_level,
        sector: fusionResult.target_sector,
        coordinates: fusionResult.estimated_coords,
        evidence_score: fusionResult.evidence_score,
        detected_pattern: topPattern,
        multi_node_agreement: fusionResult.multi_node_agreement,
        involved_nodes: elevatedNodeIds,
        estimated_depth_m: fusionResult.estimated_depth_m,
        notes: `AI Sensor-Fusion triggered: ${fusionResult.recommended_action}`
      });

      if (this.io) {
        this.io.emit('new_alert', alert);
      }
    }

    // Broadcast updated fusion state
    if (this.io) {
      this.io.emit('fusion_state_update', fusionResult);
    }

    return fusionResult;
  }
}

module.exports = new FusionEngineService();
