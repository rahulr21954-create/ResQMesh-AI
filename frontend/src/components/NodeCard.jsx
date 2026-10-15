import React from 'react';
import { Battery, BatteryCharging, Radio, Signal, Thermometer, Cpu, Volume2, Activity } from 'lucide-react';

export default function NodeCard({ node, isSelected, onSelect }) {
  const tel = node.latest_telemetry || {};
  const ev = tel.evidence_index || 0;
  const isElevated = ev > 45;

  const batteryColor =
    node.battery > 70
      ? 'text-emerald-400'
      : node.battery > 30
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <div
      onClick={() => onSelect && onSelect(node.id)}
      className={`rounded-xl border p-4 transition-all duration-300 cursor-pointer relative ${
        isSelected
          ? 'bg-[#152238] border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500'
          : isElevated
          ? 'bg-[#18131d] border-rose-500/50 hover:border-rose-400 shadow-rose-950/30'
          : 'bg-[#0f172a] border-[#1e2e4a] hover:border-[#2d4268]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
              isElevated
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            {node.name ? node.name.charAt(5) : 'N'}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 leading-tight">{node.name || node.id}</h4>
            <span className="text-[10px] font-mono text-slate-400">Position: ({node.x}m, {node.y}m)</span>
          </div>
        </div>

        {/* Status indicator */}
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
            isElevated
              ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
          }`}
        >
          {isElevated ? 'ELEVATED' : 'NOMINAL'}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono my-2.5 bg-[#0b1220] p-2.5 rounded-lg border border-[#1b2b45]">
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Sound:</span>
          <strong className="text-slate-200">{tel.audio_level || 35} dB</strong>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Vib:</span>
          <strong className="text-slate-200">{tel.vibration_rms || 0.02}g</strong>
        </div>

        <div className="flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-slate-400">Temp:</span>
          <strong className="text-slate-200">{tel.temperature || 24}&deg;C</strong>
        </div>

        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-slate-400">Cadence:</span>
          <strong className="text-slate-200">{tel.dominant_bpm || 0} BPM</strong>
        </div>
      </div>

      {/* Node Health (Battery & RSSI) */}
      <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400 border-t border-[#18263e]">
        <div className="flex items-center gap-1.5">
          <Battery className={`w-3.5 h-3.5 ${batteryColor}`} />
          <span>Battery: <strong className={batteryColor}>{node.battery}%</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <Signal className="w-3.5 h-3.5 text-cyan-400" />
          <span>RSSI: <strong className="text-slate-300">{node.signal_rssi || -60} dBm</strong></span>
        </div>
      </div>
    </div>
  );
}
