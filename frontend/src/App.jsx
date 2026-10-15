import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LiveSiteMap from './components/LiveSiteMap';
import PriorityZonesCard from './components/PriorityZonesCard';
import SensorWaveforms from './components/SensorWaveforms';
import NodeCard from './components/NodeCard';
import EvidenceTimeline from './components/EvidenceTimeline';
import AlertReviewModal from './components/AlertReviewModal';
import ScenarioSimulator from './components/ScenarioSimulator';
import socket from './services/socket';
import { fetchNodes, fetchAlerts, fetchFusion } from './services/api';

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [fusion, setFusion] = useState({});
  const [selectedNodeId, setSelectedNodeId] = useState('node-alpha');
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Initial Data Fetch
  const refreshData = async () => {
    try {
      const [nRes, aRes, fRes] = await Promise.all([
        fetchNodes(),
        fetchAlerts(),
        fetchFusion()
      ]);
      if (nRes.success) setNodes(nRes.data);
      if (aRes.success) setAlerts(aRes.data);
      if (fRes.success) setFusion(fRes.data);
    } catch (e) {
      console.warn("Failed fetching initial REST data:", e);
    }
  };

  useEffect(() => {
    refreshData();

    // Socket.io Realtime Listeners
    socket.on('initial_state', (data) => {
      if (data.nodes) setNodes(data.nodes);
      if (data.alerts) setAlerts(data.alerts);
      if (data.fusion) setFusion(data.fusion);
    });

    socket.on('nodes_update', (updatedNodes) => {
      setNodes(updatedNodes);
    });

    socket.on('fusion_state_update', (fusionState) => {
      setFusion(fusionState);
    });

    socket.on('new_alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
    });

    socket.on('alert_updated', (alert) => {
      setAlerts((prev) => prev.map(a => a.id === alert.id ? alert : a));
    });

    socket.on('alerts_cleared', (cleared) => {
      setAlerts(cleared);
    });

    return () => {
      socket.off('initial_state');
      socket.off('nodes_update');
      socket.off('fusion_state_update');
      socket.off('new_alert');
      socket.off('alert_updated');
      socket.off('alerts_cleared');
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans">
      {/* Tactical Top Header */}
      <Header
        nodes={nodes}
        alerts={alerts}
        onOpenAlerts={() => setIsAlertModalOpen(true)}
      />

      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Hackathon Rubble Simulator Controller (Section 9 Prototype Demo) */}
        <ScenarioSimulator onScenarioTriggered={() => refreshData()} />

        {/* Core Tactical SAR Grid: Site Map & Decision Support vs Real-Time Waveforms */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 2D Spatial Rubble Map & Priority Zone Decision Support */}
          <div className="lg:col-span-7 space-y-6">
            <LiveSiteMap
              nodes={nodes}
              fusion={fusion}
              onSelectNode={(node) => setSelectedNodeId(node.id)}
            />

            <PriorityZonesCard
              fusion={fusion}
              onReviewAction={() => setIsAlertModalOpen(true)}
            />
          </div>

          {/* Right Column: Multimodal Waveforms Spectrum & Evidence Timeline */}
          <div className="lg:col-span-5 space-y-6">
            <SensorWaveforms
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={(id) => setSelectedNodeId(id)}
            />

            <EvidenceTimeline alerts={alerts} />
          </div>
        </div>

        {/* Distributed Sensor Mesh Health & Fleet Telemetry Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Distributed Sensor Mesh Fleet ({nodes.length} Nodes Active)
            </h3>
            <span className="text-xs font-mono text-slate-500">Protocol: 2.4GHz Wi-Fi / LoRa Ready</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                onSelect={(id) => setSelectedNodeId(id)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Human Review Modal */}
      <AlertReviewModal
        alerts={alerts}
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onRefresh={refreshData}
      />
    </div>
  );
}
