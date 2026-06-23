import Image from "next/image";
import { BrainCircuit, LineChart, ShieldAlert } from "lucide-react";
import DemoSimulator from "@/components/DemoSimulator";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-zinc-100">
              <Image src="/assets/kira.png" alt="Kira" width={64} height={64} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xl tracking-tight text-zinc-900">Kira RUL System</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/auth/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
              Login
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-150 h-150 bg-blue-400/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-125 h-125 bg-purple-400/20 blur-[120px] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-100 h-100 bg-pink-400/10 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium mb-8 animate-slide-up">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            AI-Powered Asset Intelligence
          </div>

          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-zinc-900 leading-[1.05] mb-8 animate-slide-up">
            Intelligent Asset
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 via-purple-600 to-pink-600">
              Management
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Prediksi <strong className="text-zinc-700">Remaining Useful Life</strong> aset secara otomatis dengan AI — cegah kerusakan sebelum terjadi.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <a
              href="/auth/login"
              className="px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
            >
              Mulai Sekarang →
            </a>
            <a
              href="#fitur"
              className="px-8 py-4 rounded-2xl bg-white hover:bg-zinc-50 text-zinc-700 font-semibold text-base transition-all border border-zinc-200 shadow-sm hover:-translate-y-0.5"
            >
              Lihat Fitur
            </a>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 mt-20 max-w-lg mx-auto animate-slide-up" style={{ animationDelay: "0.35s" }}>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-zinc-900">AI</div>
              <div className="text-xs text-zinc-500 mt-1">Prediksi RUL</div>
            </div>
            <div className="text-center border-x border-zinc-200">
              <div className="text-3xl font-extrabold text-zinc-900">RT</div>
              <div className="text-xs text-zinc-500 mt-1">Realtime Alert</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-zinc-900">↓</div>
              <div className="text-xs text-zinc-500 mt-1">Kurangi Downtime</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-400 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-20 px-6 bg-white border-y border-zinc-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">Fitur Utama</h2>
            <p className="text-zinc-600 max-w-2xl mx-auto">
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
      <section id="tentang" className="py-20 px-6 bg-linear-to-r from-blue-50 to-purple-50 border-y border-zinc-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">Tentang KIRA</h2>
            <p className="text-zinc-700 max-w-2xl mx-auto">
              KIRA menggunakan <span className="font-semibold">Deep Learning</span> untuk memprediksi <span className="font-semibold">Remaining Useful Life (RUL)</span> dengan akurat, membantu Anda mengambil keputusan maintenance yang tepat dan mengurangi biaya operasional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="p-8 rounded-2xl bg-white border border-zinc-200 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: "0s" }}>
              <div className="text-5xl mb-4">🎯</div>
              <h4 className="text-xl font-semibold text-zinc-900 mb-3">Prediksi Akurat (RUL)</h4>
              <p className="text-zinc-600">
                Prediksi sisa waktu pakai aset dengan akurasi tinggi untuk perencanaan maintenance yang lebih baik.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-zinc-200 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="text-5xl mb-4">⚡</div>
              <h4 className="text-xl font-semibold text-zinc-900 mb-3">Klasifikasi Otomatis</h4>
              <p className="text-zinc-600">
                Klasifikasi otomatis tingkat keparahan maintenance untuk prioritas pekerjaan yang lebih efektif.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-zinc-200 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="text-5xl mb-4">💰</div>
              <h4 className="text-xl font-semibold text-zinc-900 mb-3">Efisiensi Biaya</h4>
              <p className="text-zinc-600">
                Kurangi maintenance tak terencana dan hemat biaya operasional dengan strategi preventive yang tepat sasaran.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-zinc-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">Cara Kerja Sistem</h2>
            <p className="text-zinc-600 max-w-2xl mx-auto">
              Tiga langkah sederhana untuk mengoptimalkan manajemen aset Anda dengan kecerdasan buatan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <WorkflowCard number="1" title="Data Collection" description="Kumpulan data aset dari berbagai sumber - sensor, log maintenance, dan historical data" icon="📊" delay="0s" />
            <WorkflowCard number="2" title="AI Processing" description="Model ML menganalisis pola untuk memprediksi RUL dan mengidentifikasi anomali" icon="🤖" delay="0.15s" />
            <WorkflowCard number="3" title="Action Plan" description="Dapatkan rekomendasi maintenance dengan timeline spesifik untuk setiap aset" icon="✅" delay="0.3s" />
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="tim" className="py-20 px-6 bg-white border-t border-zinc-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">Tim Pengembang</h2>
            <p className="text-zinc-600 max-w-2xl mx-auto">
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
                className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 hover:shadow-lg transition-all hover:scale-105 text-center animate-slide-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="text-4xl mb-4">{member.avatar}</div>
                <h3 className="font-semibold text-zinc-900 text-sm md:text-base mb-2">{member.short}</h3>
                <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{member.name}</p>
                <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-medium">
                  Developer
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-zinc-500 text-sm border-t border-zinc-200 bg-zinc-50">
        <p>© 2026 Kira Systems. Designed for enterprise reliability.</p>
      </footer>

      {/* Floating demo button */}
      <DemoSimulator />
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode; title: string; description: string; delay: string }) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-100 hover:shadow-xl transition-shadow animate-slide-up" style={{ animationDelay: delay }}>
      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm border border-zinc-100">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 mb-2">{title}</h3>
      <p className="text-zinc-600 leading-relaxed">{description}</p>
    </div>
  );
}

function WorkflowCard({ number, title, description, icon, delay }: { number: string; title: string; description: string; icon: string; delay: string }) {
  return (
    <div className="relative p-8 rounded-2xl bg-white border border-zinc-200 hover:shadow-lg transition-all animate-slide-up" style={{ animationDelay: delay }}>
      <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
        {number}
      </div>
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-zinc-900 mb-3">{title}</h3>
      <p className="text-zinc-600 leading-relaxed">{description}</p>
    </div>
  );
}
