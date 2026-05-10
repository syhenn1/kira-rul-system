import MaintenanceSimulator from "@/components/MaintenanceSimulator";
import { BrainCircuit, LineChart, ShieldAlert } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">Kira RUL System</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Documentation
            </button>
            <a href="/auth/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Login
            </a>
            <a href="/dashboard" className="text-sm font-medium px-4 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-105 transition-transform">
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] opacity-30 dark:opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse-slow"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Kira AI v2.0 is now live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6 animate-slide-up">
            Intelligent Asset <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Management & Prediction
            </span>
          </h1>
          
          <p className="mt-4 text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Harness the power of AI to predict Remaining Useful Life (RUL) and automatically classify maintenance severity before critical failures occur.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <a href="#simulator" className="px-8 py-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold hover:scale-105 transition-transform">
              Try the Simulator
            </a>
            <a href="/dashboard" className="px-8 py-4 rounded-full glass font-semibold hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors">
              View Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white dark:bg-zinc-950/50 border-y border-zinc-200 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<BrainCircuit className="w-6 h-6 text-blue-500" />}
              title="AI RUL Prediction"
              description="Our advanced ML models analyze historical data to accurately predict how many days your asset has left before failure."
              delay="0.1s"
            />
            <FeatureCard 
              icon={<ShieldAlert className="w-6 h-6 text-purple-500" />}
              title="Severity Classification"
              description="Automatically classify maintenance reports into severity levels based on symptoms and causes to prioritize your workflow."
              delay="0.2s"
            />
            <FeatureCard 
              icon={<LineChart className="w-6 h-6 text-pink-500" />}
              title="Actionable Insights"
              description="Get clear, data-driven recommendations on when to schedule maintenance to minimize downtime and save costs."
              delay="0.3s"
            />
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section id="simulator" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">Interactive AI Demo</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Input a mock maintenance record below. The Kira Engine will analyze the symptoms and determine the predicted RUL and issue severity.
            </p>
          </div>
          
          <MaintenanceSimulator />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-zinc-500 dark:text-zinc-400 text-sm border-t border-zinc-200 dark:border-zinc-900">
        <p>© 2026 Kira Systems. Designed for enterprise reliability.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: string }) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:shadow-xl transition-shadow animate-slide-up" style={{ animationDelay: delay }}>
      <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-950 flex items-center justify-center mb-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
