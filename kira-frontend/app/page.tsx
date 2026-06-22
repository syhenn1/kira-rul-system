import Image from "next/image";
import { BrainCircuit, LineChart, ShieldAlert } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg">
              <Image src="/assets/kira.png" alt="Kira" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-white">Kira RUL System</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/auth/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Login
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
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6 animate-slide-up">
            Intelligent Asset <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Management & Prediction
            </span>
          </h1>
          
          <p className="mt-4 text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Harness the power of AI to predict Remaining Useful Life (RUL) and automatically classify maintenance severity before critical failures occur.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <a href="#fitur" className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
              Fitur
            </a>
            <a href="#tentang" className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors">
              Tentang KIRA
            </a>
            <a href="#how-it-works" className="px-6 py-2 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-medium transition-colors">
              Cara Kerja
            </a>
            <a href="#tim" className="px-6 py-2 rounded-full bg-green-600 hover:bg-green-700 text-white font-medium transition-colors">
              Tim
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-20 px-6 bg-white dark:bg-zinc-950/50 border-y border-zinc-200 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">Fitur Utama</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Solusi lengkap untuk manajemen aset dan prediksi maintenance yang lebih baik.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<BrainCircuit className="w-6 h-6 text-blue-500" />}
              title="Prediksi RUL dengan AI"
              description="Model ML canggih kami menganalisis data historis untuk memprediksi dengan akurat berapa hari aset Anda tersisa sebelum gagal."
              delay="0.1s"
            />
            <FeatureCard 
              icon={<ShieldAlert className="w-6 h-6 text-purple-500" />}
              title="Klasifikasi Tingkat Keparahan"
              description="Klasifikasi otomatis laporan maintenance ke tingkat keparahan berdasarkan gejala dan penyebab untuk memprioritaskan alur kerja Anda."
              delay="0.2s"
            />
            <FeatureCard 
              icon={<LineChart className="w-6 h-6 text-pink-500" />}
              title="Rekomendasi Aksi"
              description="Dapatkan rekomendasi yang jelas dan berbasis data tentang kapan jadwal maintenance untuk meminimalkan downtime dan menghemat biaya."
              delay="0.3s"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="tentang" className="py-20 px-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-zinc-900 dark:to-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">Tentang KIRA</h2>
            <p className="text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto">
              KIRA menggunakan <span className="font-semibold">Deep Learning</span> untuk memprediksi <span className="font-semibold">Remaining Useful Life (RUL)</span> dengan akurat, membantu Anda mengambil keputusan maintenance yang tepat dan mengurangi biaya operasional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="p-8 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: "0s" }}>
              <div className="text-5xl mb-4">🎯</div>
              <h4 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Prediksi Akurat (RUL)</h4>
              <p className="text-zinc-600 dark:text-zinc-400">
                Prediksi sisa waktu pakai aset dengan akurasi tinggi untuk perencanaan maintenance yang lebih baik.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="text-5xl mb-4">⚡</div>
              <h4 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Klasifikasi Otomatis</h4>
              <p className="text-zinc-600 dark:text-zinc-400">
                Klasifikasi otomatis tingkat keparahan maintenance untuk prioritas pekerjaan yang lebih efektif.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="text-5xl mb-4">💰</div>
              <h4 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Efisiensi Biaya</h4>
              <p className="text-zinc-600 dark:text-zinc-400">
                Kurangi maintenance tak terencana dan hemat biaya operasional dengan strategi preventive yang tepat sasaran.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">Cara Kerja Sistem</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Tiga langkah sederhana untuk mengoptimalkan manajemen aset Anda dengan kecerdasan buatan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <WorkflowCard
              number="1"
              title="Data Collection"
              description="Kumpulan data aset dari berbagai sumber - sensor, log maintenance, dan historical data"
              icon="📊"
              delay="0s"
            />
            <WorkflowCard
              number="2"
              title="AI Processing"
              description="Model ML menganalisis pola untuk memprediksi RUL dan mengidentifikasi anomali"
              icon="🤖"
              delay="0.15s"
            />
            <WorkflowCard
              number="3"
              title="Action Plan"
              description="Dapatkan rekomendasi maintenance dengan timeline spesifik untuk setiap aset"
              icon="✅"
              delay="0.3s"
            />
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="tim" className="py-20 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950/50 dark:to-[#050505]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">Tim Pengembang</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Dibangun oleh tim yang berdedikasi untuk menghadirkan solusi manajemen aset terbaik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { name: "Mochamad Rifat Syahman Hambali", short: "Rifat", avatar: "🔵" },
              { name: "Muhammad Dzaky Fauzan", short: "Dzaky", avatar: "🟣" },
              { name: "Yasmeen Almira", short: "Yasmeen", avatar: "🟢" },
              { name: "Muhammad Syukron Rizky Fadilla", short: "Syukron", avatar: "🟡" },
              { name: "Muhamad Gerraldy Ghassan Herfio", short: "Gerraldy", avatar: "🔴" },
            ].map((member, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-all hover:scale-105 text-center animate-slide-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="text-4xl mb-4">{member.avatar}</div>
                <h3 className="font-semibold text-zinc-900 dark:text-white text-sm md:text-base mb-2">
                  {member.short}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                  {member.name}
                </p>
                <span className="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium">
                  ROLE
                </span>
              </div>
            ))}
          </div>
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

function WorkflowCard({ number, title, description, icon, delay }: { number: string, title: string, description: string, icon: string, delay: string }) {
  return (
    <div 
      className="relative p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-all animate-slide-up"
      style={{ animationDelay: delay }}
    >
      <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
        {number}
      </div>
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}