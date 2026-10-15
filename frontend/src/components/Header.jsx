import React, { useState, useEffect } from 'react';
import { Radio, ShieldAlert, Wifi, Activity, Clock, Bell, Volume2, VolumeX } from 'lucide-react';

export default function Header({ nodes = [], alerts = [], onOpenAlerts }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onlineCount = nodes.filter(n => n.status === 'ONLINE').length;
  const pendingAlerts = alerts.filter(a => a.status === 'PENDING_REVIEW' || a.status === 'DISPATCHED_SAR').length;

  return (
    <header className="bg-[#0e1626] border-b border-[#1e2c45] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xl">
      {/* Brand Title */}
      <div className="flex items-center gap-3.5">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400 shadow-inner">
          <Radio className="w-5 h-5 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping"></span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              ResQMesh <span className="text-cyan-400 text-xs px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/80 font-mono">v1.0 SAR-AI</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            AI-Powered Distributed Survivor Detection & Localization System
          </p>
        </div>
      </div>

      {/* Mesh Health & Gateway Status */}
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 bg-[#131d31] px-3.5 py-1.5 rounded-lg border border-[#1e2e4a] text-xs font-mono">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Mesh Network:</span>
          <span className="text-emerald-400 font-semibold">{onlineCount}/{nodes.length} Nodes Online</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 bg-[#131d31] px-3.5 py-1.5 rounded-lg border border-[#1e2e4a] text-xs font-mono">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">AI Fusion:</span>
          <span className="text-cyan-400 font-semibold">Active (Multi-modal)</span>
        </div>

        <div className="flex items-center gap-2 bg-[#131d31] px-3 py-1.5 rounded-lg border border-[#1e2e4a] text-xs font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{time}</span>
        </div>

        {/* Alerts Bell Badge */}
        <button
          onClick={onOpenAlerts}
          className={`relative p-2 rounded-lg border transition-all flex items-center gap-2 text-xs font-semibold ${
            pendingAlerts > 0
              ? 'bg-rose-950/60 border-rose-500/70 text-rose-300 hover:bg-rose-900/80 shadow-lg shadow-rose-950/50'
              : 'bg-[#131d31] border-[#1e2e4a] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alerts</span>
          {pendingAlerts > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-bounce">
              {pendingAlerts}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
