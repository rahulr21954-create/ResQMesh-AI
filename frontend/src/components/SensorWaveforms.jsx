import React, { useState } from 'react';
import { Activity, Radio, Volume2, Waves, Zap } from 'lucide-react';

export default function SensorWaveforms({ nodes = [], selectedNodeId, onSelectNode }) {
  const activeNode = nodes.find(n => n.id === selectedNodeId) || nodes[0] || {};
  const tel = activeNode.latest_telemetry || {};

  const soundDb = tel.audio_level || 38.0;
  const vibRms = tel.vibration_rms || 0.022;
  const vibPeak = tel.vibration_peak || 0.038;
  const periodicity = tel.periodicity || 0.04;
  const bpm = tel.dominant_bpm || 0;
  const pattern = tel.pattern || 'NORMAL_BACKGROUND';

  // Generate simulated dynamic SVG waveform based on current dB and vibration
  const points = 32;
  const wavePoints = Array.from({ length: points }).map((_, i) => {
    const x = (i / (points - 1)) * 300;
    // Modulate wave height with soundDb and vibration
    const amp = Math.min(38, Math.max(4, (soundDb - 30) * 0.9));
    const freq = periodicity > 0.4 ? 4 : 2;
    const y = 45 + Math.sin(i * freq + Date.now() / 250) * amp * (0.6 + Math.random() * 0.4);
    return `${x},${y}`;
  }).join(' ');

  const isTapping = pattern === 'SURVIVOR_RHYTHMIC_TAPPING';

  return (
    <div className="bg-[#0f172a] rounded-xl border border-[#1e2e4a] p-4 shadow-xl flex flex-col justify-between">
      {/* Node Selector Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1e2e4a] mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-200">Real-Time Waveform & Multimodal Spectrum</h3>
        </div>

        {/* Node selector buttons */}
        <div className="flex items-center gap-1.5 bg-[#0b1220] p-1 rounded-lg border border-[#1e2e4a]">
          {nodes.map(n => (
            <button
              key={n.id}
              onClick={() => onSelectNode(n.id)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                (activeNode.id === n.id)
                  ? 'bg-cyan-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {n.name ? n.name.split(' ')[0] + ' ' + n.name.split(' ')[1] : n.id}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {/* Sound Decibels */}
        <div className="bg-[#0b1220] p-3 rounded-lg border border-[#1b2b45]">
          <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-amber-400" /> Acoustic SPL
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold font-mono ${soundDb > 60 ? 'text-amber-400' : 'text-slate-200'}`}>
              {soundDb}
            </span>
            <span className="text-[10px] font-mono text-slate-400">dB</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full ${soundDb > 65 ? 'bg-amber-400' : 'bg-cyan-500'}`}
              style={{ width: `${Math.min(100, Math.max(10, ((soundDb - 30) / 60) * 100))}%` }}
            />
          </div>
        </div>

        {/* Vibration RMS */}
        <div className="bg-[#0b1220] p-3 rounded-lg border border-[#1b2b45]">
          <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" /> Vibration RMS
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold font-mono ${vibRms > 0.08 ? 'text-cyan-300' : 'text-slate-200'}`}>
              {vibRms}
            </span>
            <span className="text-[10px] font-mono text-slate-400">g</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full ${vibRms > 0.1 ? 'bg-rose-400' : 'bg-cyan-400'}`}
              style={{ width: `${Math.min(100, Math.max(5, (vibRms / 0.3) * 100))}%` }}
            />
          </div>
        </div>

        {/* Peak Dynamic Acceleration */}
        <div className="bg-[#0b1220] p-3 rounded-lg border border-[#1b2b45]">
          <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Zap className="w-3 h-3 text-rose-400" /> Peak Impact
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold font-mono text-slate-200">
              {vibPeak}
            </span>
            <span className="text-[10px] font-mono text-slate-400">g</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="h-full bg-rose-500"
              style={{ width: `${Math.min(100, Math.max(5, (vibPeak / 0.5) * 100))}%` }}
            />
          </div>
        </div>

        {/* Rhythm / Periodicity Autocorrelation */}
        <div className="bg-[#0b1220] p-3 rounded-lg border border-[#1b2b45]">
          <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1">
            <Radio className="w-3 h-3 text-emerald-400" /> Tapping Cadence
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold font-mono ${isTapping ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
              {isTapping ? `${bpm} BPM` : '0 BPM'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-1">
            Periodicity: {(periodicity * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Live Oscilloscope Waveform Display */}
      <div className="relative bg-[#070b13] border border-[#18263e] rounded-lg p-2.5 h-28 overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 z-10">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isTapping ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`}></span>
            Channel: <strong className="text-cyan-300">{activeNode.name || 'Sensor Node'}</strong>
          </span>
          <span className="text-slate-500">Sampling Rate: 16 kHz (Acoustic) / 200 Hz (IMU)</span>
        </div>

        {/* Center zero line */}
        <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-800 pointer-events-none"></div>

        {/* SVG Wave */}
        <svg className="w-full h-20" viewBox="0 0 300 90" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={isTapping ? '#f43f5e' : '#06b6d4'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={wavePoints}
          />
        </svg>

        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 z-10">
          <span>Detected Pattern: <strong className={isTapping ? 'text-rose-400 font-bold' : 'text-slate-300'}>{pattern}</strong></span>
          <span>Buffer: 256 samples rolling</span>
        </div>
      </div>
    </div>
  );
}
