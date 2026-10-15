import React, { useState } from 'react';
import { MapPin, Target, Eye, Layers, Compass, Zap } from 'lucide-react';

export default function LiveSiteMap({ nodes = [], fusion = {}, onSelectNode }) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [selectedSector, setSelectedSector] = useState(null);

  // Sector rows: A to D (y: 0-60m), columns 1 to 4 (x: 0-60m)
  const rows = ['A', 'B', 'C', 'D'];
  const cols = [1, 2, 3, 4];

  // Convert real site meters (0-60m) to percentage coordinates for rendering
  const toPercent = (val) => Math.min(100, Math.max(0, (val / 60.0) * 100));

  const targetCoords = fusion.estimated_coords || { x: 30, y: 30 };
  const targetXPercent = toPercent(targetCoords.x);
  const targetYPercent = toPercent(targetCoords.y);

  const isCriticalOrElevated = fusion.priority_level === 'CRITICAL' || fusion.priority_level === 'ELEVATED';

  return (
    <div className="bg-[#0f172a] rounded-xl border border-[#1e2e4a] overflow-hidden flex flex-col shadow-2xl relative">
      {/* Map Control Bar */}
      <div className="bg-[#131e33] px-4 py-3 border-b border-[#1e2e4a] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">Disaster Rubble Grid Site Plan (60m × 60m)</h2>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded border transition-colors flex items-center gap-1.5 ${
              showHeatmap
                ? 'bg-cyan-950/80 border-cyan-600 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Heatmap Overlay: {showHeatmap ? 'ON' : 'OFF'}</span>
          </button>

          <div className="flex items-center gap-1 bg-[#0b1220] px-2.5 py-1 rounded border border-[#1e2e4a] text-slate-400">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>North Rubble Orientation</span>
          </div>
        </div>
      </div>

      {/* 2D Interactive Grid Viewport */}
      <div className="relative w-full aspect-square md:aspect-[16/11] bg-[#070b13] bg-grid-tactical overflow-hidden p-6 select-none">
        {/* Sector Matrix Grid Overlay */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
          {rows.map((row) =>
            cols.map((col) => {
              const sectorName = `Sector ${row}${col}`;
              const isTargetSector = fusion.target_sector === sectorName && isCriticalOrElevated;

              return (
                <div
                  key={sectorName}
                  className={`border border-[#18263e]/70 relative transition-all duration-500 ${
                    isTargetSector
                      ? 'bg-rose-500/15 border-rose-500/60 shadow-[inset_0_0_20px_rgba(244,63,94,0.25)]'
                      : 'hover:bg-cyan-500/5'
                  }`}
                >
                  <span
                    className={`absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      isTargetSector
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-[#10192a] text-slate-400 border border-[#1b2a44]'
                    }`}
                  >
                    {sectorName}
                  </span>

                  {isTargetSector && (
                    <div className="absolute bottom-2 right-2 text-[10px] font-mono text-rose-300 bg-rose-950/90 border border-rose-500/50 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <Target className="w-3 h-3 text-rose-400 animate-spin" />
                      <span>PRIORITY ZONE</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Heatmap Evidence Cloud (Rendering Probabilistic Density) */}
        {showHeatmap && fusion.heatmap && fusion.heatmap.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {fusion.heatmap.map((pt, idx) => {
              const px = toPercent(pt.x);
              const py = toPercent(pt.y);
              const opacity = Math.min(0.65, pt.intensity / 110);
              const color =
                pt.intensity > 70
                  ? 'rgba(239, 68, 68,' // Red for high
                  : pt.intensity > 40
                  ? 'rgba(245, 158, 11,' // Amber for moderate
                  : 'rgba(6, 182, 212,'; // Cyan for low

              return (
                <div
                  key={idx}
                  className="absolute rounded-full filter blur-md transition-all duration-700 pointer-events-none"
                  style={{
                    left: `${px}%`,
                    top: `${py}%`,
                    width: '56px',
                    height: '56px',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: `${color} ${opacity})`
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Estimated Survivor Epicenter Reticle */}
        {isCriticalOrElevated && (
          <div
            className="absolute z-20 pointer-events-none transition-all duration-700 ease-out"
            style={{
              left: `${targetXPercent}%`,
              top: `${targetYPercent}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Pulsing targeting radar rings */}
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-rose-500/80 animate-spin"></div>
              <div className="absolute w-32 h-32 rounded-full border border-rose-500/30 animate-ping"></div>
              <div className="absolute w-4 h-4 bg-rose-500 rounded-full shadow-[0_0_15px_#f43f5e] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>

              {/* Coordinates Pill */}
              <div className="absolute top-10 whitespace-nowrap bg-rose-950/90 border border-rose-500 text-rose-200 text-[11px] font-mono px-2.5 py-1 rounded-md shadow-xl flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-bold">Survivor Epicenter: ({targetCoords.x}m, {targetCoords.y}m)</span>
                <span className="text-amber-300">~{fusion.estimated_depth_m || 1.2}m depth</span>
              </div>
            </div>
          </div>
        )}

        {/* Distributed Sensor Nodes Placement */}
        {nodes.map((node) => {
          const nx = toPercent(node.x);
          const ny = toPercent(node.y);
          const ev = (node.latest_telemetry && node.latest_telemetry.evidence_index) || 0;
          const isElevated = ev > 45;
          const sound = (node.latest_telemetry && node.latest_telemetry.audio_level) || 35;
          const vib = (node.latest_telemetry && node.latest_telemetry.vibration_rms) || 0.02;

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode && onSelectNode(node)}
              className="absolute z-30 cursor-pointer group transition-all duration-300"
              style={{
                left: `${nx}%`,
                top: `${ny}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Elevated Wave Ripple Animation */}
              {isElevated && (
                <div className="absolute -inset-4 rounded-full border-2 border-cyan-400/80 animate-ping pointer-events-none"></div>
              )}

              {/* Node Marker Node Pin */}
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg transition-transform group-hover:scale-110 ${
                  isElevated
                    ? 'bg-rose-900 border-rose-400 text-rose-200 shadow-rose-900/60'
                    : 'bg-slate-900 border-cyan-500 text-cyan-300 shadow-cyan-900/40'
                }`}
              >
                <span className="font-mono text-xs font-bold">
                  {node.name ? node.name.charAt(5) || 'N' : 'N'}
                </span>

                {/* Battery status dot */}
                <span
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-black ${
                    node.battery > 50 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  title={`Battery: ${node.battery}%`}
                />
              </div>

              {/* Hover Tooltip Card */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#0b1322] border border-[#223554] p-2.5 rounded-lg shadow-2xl text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40">
                <p className="font-bold text-slate-200">{node.name}</p>
                <div className="text-[10px] text-slate-400 mt-1 flex flex-col gap-0.5">
                  <div className="flex justify-between gap-4">
                    <span>Position:</span>
                    <span className="text-cyan-300">{node.x}m, {node.y}m</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Acoustic:</span>
                    <span className="text-amber-300">{sound} dB</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Vibration:</span>
                    <span className="text-violet-300">{vib}g RMS</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Evidence Score:</span>
                    <span className={isElevated ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {ev}/100
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map Footer Legend */}
      <div className="bg-[#10192a] px-4 py-2 border-t border-[#1e2e4a] flex items-center justify-between text-[11px] font-mono text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Sensor Node (Nominal)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span> Elevated Evidence Node
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Trilaterated Center
          </span>
        </div>
        <div>
          <span>Inverse-distance attenuation: &alpha; = 1.8</span>
        </div>
      </div>
    </div>
  );
}
