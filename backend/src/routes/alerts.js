const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/alerts - Get all alerts
router.get('/', (req, res) => {
  const alerts = db.getAlerts();
  res.json({ success: true, count: alerts.length, data: alerts });
});

// POST /api/alerts/:id/review - Human Review Workflow action
router.post('/:id/review', (req, res) => {
  const { id } = req.params;
  const { status, reviewed_by, notes } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }

  const validStatuses = [
    'PENDING_REVIEW',
    'DISPATCHED_SAR',
    'INVESTIGATING',
    'CONFIRMED_SURVIVOR',
    'FALSE_ALARM',
    'RESOLVED'
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Invalid status. Valid values: ${validStatuses.join(', ')}` });
  }

  const updated = db.updateAlert(id, {
    status,
    reviewed_by: reviewed_by || 'SAR Incident Commander',
    notes: notes || '',
    reviewed_at: new Date().toISOString()
  });

  if (!updated) {
    return res.status(404).json({ success: false, error: 'Alert not found' });
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('alert_updated', updated);
  }

  res.json({ success: true, data: updated });
});

// POST /api/alerts/clear - Clear resolved/dismissed alerts
router.post('/clear', (req, res) => {
  const alerts = db.getAlerts();
  // Keep only active / pending
  const filtered = alerts.filter(a => a.status === 'PENDING_REVIEW' || a.status === 'INVESTIGATING' || a.status === 'DISPATCHED_SAR');
  db.data.alerts = filtered;
  db.saveData();

  const io = req.app.get('io');
  if (io) io.emit('alerts_cleared', filtered);

  res.json({ success: true, count: filtered.length, data: filtered });
});

module.exports = router;
