'use client';

import { useState, useEffect } from 'react';

export default function WelcomeHeader() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format date: "Senin, 17 Mei 2026"
  const dateStr = time ? new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(time) : '...';

  // Format time: "16:50"
  const timeStr = time ? new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(time).replace('.', ':') : '...';

  // Determine greeting based on time
  const hour = time ? time.getHours() : 12;
  let greeting = 'Selamat Datang';
  if (hour >= 5 && hour < 11) greeting = 'Selamat Pagi';
  else if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
  else greeting = 'Selamat Malam';

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
          {greeting}, Admin! 👋
        </h1>
        <p className="text-gray-500 mt-2 text-base md:text-lg">
          Berikut adalah ringkasan performa dan kondisi aset Anda hari ini.
        </p>
      </div>
      <div className="mt-4 md:mt-0 md:text-right bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 md:gap-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <p className="text-2xl font-bold text-blue-600 font-mono tracking-tight">
            {timeStr}
          </p>
        </div>
        <p className="text-sm text-gray-500 font-medium mt-1">
          {dateStr}
        </p>
      </div>
    </div>
  );
}
