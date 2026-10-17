/**
 * RescueMesh - Wokwi Live Bridge
 * Dual Mode: Tries Render Production Backend & falls back to Localhost:5000 automatically!
 */

const readline = require('readline');

let targetUrl = process.env.VITE_API_URL 
  ? `${process.env.VITE_API_URL.replace(/\/+$/, '')}/api/sensors` 
  : 'https://resqmesh-ai-2.onrender.com/api/sensors';

const LOCAL_FALLBACK_URL = 'http://localhost:5000/api/sensors';
let usingFallback = false;

console.log('====================================================');
console.log('    RescueMesh Wokwi Live Simulation Bridge         ');
console.log('====================================================');
console.log(`Primary Backend:  ${targetUrl}`);
console.log(`Local Fallback:   ${LOCAL_FALLBACK_URL}`);
console.log('Mode 1: Streaming simulated Wokwi data automatically');
console.log('Mode 2: Type "1" for Normal | "2" for Survivor Tapping');
console.log('====================================================\n');

async function sendRequest(url, payload) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function forwardTelemetry(rawJson) {
  let parsed;
  try {
    parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  } catch (e) {
    try {
      const fixed = rawJson.trim().startsWith('{') ? rawJson : '{' + rawJson;
      parsed = JSON.parse(fixed);
    } catch (err) {
      console.log('⚠️ Could not parse JSON line');
      return;
    }
  }

  if (!parsed.node_id && parsed.nodeId) parsed.node_id = parsed.nodeId;
  if (!parsed.nodeId && parsed.node_id) parsed.nodeId = parsed.node_id;

  const activeUrl = usingFallback ? LOCAL_FALLBACK_URL : targetUrl;

  try {
    const res = await sendRequest(activeUrl, parsed);

    if (res.ok) {
      const sound = parsed.soundAnalog || parsed.audio_level || '1733';
      const temp = parsed.objectTemperature || parsed.temperature || '36.6';
      const source = usingFallback ? 'Localhost:5000' : 'Render Live';
      console.log(`✅ [${source} 200 OK] Node: ${parsed.nodeId} | Sound: ${sound} | Temp: ${temp}°C`);
      return;
    }

    // If Render failed with 502/503/404, switch to Localhost
    if (!usingFallback && (res.status === 502 || res.status === 503 || res.status === 404)) {
      console.warn(`⚠️ Render returned ${res.status} Bad Gateway. Auto-switching to Localhost (http://localhost:5000)...`);
      usingFallback = true;
      const localRes = await sendRequest(LOCAL_FALLBACK_URL, parsed);
      if (localRes.ok) {
        console.log(`✅ [Localhost:5000 200 OK] Node: ${parsed.nodeId} | Connected!`);
      }
    } else {
      console.warn(`⚠️ [Server status ${res.status}]`);
    }
  } catch (err) {
    if (!usingFallback) {
      console.warn(`⚠️ Could not reach Render (${err.message}). Auto-switching to Localhost...`);
      usingFallback = true;
    } else {
      console.error(`❌ Backend connection offline. Make sure local backend is running ('cd backend && npm start')`);
    }
  }
}

// Auto-stream realistic Wokwi samples every 2 seconds
let autoStream = true;
let streamMode = 'NORMAL';

setInterval(() => {
  if (!autoStream) return;

  const sample = {
    nodeId: "RM-NODE-01",
    node_id: "node-alpha",
    mpuReady: true,
    mlxReady: true,
    acceleration: {
      x: streamMode === 'TAPPING' ? +(Math.random() * 0.4 - 0.2).toFixed(3) : 0.000,
      y: streamMode === 'TAPPING' ? +(Math.random() * 0.4 - 0.2).toFixed(3) : 0.000,
      z: streamMode === 'TAPPING' ? +(9.807 + Math.random() * 1.5).toFixed(3) : 9.807
    },
    gyroscope: { x: 0.000, y: 0.000, z: 0.000 },
    objectTemperature: +(36.61 + Math.random() * 0.2 - 0.1).toFixed(2),
    ambientTemperature: 22.01,
    soundAnalog: streamMode === 'TAPPING' ? Math.floor(2800 + Math.random() * 600) : 1733,
    soundDigital: streamMode === 'TAPPING' ? 1 : 0,
    audio_level: streamMode === 'TAPPING' ? 76.5 : 58.2,
    vibration_rms: streamMode === 'TAPPING' ? 0.165 : 0.015,
    battery: 94,
    signal_rssi: -58
  };

  forwardTelemetry(sample);
}, 2000);

// CLI input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  if (trimmed === '1') {
    streamMode = 'NORMAL';
    autoStream = true;
    console.log('>>> Switched to NORMAL stream.');
  } else if (trimmed === '2') {
    streamMode = 'TAPPING';
    autoStream = true;
    console.log('>>> [TRIGGERED] SURVIVOR TAPPING! Spiking signals to backend...');
  } else if (trimmed.startsWith('{') || trimmed.includes('"nodeId"')) {
    autoStream = false;
    forwardTelemetry(trimmed);
  }
});
