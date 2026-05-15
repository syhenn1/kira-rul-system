'use client';

export default function TeamsPage() {
  const teamMembers = [
    {
      name: 'Mochamad Rifat Syahman Hambali',
      role: 'AI & Prediction Engineer',
      desc:
        'Developing AI prediction models and intelligent maintenance forecasting systems.',
      image:
        'https://i.pravatar.cc/400?img=12',
    },

    {
      name: 'Muhammad Dzaky Fauzan',
      role: 'Backend Developer',
      desc:
        'Building APIs, database architecture, and backend integrations.',
      image:
        'https://i.pravatar.cc/400?img=15',
    },

    {
      name: 'Muhamad Gerraldy Ghassan Herfio',
      role: 'UI / UX Designer',
      desc:
        'Designing intuitive user experiences and modern visual systems.',
      image:
        'https://i.pravatar.cc/400?img=68',
    },

    {
      name: 'Muhammad Syukron Rizky Fadilla',
      role: 'Maintenance System Developer',
      desc:
        'Developing maintenance scheduling and monitoring workflows.',
      image:
        'https://i.pravatar.cc/400?img=14',
    },

    {
      name: 'Yasmeen Almira',
      role: 'Frontend Developer',
      desc:
        'Designing and developing modern responsive interfaces for KIRA.',
      image: '/yasmeen.jpg.jpeg',
    },
  ];

  return (
    <main className="min-h-screen bg-[#09090B] text-white">

      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-xl">

        <div className="max-w-7xl mx-auto h-20 px-6 flex items-center justify-between">

          {/* LOGO */}
          <a
            href="/"
            className="flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-bold">
              K
            </div>

            <span className="text-2xl font-bold">
              KIRA
            </span>
          </a>

          {/* MENU */}
          <div className="flex items-center gap-8">

            <a
              href="/"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Home
            </a>

            <a
              href="/auth/login"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Login
            </a>

            <a
              href="/dashboard"
              className="px-6 py-2 rounded-full bg-white text-black text-sm font-semibold"
            >
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <section className="pt-36 pb-24 px-6">

        {/* HEADER */}
        <div className="max-w-3xl mx-auto text-center">

          <p className="uppercase tracking-[0.3em] text-sm text-white/40">
            TEAM BEHIND KIRA
          </p>

          <h1 className="mt-5 text-5xl font-bold">
            Meet Our Team
          </h1>

          <p className="mt-6 text-gray-400 text-lg leading-relaxed">
            A collaborative development team building intelligent AI-powered asset management systems with modern SaaS technology.
          </p>
        </div>

        {/* GRID */}
        <div className="max-w-6xl mx-auto mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">

          {teamMembers.map((member) => (

            <div
              key={member.name}
              className="w-full max-w-[320px] bg-white/[0.03] border border-white/10 rounded-[28px] overflow-hidden hover:-translate-y-2 transition-all duration-300"
            >

              {/* IMAGE */}
              <div className="w-full h-[320px] overflow-hidden">

                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* CONTENT */}
              <div className="p-6">

                <h2 className="text-2xl font-semibold leading-snug">
                  {member.name}
                </h2>

                <p className="mt-2 text-sm text-fuchsia-400 font-medium">
                  {member.role}
                </p>

                <p className="mt-4 text-gray-400 leading-relaxed text-sm">
                  {member.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-20 text-center">

          <p className="text-gray-500 text-sm">
            © 2026 KIRA Systems — Intelligent Asset Management Platform
          </p>
        </div>
      </section>
    </main>
  );
}