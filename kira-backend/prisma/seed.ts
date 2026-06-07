import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL || ''),
});

// ── helpers ──────────────────────────────────────────────────────────────────

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper untuk parsing angka format Indonesia (mengubah koma menjadi titik)
function parseIndoNum(str: string): number {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, '').replace(/,/g, '.')) || 0;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Membersihkan seluruh database...');
  await prisma.assetPredictionHistory.deleteMany({});
  await prisma.maintenanceLog.deleteMany({});
  await prisma.maintenance.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.gedung.deleteMany({});
  await prisma.technician.deleteMany({});
  await prisma.companyMember.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});
  
  await prisma.merk.deleteMany({});
  await prisma.kategori.deleteMany({});
  await prisma.subKategori.deleteMany({});
  await prisma.tipe.deleteMany({});

  const TODAY = new Date('2026-05-31T12:00:00Z');

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DATASET MENTAH (100% PERSIS DARI INPUT)
  // ──────────────────────────────────────────────────────────────────────────
  const rawDataset = `Sedang	3,0	20,0	9935000,0	8574000,0	211,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung Parkir	Critical	2123,8
Ringan	1,0	1,0	336000,0	336000,0	,0	Perkins	Mechanical	Genset	Genset Diesel	Gedung A	Critical	2194,7
Sedang	1,0	1,0	836000,0	836000,0	101,0	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Gedung C	Critical	2828,7
normal	,0	,0	,0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung Parkir	Minor	1874,8
normal	,0	,0	,0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Gedung Utama	Critical	1754,1
normal	,0	,0	,0	,0	,0	Import	Plumbing	Sanitari Sistem	Urinal	Gedung E	Minor	2402,9
Ringan	2,0	,0	4873000,0	4627000,0	25,0	Generic	Electrical	Signage Gedung	Lampu Neon Sign	Gedung B	Major	2449,1
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Signage Gedung	Lampu Backlit Sign	Gedung Servis	Critical	2385,8
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Gedung A	Major	2366,2
normal	,0	,0	,0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung A	Minor	1974,6
normal	,0	,0	,0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Gedung B	Major	2724,3
Berat	1,0	3,0	2089000,0	2089000,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Gedung E	Critical	1761,3
normal	,0	,0	,0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung Parkir	Critical	2329,0
Fatal	3,0	1,7	49751000,0	48974000,0	272,3	Panasonic	Mechanical	Tata Udara	AC Split	Gedung B	Major	2095,0
Berat	3,0	80,7	31323000,0	23330000,0	28,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung Utama	Major	2116,3
Sedang	2,0	,5	2203000,0	1769000,0	123,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung E	Major	2307,1
normal	,0	,0	,0	,0	,0	Import	Mechanical	Tata Udara	AHU	Gedung Utama	Major	2585,4
Sedang	2,0	,5	1757000,0	1099000,0	154,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Gedung Utama	Major	3030,5
Sedang	1,0	,0	1917000,0	1917000,0	140,0	Grundfos	Mechanical	Pompa	Pompa Transfer	Gedung C	Major	2781,2
Fatal	1,0	89,0	13127000,0	13127000,0	,0	Lokal	Security Sistem	Sistem Keamanan	Kick Bar	Gedung A	Critical	2657,6
Sedang	2,0	147,5	9467000,0	8192000,0	210,0	Generic	Electrical	Panel Distribusi	Panel UPS	Gedung C	Major	2730,2
normal	,0	,0	,0	,0	,0	Generic	Civil	Lantai Bangunan	Lantai Karpet	Gedung D	Minor	1677,1
normal	,0	,0	,0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung Parkir	Critical	2645,5
normal	,0	,0	,0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Gedung A	Major	1811,7
normal	,0	,0	,0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Gedung Parkir	Major	1650,5
Berat	1,0	,0	6551000,0	6551000,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung C	Critical	2513,3
Sedang	4,0	37,0	16646000,0	8535000,0	62,8	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Heat Detector	Gedung B	Minor	2123,5
normal	,0	,0	,0	,0	,0	Generic	Electrical	Panel Distribusi	LVMDP	Gedung Servis	Major	2637,0
Berat	1,0	239,0	3494000,0	3494000,0	,0	Lokal	Plumbing	Sanitari Sistem	Rooftank	Gedung E	Minor	1629,8
Ringan	6,0	21,3	49776000,0	42309000,0	49,5	Gree	Mechanical	Tata Udara	AC Split	Gedung Servis	Critical	2372,2
Sedang	5,0	7,2	9559000,0	7874000,0	109,4	Panasonic	Mechanical	Tata Udara	AC Cassette	Gedung Utama	Major	1962,0
Ringan	1,0	,0	437000,0	437000,0	,0	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Gedung Parkir	Minor	1803,6
normal	,0	,0	,0	,0	,0	Import	Electrical	Control Panel	Control Panel Hydrant Diesel Pump	Gedung Parkir	Minor	2085,9
Sedang	4,0	,8	11915000,0	9279000,0	142,3	Sharp	Mechanical	Tata Udara	AC Split	Gedung E	Critical	1679,2
Sedang	1,0	29,0	1098000,0	1098000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung E	Major	2661,5
Ringan	1,0	87,0	217000,0	217000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Gedung D	Minor	1800,8
normal	,0	,0	,0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Gedung C	Major	2115,5
Ringan	1,0	2,0	483000,0	483000,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung Parkir	Minor	2248,3
normal	,0	,0	,0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED	Gedung A	Major	2063,0
Ringan	1,0	,0	484000,0	484000,0	,0	Generic	Security Sistem	Sistem Keamanan	Access Control 	Gedung B	Major	2195,2
Sedang	1,0	,0	1147000,0	1147000,0	,0	LG	Mechanical	Tata Udara	AC Cassette	Gedung Utama	Major	2638,4
Ringan	1,0	,0	189000,0	189000,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Gedung C	Major	2888,1
normal	,0	,0	,0	,0	,0	Generic	Civil	Atap Bangunan	Atap Beton	Gedung C	Minor	2644,1
Sedang	1,0	,0	1062000,0	1062000,0	,0	Generic	Civil	Lantai Bangunan	Lantai Granit	Gedung D	Minor	2754,3
Ringan	2,0	,5	671000,0	499000,0	135,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Gedung E	Major	2575,1
Berat	4,0	81,8	39796000,0	24748000,0	117,0	Generic	Civil	Lantai Bangunan	Lantai Keramik	Gedung E	Major	2194,9
Sedang	3,0	58,7	8286000,0	7585000,0	131,7	Generic	Mechanical	Tata Udara	AC VRV	Gedung C	Critical	2690,5
normal	,0	,0	,0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung D	Critical	2340,7
normal	,0	,0	,0	,0	,0	Lokal	Mechanical	Tata Udara	AC VRV	Gedung Parkir	Major	1821,2
normal	,0	,0	,0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Wet Chemical	Gedung Parkir	Major	2395,9
Berat	1,0	,0	4652000,0	4652000,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung B	Minor	2984,0
normal	,0	,0	,0	,0	,0	Import	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Gedung A	Minor	2286,8
Ringan	2,0	90,5	435000,0	278000,0	79,5	Panasonic	Mechanical	Tata Udara	AC Cassette	Gedung B	Critical	2614,2
Sedang	2,0	88,5	977000,0	925000,0	237,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Gedung Servis	Major	2293,1
normal	,0	,0	,0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Gedung Utama	Minor	2672,9
Berat	1,0	,0	4052000,0	4052000,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Kotor	Gedung B	Major	1636,2
Sedang	1,0	3,0	1492000,0	1492000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung A	Minor	2051,3
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung Servis	Major	2829,3
Ringan	2,0	,5	3882000,0	3438000,0	221,5	Hikvision	Security Sistem	Sistem Pengawasan	Monitor CCTV	Gedung C	Major	2285,6
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung A	Major	2162,8
Berat	9,0	43,4	68836000,0	40869000,0	86,2	Panasonic	Mechanical	Tata Udara	AC Split	Gedung Parkir	Critical	2095,9
Sedang	2,0	1,0	10332000,0	8969000,0	270,5	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Gedung Parkir	Major	1950,7
Sedang	1,0	295,0	781000,0	781000,0	338,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Gedung D	Major	2787,8
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung Servis	Major	2556,1
normal	,0	,0	,0	,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Gedung Parkir	Minor	1807,1
normal	,0	,0	,0	,0	,0	Generic	Plumbing	Sanitari Sistem	Kloset	Gedung E	Major	2153,7
Sedang	6,0	2,0	17264000,0	9365000,0	125,5	Import	Sistem Pemadam Kebakaran	Fire Pump System	Diesel Fire Pump	Gedung Servis	Critical	2481,9
Fatal	2,0	,0	10346000,0	10004000,0	477,5	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung Servis	Critical	2549,6
normal	,0	,0	,0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Gedung Servis	Major	1810,5
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung Parkir	Minor	2456,1
normal	,0	,0	,0	,0	,0	Import	Electrical	Panel Distribusi	SDP	Gedung E	Minor	2199,9
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung B	Critical	2200,1
normal	,0	,0	,0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung Parkir	Major	2557,7
Sedang	2,0	,0	1748000,0	1554000,0	286,0	Notifier	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Gedung Utama	Minor	1997,5
normal	,0	,0	,0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Gedung A	Major	2562,8
Berat	1,0	,0	4229000,0	4229000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung A	Major	2328,1
Berat	7,0	81,1	22361000,0	6247000,0	55,9	Notifier	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Gedung Utama	Critical	2312,5
Ringan	2,0	60,0	6026000,0	5695000,0	312,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung E	Major	2934,2
Berat	1,0	1,0	7412000,0	7412000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung B	Major	2346,6
normal	,0	,0	,0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Gedung Utama	Major	2415,7
normal	,0	,0	,0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung D	Major	2134,1
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Generator Panel	Automatic Transfer Switch (ATS Panel)	Gedung D	Major	2660,8
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Panel Distribusi	SDP	Gedung Utama	Major	2078,3
Fatal	1,0	1,0	26480000,0	26480000,0	584,0	Panasonic	Mechanical	Tata Udara	AC Split	Gedung Utama	Major	1896,8
Ringan	1,0	,0	304000,0	304000,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung A	Major	1853,7
Sedang	4,0	8,3	20337000,0	9897000,0	212,5	Samsung	Mechanical	Tata Udara	AC Split	Gedung E	Critical	1714,6
normal	,0	,0	,0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Gedung Parkir	Critical	3165,1
Sedang	1,0	,0	1283000,0	1283000,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Gedung Parkir	Major	2440,3
Sedang	1,0	,0	1965000,0	1965000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung D	Major	1911,3
Fatal	1,0	3,0	22582000,0	22582000,0	,0	Generic	Distribusi Air	Distributor Air Bersih	Roof Tank	Gedung C	Minor	2572,5
normal	,0	,0	,0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Fire Pump System	Diesel Fire Pump	Gedung Servis	Minor	2458,7
normal	,0	,0	,0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Gedung Parkir	Critical	2139,7
Fatal	2,0	1,0	54723000,0	45501000,0	363,5	Gree	Mechanical	Tata Udara	AC Split	Gedung Parkir	Minor	1857,4
Ringan	1,0	,0	335000,0	335000,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	DVR CCTV	Gedung Parkir	Minor	2005,2
Sedang	8,0	57,8	13045000,0	7044000,0	89,5	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Gedung Servis	Critical	2037,3
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung B	Major	2500,0
Ringan	1,0	59,0	227000,0	227000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung Utama	Critical	2584,0
Berat	4,0	15,0	47058000,0	33456000,0	63,0	LG	Mechanical	Tata Udara	AC Split	Gedung Utama	Major	2442,4
normal	,0	,0	,0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Gedung D	Major	2580,6
Sedang	1,0	,0	1002000,0	1002000,0	,0	LG	Mechanical	Tata Udara	AC Split	Gedung Parkir	Minor	2522,8
normal	,0	,0	,0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung B	Minor	2388,8
Sedang	1,0	,0	1021000,0	1021000,0	,0	Wasser	Plumbing	Sanitari Sistem	Kran Air	Gedung Parkir	Minor	2072,8
Sedang	1,0	118,0	1071000,0	1071000,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Gedung A	Major	1933,3
Fatal	1,0	,0	42525000,0	42525000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung D	Minor	1961,5
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Control Panel	Control Panel Penerangan	Gedung Utama	Minor	1906,2
normal	,0	,0	,0	,0	,0	Generic	Civil	Lantai Bangunan	Lantai Granit	Gedung B	Minor	1857,0
normal	,0	,0	,0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Hydrant System	Valve Control	Gedung Utama	Critical	2511,9
Sedang	1,0	,0	974000,0	974000,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung Utama	Minor	2100,7
Berat	9,0	14,1	19768000,0	9019000,0	53,9	Panasonic	Mechanical	Tata Udara	AC Split	Gedung D	Major	1776,1
normal	,0	,0	,0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung Parkir	Minor	2218,2
normal	,0	,0	,0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung E	Major	2503,3
Berat	1,0	1,0	5926000,0	5926000,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung B	Major	2040,6
Ringan	8,0	33,8	4279000,0	1532000,0	103,9	Panasonic	Mechanical	Tata Udara	AC Cassette	Gedung Servis	Critical	2020,9
Sedang	1,0	,0	1334000,0	1334000,0	,0	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Gedung Servis	Major	1823,2
normal	,0	,0	,0	,0	,0	Lokal	Civil	Atap Bangunan	Atap Beton	Gedung A	Minor	2313,7
Ringan	1,0	,0	204000,0	204000,0	,0	LG	Mechanical	Tata Udara	AC Split	Gedung B	Minor	2557,5
normal	,0	,0	,0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Gedung Utama	Critical	2005,3
Ringan	2,0	15,0	4163000,0	3960000,0	4,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Gedung C	Major	2027,7
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung A	Major	2331,4
normal	,0	,0	,0	,0	,0	Generic	Security Sistem	Sistem Keamanan	Push Button	Gedung B	Critical	2094,9
normal	,0	,0	,0	,0	,0	Lokal	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Kotor	Gedung E	Minor	1987,9
Sedang	2,0	,0	10149000,0	9187000,0	471,0	Daikin	Mechanical	Tata Udara	AC Sentral	Gedung Servis	Minor	2112,9
Berat	1,0	2,0	8693000,0	8693000,0	,0	Generic	Distribusi Air	Distributor Air Bersih	Roof Tank	Gedung A	Major	2343,5
normal	,0	,0	,0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung C	Minor	2249,7
Sedang	1,0	1,0	927000,0	927000,0	474,0	Gree	Mechanical	Tata Udara	AC Split	Gedung Utama	Major	1776,1
Sedang	3,0	,7	2931000,0	1470000,0	209,7	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Gedung A	Major	2336,0
Ringan	1,0	,0	225000,0	225000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung D	Major	2918,2
Fatal	4,0	45,0	40826000,0	30137000,0	101,0	Lokal	Electrical	Signage Gedung	Lampu Pylon Sign	Gedung Servis	Minor	2052,9
normal	,0	,0	,0	,0	,0	Import	Electrical	Control Panel	Control Panel AC	Gedung Parkir	Major	1885,3
normal	,0	,0	,0	,0	,0	Import	Electrical	Panel Distribusi	Panel UPS	Gedung C	Major	2259,5
Berat	1,0	27,0	6719000,0	6719000,0	,0	LG	Mechanical	Tata Udara	AC Split	Gedung E	Minor	2253,5
normal	,0	,0	,0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Gedung D	Major	2255,7
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Control Panel	Control Panel Penerangan	Gedung Parkir	Minor	2030,3
Sedang	1,0	30,0	1050000,0	1050000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung B	Critical	2619,1
Sedang	2,0	,0	2381000,0	1950000,0	61,5	Cummins	Mechanical	Genset	Genset Diesel	Gedung A	Major	2425,0
normal	,0	,0	,0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Gedung E	Major	2158,1
Ringan	7,0	1,0	56222000,0	47669000,0	53,1	Sharp	Mechanical	Tata Udara	AC Split	Gedung D	Major	2408,6
normal	,0	,0	,0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Gedung B	Critical	3044,5
normal	,0	,0	,0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Gedung C	Minor	2337,4
Sedang	2,0	1,5	1996000,0	1598000,0	189,5	Lokal	Sistem Telekomunikasi Gedung	Sistem Jaringan Internet	LAN (Local Area Network)	Gedung D	Major	2577,7
normal	,0	,0	,0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung C	Major	2628,3
normal	,0	,0	,0	,0	,0	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung Utama	Critical	1879,1
Sedang	1,0	1,0	1986000,0	1986000,0	,0	Honeywell	Security Sistem	Sistem Pengawasan	DVR CCTV	Gedung Servis	Major	2244,8
Sedang	1,0	1,0	1992000,0	1992000,0	,0	Import	Plumbing	Sanitari Sistem	Kloset	Gedung Utama	Minor	1922,1
Berat	4,0	38,5	54034000,0	42413000,0	189,3	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung Servis	Minor	2676,5
normal	,0	,0	,0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung Parkir	Critical	3052,9
normal	,0	,0	,0	,0	,0	Generic	Sistem Proteksi Kebakaran Aktif	Sistem Alarm Kebakaran	Bell Alarm	Gedung Utama	Critical	2912,0
Berat	8,0	33,9	59033000,0	36954000,0	117,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Gedung B	Critical	2379,3
normal	,0	,0	,0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung E	Critical	2466,0
normal	,0	,0	,0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Gedung E	Critical	2232,2
Berat	1,0	1,0	4605000,0	4605000,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Gedung A	Minor	2496,2
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung Parkir	Critical	2275,4
normal	,0	,0	,0	,0	,0	Grundfos	Mechanical	Pompa	Pompa Air Tanah	Gedung Parkir	Minor	2319,6
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung C	Major	3018,6
Sedang	6,0	11,3	13931000,0	9613000,0	78,7	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Gedung Utama	Critical	2109,1
normal	,0	,0	,0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung E	Critical	2589,0
normal	,0	,0	,0	,0	,0	Generic	Sistem Proteksi Kebakaran Aktif	Sistem Alarm Kebakaran	MCFA	Gedung A	Major	1782,5
Ringan	5,0	54,4	63563000,0	37439000,0	113,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Gedung A	Minor	1920,4
Fatal	1,0	2,0	41962000,0	41962000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung Servis	Critical	2216,6
Sedang	4,0	1,0	3963000,0	1835000,0	49,0	Generic	Mechanical	Tata Udara	FCU	Gedung E	Major	1868,4
Ringan	1,0	,0	399000,0	399000,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung Servis	Major	2228,5
Sedang	6,0	10,5	13334000,0	9585000,0	75,3	Generic	Electrical	Generator Panel	Automatic Transfer Switch (ATS Panel)	Gedung E	Critical	2218,6
Sedang	1,0	,0	878000,0	878000,0	,0	Import	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung A	Minor	1981,6
Berat	1,0	3,0	6567000,0	6567000,0	,0	Import	Electrical	Control Panel	Panel PP-ME	Gedung A	Critical	2993,5
Berat	6,0	60,0	15700000,0	6757000,0	152,2	Ebara	Mechanical	Pompa	Pompa Boster	Gedung Servis	Critical	2868,8
Sedang	1,0	1,0	1125000,0	1125000,0	,0	Import	Plumbing	Sanitari Sistem	Floor Drain	Gedung A	Minor	2838,1
Berat	3,0	1,3	13044000,0	8849000,0	105,0	Samsung	Mechanical	Tata Udara	AC Split	Gedung D	Major	1803,2
normal	,0	,0	,0	,0	,0	Import	Mechanical	Tata Udara	FCU	Gedung D	Major	2081,8
normal	,0	,0	,0	,0	,0	Import	Mechanical	Tata Udara	FCU	Gedung Servis	Major	2835,7
normal	,0	,0	,0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung C	Major	2249,3
normal	,0	,0	,0	,0	,0	Grundfos	Mechanical	Pompa	Pompa Boster	Gedung Utama	Minor	1958,7
normal	,0	,0	,0	,0	,0	Import	Plumbing	Sanitari Sistem	Urinal	Gedung B	Major	2433,3
Berat	3,0	2,3	9703000,0	5166000,0	128,7	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung D	Critical	1943,5
Ringan	4,0	155,0	25987000,0	24915000,0	198,0	Import	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung Utama	Critical	2374,7
Berat	1,0	,0	8090000,0	8090000,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Gedung C	Minor	2186,1
Ringan	1,0	1,0	215000,0	215000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Batu Alam	Gedung B	Minor	2237,3
Sedang	3,0	30,0	2621000,0	1606000,0	218,0	Generic	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung E	Minor	2736,8
normal	,0	,0	,0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung C	Critical	2139,8
Berat	1,0	1,0	7776000,0	7776000,0	,0	Import	Mechanical	Tata Udara	FCU	Gedung D	Critical	2617,5
Berat	2,0	1,0	13402000,0	9380000,0	157,0	Generic	Plumbing	Sanitari Sistem	Jet Shower	Gedung Servis	Minor	2213,1
Fatal	2,0	119,5	57310000,0	48970000,0	50,0	Generic	Electrical	Signage Gedung	Lampu Pylon Sign	Gedung C	Critical	1939,4
Ringan	4,0	,8	14868000,0	8106000,0	87,8	Daikin	Mechanical	Tata Udara	AC Split	Gedung A	Critical	2199,2
normal	,0	,0	,0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu TL LED	Gedung C	Minor	2520,5
normal	,0	,0	,0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Gedung C	Critical	2345,5
Berat	1,0	,0	8326000,0	8326000,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Gedung D	Minor	1648,2
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung B	Major	1989,1
normal	,0	,0	,0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Gedung Parkir	Critical	2820,8
normal	,0	,0	,0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu LED Downlight	Gedung A	Critical	2353,6
Berat	1,0	2,0	6272000,0	6272000,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung C	Major	2265,6
normal	,0	,0	,0	,0	,0	LG	Security Sistem	Sistem Pengawasan	Monitor CCTV	Gedung Utama	Critical	1898,9
Sedang	2,0	1,0	1683000,0	1213000,0	217,5	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Gedung Servis	Major	2741,7
Berat	3,0	10,7	16729000,0	9863000,0	59,3	Panasonic	Mechanical	Tata Udara	AC Split	Gedung D	Major	2939,1
Ringan	2,0	106,5	9445000,0	9035000,0	50,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung D	Critical	1983,4
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu TL	Gedung E	Major	2007,7
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Downlight	Gedung C	Minor	1908,7
Sedang	1,0	89,0	360000,0	360000,0	,0	Generic	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung A	Major	2731,0
Sedang	2,0	3,0	1627000,0	1218000,0	94,5	Samsung	Security Sistem	Sistem Pengawasan	Monitor CCTV	Gedung B	Critical	2804,3
Sedang	1,0	,0	1666000,0	1666000,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung Servis	Major	2227,7
normal	,0	,0	,0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung Parkir	Major	2574,1
normal	,0	,0	,0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Gedung Parkir	Major	1898,8
Ringan	2,0	,0	705000,0	359000,0	417,5	Panasonic	Mechanical	Tata Udara	AC Split	Gedung A	Major	1967,4
normal	,0	,0	,0	,0	,0	Lokal	Mechanical	Sewage Treatment Plant	Commercial STP	Gedung Utama	Critical	2147,5
normal	,0	,0	,0	,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung Servis	Major	2089,4
normal	,0	,0	,0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung B	Critical	2002,3
normal	,0	,0	,0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Gedung D	Critical	1954,9
normal	,0	,0	,0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung Parkir	Critical	2496,7
Sedang	2,0	30,0	3760000,0	1993000,0	97,5	Samsung	Mechanical	Tata Udara	AC Split	Gedung B	Minor	1782,9
normal	,0	,0	,0	,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung D	Major	3077,8
Sedang	9,0	14,2	13680000,0	5857000,0	90,8	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung Servis	Major	2738,5
Fatal	2,0	2,0	39715000,0	39327000,0	290,5	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Gedung D	Critical	3016,7
normal	,0	,0	,0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Gedung A	Major	2237,0
normal	,0	,0	,0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung Parkir	Major	1827,6
normal	,0	,0	,0	,0	,0	Onda	Plumbing	Sanitari Sistem	Kran Air	Gedung Parkir	Major	2490,1
normal	,0	,0	,0	,0	,0	Import	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung B	Major	2348,5
Sedang	4,0	1,3	4583000,0	1950000,0	138,8	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung B	Major	2189,6
Ringan	6,0	30,2	2225000,0	857000,0	135,2	LG	Mechanical	Tata Udara	AC Cassette	Gedung C	Minor	2569,0
Ringan	1,0	237,0	186000,0	186000,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung B	Major	2499,6
Berat	1,0	,0	3463000,0	3463000,0	,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Gedung Utama	Minor	2271,6
normal	,0	,0	,0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Gedung E	Major	1771,4
Ringan	4,0	,8	17364000,0	9018000,0	183,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung C	Minor	2097,1
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Control Panel	Control Panel Penerangan	Gedung Servis	Critical	2552,7
Sedang	4,0	30,0	5764000,0	1949000,0	65,8	Daikin	Mechanical	Tata Udara	AC Split	Gedung E	Major	2371,2
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Signage Gedung	Lampu Pylon Sign	Gedung Utama	Minor	1894,5
normal	,0	,0	,0	,0	,0	Siemens	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Gedung Servis	Major	1915,8
Ringan	1,0	2,0	376000,0	376000,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung E	Minor	2505,4
Fatal	2,0	,5	22990000,0	22624000,0	307,5	Import	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung Utama	Major	1741,5
Berat	1,0	2,0	3427000,0	3427000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung A	Minor	2987,4
Berat	1,0	117,0	4551000,0	4551000,0	,0	Lokal	Arsitektur	Interior Gedung	Meja kerja	Gedung Parkir	Major	2189,6
normal	,0	,0	,0	,0	,0	Generic	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung Utama	Minor	2158,7
normal	,0	,0	,0	,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Gedung E	Major	1688,5
Ringan	2,0	,5	5688000,0	5484000,0	207,5	Lokal	Sistem Proteksi Kebakaran Aktif	Sistem Alarm Kebakaran	Bell Alarm	Gedung A	Major	3255,2
Sedang	2,0	89,0	1948000,0	1568000,0	424,0	Import	Electrical	Lampu Penerangan	Lampu LED	Gedung Utama	Major	2481,4
Fatal	2,0	118,5	21325000,0	19549000,0	248,5	Lokal	Plumbing	Sanitari Sistem	Kloset	Gedung B	Major	2404,7
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Interior Gedung	Meja kerja	Gedung Utama	Major	2092,9
Fatal	1,0	121,0	32968000,0	32968000,0	,0	Ina	Plumbing	Sanitari Sistem	Wastafel	Gedung B	Major	2122,4
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Gedung Servis	Minor	2447,3
Berat	7,0	89,0	24942000,0	8357000,0	122,7	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung D	Major	2290,3
normal	,0	,0	,0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Gedung B	Major	2489,6
Sedang	4,0	52,5	9203000,0	6660000,0	176,5	Generic	Electrical	Lampu Penerangan	Lampu LED Bulb	Gedung Parkir	Major	2016,0
normal	,0	,0	,0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu TL LED	Gedung D	Major	2136,3
Sedang	1,0	,0	405000,0	405000,0	,0	Import	Plumbing	Sanitari Sistem	Urinal	Gedung Utama	Minor	2228,2
normal	,0	,0	,0	,0	,0	Import	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung C	Minor	2980,0
normal	,0	,0	,0	,0	,0	Ina	Plumbing	Sanitari Sistem	Wastafel	Gedung Servis	Critical	2504,5
Fatal	1,0	,0	24284000,0	24284000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung Utama	Minor	2392,4
Sedang	1,0	1,0	1098000,0	1098000,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung A	Minor	1740,7
Sedang	1,0	237,0	394000,0	394000,0	116,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Bulb	Gedung C	Major	2351,6
normal	,0	,0	,0	,0	,0	Generic	Sistem Pemadam Kebakaran	Hydrant System	Valve Control	Gedung Utama	Critical	1589,2
Sedang	1,0	,0	1781000,0	1781000,0	,0	Generic	Plumbing	Sanitari Sistem	Kloset	Gedung Parkir	Minor	2597,4
Sedang	1,0	,0	940000,0	940000,0	,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Gedung B	Major	2340,4
Sedang	3,0	,7	2721000,0	1845000,0	85,0	Generic	Mechanical	Pompa	Pompa Chiller Water Sekunder	Gedung D	Major	2558,5
Sedang	5,0	24,0	6785000,0	1699000,0	180,8	Generic	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung Utama	Critical	2375,7
normal	,0	,0	,0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Gedung B	Major	2306,0
normal	,0	,0	,0	,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung Utama	Major	2089,6
normal	,0	,0	,0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Gedung B	Major	2238,1
normal	,0	,0	,0	,0	,0	Import	Arsitektur	Interior Gedung	Kursi	Gedung C	Major	2272,5
Ringan	2,0	1,5	718000,0	476000,0	28,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung D	Critical	1942,1
Sedang	9,0	24,1	56165000,0	49589000,0	109,9	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Gedung Utama	Critical	1999,6
normal	,0	,0	,0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Gedung Servis	Major	2089,3
Sedang	1,0	,0	1738000,0	1738000,0	,0	Toto	Plumbing	Sanitari Sistem	Wastafel	Gedung Parkir	Major	2283,6
Ringan	1,0	2,0	159000,0	159000,0	,0	American Standard	Plumbing	Sanitari Sistem	Wastafel	Gedung C	Major	2884,4
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung Servis	Minor	2173,9
Ringan	6,0	29,5	20469000,0	9258000,0	123,2	Lokal	Plumbing	Sanitari Sistem	Rooftank	Gedung A	Critical	2645,3
normal	,0	,0	,0	,0	,0	Import	Distribusi Air	Distributor Air Bersih	Ground Water Tank	Gedung A	Critical	2189,6
Berat	1,0	60,0	8764000,0	8764000,0	,0	Import	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung E	Major	1667,7
normal	,0	,0	,0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung B	Major	2429,9
normal	,0	,0	,0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Gedung Servis	Critical	3035,3
normal	,0	,0	,0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Video Wall	Gedung A	Minor	1933,7
Sedang	2,0	17,5	3031000,0	1921000,0	28,0	Lokal	Sistem Pemadam Kebakaran	Hydrant System	Selang Hidrant	Gedung A	Critical	1812,0
Ringan	2,0	14,5	339000,0	251000,0	177,0	Generic	Plumbing	Sanitari Sistem	Kloset	Gedung A	Major	2890,4
Sedang	4,0	,3	11036000,0	9016000,0	226,5	Import	Arsitektur	Interior Gedung	Lemari/Loker	Gedung E	Major	2526,6
Sedang	1,0	32,0	1218000,0	1218000,0	331,0	Generic	Electrical	Lampu Penerangan	Lampu TL	Gedung Utama	Minor	2597,3
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Bulb	Gedung B	Major	1586,1
normal	,0	,0	,0	,0	,0	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Gedung Servis	Major	2035,2
Berat	2,0	60,0	3963000,0	2088000,0	81,5	Lokal	Plumbing	Sanitari Sistem	Jet Shower	Gedung D	Major	2446,8
Sedang	3,0	1,3	12123000,0	9516000,0	292,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Downlight	Gedung Servis	Major	2636,2
normal	,0	,0	,0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED Downlight	Gedung D	Major	1962,7
normal	,0	,0	,0	,0	,0	Generic	Distribusi Air	Distributor Air Bersih	Roof Tank	Gedung Parkir	Major	2373,6
Ringan	3,0	10,3	2423000,0	1859000,0	87,7	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung A	Major	2314,7
Berat	1,0	,0	7514000,0	7514000,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung Parkir	Minor	2090,6
Berat	3,0	81,0	9674000,0	5356000,0	167,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung C	Critical	1812,4
Sedang	3,0	70,0	2964000,0	1153000,0	193,3	Sharp	Mechanical	Tata Udara	AC Split	Gedung E	Critical	2222,2
normal	,0	,0	,0	,0	,0	Import	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Gedung C	Critical	2200,7
normal	,0	,0	,0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung Parkir	Critical	1658,5
normal	,0	,0	,0	,0	,0	Import	Plumbing	Sanitari Sistem	Kloset	Gedung C	Minor	2507,1
Ringan	4,0	29,8	1794000,0	1044000,0	209,5	American Standard	Plumbing	Sanitari Sistem	Wastafel	Gedung D	Minor	1810,8
normal	,0	,0	,0	,0	,0	Deutz	Mechanical	Genset	Genset Diesel	Gedung B	Critical	2622,8
Ringan	3,0	30,0	1671000,0	931000,0	13,3	Onda	Plumbing	Sanitari Sistem	Kran Air	Gedung A	Major	2044,8
normal	,0	,0	,0	,0	,0	Generic	Electrical	Transformator (Trafo)	Trafo IT UPS	Gedung A	Critical	2744,2
Sedang	1,0	177,0	723000,0	723000,0	,0	Generic	Civil	Atap Bangunan	Atap Seng	Gedung C	Minor	2554,2
Ringan	1,0	,0	492000,0	492000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung B	Major	1839,6
Sedang	1,0	1,0	370000,0	370000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung C	Major	2010,9
Sedang	3,0	30,3	6229000,0	4185000,0	193,7	Generic	Electrical	Lampu Penerangan	Lampu TL	Gedung A	Major	2200,8
Sedang	4,0	,8	4098000,0	1244000,0	125,5	Import	Electrical	Lampu Penerangan	Lampu UV	Gedung Utama	Major	2110,6
Berat	1,0	89,0	1838000,0	1838000,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Gedung Servis	Major	1822,7
normal	,0	,0	,0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Gedung Servis	Critical	2325,6
Ringan	1,0	,0	239000,0	239000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung B	Major	2154,5
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung E	Major	3011,1
normal	,0	,0	,0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung Parkir	Major	2006,7
normal	,0	,0	,0	,0	,0	LG	Mechanical	Tata Udara	AC Cassette	Gedung C	Major	1851,9
Ringan	1,0	1,0	50000,0	50000,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Gedung Parkir	Minor	1946,1
normal	,0	,0	,0	,0	,0	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung C	Minor	1975,6
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung E	Minor	2208,7
Ringan	3,0	,3	4882000,0	4435000,0	157,3	Lokal	Mechanical	Tata Udara	Air Purifier	Gedung Servis	Major	2064,1
Fatal	5,0	47,6	47072000,0	35451000,0	72,4	Lokal	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung D	Major	2653,0
Sedang	1,0	1,0	897000,0	897000,0	,0	Lokal	Arsitektur	Interior Gedung	Meja kerja	Gedung A	Minor	1819,1
Sedang	2,0	59,0	1640000,0	952000,0	16,5	Generic	Electrical	Backup Power System	Uninterruptible Power Supply	Gedung B	Major	1699,0
Sedang	2,0	15,5	1779000,0	1527000,0	98,5	Import	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Gedung A	Major	2569,7
Sedang	4,0	1,3	6389000,0	3629000,0	240,8	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung B	Critical	1919,9
Sedang	1,0	237,0	1887000,0	1887000,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Gedung Servis	Minor	2652,9
normal	,0	,0	,0	,0	,0	Onda	Plumbing	Sanitari Sistem	Kran Air	Gedung D	Minor	2174,9
Ringan	1,0	1,0	78000,0	78000,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Gedung C	Minor	2840,1
normal	,0	,0	,0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung Utama	Critical	1945,7
Sedang	6,0	6,0	10618000,0	6256000,0	123,3	Generic	Electrical	Lampu Penerangan	Lampu LED Bulb	Gedung C	Critical	2221,0
normal	,0	,0	,0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Gedung Parkir	Minor	2008,2
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Interior Gedung	Meja kerja	Gedung E	Minor	3252,5
Sedang	4,0	1,0	10373000,0	8777000,0	235,3	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung D	Critical	2959,8
normal	,0	,0	,0	,0	,0	Generic	Civil	Lantai Bangunan	Lantai Batu	Gedung D	Minor	2317,5
normal	,0	,0	,0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED Downlight	Gedung Parkir	Critical	1746,8
Sedang	5,0	47,8	4611000,0	1765000,0	103,2	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Gedung E	Major	1750,5
normal	,0	,0	,0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung E	Major	1752,8
Ringan	20,0	29,4	94032000,0	25022000,0	44,5	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung B	Critical	2784,7
normal	,0	,0	,0	,0	,0	Generic	Electrical	Panel Distribusi	SDP	Gedung D	Minor	2386,1
Sedang	1,0	89,0	1834000,0	1834000,0	,0	Generic	Civil	Lantai Bangunan	Lantai Keramik	Gedung Utama	Minor	2463,3
Sedang	4,0	15,8	23435000,0	21238000,0	162,8	Generic	Plumbing	Sanitari Sistem	Jet Shower	Gedung Servis	Critical	2145,6
normal	,0	,0	,0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Gedung Utama	Critical	2822,8
normal	,0	,0	,0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung Parkir	Critical	2675,0
Ringan	1,0	1,0	187000,0	187000,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung A	Minor	2300,3
Sedang	1,0	31,0	1916000,0	1916000,0	,0	Generic	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung B	Minor	2817,4
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung A	Major	2511,0
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung A	Minor	2186,2
normal	,0	,0	,0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu TL	Gedung Servis	Major	2437,6
normal	,0	,0	,0	,0	,0	Generic	Civil	Dinding Bangunan	Dinding Kaca Non Tempered	Gedung E	Major	2261,5
normal	,0	,0	,0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Speaker	Gedung E	Major	2075,9
Fatal	2,0	,0	31849000,0	30236000,0	285,0	Generic	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung Parkir	Minor	2694,9
Berat	1,0	1,0	7857000,0	7857000,0	,0	Lokal	Sistem Proteksi Kebakaran Aktif	Sistem Alarm Kebakaran	Bell Alarm	Gedung Utama	Critical	2612,9
normal	,0	,0	,0	,0	,0	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Gedung B	Critical	1820,8
Sedang	5,0	59,8	10461000,0	7529000,0	178,4	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung Utama	Critical	1984,6
Sedang	3,0	,7	3072000,0	1900000,0	304,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung Servis	Critical	2297,9
Sedang	3,0	50,3	30162000,0	28203000,0	30,0	Generic	Civil	Dinding Bangunan	Dinding Batu Alam	Gedung D	Minor	2444,6
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Panel Distribusi	MDP	Gedung B	Minor	1845,2
Fatal	1,0	2,0	24063000,0	24063000,0	,0	Import	Pencatatan Meter	Meter KWH 	Meter PLN	Gedung C	Minor	2677,6
Ringan	1,0	,0	470000,0	470000,0	,0	Generic	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Speaker	Gedung Parkir	Major	1730,0
Berat	1,0	1,0	5433000,0	5433000,0	,0	Import	Distribusi Air	Distributor Air Bersih	PAM	Gedung C	Minor	1790,5
Sedang	6,0	11,0	5062000,0	1785000,0	149,5	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung C	Critical	1732,7
Sedang	1,0	2,0	1039000,0	1039000,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung Parkir	Major	2246,5
Berat	1,0	87,0	7505000,0	7505000,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung B	Minor	1758,9
Fatal	3,0	59,0	38309000,0	36337000,0	258,0	LG	Mechanical	Tata Udara	AC Split	Gedung E	Critical	1809,8
Sedang	1,0	1,0	1822000,0	1822000,0	,0	Generic	Electrical	Signage Gedung	Lampu Neon Sign	Gedung C	Minor	1802,8
normal	,0	,0	,0	,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Gedung E	Minor	2101,0
Sedang	1,0	1,0	1890000,0	1890000,0	,0	Lokal	Arsitektur	Exterior Gedung	Pagar Besi	Gedung D	Minor	2295,3
Sedang	1,0	,0	1197000,0	1197000,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung B	Minor	3174,0
Berat	1,0	2,0	5008000,0	5008000,0	,0	Generic	Civil	Dinding Bangunan	Dinding Partisi, GRC / Gypsum	Gedung Parkir	Minor	2078,1
Ringan	1,0	,0	394000,0	394000,0	,0	Generic	Arsitektur	Pintu dan Jendela	Kusen Jendela Berbahan Kayu	Gedung D	Minor	2105,2
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Interior Gedung	Kursi	Gedung E	Minor	1984,9
normal	,0	,0	,0	,0	,0	Import	Plumbing	Sanitari Sistem	Jet Shower	Gedung E	Minor	2089,1
normal	,0	,0	,0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Standing	Gedung D	Major	2122,6
Ringan	3,0	2,0	4118000,0	3639000,0	40,7	Sharp	Mechanical	Tata Udara	AC Split	Gedung D	Major	2977,9
normal	,0	,0	,0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung D	Minor	1722,9
Sedang	2,0	87,5	860000,0	467000,0	414,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Gedung C	Major	2574,0
Sedang	1,0	,0	934000,0	934000,0	,0	Notifier	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Gedung Parkir	Major	1767,4
Ringan	2,0	31,0	9122000,0	8686000,0	167,5	Import	Security Sistem	Sistem Keamanan	Push Button	Gedung Utama	Critical	2774,6
normal	,0	,0	,0	,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung A	Major	2855,6
normal	,0	,0	,0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung Utama	Critical	2608,0
normal	,0	,0	,0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Gedung A	Major	2293,6
Sedang	1,0	1,0	1419000,0	1419000,0	,0	Import	Distribusi Air	Distributor Air Bersih	Roof Tank	Gedung A	Major	2094,9
normal	,0	,0	,0	,0	,0	Generic	Civil	Lantai Bangunan	Lantai Beton	Gedung E	Critical	1896,4
Sedang	4,0	54,0	14968000,0	7604000,0	91,3	Generic	Electrical	Lampu Penerangan	Lampu LED Bulb	Gedung Servis	Critical	2076,4
Sedang	1,0	2,0	1799000,0	1799000,0	23,0	Import	Electrical	Control Panel	Control Panel AC	Gedung E	Minor	1975,5
Sedang	1,0	1,0	322000,0	322000,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Gedung B	Minor	2010,6
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Rolling Door	Gedung D	Minor	2164,7
normal	,0	,0	,0	,0	,0	Import	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Gedung D	Major	2081,4
Ringan	4,0	,8	9226000,0	7135000,0	186,0	Import	Electrical	Backup Power System	Uninterruptible Power Supply	Gedung B	Major	2105,1
normal	,0	,0	,0	,0	,0	Notifier	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Gedung C	Major	3147,5
normal	,0	,0	,0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	DVR CCTV	Gedung B	Major	1961,5
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Interior Gedung	Lemari/Loker	Gedung A	Major	2007,6
Sedang	1,0	90,0	701000,0	701000,0	,0	Perkins	Mechanical	Genset	Genset Diesel	Gedung Parkir	Major	2683,5
normal	,0	,0	,0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung Servis	Critical	1762,9
Sedang	1,0	1,0	612000,0	612000,0	,0	Lokal	Electrical	Transformator (Trafo)	Trafo IT UPS	Gedung B	Major	2568,2
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung D	Critical	1919,7
normal	,0	,0	,0	,0	,0	Lokal	Distribusi Air	Distributor Air Bersih	Ground Water Tank	Gedung Servis	Minor	2049,2
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Interior Gedung	Lemari/Loker	Gedung B	Minor	2939,4
normal	,0	,0	,0	,0	,0	Import	Electrical	Control Panel	Control Panel Penerangan	Gedung Servis	Major	1857,8
normal	,0	,0	,0	,0	,0	Import	Plumbing	Sanitari Sistem	Jet Shower	Gedung A	Minor	2158,6
Sedang	1,0	,0	1244000,0	1244000,0	,0	Toto	Plumbing	Sanitari Sistem	Wastafel	Gedung D	Major	1693,8
normal	,0	,0	,0	,0	,0	Import	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung E	Major	2157,2
Sedang	1,0	178,0	752000,0	752000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung Parkir	Minor	2506,3
normal	,0	,0	,0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Gedung Servis	Critical	2489,8
normal	,0	,0	,0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung A	Critical	2335,9
Ringan	1,0	1,0	223000,0	223000,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung E	Critical	2084,1
Ringan	1,0	2,0	355000,0	355000,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung Utama	Minor	1968,8
normal	,0	,0	,0	,0	,0	Import	Civil	Lantai Bangunan	Lantai Granit	Gedung Utama	Minor	2343,9
normal	,0	,0	,0	,0	,0	Perkins	Mechanical	Genset	Genset Diesel	Gedung Utama	Critical	2132,1
normal	,0	,0	,0	,0	,0	Import	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Gedung D	Major	2090,6
normal	,0	,0	,0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Gedung A	Critical	2431,3
normal	,0	,0	,0	,0	,0	Import	Electrical	Signage Gedung	Lampu Neon Sign	Gedung D	Major	2457,6
normal	,0	,0	,0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Gedung D	Major	1781,5
normal	,0	,0	,0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Gedung B	Minor	2074,5
Ringan	4,0	15,0	13796000,0	12611000,0	152,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung A	Critical	1889,7
Sedang	1,0	,0	766000,0	766000,0	,0	Import	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Gedung Servis	Minor	2089,3
Ringan	1,0	1,0	425000,0	425000,0	,0	Import	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung Parkir	Minor	2819,9
normal	,0	,0	,0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Gedung D	Major	2461,1
Sedang	1,0	,0	1546000,0	1546000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung C	Major	2481,9
Sedang	1,0	1,0	532000,0	532000,0	,0	Import	Civil	Dinding Bangunan	Dinding Partisi, GRC / Gypsum	Gedung Utama	Minor	2640,3
Berat	1,0	30,0	6882000,0	6882000,0	,0	Generic	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung B	Major	1659,2
Ringan	1,0	2,0	172000,0	172000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Partisi, GRC / Gypsum	Gedung A	Minor	2413,7
normal	,0	,0	,0	,0	,0	Lokal	Pencatatan Meter	Meter Air Bersih	Meter PDAM	Gedung E	Minor	2154,8
Berat	1,0	1,0	4512000,0	4512000,0	,0	Import	Plumbing	Sanitari Sistem	Kloset	Gedung Parkir	Minor	1973,1
Ringan	6,0	30,5	24545000,0	17415000,0	151,7	Generic	Security Sistem	Sistem Keamanan	Fingerprint	Gedung B	Major	2141,7
Ringan	2,0	3,0	8921000,0	8488000,0	18,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Gedung Parkir	Critical	2496,4
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Interior Gedung	Meja kerja	Gedung A	Minor	1997,8
Ringan	3,0	,7	3356000,0	3020000,0	255,0	Generic	Arsitektur	Interior Gedung	Meja kerja	Gedung Utama	Major	2341,6
Ringan	1,0	,0	278000,0	278000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung Parkir	Minor	1836,5
normal	,0	,0	,0	,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung Servis	Major	2474,1
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Besi	Gedung D	Major	2419,0
Sedang	1,0	1,0	594000,0	594000,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	DVR CCTV	Gedung Parkir	Critical	1587,2
Ringan	2,0	60,5	371000,0	306000,0	74,0	Import	Electrical	Transformator (Trafo)	Trafo IT UPS	Gedung B	Critical	2513,2
Ringan	1,0	1,0	355000,0	355000,0	,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Gedung A	Minor	2180,2
Ringan	4,0	,5	1904000,0	1084000,0	76,8	Lokal	Electrical	Lampu Penerangan	Lampu Downlight	Gedung Servis	Major	2126,2
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Rolling Door	Gedung Servis	Major	2440,3
Sedang	3,0	1,3	10676000,0	9057000,0	155,0	Import	Security Sistem	Sistem Keamanan	Fingerprint	Gedung B	Critical	2265,8
Fatal	3,0	1,0	41905000,0	30932000,0	347,0	Toto	Plumbing	Sanitari Sistem	Kran Air	Gedung Servis	Major	2098,6
Sedang	2,0	1,0	10897000,0	9861000,0	140,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung Parkir	Critical	2302,6
Sedang	7,0	38,9	16077000,0	6802000,0	99,4	Lokal	Plumbing	Sanitari Sistem	Kloset	Gedung B	Major	1736,5
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Interior Gedung	Kursi	Gedung B	Minor	2094,7
Ringan	1,0	,0	98000,0	98000,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	DVR CCTV	Gedung B	Major	2303,3
normal	,0	,0	,0	,0	,0	Import	Civil	Dinding Bangunan	Dinding Partisi, GRC / Gypsum	Gedung E	Minor	2439,2
normal	,0	,0	,0	,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Gedung A	Major	2365,1
normal	,0	,0	,0	,0	,0	Import	Electrical	Signage Gedung	Lampu Neon Sign	Gedung E	Minor	1988,5
Sedang	6,0	,3	40636000,0	36625000,0	55,2	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung D	Major	1826,5
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung D	Major	2344,0
normal	,0	,0	,0	,0	,0	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Gedung Utama	Critical	2137,6
normal	,0	,0	,0	,0	,0	Wasser	Plumbing	Sanitari Sistem	Kran Air	Gedung A	Major	2038,5
Sedang	10,0	12,5	33569000,0	9500000,0	55,4	Import	Sistem Telekomunikasi Gedung	Telephone System	PABX	Gedung B	Major	3086,8
Ringan	1,0	88,0	385000,0	385000,0	,0	Lokal	Arsitektur	Tata Lingkungan	Paving Block	Gedung Parkir	Minor	1685,4
Sedang	10,0	16,4	37725000,0	30698000,0	104,0	Lokal	Electrical	Lampu Penerangan	Lampu TL LED	Gedung B	Critical	1864,9
Berat	1,0	,0	3761000,0	3761000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Gedung B	Major	2227,2
normal	,0	,0	,0	,0	,0	Import	Electrical	Panel Distribusi	LVMDP	Gedung Parkir	Minor	2917,6
Ringan	9,0	74,0	17626000,0	14078000,0	112,2	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung Parkir	Critical	2042,9
normal	,0	,0	,0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu TL LED	Gedung C	Major	2850,4
Berat	1,0	146,0	5007000,0	5007000,0	,0	Generic	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung Parkir	Minor	3239,6
Sedang	2,0	,0	11501000,0	9753000,0	31,0	Daikin	Mechanical	Tata Udara	AC Split	Gedung C	Major	2189,1
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung C	Major	1832,0
Ringan	2,0	1,5	5812000,0	5640000,0	1,5	Lokal	Arsitektur	Interior Gedung	Kursi	Gedung B	Minor	1674,4
normal	,0	,0	,0	,0	,0	Import	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung D	Major	2108,6
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Interior Gedung	Meja kerja	Gedung D	Minor	2092,5
normal	,0	,0	,0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu TL LED	Gedung Utama	Major	1809,3
normal	,0	,0	,0	,0	,0	Import	Arsitektur	Pintu dan Jendela	Kusen Jendela Berbahan Alumunium	Gedung Parkir	Minor	1956,1
normal	,0	,0	,0	,0	,0	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Gedung A	Minor	2200,8
normal	,0	,0	,0	,0	,0	Honeywell	Security Sistem	Sistem Pengawasan	DVR CCTV	Gedung A	Major	1980,4
Ringan	1,0	,0	367000,0	367000,0	,0	Import	Electrical	Panel Distribusi	Panel UPS	Gedung B	Critical	2594,4
Sedang	6,0	80,7	13364000,0	8308000,0	78,2	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung D	Critical	2197,9
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Interior Gedung	Meja kerja	Gedung Servis	Minor	2591,8
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung Parkir	Minor	1907,7
Sedang	2,0	30,0	2994000,0	1541000,0	193,5	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Gedung Utama	Major	2174,9
Sedang	1,0	,0	1657000,0	1657000,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Gedung Servis	Major	2336,9
Sedang	8,0	27,1	22174000,0	9003000,0	122,5	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung E	Critical	1924,5
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Control Panel	Breker Panel	Gedung D	Major	2172,5
Ringan	2,0	,5	558000,0	333000,0	158,5	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung E	Critical	2100,6
Sedang	6,0	49,8	28615000,0	25562000,0	55,5	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung C	Critical	2522,5
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Bulb	Gedung Utama	Minor	2386,7
normal	,0	,0	,0	,0	,0	Samsung	Security Sistem	Sistem Pengawasan	Monitor CCTV	Gedung Servis	Major	2830,3
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Gedung E	Major	1976,6
Sedang	1,0	,0	1517000,0	1517000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Gedung Servis	Minor	2549,5
normal	,0	,0	,0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu TL LED	Gedung Utama	Major	1871,5
normal	,0	,0	,0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Gedung D	Critical	3072,9
Sedang	1,0	1,0	939000,0	939000,0	,0	Lokal	Plumbing	Sanitari Sistem	Urinal	Gedung Parkir	Minor	2219,7
normal	,0	,0	,0	,0	,0	Toto	Plumbing	Sanitari Sistem	Wastafel	Gedung Utama	Major	2114,5
Sedang	1,0	89,0	488000,0	488000,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED Bulb	Gedung Parkir	Minor	2976,0
normal	,0	,0	,0	,0	,0	Generic	Arsitektur	Interior Gedung	Kursi	Gedung B	Minor	2247,9
Ringan	1,0	1,0	175000,0	175000,0	,0	Generic	Arsitektur	Interior Gedung	Meja kerja	Gedung Parkir	Minor	1911,1
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Gedung E	Critical	2636,4
Sedang	4,0	29,5	11494000,0	9551000,0	52,3	Import	Arsitektur	Exterior Gedung	Pagar Besi	Gedung E	Major	2721,9
normal	,0	,0	,0	,0	,0	Lokal	Arsitektur	Pintu dan Jendela	Pintu Besi	Gedung C	Minor	1711,9
Fatal	1,0	,0	42419000,0	42419000,0	,0	Generic	Arsitektur	Interior Gedung	Plafon	Gedung A	Minor	2938,6
Ringan	1,0	59,0	484000,0	484000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Partisi, GRC / Gypsum	Gedung E	Major	1738,7
normal	,0	,0	,0	,0	,0	Lokal	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Gedung Servis	Major	2232,9
Sedang	1,0	1,0	1194000,0	1194000,0	,0	Generic	Mechanical	Pompa	Pompa Sampit	Gedung C	Major	2455,2
normal	,0	,0	,0	,0	,0	Generic	Plumbing	Sanitari Sistem	Jet Shower	Gedung C	Major	2184,2
Sedang	1,0	3,0	1285000,0	1285000,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu TL	Gedung A	Minor	2185,7
Sedang	2,0	,5	1412000,0	1196000,0	281,0	Grundfos	Mechanical	Pompa	Pompa Boster	Gedung D	Major	1922,1
normal	,0	,0	,0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung E	Critical	1907,2
normal	,0	,0	,0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Gedung A	Major	2615,7
Sedang	2,0	73,0	9505000,0	9131000,0	387,0	Generic	Electrical	Lampu Penerangan	Lampu TL LED	Gedung Parkir	Major	1970,0
normal	,0	,0	,0	,0	,0	Generic	Civil	Dinding Bangunan	Dinding Partisi, GRC / Gypsum	Gedung Utama	Major	1990,0
Sedang	1,0	,0	409000,0	409000,0	,0	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kaca Otomatis	Gedung B	Minor	2505,3
Ringan	3,0	10,3	758000,0	394000,0	157,0	Import	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Gedung C	Major	2868,5
Sedang	2,0	,5	1367000,0	1067000,0	327,0	Generic	Arsitektur	Tata Lingkungan	Lantai Parkir Beton	Gedung Servis	Major	2183,7`;

  const datasetRows = rawDataset.trim().split('\n').map(line => line.split('\t'));

  // ──────────────────────────────────────────────────────────────────────────
  // 2. EKSTRAKSI DAN INSERT DATA REFERENSI (MERK, KATEGORI, DLL)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📋  Menyiapkan data lookup dinamis dari dataset...');

  const uniqueMerks = Array.from(new Set(datasetRows.map(r => r[6]?.trim()).filter(Boolean)));
  const uniqueKategoris = Array.from(new Set(datasetRows.map(r => r[7]?.trim()).filter(Boolean)));
  const uniqueSubKats = Array.from(new Set(datasetRows.map(r => r[8]?.trim()).filter(Boolean)));
  const uniqueTipes = Array.from(new Set(datasetRows.map(r => r[9]?.trim()).filter(Boolean)));
  const uniqueGedungs = Array.from(new Set(datasetRows.map(r => r[10]?.trim()).filter(Boolean)));

  await prisma.merk.createMany({ data: uniqueMerks.map((nama, i) => ({ id: crypto.randomUUID(), kode: `MRK-${String(i+1).padStart(3, '0')}`, nama })) });
  await prisma.kategori.createMany({ data: uniqueKategoris.map((nama, i) => ({ id: crypto.randomUUID(), kode: `KAT-${String(i+1).padStart(3, '0')}`, nama })) });
  await prisma.subKategori.createMany({ data: uniqueSubKats.map((nama, i) => ({ id: crypto.randomUUID(), kode: `SKT-${String(i+1).padStart(3, '0')}`, nama })) });
  await prisma.tipe.createMany({ data: uniqueTipes.map((nama, i) => ({ id: crypto.randomUUID(), kode: `TPE-${String(i+1).padStart(3, '0')}`, nama })) });

  const merkMap = Object.fromEntries((await prisma.merk.findMany()).map(r => [r.nama.toLowerCase(), r.id]));
  const kategoriMap = Object.fromEntries((await prisma.kategori.findMany()).map(r => [r.nama.toLowerCase(), r.id]));
  const subKatMap = Object.fromEntries((await prisma.subKategori.findMany()).map(r => [r.nama.toLowerCase(), r.id]));
  const tipeMap = Object.fromEntries((await prisma.tipe.findMany()).map(r => [r.nama.toLowerCase(), r.id]));

  // ──────────────────────────────────────────────────────────────────────────
  // 3. PREPARASI PENGGUNA DAN PERUSAHAAN UTAMA (PT KIRA)
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`👤🏢 Menyiapkan data User dan Perusahaan...`);
  const defaultPassword = await bcrypt.hash('admin', 10);
  const mainUserId = '115deaf4-d9f2-45ea-9c07-44d94d05d59c';
  const mainCompanyId = 'c0a80101-1234-4567-89ab-cdef12345678';

  // Nama & email karyawan nyata (bukan placeholder "User Pekerja N") agar
  // tampil masuk akal di kolom "Created By" pada timeline maintenance.
  const rawEmployees = [
    'Dewi Anggraini', 'Siti Nurhaliza', 'Bayu Saputra', 'Indra Gunawan', 'Wahyu Hidayat',
    'Agus Setiawan', 'Hadi Prasetyo', 'Dian Permata', 'Maya Kusuma', 'Ratna Sari',
    'Yuni Astuti', 'Putri Wulandari', 'Arif Wibowo', 'Bambang Hartono', 'Doni Saputra',
    'Galih Pratama', 'Hendro Wibisono', 'Imam Syafii', 'Joni Iskandar', 'Kurnia Wijaya',
    'Lina Marlina', 'Mira Sasmita', 'Nina Kartika', 'Oka Wirawan', 'Panji Gumilang',
    'Qori Aulia', 'Reza Maulana', 'Sari Indah', 'Tono Sudrajat', 'Udin Saepudin',
    'Vina Anjani', 'Wati Suryani', 'Yoga Pranata', 'Zaki Ramadhan', 'Dewa Mahardika',
    'Citra Lestari', 'Farhan Maulidi', 'Gilang Ramadhan', 'Hana Salsabila', 'Intan Permatasari',
    'Jihan Aulia', 'Kiki Amalia', 'Lutfi Hakim', 'Mega Wati', 'Nanda Pratiwi',
    'Olga Marpaung', 'Putra Ananda', 'Qisthi Rahma', 'Rangga Saputra',
  ];

  const usersToInsert = [{ id: mainUserId, name: 'Admin', email: 'admin@perusahaan.com', password: defaultPassword }];
  for (const name of rawEmployees) {
    const slug = name.toLowerCase().replace(/\s+/g, '.');
    usersToInsert.push({ id: crypto.randomUUID(), name, email: `${slug}@karyawan.kira.id`, password: defaultPassword });
  }
  await prisma.user.createMany({ data: usersToInsert });

  await prisma.company.create({
    data: { id: mainCompanyId, company_name: 'PT KIRA Multi Industri', license_status: 'Active', owner_id: mainUserId },
  });

  await prisma.companyMember.create({
    data: { id_user: mainUserId, id_perusahaan: mainCompanyId, role: 'Admin', joined_at: addMonths(TODAY, -18) },
  });

  // Insert Gedung berdasar dari dataset
  const gedungToInsert = uniqueGedungs.map(nama => ({
    id: crypto.randomUUID(),
    id_perusahaan: mainCompanyId,
    nama: nama,
    kode: nama.replace('Gedung ', '').toUpperCase().replace(/\s/g, '_'),
  }));
  await prisma.gedung.createMany({ data: gedungToInsert });
  const gedungMap = Object.fromEntries(gedungToInsert.map(g => [g.nama.toLowerCase(), g.id]));

  // ──────────────────────────────────────────────────────────────────────────
  // 4. TEKNISI
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`🔩 Menyiapkan data Teknisi...`);

  const rawTechnicians = [
    // Mechanical
    { name: 'Budi Santoso',       email: 'budi.santoso@teknisi.kira.id',       phone: '081234560001', specialization: 'Mechanical',      experience_years: 8,  status: 'Tersedia' },
    { name: 'Ahmad Fauzi',        email: 'ahmad.fauzi@teknisi.kira.id',        phone: '081234560002', specialization: 'Mechanical',      experience_years: 12, status: 'Tersedia' },
    { name: 'Rizki Pratama',      email: 'rizki.pratama@teknisi.kira.id',      phone: '081234560003', specialization: 'Mechanical',      experience_years: 5,  status: 'Ditugaskan' },
    { name: 'Rendi Prakoso',      email: 'rendi.prakoso@teknisi.kira.id',      phone: '081234560004', specialization: 'Mechanical',      experience_years: 2,  status: 'Tidak Aktif' },
    // Electrical
    { name: 'Deni Kurniawan',     email: 'deni.kurniawan@teknisi.kira.id',     phone: '081234560005', specialization: 'Electrical',      experience_years: 10, status: 'Tersedia' },
    { name: 'Eko Saputro',        email: 'eko.saputro@teknisi.kira.id',        phone: '081234560006', specialization: 'Electrical',      experience_years: 7,  status: 'Tersedia' },
    { name: 'Fajar Nugroho',      email: 'fajar.nugroho@teknisi.kira.id',      phone: '081234560007', specialization: 'Electrical',      experience_years: 3,  status: 'Ditugaskan' },
    { name: 'Sigit Purnomo',      email: 'sigit.purnomo@teknisi.kira.id',      phone: '081234560008', specialization: 'Electrical',      experience_years: 11, status: 'Tersedia' },
    { name: 'Vicky Rahmadi',      email: 'vicky.rahmadi@teknisi.kira.id',      phone: '081234560009', specialization: 'Electrical',      experience_years: 1,  status: 'Tidak Aktif' },
    // HVAC
    { name: 'Hendra Wijaya',      email: 'hendra.wijaya@teknisi.kira.id',      phone: '081234560010', specialization: 'HVAC',            experience_years: 9,  status: 'Tersedia' },
    { name: 'Irwan Susanto',      email: 'irwan.susanto@teknisi.kira.id',      phone: '081234560011', specialization: 'HVAC',            experience_years: 6,  status: 'Tersedia' },
    { name: 'Taufik Hidayat',     email: 'taufik.hidayat@teknisi.kira.id',     phone: '081234560012', specialization: 'HVAC',            experience_years: 4,  status: 'Ditugaskan' },
    // Civil & Plumbing
    { name: 'Joko Wibowo',        email: 'joko.wibowo@teknisi.kira.id',        phone: '081234560013', specialization: 'Civil',           experience_years: 15, status: 'Tersedia' },
    { name: 'Krisna Aditya',      email: 'krisna.aditya@teknisi.kira.id',      phone: '081234560014', specialization: 'Civil',           experience_years: 4,  status: 'Tersedia' },
    { name: 'Umar Hasyim',        email: 'umar.hasyim@teknisi.kira.id',        phone: '081234560015', specialization: 'Civil',           experience_years: 9,  status: 'Tersedia' },
    { name: 'Lukman Hakim',       email: 'lukman.hakim@teknisi.kira.id',       phone: '081234560016', specialization: 'Plumbing',        experience_years: 8,  status: 'Tersedia' },
    { name: 'Yusuf Anshari',      email: 'yusuf.anshari@teknisi.kira.id',      phone: '081234560017', specialization: 'Plumbing',        experience_years: 5,  status: 'Tersedia' },
    // Security & Fire
    { name: 'Muhamad Iqbal',      email: 'muhamad.iqbal@teknisi.kira.id',      phone: '081234560018', specialization: 'Security Sistem', experience_years: 6,  status: 'Tersedia' },
    { name: 'Novan Setiawan',     email: 'novan.setiawan@teknisi.kira.id',     phone: '081234560019', specialization: 'Security Sistem', experience_years: 3,  status: 'Ditugaskan' },
    { name: 'Ogi Firmansyah',     email: 'ogi.firmansyah@teknisi.kira.id',     phone: '081234560020', specialization: 'Fire Protection', experience_years: 7,  status: 'Tersedia' },
    { name: 'Pandu Wicaksono',    email: 'pandu.wicaksono@teknisi.kira.id',    phone: '081234560021', specialization: 'Fire Protection', experience_years: 5,  status: 'Tersedia' },
  ];

  const techniciansToInsert = rawTechnicians.map((t) => ({
    id: crypto.randomUUID(),
    id_perusahaan: mainCompanyId,
    ...t,
  }));
  await prisma.technician.createMany({ data: techniciansToInsert });

  // Mapping dari kategori aset ke spesialisasi teknisi yang relevan
  const techSpecByCategory: Record<string, string[]> = {
    'mechanical':                          ['Mechanical', 'HVAC'],
    'ventilasi sistem':                    ['HVAC', 'Mechanical'],
    'electrical':                          ['Electrical'],
    'plumbing':                            ['Plumbing', 'Civil'],
    'civil':                               ['Civil'],
    'arsitektur':                          ['Civil'],
    'security sistem':                     ['Security Sistem'],
    'sistem proteksi kebakaran aktif':     ['Fire Protection'],
    'sistem pemadam kebakaran':            ['Fire Protection'],
    'distribusi air':                      ['Plumbing', 'Civil'],
    'sistem telekomunikasi gedung':        ['Electrical'],
    'pencatatan meter':                    ['Electrical'],
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 5. GENERATE ASSETS, MAINTENANCE & RUL
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`📦🔧🔮 Menyiapkan data Asset, Maintenance, dan Prediksi RUL berdasarkan dataset...`);

  const assetsToInsert: any[] = [];
  const maintenancesToInsert: any[] = [];
  const maintenanceLogsToInsert: any[] = [];

  const jenisKerusakanPool = [
    'Mati mendadak', 'Kebocoran', 'Retak/pecah', 'Getaran berlebihan',
    'Koneksi terputus', 'Korsleting', 'Aus/abrasi', 'Overheating',
    'Tidak berfungsi', 'Suara berisik', 'Bocor refrigeran', 'Filter tersumbat',
    'Daya tidak stabil', 'Layar mati', 'Pompa tidak bekerja',
    'Kebocoran pipa', 'Sensor tidak responsif', 'Panel trip', 'Baterai lemah',
    'Kompresor rusak',
  ];

  const penyebabPool = [
    'Overload', 'Kelembaban tinggi', 'Usia pakai', 'Faktor lingkungan',
    'Kurang pelumasan', 'Korosi', 'Human error', 'Tegangan tidak stabil',
    'Debu dan kotoran', 'Beban berlebih', 'Kabel putus', 'Getaran mekanis',
    'Suhu ekstrem', 'Pemeliharaan tertunda', 'Komponen aus',
  ];

  const sparePartPool = [
    'PCB board', 'Seal ring', 'Kompresor', 'Kapasitor', 'Filter udara',
    'Bearing', 'Belt/Sabuk', 'Motor listrik', 'Thermostat', 'Valve',
    'Gasket', 'Pipa PVC', 'Lensa kamera', 'Pompa mini', 'Fuse/Sekring',
    'Relay', 'Kontaktor', 'Lampu indikator', 'Sensor suhu', 'Suku cadang umum',
    null, null, // beberapa record tanpa spare part (nullable)
  ];

  const predictionsToInsert: any[] = [];

  function addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  let assetIndex = 1;

  for (const row of datasetRows) {
    if (row.length < 13) continue;

    const mode_severity = row[0].trim();
    const maint_count = Math.round(parseIndoNum(row[1]));
    const avg_downtime = parseIndoNum(row[2]);
    const total_cost = parseIndoNum(row[3]);
    const max_cost = parseIndoNum(row[4]);
    const predicted_rul = parseIndoNum(row[5]);
    const merkStr = row[6].trim();
    const kategoriStr = row[7].trim();
    const subKatStr = row[8].trim();
    const tipeStr = row[9].trim();
    const gedungStr = row[10].trim();
    const criticality = row[11].trim();
    const noised_umur = parseIndoNum(row[12]);

    const assetId = crypto.randomUUID();
    const merkId = merkMap[merkStr.toLowerCase()] ?? null;
    const kategoriId = kategoriMap[kategoriStr.toLowerCase()] ?? null;
    const subKategoriId = subKatMap[subKatStr.toLowerCase()] ?? null;
    const tipeId = tipeMap[tipeStr.toLowerCase()] ?? null;
    const gedungId = gedungMap[gedungStr.toLowerCase()] ?? null;

    let translatedSeverity = 'Low';
    if (mode_severity === 'Sedang') translatedSeverity = 'Medium';
    if (mode_severity === 'Berat')  translatedSeverity = 'High';
    if (mode_severity === 'Fatal')  translatedSeverity = 'Critical';

    // ── Generate Maintenance Data ──
    let lastMaintenanceId: string | null = null;
    let lastMaintenanceStatus = 'Completed';

    if (maint_count > 0) {
      const cost_per_maint = total_cost / maint_count;
      const downtimeHours = Math.max(1, avg_downtime);

      for (let m = 0; m < maint_count; m++) {
        const mId = crypto.randomUUID();
        lastMaintenanceId = mId;
        const isLast = m === maint_count - 1;

        // Older maintenances: 2–12 months ago (spaced out)
        // Last maintenance: 0–45 days ago (recent)
        let scheduledDate: Date;
        if (!isLast) {
          const monthsBack = randInt(2, 12);
          scheduledDate = new Date(addMonths(TODAY, -monthsBack));
          scheduledDate.setDate(randInt(1, 27));
        } else {
          // Recent: 0–45 days ago
          scheduledDate = addDays(TODAY, -randInt(0, 45));
        }

        const completionDate = new Date(scheduledDate.getTime() + downtimeHours * 60 * 60 * 1000);
        const daysAgo = (TODAY.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24);
        // Maintenance dianggap "dibuat" saat log Scheduled pertama dicatat
        const scheduledLogAt = addDays(scheduledDate, -randInt(2, 5));

        // Determine status for this maintenance
        let mStatus: string;
        if (!isLast || daysAgo > 10) {
          mStatus = 'Completed';
        } else if (daysAgo >= 2) {
          mStatus = 'In Progress';
        } else {
          mStatus = 'Scheduled';
        }

        if (isLast) lastMaintenanceStatus = mStatus;

        const assignedUserId = usersToInsert[randInt(0, usersToInsert.length - 1)].id;

        // Pilih teknisi yang spesialisasinya cocok dengan kategori aset
        const relevantSpecs = techSpecByCategory[kategoriStr.toLowerCase()] ?? null;
        const candidateTechs = relevantSpecs
          ? techniciansToInsert.filter((t) => relevantSpecs.includes(t.specialization))
          : techniciansToInsert;
        const pickedTech = pick(candidateTechs.length > 0 ? candidateTechs : techniciansToInsert);

        maintenancesToInsert.push({
          id: mId,
          id_asset: assetId,
          id_user: assignedUserId,
          id_teknisi: pickedTech.id,
          maintenance_type: pick(['Preventive', 'Corrective']),
          severity: translatedSeverity,
          down_time: mStatus === 'Completed' ? Math.round(avg_downtime) : 0,
          cost: mStatus === 'Completed' ? cost_per_maint : 0,
          jenis_kerusakan:      pick(jenisKerusakanPool),
          penyebab:             pick(penyebabPool),
          spare_part_digunakan: pick(sparePartPool),
          created_at: scheduledLogAt,
        });

        // ── Maintenance Logs: Scheduled → In Progress → Completed ──
        // Log 1: Scheduled (created 2–5 days before the scheduled date)
        maintenanceLogsToInsert.push({
          id: crypto.randomUUID(),
          id_maintenance: mId,
          id_user: assignedUserId,
          status: 'Scheduled',
          note: 'Maintenance dijadwalkan oleh sistem',
          created_at: scheduledLogAt,
          down_time: 0,
          cost: 0,
        });

        // Log 2: In Progress (at scheduledDate, if work has started)
        if (mStatus === 'In Progress' || mStatus === 'Completed') {
          maintenanceLogsToInsert.push({
            id: crypto.randomUUID(),
            id_maintenance: mId,
            id_user: assignedUserId,
            status: 'In Progress',
            note: 'Teknisi mulai mengerjakan maintenance',
            created_at: scheduledDate,
            down_time: 0,
            cost: 0,
          });
        }

        // Log 3: Completed (at completionDate, if work is done)
        if (mStatus === 'Completed') {
          maintenanceLogsToInsert.push({
            id: crypto.randomUUID(),
            id_maintenance: mId,
            id_user: assignedUserId,
            status: 'Completed',
            note: 'Maintenance berhasil diselesaikan',
            created_at: completionDate,
            down_time: Math.round(avg_downtime),
            cost: cost_per_maint,
          });
        }
      }
    }

    // Asset status reflects its latest maintenance
    let assetStatus = 'Active';
    if (lastMaintenanceStatus === 'In Progress' || lastMaintenanceStatus === 'Scheduled') {
      assetStatus = 'Maintenance';
    }

    // ── Insert Asset ──
    assetsToInsert.push({
      id: assetId,
      id_perusahaan: mainCompanyId,
      gedung_id: gedungId,
      asset_name: `${tipeStr} ${merkStr} - ${String(assetIndex).padStart(3, '0')}`,
      purchase_date: addMonths(TODAY, -randInt(6, 60)),
      initial_useful_life: noised_umur,
      merk_id: merkId,
      kategori_id: kategoriId,
      sub_kategori_id: subKategoriId,
      tipe_id: tipeId,
      criticality_level: criticality,
      status: assetStatus,
    });

    // ── Generate Prediction History ──
    const finalPredictedRul = predicted_rul > 0 ? predicted_rul : noised_umur;

    predictionsToInsert.push({
      id: crypto.randomUUID(),
      id_asset: assetId,
      id_maintenance: lastMaintenanceId,
      maintenance_count: maint_count,
      average_down_time: avg_downtime,
      total_maintenance_cost: total_cost,
      max_maintenance_cost: max_cost,
      mode_severity: mode_severity,
      predicted_rul: finalPredictedRul,
      recorded_at: TODAY,
    });

    assetIndex++;
  }

  await prisma.asset.createMany({ data: assetsToInsert });
  await prisma.maintenance.createMany({ data: maintenancesToInsert });
  await prisma.maintenanceLog.createMany({ data: maintenanceLogsToInsert });
  await prisma.assetPredictionHistory.createMany({ data: predictionsToInsert });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. SELESAI
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n✅  SEEDING SELESAI!');
  console.log('Statistik:');
  console.log(`  Teknisi          : ${techniciansToInsert.length}`);
  console.log(`  Assets           : ${assetsToInsert.length}`);
  console.log(`  Maintenances     : ${maintenancesToInsert.length} (Scheduled/InProgress/Completed)`);
  console.log(`  Maintenance Logs : ${maintenanceLogsToInsert.length} (timeline per maintenance)`);
  console.log(`  RUL Predictions  : ${predictionsToInsert.length}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });