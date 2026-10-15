import React from 'react';
import { AlertTriangle, CheckCircle, Flame, Layers, Navigation, ShieldCheck, Zap } from 'lucide-react';

export default function PriorityZonesCard({ fusion = {}, onReviewAction }) {
  const {
    priority_level = 'NOMINAL',
    target_sector = 'Sector None',
    estimated_coords = { x: 30, y: 30 },
    estimated_depth_m = 1.2,
    evidence_score = 15,
    correlation_score = 0.2,
    multi_node_agreement = 'BACKGROUND NOMINAL',
    num_elevated_nodes = 0,
    recommended_action = 'Monitoring ongoing'
  } = fusion;

  const isCritical = priority_level === 'CRITICAL';
  const isElevated = priority_level === 'ELEVATED';

  // Badge styles
  const badgeStyle = isCritical
    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse'
    : isElevated
    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';

  return (
    <div className={`rounded-xl border p-5 shadow-2xl transition-all duration-300 ${
      isCritical
        ? 'bg-gradient-to-b from-[#1c121f] to-[#121927] border-rose-500/50 shadow-rose-950/40'
        : isElevated
        ? 'bg-gradient-to-b from-[#1c1a17] to-[#121927] border-amber-500/40 shadow-amber-950/30'
        : 'bg-[#0f172a] border-[#1e2e4a]'
    }`}>
      {/* Title Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#1e2e4a] mb-4">
        <div className="flex items-center gap-2">
          <Zap className={`w-5 h-5 ${isCritical ? 'text-rose-400 animate-bounce' : isElevated ? 'text-amber-400' : 'text-cyan-400'}`} />
          <h2 className="text-base font-bold text-white tracking-tight">AI Sensor-Fusion Decision Support</h2>
        </div>
        <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${badgeStyle}`}>
          {priority_level}
        </span>
      </div>

      {/* Target Priority Zone Callout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-[#0b1220] p-4 rounded-lg border border-[#1b2b45] flex flex-col justify-between">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Estimated Survivor Priority Zone</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-black font-mono tracking-tight ${isCritical ? 'text-rose-400' : isElevated ? 'text-amber-400' : 'text-slate-200'}`}>
              {target_sector}
            </span>
            <span className="text-xs font-mono text-cyan-400">
              ({estimated_coords.x}m, {estimated_coords.y}m)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-slate-500" />
            Estimated Depth: <strong className="text-slate-200">~{estimated_depth_m} meters</strong> beneath debris
          </p>
        </div>

        {/* Evidence Score & Multi-Node Agreement */}
        <div className="bg-[#0b1220] p-4 rounded-lg border border-[#1b2b45] flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Composite Evidence Score</span>
            <span className={`text-sm font-bold font-mono ${evidence_score > 70 ? 'text-rose-400' : 'text-cyan-400'}`}>
              {evidence_score} / 100
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2.5 my-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                evidence_score > 70
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${Math.max(5, evidence_score)}%` }}
            />
          </div>

          <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Correlation: <strong className="text-slate-200">{Math.round(correlation_score * 100)}% agreement</strong> ({num_elevated_nodes} nodes active)
          </p>
        </div>
      </div>

      {/* Multi-Node Evidence & Explainability Box */}
      <div className="bg-[#0b1220]/70 rounded-lg p-3.5 border border-[#1b2b45] text-xs font-mono space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-400">Cross-Node Correlation State: </span>
            <span className="text-slate-200 font-semibold">{multi_node_agreement}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-400">Decision-Support Directive: </span>
            <span className="text-cyan-300 font-medium">{recommended_action}</span>
          </div>
        </div>
      </div>

      {/* SAR Action Bar */}
      {(isCritical || isElevated) && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => onReviewAction && onReviewAction('DISPATCHED_SAR')}
            className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-2.5 px-4 rounded-lg text-xs font-mono shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>DISPATCH RESCUE TEAM TO {target_sector}</span>
          </button>
          
          <button
            onClick={() => onReviewAction && onReviewAction('INVESTIGATING')}
            className="bg-[#19273f] hover:bg-[#203252] text-slate-200 font-semibold py-2.5 px-4 rounded-lg text-xs font-mono border border-[#2b3f63] transition-colors"
          >
            Mark Investigating
          </button>
        </div>
      )}
    </div>
  );
}
