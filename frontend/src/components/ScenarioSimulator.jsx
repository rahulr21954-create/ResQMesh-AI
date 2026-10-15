import React, { useState, useEffect } from 'react';
import { Play, Sparkles, RefreshCw, Volume2, Activity, ShieldAlert, Layers } from 'lucide-react';
import { triggerScenario } from '../services/api';

export default function ScenarioSimulator({ onScenarioTriggered }) {
  const [currentScenario, setCurrentScenario] = useState('NORMAL');
  const [autoCycle, setAutoCycle] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTrigger = async (scenario) => {
    setLoading(true);
    setCurrentScenario(scenario);
    try {
      await triggerScenario(scenario);
      if (onScenarioTriggered) onScenarioTriggered(scenario);
    } catch (e) {
      console.error("Simulation error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Autoplay demonstration for presentations/hackathon judging
  useEffect(() => {
    if (!autoCycle) return;
    const scenarios = ['NORMAL', 'SURVIVOR_TAPPING_B2', 'STRUCTURAL_SETTLING', 'SURVIVOR_VOCALIZATION'];
    let idx = 0;

    const timer = setInterval(() => {
      idx = (idx + 1) % scenarios.length;
      handleTrigger(scenarios[idx]);
    }, 8000);

    return () => clearInterval(timer);
  }, [autoCycle]);

  return (
    <div className="bg-[#0f172a] rounded-xl border border-[#1e2e4a] p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#1e2e4a] mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-200">Hackathon Rubble Simulation Controller</h3>
        </div>

        <button
          onClick={() => setAutoCycle(!autoCycle)}
          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors flex items-center gap-1.5 ${
            autoCycle
              ? 'bg-amber-950 border-amber-500 text-amber-300 animate-pulse'
              : 'bg-[#131d31] border-[#1e2e4a] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-3 h-3" />
          <span>Auto-Demo Cycle: {autoCycle ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      <p className="text-[11px] font-mono text-slate-400 mb-3">
        Select a disaster test condition to simulate physical sensor stimulus across the 3-node mesh and verify AI multi-node evidence fusion:
      </p>

      {/* Trigger Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
        {/* Scenario 1: Survivor Tapping */}
        <button
          disabled={loading}
          onClick={() => handleTrigger('SURVIVOR_TAPPING_B2')}
          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
            currentScenario === 'SURVIVOR_TAPPING_B2'
              ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/50'
              : 'bg-[#0b1220] border-[#1b2b45] text-slate-300 hover:border-rose-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Tapping (B2)
            </span>
            <span className="text-[10px] bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded">Survivor</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Node B & A 104 BPM rhythmic tapping &rarr; Elevates Priority Zone B2
          </span>
        </button>

        {/* Scenario 2: Structural Settling */}
        <button
          disabled={loading}
          onClick={() => handleTrigger('STRUCTURAL_SETTLING')}
          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
            currentScenario === 'STRUCTURAL_SETTLING'
              ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-lg shadow-amber-950/50'
              : 'bg-[#0b1220] border-[#1b2b45] text-slate-300 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" /> Debris Shift
            </span>
            <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded">Rubble</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Concrete creaking, high vibration without rhythmic periodicity
          </span>
        </button>

        {/* Scenario 3: Human Vocalization */}
        <button
          disabled={loading}
          onClick={() => handleTrigger('SURVIVOR_VOCALIZATION')}
          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
            currentScenario === 'SURVIVOR_VOCALIZATION'
              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-lg shadow-cyan-950/50'
              : 'bg-[#0b1220] border-[#1b2b45] text-slate-300 hover:border-cyan-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Distress Cry
            </span>
            <span className="text-[10px] bg-cyan-900/60 text-cyan-300 px-1.5 py-0.5 rounded">Voice</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Mid-frequency harmonic energy in 300-3400Hz vocal band
          </span>
        </button>

        {/* Scenario 4: Calm Ambient */}
        <button
          disabled={loading}
          onClick={() => handleTrigger('NORMAL')}
          className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
            currentScenario === 'NORMAL'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-lg shadow-emerald-950/50'
              : 'bg-[#0b1220] border-[#1b2b45] text-slate-300 hover:border-emerald-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Calm Ambient
            </span>
            <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded">Baseline</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Nominal 35-40 dB quiet rubble background, no anomalies
          </span>
        </button>
      </div>
    </div>
  );
}
