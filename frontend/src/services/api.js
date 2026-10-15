const BASE_URL = '';

export async function fetchNodes() {
  const res = await fetch(`${BASE_URL}/api/nodes`);
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${BASE_URL}/api/alerts`);
  return res.json();
}

export async function fetchFusion() {
  const res = await fetch(`${BASE_URL}/api/fusion`);
  return res.json();
}

export async function reviewAlert(id, status, notes, reviewed_by = 'SAR Commander') {
  const res = await fetch(`${BASE_URL}/api/alerts/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes, reviewed_by })
  });
  return res.json();
}

export async function clearAlerts() {
  const res = await fetch(`${BASE_URL}/api/alerts/clear`, {
    method: 'POST'
  });
  return res.json();
}

export async function triggerScenario(scenario) {
  const res = await fetch(`${BASE_URL}/api/simulation/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario })
  });
  return res.json();
}

export async function updateNodePosition(id, x, y) {
  const res = await fetch(`${BASE_URL}/api/nodes/${id}/position`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y })
  });
  return res.json();
}
