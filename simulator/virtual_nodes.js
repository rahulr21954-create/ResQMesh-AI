/**
 * RescueMesh Virtual Node Simulator
 * Simulates 3 physical ESP32 sensor nodes streaming acoustic and vibration telemetry to Gateway.
 */

const http = require('http');
const readline = require('readline');

const GATEWAY_HOST = '127.0.0.1';
const GATEWAY_PORT = 5000;

// Virtual Node Specifications
const nodes = [
  {
    id: "node-alpha",
    name: "Node A (North Rubble Pile)",
    x: 18.0,
    y: 45.0,
    battery: 95,
    base_sound: 37.0,
    base_vib: 0.022
  },
  {
    id: "node-bravo",
    name: "Node B (East Collapsed Beam)",
    x: 38.0,
    y: 35.0,
    battery: 89,
    base_sound: 40.0,
    base_vib: 0.028
  },
  {
    id: "node-charlie",
    name: "Node C (South Basement Void)",
    x: 25.0,
    y: 15.0,
    battery: 92,
    base_sound: 35.0,
    base_vib: 0.019
  }
];

let activeScenario = 'NORMAL'; // NORMAL | TAPPING_B2 | SETTLING | VOCALIZATION

function sendTelemetry(payload) {
  const data = JSON.stringify(payload);
  const options = {
    hostname: GATEWAY_HOST,
    port: GATEWAY_PORT,
    path: '/api/telemetry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, (res) => {
    // discarded
  });

  req.on('error', (err) => {
    // console.log(`[Error] Gateway not reachable on ${GATEWAY_PORT}`);
  });

  req.write(data);
  req.end();
}

function tick() {
  nodes.forEach(node => {
    // Battery subtle drain
    if (Math.random() < 0.02) node.battery = Math.max(10, node.battery - 1);

    let sound = node.base_sound + (Math.random() * 4.0 - 2.0);
    let vibRms = node.base_vib + (Math.random() * 0.008 - 0.004);
    let periodicity = 0.03 + Math.random() * 0.03;
    let bpm = 0;

    if (activeScenario === 'TAPPING_B2') {
      // Survivor tapping near Sector B2 (Coords ~ 28, 38)
      // Node B is closest, Node A is medium distance, Node C is far
      if (node.id === 'node-bravo') {
        sound = 74.5 + Math.random() * 3.5;
        vibRms = 0.16 + Math.random() * 0.03;
        periodicity = 0.88;
        bpm = 104;
      } else if (node.id === 'node-alpha') {
        sound = 67.2 + Math.random() * 3.0;
        vibRms = 0.075 + Math.random() * 0.015;
        periodicity = 0.78;
        bpm = 104;
      } else if (node.id === 'node-charlie') {
        sound = 51.0 + Math.random() * 2.5;
        vibRms = 0.042 + Math.random() * 0.01;
        periodicity = 0.48;
        bpm = 104;
      }
    } else if (activeScenario === 'SETTLING') {
      // Heavy structural shift
      sound = 45.0 + Math.random() * 5.0;
      vibRms = 0.22 + Math.random() * 0.08;
      periodicity = 0.05;
      bpm = 0;
    } else if (activeScenario === 'VOCALIZATION') {
      // Voice call near Node A
      if (node.id === 'node-alpha') {
        sound = 68.0 + Math.random() * 4.0;
        vibRms = 0.025;
        periodicity = 0.15;
      } else if (node.id === 'node-bravo') {
        sound = 55.0 + Math.random() * 3.0;
        vibRms = 0.021;
        periodicity = 0.10;
      } else {
        sound = 38.0;
        vibRms = 0.018;
      }
    }

    const payload = {
      node_id: node.id,
      audio_level: +sound.toFixed(1),
      vibration_rms: +vibRms.toFixed(4),
      vibration_peak: +(vibRms * (1.4 + Math.random() * 0.8)).toFixed(4),
      temperature: +(23.8 + Math.random() * 0.4).toFixed(1),
      periodicity: +periodicity.toFixed(2),
      dominant_bpm: bpm,
      battery: node.battery,
      signal_rssi: -55 - Math.floor(Math.random() * 12)
    };

    sendTelemetry(payload);
  });
}

// Start simulation loop (every 1.5 seconds)
console.log("==================================================");
console.log(" RescueMesh Virtual Multi-Node Simulator Active");
console.log(" Streaming telemetry for 3 nodes to Gateway (Port 5000)...");
console.log("--------------------------------------------------");
console.log(" Keyboard Controls:");
console.log("   [1] Trigger Survivor Rhythmic Tapping at Sector B2");
console.log("   [2] Trigger Structural Creak / Settling");
console.log("   [3] Trigger Survivor Distress Vocalization");
console.log("   [4] Return to Nominal Ambient Baseline");
console.log("   [q] Exit");
console.log("==================================================");

const timer = setInterval(tick, 1500);

if (process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on('keypress', (str, key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      clearInterval(timer);
      process.exit();
    }
    if (str === '1') {
      activeScenario = 'TAPPING_B2';
      console.log("\n>>> [TRIGGERED] Scenario 1: Survivor Rhythmic Tapping (Sector B2)!");
    } else if (str === '2') {
      activeScenario = 'SETTLING';
      console.log("\n>>> [TRIGGERED] Scenario 2: Structural Settling & Concrete Creaking!");
    } else if (str === '3') {
      activeScenario = 'VOCALIZATION';
      console.log("\n>>> [TRIGGERED] Scenario 3: Human Vocalization Distress Signal!");
    } else if (str === '4') {
      activeScenario = 'NORMAL';
      console.log("\n>>> [TRIGGERED] Scenario 4: Returned to Ambient Baseline.");
    }
  });
}
