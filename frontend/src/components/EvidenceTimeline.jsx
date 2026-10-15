import React from 'react';
import { Clock, ShieldAlert, Activity, CheckCircle, Radio, Bell } from 'lucide-react';

export default function EvidenceTimeline({ alerts = [] }) {
  return (
    <div className="bg-[#0f172a] rounded-xl border border-[#1e2e4a] p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-[#1e2e4a] mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-200">Sensor-Fusion & Alert Timeline</h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400">{alerts.length} Records</span>
      </div>

      <div className="overflow-y-auto space-y-3 pr-1 max-h-72">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono text-slate-500">
            No incident alerts logged yet. System standing by.
          </div>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.priority_level === 'CRITICAL';
            const isElevated = alert.priority_level === 'ELEVATED';

            return (
              <div
                key={alert.id}
                className="bg-[#0b1220] rounded-lg p-3 border border-[#1b2b45] text-xs font-mono flex flex-col gap-1.5 transition-all hover:border-[#2a4269]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isCritical ? 'bg-rose-500 animate-ping' : isElevated ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                    />
                    <strong className={isCritical ? 'text-rose-400' : isElevated ? 'text-amber-400' : 'text-slate-200'}>
                      {alert.sector || 'Disaster Site'}
                    </strong>
                    <span className="text-[10px] text-slate-500">
                      ({alert.coordinates ? `${alert.coordinates.x}m, ${alert.coordinates.y}m` : 'coords'})
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-slate-300 text-[11px]">
                  Pattern: <span className="text-cyan-300 font-semibold">{alert.detected_pattern}</span>
                </div>

                <div className="text-[10px] text-slate-400 line-clamp-2">
                  {alert.notes || alert.multi_node_agreement}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#18263e] text-[10px]">
                  <span className="text-slate-500">
                    Depth: <strong className="text-slate-300">~{alert.estimated_depth_m || 1.2}m</strong>
                  </span>

                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      alert.status === 'CONFIRMED_SURVIVOR'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : alert.status === 'DISPATCHED_SAR'
                        ? 'bg-rose-950 text-rose-300 border border-rose-700'
                        : alert.status === 'INVESTIGATING'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : alert.status === 'FALSE_ALARM'
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                    }`}
                  >
                    {alert.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
