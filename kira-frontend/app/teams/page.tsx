'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function TeamsPage() {
  const teamMembers = [
    {
      name: 'Yasmeen Almira',
      role: 'Frontend Developer',
      desc:
        'Designing and developing modern responsive interfaces and interactive frontend experiences for the KIRA platform.',
      image:
        '/yasmeen.jpg.jpeg',
    },

    {
      name: 'Mochamad Rifat Syahman Hambali',
      role: 'AI & Prediction Engineer',
      desc:
        'Developing AI prediction models, Remaining Useful Life analytics, and intelligent maintenance forecasting systems.',
      image:
        '/placeholder-team.png',
    },

    {
      name: 'Muhammad Dzaky Fauzan',
      role: 'Backend Developer',
      desc:
        'Building REST APIs, database architecture, authentication systems, and backend integrations.',
      image:
        '/placeholder-team.png',
    },

    {
      name: 'Muhammad Syukron Rizky Fadilla',
      role: 'Maintenance System Developer',
      desc:
        'Developing maintenance scheduling systems, monitoring workflows, and operational asset management features.',
      image:
       '/placeholder-team.png',
    },

    {
      name: 'Muhamad Gerraldy Ghassan Herfio',
      role: 'UI / UX Designer',
      desc:
        'Designing intuitive user experiences, wireframes, and modern visual systems for KIRA.',
      image:
        '/placeholder-team.png',
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  const activeMember = teamMembers[activeIndex];

  const nextSlide = () => {
    setActiveIndex((prev) =>
      prev === teamMembers.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setActiveIndex((prev) =>
      prev === 0 ? teamMembers.length - 1 : prev - 1
    );
  };

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden relative">

      {/* BG */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-black to-purple-900/10" />

      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">

        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* LOGO */}
          <a
            href="/"
            className="flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold">
              K
            </div>

            <span className="font-bold text-lg tracking-wide">
              KIRA
            </span>
          </a>

          {/* MENU */}
          <div className="flex items-center gap-5">

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
              className="px-5 py-2 rounded-full bg-white text-black text-sm font-medium hover:scale-105 transition"
            >
              Dashboard
            </a>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <section className="relative z-10 px-6 pt-32 pb-24">

        {/* HEADER */}
        <div className="max-w-4xl mx-auto text-center">

          <p className="text-blue-400 uppercase tracking-[0.35em] text-sm font-semibold">
            TEAM BEHIND KIRA
          </p>

          <h1 className="mt-6 text-5xl md:text-7xl font-black leading-tight">
            Meet Our Team
          </h1>

          <p className="mt-8 text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            A collaborative development team focused on building intelligent AI-powered asset management systems with modern SaaS technology.
          </p>
        </div>

        {/* MAIN PROFILE */}
        <div className="max-w-6xl mx-auto mt-24 grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT */}
          <div>

            <p className="text-blue-400 uppercase tracking-[0.3em] text-sm font-semibold">
              {activeMember.role}
            </p>

            <h2 className="text-5xl font-bold mt-6 leading-tight">
              {activeMember.name}
            </h2>

            <p className="text-gray-400 text-lg leading-relaxed mt-8 max-w-xl">
              {activeMember.desc}
            </p>

            {/* BUTTON */}
            <div className="flex items-center gap-4 mt-10">

              <button
                onClick={prevSlide}
                className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={nextSlide}
                className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* RIGHT */}
          <div className="relative">

            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-3xl rounded-[40px]" />

            <div className="relative rounded-[40px] overflow-hidden border border-white/10">

              <img
                src={activeMember.image}
                alt={activeMember.name}
                className="w-full h-[650px] object-cover"
              />
            </div>
          </div>
        </div>

        {/* AVATAR LIST */}
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-5 mt-20 flex-wrap">

          {teamMembers.map((member, index) => (

            <button
              key={member.name}
              onClick={() => setActiveIndex(index)}
              className={`transition-all duration-300 ${
                activeIndex === index
                  ? 'scale-110'
                  : 'opacity-50 hover:opacity-100'
              }`}
            >

              <img
                src={member.image}
                alt={member.name}
                className="w-16 h-16 rounded-2xl object-cover border border-white/10"
              />
            </button>
          ))}
        </div>

        {/* FOOTER */}
        <div className="text-center mt-24 border-t border-white/10 pt-10">

          <p className="text-gray-500 text-sm">
            © 2026 KIRA Systems — Intelligent Asset Management Platform
          </p>
        </div>
      </section>
    </main>
  );
}