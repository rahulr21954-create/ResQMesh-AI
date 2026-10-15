import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, User, FileText, Trash2 } from 'lucide-react';
import { reviewAlert, clearAlerts } from '../services/api';

export default function AlertReviewModal({ alerts = [], isOpen, onClose, onRefresh }) {
  const [selectedAlertId, setSelectedAlertId] = useState(alerts[0]?.id || null);
  const [reviewerName, setReviewerName] = useState('Commander Alex Vance (SAR Taskforce 1)');
  const [fieldNotes, setFieldNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentAlert = alerts.find(a => a.id === selectedAlertId) || alerts[0];

  const handleAction = async (status) => {
    if (!currentAlert) return;
    setIsSubmitting(true);
    try {
      await reviewAlert(currentAlert.id, status, fieldNotes, reviewerName);
      setFieldNotes('');
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (window.confirm("Clear inactive/resolved alerts?")) {
      await clearAlerts();
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-[#223554] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#131e33] px-6 py-4 border-b border-[#223554] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">Human-Review & Incident Command Workflow</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClear}
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded transition-colors text-xs flex items-center gap-1 font-mono"
              title="Clear old alerts"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs">
          {/* Alert Selector Tabs */}
          <div>
            <label className="text-slate-400 block mb-2 text-[11px] uppercase tracking-wider">Select Active Incident Alert:</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {alerts.length === 0 ? (
                <div className="text-slate-500 py-2">No active alerts to review.</div>
              ) : (
                alerts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAlertId(a.id)}
                    className={`px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors flex items-center gap-2 ${
                      (currentAlert && currentAlert.id === a.id)
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-[#0b1220] border-[#1b2b45] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{a.sector}</span>
                    <span className="text-[10px] text-slate-500">[{a.status}]</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {currentAlert && (
            <>
              {/* Alert Details Card */}
              <div className="bg-[#0b1220] p-4 rounded-xl border border-[#1b2b45] space-y-3">
                <div className="flex items-center justify-between border-b border-[#18263e] pb-2">
                  <span className="text-slate-400">Target Priority Location:</span>
                  <strong className="text-rose-400 text-sm">{currentAlert.sector} ({currentAlert.coordinates?.x}m, {currentAlert.coordinates?.y}m)</strong>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">AI Detected Pattern:</span>
                    <strong className="text-cyan-300">{currentAlert.detected_pattern}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Estimated Rubble Depth:</span>
                    <strong className="text-amber-300">~{currentAlert.estimated_depth_m || 1.2} meters</strong>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">Cross-Node Consensus:</span>
                  <span className="text-slate-300">{currentAlert.multi_node_agreement}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Current Status:</span>
                  <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {currentAlert.status}
                  </span>
                </div>
              </div>

              {/* Reviewer Call Sign */}
              <div>
                <label className="text-slate-400 block mb-1.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  Incident Reviewer / Rescuer Call Sign:
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-[#0b1220] border border-[#223554] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Field Notes & Acoustic Verification */}
              <div>
                <label className="text-slate-400 block mb-1.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Rescuer Decision Notes / Verification Findings:
                </label>
                <textarea
                  rows="3"
                  value={fieldNotes}
                  onChange={(e) => setFieldNotes(e.target.value)}
                  placeholder="e.g. Deployed acoustic listening stick. Verified metallic tapping response at 1.4m depth..."
                  className="w-full bg-[#0b1220] border border-[#223554] rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Decision Action Buttons */}
              <div className="pt-2">
                <span className="text-slate-400 block mb-2 text-[11px] uppercase tracking-wider">Execute Decision-Support Protocol:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction('DISPATCHED_SAR')}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-3 rounded-lg text-center transition-colors shadow-lg shadow-rose-950/40"
                  >
                    Dispatch SAR Team
                  </button>

                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction('CONFIRMED_SURVIVOR')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-lg text-center transition-colors shadow-lg shadow-emerald-950/40"
                  >
                    Confirmed Survivor
                  </button>

                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction('INVESTIGATING')}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-3 rounded-lg text-center transition-colors"
                  >
                    Under Investigation
                  </button>

                  <button
                    disabled={isSubmitting}
                    onClick={() => handleAction('FALSE_ALARM')}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2.5 px-3 rounded-lg text-center transition-colors"
                  >
                    Mark False Alarm
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
