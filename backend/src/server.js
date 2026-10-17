
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

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

// Route /api/sensors to the full telemetry ingestion & AI fusion engine
app.use('/api/sensors', telemetryRouter);

// Fusion state
app.get('/api/fusion', (req, res) => {
  res.json({
    success: true,
    data: db.getFusionState()
  });
});

// Health check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'RescueMesh Gateway & Central Node Engine',
    timestamp: new Date().toISOString(),
    nodes_connected: db.getNodes().filter(
      node => node.status === 'ONLINE'
    ).length
  });
});

// Socket.IO
io.on('connection', socket => {
  console.log(
    `[Socket] Rescuer terminal connected: ${socket.id}`
  );

  socket.emit('initial_state', {
    nodes: db.getNodes(),
    alerts: db.getAlerts(),
    fusion: db.getFusionState(),
    incidents: db.getIncidents()
  });

  socket.on('disconnect', () => {
    console.log(
      `[Socket] Rescuer terminal disconnected: ${socket.id}`
    );
  });
});

// Background sensor simulation
const jitterTimer = setInterval(() => {
  const nodes = db.getNodes();

  nodes.forEach(node => {
    if (
      node.status === 'ONLINE' &&
      node.latest_telemetry &&
      node.latest_telemetry.pattern === 'NORMAL_BACKGROUND'
    ) {
      const cur = node.latest_telemetry;

      cur.audio_level = +(35 + Math.random() * 5).toFixed(1);
      cur.vibration_rms = +(0.018 + Math.random() * 0.012).toFixed(3);
      cur.vibration_peak = +(
        cur.vibration_rms * (1.3 + Math.random() * 0.4)
      ).toFixed(3);
      cur.temperature = +(23.8 + Math.random() * 0.4).toFixed(1);

      db.addTelemetry({
        node_id: node.id,
        ...cur,
        timestamp: new Date().toISOString()
      });
    }
  });

  io.emit('nodes_update', db.getNodes());
}, 3000);

// Start database first, then start HTTP server exactly once.
async function startServer() {
  try {
    console.log(
      'MongoDB URI loaded:',
      Boolean(process.env.MONGODB_URI)
    );

    await db.initialize();

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, '0.0.0.0', () => {
      console.log('==============================================');
      console.log('RescueMesh Gateway & Backend Server Started!');
      console.log(`Port: ${PORT}`);
      console.log('WebSocket: enabled');
      console.log('==============================================');

      fusionEngine.runFusion();
    });
  } catch (error) {
    clearInterval(jitterTimer);
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
