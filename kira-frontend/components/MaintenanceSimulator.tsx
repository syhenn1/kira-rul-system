"use client";

import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Cpu, Clock, Wrench } from "lucide-react";

export default function MaintenanceSimulator() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ rul: number; severity: string; confidence: number } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    // Simulate AI processing time
    setTimeout(() => {
      setIsSubmitting(false);
      // Mock result based on random logic or fixed for demo
      setResult({
        rul: Math.floor(Math.random() * 60) + 10, // 10 to 70 days
        severity: Math.random() > 0.5 ? "High" : "Medium",
        confidence: Math.floor(Math.random() * 15) + 80, // 80 to 95%
      });
    }, 2500);
  };

  const resetForm = () => setResult(null);

  return (
    <div className="w-full max-w-2xl mx-auto mt-12 animate-slide-up" style={{ animationDelay: "0.2s" }}>
      <div className="glass rounded-2xl p-1 shadow-2xl relative overflow-hidden group">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
        
        <div className="relative bg-white dark:bg-zinc-950 rounded-xl p-6 sm:p-10 z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Kira AI Engine</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Analyze maintenance records instantly</p>
            </div>
          </div>

          {!result && !isSubmitting ? (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Asset ID</label>
                  <input required type="text" placeholder="e.g. PUMP-042" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Component</label>
                  <select className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                    <option>Bearing</option>
                    <option>Motor</option>
                    <option>Valve</option>
                    <option>Cooling System</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Observed Symptoms / Cause</label>
                <textarea required rows={3} placeholder="Describe the issue... (e.g., High vibration detected on the main bearing, unusual noise during startup)" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"></textarea>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95">
                Analyze with Kira AI
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          ) : isSubmitting ? (
            <div className="py-16 flex flex-col items-center justify-center animate-fade-in text-center">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                <Cpu className="absolute inset-0 m-auto text-blue-500 w-8 h-8 animate-pulse-slow" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Analyzing Patterns...</h3>
              <p className="text-zinc-500 dark:text-zinc-400">Running prediction models based on historical data.</p>
            </div>
          ) : result ? (
            <div className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* RUL Card */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-xl p-5 relative overflow-hidden">
                  <Clock className="w-24 h-24 text-green-500/10 absolute -right-4 -bottom-4" />
                  <div className="relative z-10">
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Predicted RUL
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-zinc-900 dark:text-white">{result.rul}</span>
                      <span className="text-zinc-500 font-medium">Days</span>
                    </div>
                  </div>
                </div>

                {/* Severity Card */}
                <div className={`border rounded-xl p-5 relative overflow-hidden ${result.severity === 'High' ? 'bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/20' : 'bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20'}`}>
                  <AlertTriangle className={`w-24 h-24 absolute -right-4 -bottom-4 ${result.severity === 'High' ? 'text-red-500/10' : 'text-yellow-500/10'}`} />
                  <div className="relative z-10">
                    <p className={`text-sm font-semibold mb-1 flex items-center gap-2 ${result.severity === 'High' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                      <Wrench className="w-4 h-4" /> Severity Classification
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-zinc-900 dark:text-white">{result.severity}</span>
                      <span className="text-zinc-500 font-medium ml-1">Priority</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-semibold">Analysis complete.</span> AI confidence level is at {result.confidence}%. Recommended to schedule maintenance within the next {Math.floor(result.rul * 0.8)} days to prevent critical failure.
                  </p>
                </div>
              </div>

              <button onClick={resetForm} className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-medium py-3 rounded-lg transition-colors">
                Analyze Another Asset
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
