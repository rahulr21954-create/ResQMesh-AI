require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');
const fusionEngine = require('./services/fusionEngine');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

// Configure services
fusionEngine.setIO(io);
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const nodesRouter = require('./routes/nodes');
const telemetryRouter = require('./routes/telemetry');
const alertsRouter = require('./routes/alerts');
const simulationRouter = require('./routes/simulation');

app.use('/api/nodes', nodesRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/simulation', simulationRouter);

app.post("/api/sensors", (req, res) => {
  console.log("Received RescueMesh data:", req.body);

  res.status(200).json({
    success: true,
    message: "Sensor data received successfully",
    nodeId: req.body.nodeId
  });
});


// GET /api/fusion - Get current sensor fusion state & priority zone
app.get('/api/fusion', (req, res) => {
  res.json({ success: true, data: db.getFusionState() });
});

// GET /api/status - Health check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'RescueMesh Gateway & Central Node Engine',
    timestamp: new Date().toISOString(),
    nodes_connected: db.getNodes().filter(n => n.status === 'ONLINE').length
  });
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`[Socket] Rescuer terminal connected: ${socket.id}`);
  
  // Send initial state snapshot immediately
  socket.emit('initial_state', {
    nodes: db.getNodes(),
    alerts: db.getAlerts(),
    fusion: db.getFusionState(),
    incidents: db.getIncidents()
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Rescuer terminal disconnected: ${socket.id}`);
  });
});

// Subtle background sensor jitter loop (simulates real physical baseline ADC noise)
setInterval(() => {
  const nodes = db.getNodes();
  nodes.forEach(node => {
    if (node.status === "ONLINE" && node.latest_telemetry) {
      const cur = node.latest_telemetry;
      // If it's normal background, produce subtle physical ADC fluctuations
      if (cur.pattern === "NORMAL_BACKGROUND") {
        cur.audio_level = +(35.0 + Math.random() * 5.0).toFixed(1);
        cur.vibration_rms = +(0.018 + Math.random() * 0.012).toFixed(3);
        cur.vibration_peak = +(cur.vibration_rms * (1.3 + Math.random() * 0.4)).toFixed(3);
        cur.temperature = +(23.8 + Math.random() * 0.4).toFixed(1);
        
        db.addTelemetry({
          node_id: node.id,
          ...cur,
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  io.emit('nodes_update', db.getNodes());
}, 3000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`RescueMesh Gateway & Backend Server Started!`);
  console.log(`Port: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`=================================================`);
  
  // Initial fusion run
  fusionEngine.runFusion();
});
