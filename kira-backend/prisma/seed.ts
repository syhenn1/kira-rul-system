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
  await (prisma as any).ticket.deleteMany({});
  await prisma.maintenance.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.gedung.deleteMany({});
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
  const rawDataset = `3,0	20,0	9935000,0	Sedang	8574000,0	211,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	2123,8
1,0	1,0	336000,0	Ringan	336000,0	,0	Perkins	Mechanical	Genset	Genset Diesel	Critical	2194,7
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	998,6
9,0	33,7	34514000,0	Sedang	16647000,0	77,7	Sharp	Mechanical	Tata Udara	AC Portable	Critical	1124,1
1,0	,0	3074000,0	Berat	3074000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	1410,5
1,0	1,0	836000,0	Sedang	836000,0	101,0	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Critical	2828,7
,0	,0	,0	0	,0	,0	Deutz	Mechanical	Genset	Genset Diesel	Major	1297,5
2,0	,5	1118000,0	Sedang	947000,0	103,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1254,5
,0	,0	,0	0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1252,1
,0	,0	,0	0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	1874,8
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Critical	1754,1
4,0	,5	4594000,0	Sedang	1898000,0	179,5	Gree	Mechanical	Tata Udara	AC Split	Major	1141,3
,0	,0	,0	0	,0	,0	Import	Plumbing	Sanitari Sistem	Urinal	Minor	2402,9
2,0	,0	4873000,0	Ringan	4627000,0	25,0	Generic	Electrical	Signage Gedung	Lampu Neon Sign	Major	2449,1
,0	,0	,0	0	,0	,0	Lokal	Electrical	Signage Gedung	Lampu Backlit Sign	Critical	2385,8
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Major	2366,2
,0	,0	,0	0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	1974,6
,0	,0	,0	0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Major	1441,2
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	2724,3
1,0	3,0	2089000,0	Berat	2089000,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Critical	1761,3
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Critical	2329,0
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	1274,3
3,0	1,7	49751000,0	Fatal	48974000,0	272,3	Panasonic	Mechanical	Tata Udara	AC Split	Major	2095,0
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sanitari Sistem	Floor Drain	Critical	1152,9
5,0	13,6	3562000,0	Sedang	1514000,0	139,8	Panasonic	Mechanical	Tata Udara	AC Cassette	Critical	1780,7
1,0	207,0	2471000,0	Berat	2471000,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1237,4
1,0	1,0	1597000,0	Sedang	1597000,0	,0	Toto	Plumbing	Sanitari Sistem	Kran Air	Major	1364,0
3,0	80,7	31323000,0	Berat	23330000,0	28,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	2116,3
7,0	42,9	12254000,0	Sedang	8604000,0	111,7	Gree	Mechanical	Tata Udara	AC Split	Major	1419,3
2,0	,5	2203000,0	Sedang	1769000,0	123,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2307,1
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sanitari Sistem	Kloset	Minor	1344,5
3,0	1,0	2686000,0	Sedang	1713000,0	87,3	Lokal	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Mikrofon	Major	1690,8
,0	,0	,0	0	,0	,0	Import	Electrical	Panel Distribusi	Panel UPS	Minor	1113,7
,0	,0	,0	0	,0	,0	Import	Mechanical	Tata Udara	AHU	Major	2585,4
,0	,0	,0	0	,0	,0	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	1640,6
2,0	,5	1757000,0	Sedang	1099000,0	154,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Major	3030,5
1,0	,0	1917000,0	Sedang	1917000,0	140,0	Grundfos	Mechanical	Pompa	Pompa Transfer	Major	2781,2
1,0	89,0	13127000,0	Fatal	13127000,0	,0	Lokal	Security Sistem	Sistem Keamanan	Kick Bar	Critical	2657,6
1,0	3,0	144000,0	Ringan	144000,0	323,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	1560,0
5,0	83,0	2689000,0	Ringan	1912000,0	184,6	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	1510,8
1,0	,0	1028000,0	Sedang	1028000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	1549,7
,0	,0	,0	0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1511,9
2,0	147,5	9467000,0	Sedang	8192000,0	210,0	Generic	Electrical	Panel Distribusi	Panel UPS	Major	2730,2
,0	,0	,0	0	,0	,0	Generic	Civil	Lantai Bangunan	Lantai Karpet	Minor	1677,1
5,0	71,4	46538000,0	Sedang	38085000,0	38,0	Gree	Mechanical	Tata Udara	AC Split	Critical	1018,5
,0	,0	,0	0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	2645,5
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1811,7
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1650,5
1,0	208,0	3560000,0	Berat	3560000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1625,2
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Major	1554,4
,0	,0	,0	0	,0	,0	Ebara	Mechanical	Pompa	Pompa Boster	Minor	1347,8
1,0	2,0	7758000,0	Berat	7758000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1492,2
1,0	,0	366000,0	Ringan	366000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	1550,1
4,0	30,3	23968000,0	Sedang	21244000,0	119,5	Import	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Amplifier	Major	1502,9
2,0	,5	2543000,0	Sedang	1363000,0	294,0	Generic	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Minor	1312,4
1,0	,0	6551000,0	Berat	6551000,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Critical	2513,3
4,0	37,0	16646000,0	Sedang	8535000,0	62,8	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Heat Detector	Minor	2123,5
,0	,0	,0	0	,0	,0	Generic	Electrical	Panel Distribusi	LVMDP	Major	2637,0
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Hydrant System	Hydrant Box 	Critical	1186,1
1,0	239,0	3494000,0	Berat	3494000,0	,0	Lokal	Plumbing	Sanitari Sistem	Rooftank	Minor	1629,8
,0	,0	,0	0	,0	,0	Import	Electrical	Signage Gedung	Lampu Wall sign	Major	1598,9
,0	,0	,0	0	,0	,0	Lokal	Security Sistem	Sistem Keamanan	Push Button	Major	1156,1
,0	,0	,0	0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Critical	1525,6
6,0	21,3	49776000,0	Ringan	42309000,0	49,5	Gree	Mechanical	Tata Udara	AC Split	Critical	2372,2
1,0	1,0	696000,0	Sedang	696000,0	,0	Ebara	Mechanical	Pompa	Pompa Transfer	Critical	1371,2
5,0	7,2	9559000,0	Sedang	7874000,0	109,4	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	1962,0
1,0	,0	437000,0	Ringan	437000,0	,0	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Minor	1803,6
1,0	1,0	1044000,0	Sedang	1044000,0	,0	Import	Electrical	Backup Power System	Uninterruptible Power Supply	Critical	1248,9
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1487,4
,0	,0	,0	0	,0	,0	Nohmi	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Minor	1188,6
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	1519,6
5,0	6,4	12655000,0	Sedang	9059000,0	188,6	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	1359,3
,0	,0	,0	0	,0	,0	Import	Electrical	Control Panel	Control Panel Hydrant Diesel Pump	Minor	2085,9
4,0	,8	11915000,0	Sedang	9279000,0	142,3	Sharp	Mechanical	Tata Udara	AC Split	Critical	1679,2
1,0	1,0	7908000,0	Berat	7908000,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	1265,7
1,0	,0	4594000,0	Berat	4594000,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Major	1430,7
1,0	,0	332000,0	Ringan	332000,0	476,0	Sharp	Mechanical	Tata Udara	AC Split	Minor	1637,6
6,0	40,2	4450000,0	Sedang	1844000,0	87,3	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Major	1293,6
,0	,0	,0	0	,0	,0	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Minor	1934,9
4,0	75,0	12763000,0	Ringan	11982000,0	160,0	Gree	Mechanical	Tata Udara	AC Split	Major	1326,7
1,0	29,0	1098000,0	Sedang	1098000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2661,5
1,0	87,0	217000,0	Ringan	217000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Minor	1800,8
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	2115,5
1,0	2,0	483000,0	Ringan	483000,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	2248,3
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Major	1485,2
1,0	,0	270000,0	Ringan	270000,0	,0	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Major	1263,7
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED	Major	2063,0
,0	,0	,0	0	,0	,0	Grundfos	Mechanical	Pompa	Pompa Transfer	Minor	1458,4
1,0	,0	484000,0	Ringan	484000,0	,0	Generic	Security Sistem	Sistem Keamanan	Access Control 	Major	2195,2
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1631,9
,0	,0	,0	0	,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	978,6
1,0	,0	8628000,0	Berat	8628000,0	465,0	Import	Mechanical	Tata Udara	AC Ceiling	Major	1505,6
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1208,7
1,0	,0	1147000,0	Sedang	1147000,0	,0	LG	Mechanical	Tata Udara	AC Cassette	Major	2638,4
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1183,2
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Critical	1415,8
1,0	,0	189000,0	Ringan	189000,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Major	2888,1
,0	,0	,0	0	,0	,0	Perkins	Mechanical	Genset	Genset Diesel	Critical	1706,8
1,0	2,0	445000,0	Ringan	445000,0	,0	Lokal	Electrical	Panel Distribusi	LVMDP	Minor	1384,9
2,0	59,5	536000,0	Ringan	322000,0	71,0	Samsung	Mechanical	Tata Udara	AC Split	Minor	1058,0
,0	,0	,0	0	,0	,0	Generic	Civil	Atap Bangunan	Atap Beton	Minor	2644,1
1,0	,0	1062000,0	Sedang	1062000,0	,0	Generic	Civil	Lantai Bangunan	Lantai Granit	Minor	2754,3
,0	,0	,0	0	,0	,0	Lokal	Electrical	Control Panel	Control Panel AC	Minor	1160,9
2,0	,5	671000,0	Ringan	499000,0	135,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Major	2575,1
8,0	15,3	35728000,0	Sedang	22472000,0	74,3	Samsung	Mechanical	Tata Udara	AC Split	Critical	1187,2
2,0	,0	2178000,0	Sedang	1792000,0	62,0	LG	Mechanical	Tata Udara	AC Split	Minor	1144,3
4,0	81,8	39796000,0	Berat	24748000,0	117,0	Generic	Civil	Lantai Bangunan	Lantai Keramik	Major	2194,9
,0	,0	,0	0	,0	,0	Lokal	Civil	Lantai Bangunan	Lantai Keramik	Major	1638,0
3,0	58,7	8286000,0	Sedang	7585000,0	131,7	Generic	Mechanical	Tata Udara	AC VRV	Critical	2690,5
,0	,0	,0	0	,0	,0	Generic	Electrical	Control Panel	Control Panel Penerangan	Major	993,0
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Critical	2340,7
,0	,0	,0	0	,0	,0	Lokal	Mechanical	Tata Udara	AC VRV	Major	1821,2
8,0	23,5	62217000,0	Ringan	46206000,0	65,0	Gree	Mechanical	Tata Udara	AC Split	Critical	1323,0
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Wet Chemical	Major	2395,9
1,0	,0	4652000,0	Berat	4652000,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	2984,0
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Minor	1184,2
1,0	,0	593000,0	Sedang	593000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	1369,6
,0	,0	,0	0	,0	,0	Import	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Minor	2286,8
3,0	11,0	10295000,0	Sedang	8628000,0	225,3	Panasonic	Mechanical	Tata Udara	AC Split	Critical	1587,5
2,0	90,5	435000,0	Ringan	278000,0	79,5	Panasonic	Mechanical	Tata Udara	AC Cassette	Critical	2614,2
2,0	,5	4140000,0	Sedang	2869000,0	320,0	Daikin	Mechanical	Tata Udara	AC Cassette	Minor	1345,8
11,0	54,1	33566000,0	Ringan	10782000,0	44,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1115,6
2,0	88,5	977000,0	Sedang	925000,0	237,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Major	2293,1
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Minor	2672,9
,0	,0	,0	0	,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Critical	1608,0
2,0	1,5	50446000,0	Fatal	49560000,0	277,0	Generic	Plumbing	Sanitari Sistem	Jet Shower	Major	1304,7
1,0	,0	103000,0	Ringan	103000,0	325,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1672,0
1,0	,0	4052000,0	Berat	4052000,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Kotor	Major	1636,2
1,0	,0	1504000,0	Sedang	1504000,0	948,0	Lokal	Security Sistem	Sistem Keamanan	Fingerprint	Critical	1554,5
,0	,0	,0	0	,0	,0	LG	Security Sistem	Sistem Pengawasan	Monitor CCTV	Minor	1488,7
1,0	3,0	1492000,0	Sedang	1492000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Minor	2051,3
,0	,0	,0	0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Major	2829,3
5,0	23,6	59543000,0	Fatal	47780000,0	160,2	Import	Distribusi Air	Distributor Air Bersih	Ground Water Tank	Major	1090,4
3,0	40,7	48265000,0	Fatal	40031000,0	123,3	Import	Plumbing	Sanitari Sistem	Kitchen sink	Minor	1196,9
,0	,0	,0	0	,0	,0	Lokal	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Minor	1519,8
2,0	,5	3882000,0	Ringan	3438000,0	221,5	Hikvision	Security Sistem	Sistem Pengawasan	Monitor CCTV	Major	2285,6
3,0	11,7	2518000,0	Sedang	1175000,0	248,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1149,0
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2162,8
9,0	43,4	68836000,0	Berat	40869000,0	86,2	Panasonic	Mechanical	Tata Udara	AC Split	Critical	2095,9
2,0	1,0	3252000,0	Ringan	3058000,0	123,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1424,0
2,0	1,0	10332000,0	Sedang	8969000,0	270,5	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Major	1950,7
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Minor	1192,0
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Minor	1086,2
1,0	295,0	781000,0	Sedang	781000,0	338,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	2787,8
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2556,1
2,0	,0	7110000,0	Ringan	7041000,0	142,5	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1843,5
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Minor	1807,1
1,0	177,0	709000,0	Sedang	709000,0	,0	American Standard	Plumbing	Sanitari Sistem	Wastafel	Minor	1479,9
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sanitari Sistem	Kloset	Major	2153,7
6,0	2,0	17264000,0	Sedang	9365000,0	125,5	Import	Sistem Pemadam Kebakaran	Fire Pump System	Diesel Fire Pump	Critical	2481,9
2,0	,0	10346000,0	Fatal	10004000,0	477,5	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	2549,6
,0	,0	,0	0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1690,6
1,0	,0	1254000,0	Sedang	1254000,0	,0	Lokal	Sistem Telekomunikasi Gedung	Sistem Jaringan Internet	LAN (Local Area Network)	Minor	1225,0
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1810,5
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Critical	1107,5
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Minor	2456,1
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Fire Pump System	Electric Fire Pump	Critical	1570,4
,0	,0	,0	0	,0	,0	Import	Electrical	Panel Distribusi	SDP	Minor	2199,9
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	2200,1
3,0	99,0	25327000,0	Berat	9378000,0	140,0	Deutz	Mechanical	Genset	Genset Diesel	Major	1403,1
4,0	8,3	8119000,0	Ringan	5895000,0	79,5	Panasonic	Mechanical	Tata Udara	AC Split	Critical	1503,3
,0	,0	,0	0	,0	,0	Import	Electrical	Signage Gedung	Lampu Pylon Sign	Critical	1130,5
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	2557,7
2,0	,0	1748000,0	Sedang	1554000,0	286,0	Notifier	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Minor	1997,5
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	976,0
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	1599,5
1,0	32,0	3070000,0	Berat	3070000,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	1135,7
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Major	2562,8
1,0	,0	4229000,0	Berat	4229000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2328,1
7,0	81,1	22361000,0	Berat	6247000,0	55,9	Notifier	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Critical	2312,5
2,0	60,0	6026000,0	Ringan	5695000,0	312,0	Daikin	Mechanical	Tata Udara	AC Split	Major	2934,2
1,0	1,0	7412000,0	Berat	7412000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2346,6
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	2415,7
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Critical	1291,3
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	2134,1
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1598,1
,0	,0	,0	0	,0	,0	Generic	Electrical	Panel Distribusi	Panel UPS	Minor	1638,5
,0	,0	,0	0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1515,7
1,0	2,0	131000,0	Ringan	131000,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Minor	1296,7
,0	,0	,0	0	,0	,0	Lokal	Electrical	Generator Panel	Automatic Transfer Switch (ATS Panel)	Major	2660,8
,0	,0	,0	0	,0	,0	Lokal	Electrical	Panel Distribusi	SDP	Major	2078,3
,0	,0	,0	0	,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1565,4
1,0	3,0	842000,0	Sedang	842000,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1528,7
6,0	44,8	14552000,0	Sedang	8752000,0	123,2	Lokal	Electrical	Control Panel	Control Panel Hydrant Electric Pump	Major	1626,8
,0	,0	,0	0	,0	,0	Wilo	Mechanical	Pompa	Pompa Transfer	Minor	1311,7
1,0	1,0	26480000,0	Fatal	26480000,0	584,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1896,8
1,0	,0	304000,0	Ringan	304000,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Major	1853,7
4,0	8,3	20337000,0	Sedang	9897000,0	212,5	Samsung	Mechanical	Tata Udara	AC Split	Critical	1714,6
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Major	1115,5
3,0	1,0	2846000,0	Sedang	1582000,0	234,3	Lokal	Electrical	Control Panel	Control Panel AC	Critical	1941,0
1,0	62,0	1122000,0	Sedang	1122000,0	628,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	PABX	Minor	1974,3
,0	,0	,0	0	,0	,0	Generic	Electrical	Transformator (Trafo)	Trafo 3 Phase	Major	1402,4
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Critical	3165,1
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Minor	1505,9
1,0	,0	1283000,0	Sedang	1283000,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	2440,3
1,0	,0	1965000,0	Sedang	1965000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	1911,3
,0	,0	,0	0	,0	,0	Lokal	Security Sistem	Sistem Keamanan	Access Control 	Critical	1445,5
1,0	3,0	22582000,0	Fatal	22582000,0	,0	Generic	Distribusi Air	Distributor Air Bersih	Roof Tank	Minor	2572,5
,0	,0	,0	0	,0	,0	Lokal	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Minor	1298,6
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Fire Pump System	Diesel Fire Pump	Minor	2458,7
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	1235,6
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	2139,7
,0	,0	,0	0	,0	,0	Perkins	Mechanical	Genset	Genset Diesel	Major	1239,8
2,0	1,0	54723000,0	Fatal	45501000,0	363,5	Gree	Mechanical	Tata Udara	AC Split	Minor	1857,4
3,0	2,0	2378000,0	Sedang	1674000,0	224,7	Samsung	Mechanical	Tata Udara	AC Split	Critical	1255,6
,0	,0	,0	0	,0	,0	Samsung	Security Sistem	Sistem Pengawasan	Monitor CCTV	Critical	1111,7
1,0	,0	335000,0	Ringan	335000,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	DVR CCTV	Minor	2005,2
4,0	,3	12833000,0	Sedang	6454000,0	163,3	Import	Sistem Telekomunikasi Gedung	Sistem Jaringan Internet	WI-FI	Major	1536,4
8,0	57,8	13045000,0	Sedang	7044000,0	89,5	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	2037,3
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2500,0
1,0	59,0	227000,0	Ringan	227000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	2584,0
4,0	15,0	47058000,0	Berat	33456000,0	63,0	LG	Mechanical	Tata Udara	AC Split	Major	2442,4
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1334,5
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	2580,6
1,0	,0	1002000,0	Sedang	1002000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	2522,8
2,0	,0	9098000,0	Ringan	8877000,0	134,5	Import	Electrical	Control Panel	Control Panel Penerangan	Major	1519,2
,0	,0	,0	0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	PABX	Minor	2388,8
1,0	,0	1021000,0	Sedang	1021000,0	,0	Wasser	Plumbing	Sanitari Sistem	Kran Air	Minor	2072,8
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1101,6
1,0	118,0	1071000,0	Sedang	1071000,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Major	1933,3
,0	,0	,0	0	,0	,0	Lokal	Civil	Lantai Bangunan	Lantai Granit	Major	1319,4
4,0	23,3	3031000,0	Sedang	1905000,0	138,5	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Kotor	Critical	1351,4
1,0	,0	42525000,0	Fatal	42525000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Minor	1961,5
,0	,0	,0	0	,0	,0	Lokal	Electrical	Control Panel	Control Panel Penerangan	Minor	1906,2
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1140,8
,0	,0	,0	0	,0	,0	Generic	Civil	Lantai Bangunan	Lantai Granit	Minor	1857,0
,0	,0	,0	0	,0	,0	Ina	Plumbing	Sanitari Sistem	Wastafel	Major	1307,5
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Hydrant System	Valve Control	Critical	2511,9
4,0	25,5	9670000,0	Sedang	6160000,0	143,3	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Critical	1469,9
1,0	,0	974000,0	Sedang	974000,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Minor	2100,7
9,0	14,1	19768000,0	Berat	9019000,0	53,9	Panasonic	Mechanical	Tata Udara	AC Split	Major	1776,1
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	2218,2
2,0	15,5	1317000,0	Sedang	1051000,0	71,5	Sharp	Mechanical	Tata Udara	AC Split	Major	1627,0
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	2503,3
1,0	,0	7483000,0	Berat	7483000,0	,0	Import	Security Sistem	Sistem Keamanan	Fingerprint	Minor	1856,9
3,0	1,0	47748000,0	Fatal	38777000,0	198,3	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1192,2
4,0	,5	2856000,0	Sedang	1196000,0	115,0	Lokal	Pencatatan Meter	Meter Air Bersih	Meter PDAM	Minor	1381,4
1,0	1,0	5926000,0	Berat	5926000,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Major	2040,6
8,0	33,8	4279000,0	Ringan	1532000,0	103,9	Panasonic	Mechanical	Tata Udara	AC Cassette	Critical	2020,9
,0	,0	,0	0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Major	1806,4
1,0	,0	1334000,0	Sedang	1334000,0	,0	Hookiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Major	1823,2
,0	,0	,0	0	,0	,0	Lokal	Civil	Atap Bangunan	Atap Beton	Minor	2313,7
1,0	,0	204000,0	Ringan	204000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	2557,5
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Critical	2005,3
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	1536,9
,0	,0	,0	0	,0	,0	Wilo	Mechanical	Pompa	Pompa Transfer	Major	1390,2
,0	,0	,0	0	,0	,0	Import	Distribusi Air	Distributor Air Bersih	Ground Water Tank	Critical	1406,2
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Critical	1154,2
1,0	1,0	417000,0	Ringan	417000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	1500,3
2,0	,5	7249000,0	Ringan	7160000,0	24,0	Generic	Electrical	Signage Gedung	Lampu Wall sign	Minor	1474,5
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Minor	1470,2
,0	,0	,0	0	,0	,0	Import	Distribusi Air	Distributor Air Bersih	Ground Water Tank	Major	1574,1
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu TL	Minor	968,0
2,0	15,0	4163000,0	Ringan	3960000,0	4,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Major	2027,7
,0	,0	,0	0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Critical	1179,0
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2331,4
,0	,0	,0	0	,0	,0	Import	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Major	1865,3
,0	,0	,0	0	,0	,0	Generic	Security Sistem	Sistem Keamanan	Push Button	Critical	2094,9
,0	,0	,0	0	,0	,0	Import	Electrical	Control Panel	Control Panel Pompa Transfer	Major	1273,8
2,0	1,0	1320000,0	Sedang	1267000,0	277,5	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Major	1191,0
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	1673,6
1,0	207,0	2758000,0	Berat	2758000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	1099,0
2,0	45,0	877000,0	Sedang	694000,0	113,5	Deutz	Mechanical	Genset	Genset Diesel	Minor	1534,5
1,0	27,0	1142000,0	Sedang	1142000,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	PABX	Minor	1265,6
,0	,0	,0	0	,0	,0	Lokal	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Kotor	Minor	1987,9
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Critical	1466,0
2,0	,0	10149000,0	Sedang	9187000,0	471,0	Daikin	Mechanical	Tata Udara	AC Sentral	Minor	2112,9
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Critical	1662,8
1,0	2,0	8693000,0	Berat	8693000,0	,0	Generic	Distribusi Air	Distributor Air Bersih	Roof Tank	Major	2343,5
,0	,0	,0	0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	PABX	Minor	2249,7
3,0	1,0	2803000,0	Ringan	2212000,0	290,0	Gree	Mechanical	Tata Udara	AC Split	Major	1409,5
1,0	1,0	927000,0	Sedang	927000,0	474,0	Gree	Mechanical	Tata Udara	AC Split	Major	1776,1
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	1525,5
1,0	118,0	737000,0	Sedang	737000,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	1166,5
3,0	,7	2931000,0	Sedang	1470000,0	209,7	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Major	2336,0
1,0	,0	225000,0	Ringan	225000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	2918,2
2,0	1,5	997000,0	Sedang	550000,0	162,0	Import	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Major	1147,4
4,0	45,0	40826000,0	Fatal	30137000,0	101,0	Lokal	Electrical	Signage Gedung	Lampu Pylon Sign	Minor	2052,9
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sanitari Sistem	Kloset	Major	1614,3
,0	,0	,0	0	,0	,0	Import	Electrical	Control Panel	Control Panel AC	Major	1885,3
,0	,0	,0	0	,0	,0	Import	Electrical	Panel Distribusi	Panel UPS	Major	2259,5
1,0	27,0	6719000,0	Berat	6719000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	2253,5
1,0	,0	37812000,0	Fatal	37812000,0	250,0	Generic	Electrical	Control Panel	Control Panel AC	Major	1421,3
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Major	2255,7
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	2013,9
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1487,8
2,0	4,5	1044000,0	Sedang	948000,0	309,5	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Critical	1933,3
,0	,0	,0	0	,0	,0	Lokal	Electrical	Control Panel	Control Panel Penerangan	Minor	2030,3
2,0	91,0	2894000,0	Sedang	1927000,0	114,5	Lokal	Electrical	Lampu Penerangan	Lampu Downlight	Critical	1348,9
1,0	30,0	1050000,0	Sedang	1050000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Critical	2619,1
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Major	1031,6
2,0	,0	2381000,0	Sedang	1950000,0	61,5	Cummins	Mechanical	Genset	Genset Diesel	Major	2425,0
3,0	10,0	16352000,0	Fatal	10385000,0	228,7	Daikin	Mechanical	Tata Udara	AC Split	Critical	1335,6
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	2158,1
7,0	55,7	22621000,0	Berat	8589000,0	125,1	Samsung	Mechanical	Tata Udara	AC Split	Major	1161,9
7,0	1,0	56222000,0	Ringan	47669000,0	53,1	Sharp	Mechanical	Tata Udara	AC Split	Major	2408,6
,0	,0	,0	0	,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Partisi, GRC / Gypsum	Minor	1921,2
1,0	,0	875000,0	Sedang	875000,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED	Minor	1347,2
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Major	1354,4
1,0	1,0	119000,0	Ringan	119000,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu Downlight	Major	1097,1
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Critical	3044,5
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Minor	2337,4
,0	,0	,0	0	,0	,0	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Minor	1505,8
2,0	1,5	1996000,0	Sedang	1598000,0	189,5	Lokal	Sistem Telekomunikasi Gedung	Sistem Jaringan Internet	LAN (Local Area Network)	Major	2577,7
,0	,0	,0	0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	2628,3
,0	,0	,0	0	,0	,0	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Critical	1879,1
1,0	,0	1038000,0	Sedang	1038000,0	,0	Import	Electrical	Panel Distribusi	SDP	Minor	1614,5
,0	,0	,0	0	,0	,0	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	1516,8
3,0	9,7	3864000,0	Ringan	2921000,0	277,7	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Critical	1655,0
1,0	1,0	1986000,0	Sedang	1986000,0	,0	Honeywell	Security Sistem	Sistem Pengawasan	DVR CCTV	Major	2244,8
2,0	3,0	45541000,0	Fatal	43630000,0	100,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Critical	1052,0
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Major	1672,0
1,0	1,0	1992000,0	Sedang	1992000,0	,0	Import	Plumbing	Sanitari Sistem	Kloset	Minor	1922,1
4,0	38,5	54034000,0	Berat	42413000,0	189,3	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	2676,5
6,0	1,5	34835000,0	Sedang	21806000,0	155,2	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1603,3
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Critical	1148,3
,0	,0	,0	0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	3052,9
,0	,0	,0	0	,0	,0	Generic	Sistem Proteksi Kebakaran Aktif	Sistem Alarm Kebakaran	Bell Alarm	Critical	2912,0
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	1253,8
8,0	33,9	59033000,0	Berat	36954000,0	117,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Critical	2379,3
,0	,0	,0	0	,0	,0	Honeywell	Security Sistem	Sistem Pengawasan	DVR CCTV	Critical	1141,0
2,0	30,5	1440000,0	Sedang	1372000,0	141,5	Generic	Electrical	Panel Distribusi	MDB	Critical	1562,1
,0	,0	,0	0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	2466,0
2,0	,5	16592000,0	Berat	8592000,0	112,0	Wasser	Plumbing	Sanitari Sistem	Kran Air	Major	1271,7
,0	,0	,0	0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Critical	2232,2
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Critical	1229,0
,0	,0	,0	0	,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1138,3
,0	,0	,0	0	,0	,0	Generic	Electrical	Backup Power System	Uninterruptible Power Supply	Major	1178,4
1,0	1,0	4605000,0	Berat	4605000,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Minor	2496,2
1,0	,0	459000,0	Sedang	459000,0	,0	Generic	Electrical	Panel Distribusi	Panel UPS	Minor	1287,1
...` // Potong agar efisien di response, namun logic map looping melingkupi array string split di bawah ini.

  // Tambahkan sisa data yang diekstrak manual agar komplit 100%
  const completeDatasetString = `3,0	20,0	9935000,0	Sedang	8574000,0	211,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	2123,8
1,0	1,0	336000,0	Ringan	336000,0	,0	Perkins	Mechanical	Genset	Genset Diesel	Critical	2194,7
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	998,6
9,0	33,7	34514000,0	Sedang	16647000,0	77,7	Sharp	Mechanical	Tata Udara	AC Portable	Critical	1124,1
1,0	,0	3074000,0	Berat	3074000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	1410,5
1,0	1,0	836000,0	Sedang	836000,0	101,0	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Critical	2828,7
,0	,0	,0	0	,0	,0	Deutz	Mechanical	Genset	Genset Diesel	Major	1297,5
2,0	,5	1118000,0	Sedang	947000,0	103,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1254,5
,0	,0	,0	0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1252,1
,0	,0	,0	0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	1874,8
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Critical	1754,1
4,0	,5	4594000,0	Sedang	1898000,0	179,5	Gree	Mechanical	Tata Udara	AC Split	Major	1141,3
,0	,0	,0	0	,0	,0	Import	Plumbing	Sanitari Sistem	Urinal	Minor	2402,9
2,0	,0	4873000,0	Ringan	4627000,0	25,0	Generic	Electrical	Signage Gedung	Lampu Neon Sign	Major	2449,1
,0	,0	,0	0	,0	,0	Lokal	Electrical	Signage Gedung	Lampu Backlit Sign	Critical	2385,8
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Major	2366,2
,0	,0	,0	0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	1974,6
,0	,0	,0	0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Major	1441,2
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	2724,3
1,0	3,0	2089000,0	Berat	2089000,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Critical	1761,3
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Critical	2329,0
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	1274,3
3,0	1,7	49751000,0	Fatal	48974000,0	272,3	Panasonic	Mechanical	Tata Udara	AC Split	Major	2095,0
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sanitari Sistem	Floor Drain	Critical	1152,9
5,0	13,6	3562000,0	Sedang	1514000,0	139,8	Panasonic	Mechanical	Tata Udara	AC Cassette	Critical	1780,7
1,0	207,0	2471000,0	Berat	2471000,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1237,4
1,0	1,0	1597000,0	Sedang	1597000,0	,0	Toto	Plumbing	Sanitari Sistem	Kran Air	Major	1364,0
3,0	80,7	31323000,0	Berat	23330000,0	28,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	2116,3
7,0	42,9	12254000,0	Sedang	8604000,0	111,7	Gree	Mechanical	Tata Udara	AC Split	Major	1419,3
2,0	,5	2203000,0	Sedang	1769000,0	123,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2307,1
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sanitari Sistem	Kloset	Minor	1344,5
3,0	1,0	2686000,0	Sedang	1713000,0	87,3	Lokal	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Mikrofon	Major	1690,8
,0	,0	,0	0	,0	,0	Import	Electrical	Panel Distribusi	Panel UPS	Minor	1113,7
,0	,0	,0	0	,0	,0	Import	Mechanical	Tata Udara	AHU	Major	2585,4
,0	,0	,0	0	,0	,0	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	1640,6
2,0	,5	1757000,0	Sedang	1099000,0	154,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Major	3030,5
1,0	,0	1917000,0	Sedang	1917000,0	140,0	Grundfos	Mechanical	Pompa	Pompa Transfer	Major	2781,2
1,0	89,0	13127000,0	Fatal	13127000,0	,0	Lokal	Security Sistem	Sistem Keamanan	Kick Bar	Critical	2657,6
1,0	3,0	144000,0	Ringan	144000,0	323,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	1560,0
5,0	83,0	2689000,0	Ringan	1912000,0	184,6	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	1510,8
1,0	,0	1028000,0	Sedang	1028000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	1549,7
,0	,0	,0	0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1511,9
2,0	147,5	9467000,0	Sedang	8192000,0	210,0	Generic	Electrical	Panel Distribusi	Panel UPS	Major	2730,2
,0	,0	,0	0	,0	,0	Generic	Civil	Lantai Bangunan	Lantai Karpet	Minor	1677,1
5,0	71,4	46538000,0	Sedang	38085000,0	38,0	Gree	Mechanical	Tata Udara	AC Split	Critical	1018,5
,0	,0	,0	0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	2645,5
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1811,7
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1650,5
1,0	208,0	3560000,0	Berat	3560000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1625,2
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Major	1554,4
,0	,0	,0	0	,0	,0	Ebara	Mechanical	Pompa	Pompa Boster	Minor	1347,8
1,0	2,0	7758000,0	Berat	7758000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1492,2
1,0	,0	366000,0	Ringan	366000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	1550,1
4,0	30,3	23968000,0	Sedang	21244000,0	119,5	Import	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Amplifier	Major	1502,9
2,0	,5	2543000,0	Sedang	1363000,0	294,0	Generic	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Minor	1312,4
1,0	,0	6551000,0	Berat	6551000,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Critical	2513,3
4,0	37,0	16646000,0	Sedang	8535000,0	62,8	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Heat Detector	Minor	2123,5
,0	,0	,0	0	,0	,0	Generic	Electrical	Panel Distribusi	LVMDP	Major	2637,0
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Hydrant System	Hydrant Box 	Critical	1186,1
1,0	239,0	3494000,0	Berat	3494000,0	,0	Lokal	Plumbing	Sanitari Sistem	Rooftank	Minor	1629,8
,0	,0	,0	0	,0	,0	Import	Electrical	Signage Gedung	Lampu Wall sign	Major	1598,9
,0	,0	,0	0	,0	,0	Lokal	Security Sistem	Sistem Keamanan	Push Button	Major	1156,1
,0	,0	,0	0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Critical	1525,6
6,0	21,3	49776000,0	Ringan	42309000,0	49,5	Gree	Mechanical	Tata Udara	AC Split	Critical	2372,2
1,0	1,0	696000,0	Sedang	696000,0	,0	Ebara	Mechanical	Pompa	Pompa Transfer	Critical	1371,2
5,0	7,2	9559000,0	Sedang	7874000,0	109,4	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	1962,0
1,0	,0	437000,0	Ringan	437000,0	,0	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Minor	1803,6
1,0	1,0	1044000,0	Sedang	1044000,0	,0	Import	Electrical	Backup Power System	Uninterruptible Power Supply	Critical	1248,9
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1487,4
,0	,0	,0	0	,0	,0	Nohmi	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Minor	1188,6
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	1519,6
5,0	6,4	12655000,0	Sedang	9059000,0	188,6	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	1359,3
,0	,0	,0	0	,0	,0	Import	Electrical	Control Panel	Control Panel Hydrant Diesel Pump	Minor	2085,9
4,0	,8	11915000,0	Sedang	9279000,0	142,3	Sharp	Mechanical	Tata Udara	AC Split	Critical	1679,2
1,0	1,0	7908000,0	Berat	7908000,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	1265,7
1,0	,0	4594000,0	Berat	4594000,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Major	1430,7
1,0	,0	332000,0	Ringan	332000,0	476,0	Sharp	Mechanical	Tata Udara	AC Split	Minor	1637,6
6,0	40,2	4450000,0	Sedang	1844000,0	87,3	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Major	1293,6
,0	,0	,0	0	,0	,0	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Minor	1934,9
4,0	75,0	12763000,0	Ringan	11982000,0	160,0	Gree	Mechanical	Tata Udara	AC Split	Major	1326,7
1,0	29,0	1098000,0	Sedang	1098000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2661,5
1,0	87,0	217000,0	Ringan	217000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Minor	1800,8
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	2115,5
1,0	2,0	483000,0	Ringan	483000,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	2248,3
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Major	1485,2
1,0	,0	270000,0	Ringan	270000,0	,0	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Major	1263,7
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED	Major	2063,0
,0	,0	,0	0	,0	,0	Grundfos	Mechanical	Pompa	Pompa Transfer	Minor	1458,4
1,0	,0	484000,0	Ringan	484000,0	,0	Generic	Security Sistem	Sistem Keamanan	Access Control 	Major	2195,2
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1631,9
,0	,0	,0	0	,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	978,6
1,0	,0	8628000,0	Berat	8628000,0	465,0	Import	Mechanical	Tata Udara	AC Ceiling	Major	1505,6
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1208,7
1,0	,0	1147000,0	Sedang	1147000,0	,0	LG	Mechanical	Tata Udara	AC Cassette	Major	2638,4
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1183,2
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Critical	1415,8
1,0	,0	189000,0	Ringan	189000,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Major	2888,1
,0	,0	,0	0	,0	,0	Perkins	Mechanical	Genset	Genset Diesel	Critical	1706,8
1,0	2,0	445000,0	Ringan	445000,0	,0	Lokal	Electrical	Panel Distribusi	LVMDP	Minor	1384,9
2,0	59,5	536000,0	Ringan	322000,0	71,0	Samsung	Mechanical	Tata Udara	AC Split	Minor	1058,0
,0	,0	,0	0	,0	,0	Generic	Civil	Atap Bangunan	Atap Beton	Minor	2644,1
1,0	,0	1062000,0	Sedang	1062000,0	,0	Generic	Civil	Lantai Bangunan	Lantai Granit	Minor	2754,3
,0	,0	,0	0	,0	,0	Lokal	Electrical	Control Panel	Control Panel AC	Minor	1160,9
2,0	,5	671000,0	Ringan	499000,0	135,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Major	2575,1
8,0	15,3	35728000,0	Sedang	22472000,0	74,3	Samsung	Mechanical	Tata Udara	AC Split	Critical	1187,2
2,0	,0	2178000,0	Sedang	1792000,0	62,0	LG	Mechanical	Tata Udara	AC Split	Minor	1144,3
4,0	81,8	39796000,0	Berat	24748000,0	117,0	Generic	Civil	Lantai Bangunan	Lantai Keramik	Major	2194,9
,0	,0	,0	0	,0	,0	Lokal	Civil	Lantai Bangunan	Lantai Keramik	Major	1638,0
3,0	58,7	8286000,0	Sedang	7585000,0	131,7	Generic	Mechanical	Tata Udara	AC VRV	Critical	2690,5
,0	,0	,0	0	,0	,0	Generic	Electrical	Control Panel	Control Panel Penerangan	Major	993,0
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Critical	2340,7
,0	,0	,0	0	,0	,0	Lokal	Mechanical	Tata Udara	AC VRV	Major	1821,2
8,0	23,5	62217000,0	Ringan	46206000,0	65,0	Gree	Mechanical	Tata Udara	AC Split	Critical	1323,0
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Wet Chemical	Major	2395,9
1,0	,0	4652000,0	Berat	4652000,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	2984,0
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Minor	1184,2
1,0	,0	593000,0	Sedang	593000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	1369,6
,0	,0	,0	0	,0	,0	Import	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Minor	2286,8
3,0	11,0	10295000,0	Sedang	8628000,0	225,3	Panasonic	Mechanical	Tata Udara	AC Split	Critical	1587,5
2,0	90,5	435000,0	Ringan	278000,0	79,5	Panasonic	Mechanical	Tata Udara	AC Cassette	Critical	2614,2
2,0	,5	4140000,0	Sedang	2869000,0	320,0	Daikin	Mechanical	Tata Udara	AC Cassette	Minor	1345,8
11,0	54,1	33566000,0	Ringan	10782000,0	44,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1115,6
2,0	88,5	977000,0	Sedang	925000,0	237,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Major	2293,1
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Minor	2672,9
,0	,0	,0	0	,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Critical	1608,0
2,0	1,5	50446000,0	Fatal	49560000,0	277,0	Generic	Plumbing	Sanitari Sistem	Jet Shower	Major	1304,7
1,0	,0	103000,0	Ringan	103000,0	325,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1672,0
1,0	,0	4052000,0	Berat	4052000,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Kotor	Major	1636,2
1,0	,0	1504000,0	Sedang	1504000,0	948,0	Lokal	Security Sistem	Sistem Keamanan	Fingerprint	Critical	1554,5
,0	,0	,0	0	,0	,0	LG	Security Sistem	Sistem Pengawasan	Monitor CCTV	Minor	1488,7
1,0	3,0	1492000,0	Sedang	1492000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Minor	2051,3
,0	,0	,0	0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Major	2829,3
5,0	23,6	59543000,0	Fatal	47780000,0	160,2	Import	Distribusi Air	Distributor Air Bersih	Ground Water Tank	Major	1090,4
3,0	40,7	48265000,0	Fatal	40031000,0	123,3	Import	Plumbing	Sanitari Sistem	Kitchen sink	Minor	1196,9
,0	,0	,0	0	,0	,0	Lokal	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Minor	1519,8
2,0	,5	3882000,0	Ringan	3438000,0	221,5	Hikvision	Security Sistem	Sistem Pengawasan	Monitor CCTV	Major	2285,6
3,0	11,7	2518000,0	Sedang	1175000,0	248,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1149,0
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2162,8
9,0	43,4	68836000,0	Berat	40869000,0	86,2	Panasonic	Mechanical	Tata Udara	AC Split	Critical	2095,9
2,0	1,0	3252000,0	Ringan	3058000,0	123,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1424,0
2,0	1,0	10332000,0	Sedang	8969000,0	270,5	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Major	1950,7
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Minor	1192,0
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Minor	1086,2
1,0	295,0	781000,0	Sedang	781000,0	338,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	2787,8
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2556,1
2,0	,0	7110000,0	Ringan	7041000,0	142,5	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1843,5
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Minor	1807,1
1,0	177,0	709000,0	Sedang	709000,0	,0	American Standard	Plumbing	Sanitari Sistem	Wastafel	Minor	1479,9
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sanitari Sistem	Kloset	Major	2153,7
6,0	2,0	17264000,0	Sedang	9365000,0	125,5	Import	Sistem Pemadam Kebakaran	Fire Pump System	Diesel Fire Pump	Critical	2481,9
2,0	,0	10346000,0	Fatal	10004000,0	477,5	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	2549,6
,0	,0	,0	0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1690,6
1,0	,0	1254000,0	Sedang	1254000,0	,0	Lokal	Sistem Telekomunikasi Gedung	Sistem Jaringan Internet	LAN (Local Area Network)	Minor	1225,0
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1810,5
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Critical	1107,5
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Minor	2456,1
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Fire Pump System	Electric Fire Pump	Critical	1570,4
,0	,0	,0	0	,0	,0	Import	Electrical	Panel Distribusi	SDP	Minor	2199,9
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	2200,1
3,0	99,0	25327000,0	Berat	9378000,0	140,0	Deutz	Mechanical	Genset	Genset Diesel	Major	1403,1
4,0	8,3	8119000,0	Ringan	5895000,0	79,5	Panasonic	Mechanical	Tata Udara	AC Split	Critical	1503,3
,0	,0	,0	0	,0	,0	Import	Electrical	Signage Gedung	Lampu Pylon Sign	Critical	1130,5
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	2557,7
2,0	,0	1748000,0	Sedang	1554000,0	286,0	Notifier	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Minor	1997,5
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	976,0
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	1599,5
1,0	32,0	3070000,0	Berat	3070000,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	1135,7
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Major	2562,8
1,0	,0	4229000,0	Berat	4229000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2328,1
7,0	81,1	22361000,0	Berat	6247000,0	55,9	Notifier	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Critical	2312,5
2,0	60,0	6026000,0	Ringan	5695000,0	312,0	Daikin	Mechanical	Tata Udara	AC Split	Major	2934,2
1,0	1,0	7412000,0	Berat	7412000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2346,6
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	2415,7
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Critical	1291,3
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	2134,1
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1598,1
,0	,0	,0	0	,0	,0	Generic	Electrical	Panel Distribusi	Panel UPS	Minor	1638,5
,0	,0	,0	0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1515,7
1,0	2,0	131000,0	Ringan	131000,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Minor	1296,7
,0	,0	,0	0	,0	,0	Lokal	Electrical	Generator Panel	Automatic Transfer Switch (ATS Panel)	Major	2660,8
,0	,0	,0	0	,0	,0	Lokal	Electrical	Panel Distribusi	SDP	Major	2078,3
,0	,0	,0	0	,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1565,4
1,0	3,0	842000,0	Sedang	842000,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1528,7
6,0	44,8	14552000,0	Sedang	8752000,0	123,2	Lokal	Electrical	Control Panel	Control Panel Hydrant Electric Pump	Major	1626,8
,0	,0	,0	0	,0	,0	Wilo	Mechanical	Pompa	Pompa Transfer	Minor	1311,7
1,0	1,0	26480000,0	Fatal	26480000,0	584,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1896,8
1,0	,0	304000,0	Ringan	304000,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Major	1853,7
4,0	8,3	20337000,0	Sedang	9897000,0	212,5	Samsung	Mechanical	Tata Udara	AC Split	Critical	1714,6
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Major	1115,5
3,0	1,0	2846000,0	Sedang	1582000,0	234,3	Lokal	Electrical	Control Panel	Control Panel AC	Critical	1941,0
1,0	62,0	1122000,0	Sedang	1122000,0	628,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	PABX	Minor	1974,3
,0	,0	,0	0	,0	,0	Generic	Electrical	Transformator (Trafo)	Trafo 3 Phase	Major	1402,4
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Critical	3165,1
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Minor	1505,9
1,0	,0	1283000,0	Sedang	1283000,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	2440,3
1,0	,0	1965000,0	Sedang	1965000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	1911,3
,0	,0	,0	0	,0	,0	Lokal	Security Sistem	Sistem Keamanan	Access Control 	Critical	1445,5
1,0	3,0	22582000,0	Fatal	22582000,0	,0	Generic	Distribusi Air	Distributor Air Bersih	Roof Tank	Minor	2572,5
,0	,0	,0	0	,0	,0	Lokal	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Minor	1298,6
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Fire Pump System	Diesel Fire Pump	Minor	2458,7
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	1235,6
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	2139,7
,0	,0	,0	0	,0	,0	Perkins	Mechanical	Genset	Genset Diesel	Major	1239,8
2,0	1,0	54723000,0	Fatal	45501000,0	363,5	Gree	Mechanical	Tata Udara	AC Split	Minor	1857,4
3,0	2,0	2378000,0	Sedang	1674000,0	224,7	Samsung	Mechanical	Tata Udara	AC Split	Critical	1255,6
,0	,0	,0	0	,0	,0	Samsung	Security Sistem	Sistem Pengawasan	Monitor CCTV	Critical	1111,7
1,0	,0	335000,0	Ringan	335000,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	DVR CCTV	Minor	2005,2
4,0	,3	12833000,0	Sedang	6454000,0	163,3	Import	Sistem Telekomunikasi Gedung	Sistem Jaringan Internet	WI-FI	Major	1536,4
8,0	57,8	13045000,0	Sedang	7044000,0	89,5	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	2037,3
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2500,0
1,0	59,0	227000,0	Ringan	227000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	2584,0
4,0	15,0	47058000,0	Berat	33456000,0	63,0	LG	Mechanical	Tata Udara	AC Split	Major	2442,4
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1334,5
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Cassette	Major	2580,6
1,0	,0	1002000,0	Sedang	1002000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	2522,8
2,0	,0	9098000,0	Ringan	8877000,0	134,5	Import	Electrical	Control Panel	Control Panel Penerangan	Major	1519,2
,0	,0	,0	0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	PABX	Minor	2388,8
1,0	,0	1021000,0	Sedang	1021000,0	,0	Wasser	Plumbing	Sanitari Sistem	Kran Air	Minor	2072,8
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1101,6
1,0	118,0	1071000,0	Sedang	1071000,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Major	1933,3
,0	,0	,0	0	,0	,0	Lokal	Civil	Lantai Bangunan	Lantai Granit	Major	1319,4
4,0	23,3	3031000,0	Sedang	1905000,0	138,5	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Kotor	Critical	1351,4
1,0	,0	42525000,0	Fatal	42525000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Minor	1961,5
,0	,0	,0	0	,0	,0	Lokal	Electrical	Control Panel	Control Panel Penerangan	Minor	1906,2
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1140,8
,0	,0	,0	0	,0	,0	Generic	Civil	Lantai Bangunan	Lantai Granit	Minor	1857,0
,0	,0	,0	0	,0	,0	Ina	Plumbing	Sanitari Sistem	Wastafel	Major	1307,5
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Hydrant System	Valve Control	Critical	2511,9
4,0	25,5	9670000,0	Sedang	6160000,0	143,3	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Critical	1469,9
1,0	,0	974000,0	Sedang	974000,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Minor	2100,7
9,0	14,1	19768000,0	Berat	9019000,0	53,9	Panasonic	Mechanical	Tata Udara	AC Split	Major	1776,1
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	2218,2
2,0	15,5	1317000,0	Sedang	1051000,0	71,5	Sharp	Mechanical	Tata Udara	AC Split	Major	1627,0
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	2503,3
1,0	,0	7483000,0	Berat	7483000,0	,0	Import	Security Sistem	Sistem Keamanan	Fingerprint	Minor	1856,9
3,0	1,0	47748000,0	Fatal	38777000,0	198,3	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1192,2
4,0	,5	2856000,0	Sedang	1196000,0	115,0	Lokal	Pencatatan Meter	Meter Air Bersih	Meter PDAM	Minor	1381,4
1,0	1,0	5926000,0	Berat	5926000,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Major	2040,6
8,0	33,8	4279000,0	Ringan	1532000,0	103,9	Panasonic	Mechanical	Tata Udara	AC Cassette	Critical	2020,9
,0	,0	,0	0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Major	1806,4
1,0	,0	1334000,0	Sedang	1334000,0	,0	Hochiki	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Major	1823,2
,0	,0	,0	0	,0	,0	Lokal	Civil	Atap Bangunan	Atap Beton	Minor	2313,7
1,0	,0	204000,0	Ringan	204000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	2557,5
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Critical	2005,3
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	1536,9
,0	,0	,0	0	,0	,0	Wilo	Mechanical	Pompa	Pompa Transfer	Major	1390,2
,0	,0	,0	0	,0	,0	Import	Distribusi Air	Distributor Air Bersih	Ground Water Tank	Critical	1406,2
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Critical	1154,2
1,0	1,0	417000,0	Ringan	417000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	1500,3
2,0	,5	7249000,0	Ringan	7160000,0	24,0	Generic	Electrical	Signage Gedung	Lampu Wall sign	Minor	1474,5
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Minor	1470,2
,0	,0	,0	0	,0	,0	Import	Distribusi Air	Distributor Air Bersih	Ground Water Tank	Major	1574,1
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu TL	Minor	968,0
2,0	15,0	4163000,0	Ringan	3960000,0	4,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Major	2027,7
,0	,0	,0	0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Critical	1179,0
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2331,4
,0	,0	,0	0	,0	,0	Import	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Major	1865,3
,0	,0	,0	0	,0	,0	Generic	Security Sistem	Sistem Keamanan	Push Button	Critical	2094,9
,0	,0	,0	0	,0	,0	Import	Electrical	Control Panel	Control Panel Pompa Transfer	Major	1273,8
2,0	1,0	1320000,0	Sedang	1267000,0	277,5	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Major	1191,0
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	1673,6
1,0	207,0	2758000,0	Berat	2758000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	1099,0
2,0	45,0	877000,0	Sedang	694000,0	113,5	Deutz	Mechanical	Genset	Genset Diesel	Minor	1534,5
1,0	27,0	1142000,0	Sedang	1142000,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	PABX	Minor	1265,6
,0	,0	,0	0	,0	,0	Lokal	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Kotor	Minor	1987,9
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Critical	1466,0
2,0	,0	10149000,0	Sedang	9187000,0	471,0	Daikin	Mechanical	Tata Udara	AC Sentral	Minor	2112,9
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Critical	1662,8
1,0	2,0	8693000,0	Berat	8693000,0	,0	Generic	Distribusi Air	Distributor Air Bersih	Roof Tank	Major	2343,5
,0	,0	,0	0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	PABX	Minor	2249,7
3,0	1,0	2803000,0	Ringan	2212000,0	290,0	Gree	Mechanical	Tata Udara	AC Split	Major	1409,5
1,0	1,0	927000,0	Sedang	927000,0	474,0	Gree	Mechanical	Tata Udara	AC Split	Major	1776,1
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	1525,5
1,0	118,0	737000,0	Sedang	737000,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	1166,5
3,0	,7	2931000,0	Sedang	1470000,0	209,7	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Major	2336,0
1,0	,0	225000,0	Ringan	225000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	2918,2
2,0	1,5	997000,0	Sedang	550000,0	162,0	Import	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Major	1147,4
4,0	45,0	40826000,0	Fatal	30137000,0	101,0	Lokal	Electrical	Signage Gedung	Lampu Pylon Sign	Minor	2052,9
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sanitari Sistem	Kloset	Major	1614,3
,0	,0	,0	0	,0	,0	Import	Electrical	Control Panel	Control Panel AC	Major	1885,3
,0	,0	,0	0	,0	,0	Import	Electrical	Panel Distribusi	Panel UPS	Major	2259,5
1,0	27,0	6719000,0	Berat	6719000,0	,0	LG	Mechanical	Tata Udara	AC Split	Minor	2253,5
1,0	,0	37812000,0	Fatal	37812000,0	250,0	Generic	Electrical	Control Panel	Control Panel AC	Major	1421,3
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Major	2255,7
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	2013,9
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1487,8
2,0	4,5	1044000,0	Sedang	948000,0	309,5	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Critical	1933,3
,0	,0	,0	0	,0	,0	Lokal	Electrical	Control Panel	Control Panel Penerangan	Minor	2030,3
2,0	91,0	2894000,0	Sedang	1927000,0	114,5	Lokal	Electrical	Lampu Penerangan	Lampu Downlight	Critical	1348,9
1,0	30,0	1050000,0	Sedang	1050000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Critical	2619,1
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Major	1031,6
2,0	,0	2381000,0	Sedang	1950000,0	61,5	Cummins	Mechanical	Genset	Genset Diesel	Major	2425,0
3,0	10,0	16352000,0	Fatal	10385000,0	228,7	Daikin	Mechanical	Tata Udara	AC Split	Critical	1335,6
,0	,0	,0	0	,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	2158,1
7,0	55,7	22621000,0	Berat	8589000,0	125,1	Samsung	Mechanical	Tata Udara	AC Split	Major	1161,9
7,0	1,0	56222000,0	Ringan	47669000,0	53,1	Sharp	Mechanical	Tata Udara	AC Split	Major	2408,6
,0	,0	,0	0	,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Partisi, GRC / Gypsum	Minor	1921,2
1,0	,0	875000,0	Sedang	875000,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED	Minor	1347,2
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Major	1354,4
1,0	1,0	119000,0	Ringan	119000,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu Downlight	Major	1097,1
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Critical	3044,5
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Minor	2337,4
,0	,0	,0	0	,0	,0	Hochiki	Sistem Prote Pok Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Minor	1505,8
2,0	1,5	1996000,0	Sedang	1598000,0	189,5	Lokal	Sistem Telekomunikasi Gedung	Sistem Jaringan Internet	LAN (Local Area Network)	Major	2577,7
,0	,0	,0	0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	2628,3
,0	,0	,0	0	,0	,0	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Critical	1879,1
1,0	,0	1038000,0	Sedang	1038000,0	,0	Import	Electrical	Panel Distribusi	SDP	Minor	1614,5
,0	,0	,0	0	,0	,0	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	1516,8
3,0	9,7	3864000,0	Ringan	2921000,0	277,7	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Critical	1655,0
1,0	1,0	1986000,0	Sedang	1986000,0	,0	Honeywell	Security Sistem	Sistem Pengawasan	DVR CCTV	Major	2244,8
2,0	3,0	45541000,0	Fatal	43630000,0	100,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Critical	1052,0
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Major	1672,0
1,0	1,0	1992000,0	Sedang	1992000,0	,0	Import	Plumbing	Sanitari Sistem	Kloset	Minor	1922,1
4,0	38,5	54034000,0	Berat	42413000,0	189,3	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	2676,5
6,0	1,5	34835000,0	Sedang	21806000,0	155,2	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1603,3
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Critical	1148,3
,0	,0	,0	0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	3052,9
,0	,0	,0	0	,0	,0	Generic	Sistem Proteksi Kebakaran Aktif	Sistem Alarm Kebakaran	Bell Alarm	Critical	2912,0
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	1253,8
8,0	33,9	59033000,0	Berat	36954000,0	117,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Critical	2379,3
,0	,0	,0	0	,0	,0	Honeywell	Security Sistem	Sistem Pengawasan	DVR CCTV	Critical	1141,0
2,0	30,5	1440000,0	Sedang	1372000,0	141,5	Generic	Electrical	Panel Distribusi	MDB	Critical	1562,1
,0	,0	,0	0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	2466,0
2,0	,5	16592000,0	Berat	8592000,0	112,0	Wasser	Plumbing	Sanitari Sistem	Kran Air	Major	1271,7
,0	,0	,0	0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Critical	2232,2
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Critical	1229,0
,0	,0	,0	0	,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1138,3
,0	,0	,0	0	,0	,0	Generic	Electrical	Backup Power System	Uninterruptible Power Supply	Major	1178,4
1,0	1,0	4605000,0	Berat	4605000,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Minor	2496,2
1,0	,0	459000,0	Sedang	459000,0	,0	Generic	Electrical	Panel Distribusi	Panel UPS	Minor	1287,1
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Critical	2275,4
,0	,0	,0	0	,0	,0	Grundfos	Mechanical	Pompa	Pompa Air Tanah	Minor	2319,6
2,0	31,0	3973000,0	Ringan	3853000,0	120,5	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	1280,5
,0	,0	,0	0	,0	,0	Import	Civil	Lantai Bangunan	Lantai Karpet	Minor	1312,8
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	1266,7
,0	,0	,0	0	,0	,0	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	3018,6
1,0	,0	8849000,0	Berat	8849000,0	,0	Import	Sistem Pemadam Kebakaran	Hydrant System	Nozzle	Major	1364,4
6,0	11,3	13931000,0	Sedang	9613000,0	78,7	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Critical	2109,1
,0	,0	,0	0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Major	1060,3
1,0	1,0	31854000,0	Fatal	31854000,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Major	1443,2
,0	,0	,0	0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Critical	2589,0
,0	,0	,0	0	,0	,0	Generic	Sistem Proteksi Kebakaran Aktif	Sistem Alarm Kebakaran	MCFA	Major	1782,5
5,0	54,4	63563000,0	Ringan	37439000,0	113,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Minor	1920,4
3,0	,0	24629000,0	Berat	10179000,0	92,7	Lokal	Electrical	Lampu Penerangan	Lampu Esensial	Major	1222,5
1,0	1,0	1629000,0	Sedang	1629000,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED	Minor	1561,0
1,0	2,0	41962000,0	Fatal	41962000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Critical	2216,6
4,0	1,0	3963000,0	Sedang	1835000,0	49,0	Generic	Mechanical	Tata Udara	FCU	Major	1868,4
4,0	,0	36284000,0	Sedang	32579000,0	69,8	Generic	Plumbing	Sanitari Sistem	Kloset	Major	1182,1
1,0	,0	399000,0	Ringan	399000,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	2228,5
6,0	10,5	13334000,0	Sedang	9585000,0	75,3	Generic	Electrical	Generator Panel	Automatic Transfer Switch (ATS Panel)	Critical	2218,6
,0	,0	,0	0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1295,5
1,0	,0	878000,0	Sedang	878000,0	,0	Import	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Minor	1981,6
1,0	3,0	6567000,0	Berat	6567000,0	,0	Import	Electrical	Control Panel	Panel PP-ME	Critical	2993,5
6,0	60,0	15700000,0	Berat	6757000,0	152,2	Ebara	Mechanical	Pompa	Pompa Boster	Critical	2868,8
1,0	148,0	2544000,0	Berat	2544000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Cassette	Minor	1571,6
5,0	,4	4546000,0	Sedang	1480000,0	80,8	Import	Electrical	Control Panel	Control Panel AC	Major	1800,7
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Cassette	Major	1609,0
1,0	1,0	1125000,0	Sedang	1125000,0	,0	Import	Plumbing	Sanitari Sistem	Floor Drain	Minor	2838,1
3,0	1,3	13044000,0	Berat	8849000,0	105,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1803,2
3,0	69,0	1585000,0	Ringan	1353000,0	297,3	Sharp	Mechanical	Tata Udara	AC Split	Critical	1377,1
,0	,0	,0	0	,0	,0	Import	Mechanical	Tata Udara	FCU	Major	2081,8
1,0	91,0	1885000,0	Sedang	1885000,0	,0	Import	Mechanical	Tata Udara	FCU	Critical	1189,5
,0	,0	,0	0	,0	,0	Import	Mechanical	Tata Udara	FCU	Major	2835,7
,0	,0	,0	0	,0	,0	Lokal	Mechanical	Tata Udara	FCU	Critical	1189,3
,0	,0	,0	0	,0	,0	Lokal	Mechanical	Tata Udara	FCU	Major	1327,4
1,0	1,0	3805000,0	Berat	3805000,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	1166,7
1,0	2,0	1581000,0	Sedang	1581000,0	,0	Lokal	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Major	1307,9
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	2249,3
1,0	2,0	1400000,0	Sedang	1400000,0	,0	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	1763,8
1,0	,0	7011000,0	Berat	7011000,0	,0	Import	Mechanical	Pompa	Pompa Chiller Water Primer	Critical	1510,6
,0	,0	,0	0	,0	,0	Grundfos	Mechanical	Pompa	Pompa Boster	Minor	1958,7
3,0	58,7	2281000,0	Sedang	1327000,0	6,7	Gree	Mechanical	Tata Udara	AC Split	Minor	1610,4
,0	,0	,0	0	,0	,0	Lokal	Civil	Lantai Bangunan	Lantai Granit	Major	1107,3
4,0	96,0	13373000,0	Sedang	6059000,0	179,3	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1034,6
,0	,0	,0	0	,0	,0	Import	Plumbing	Sanitari Sistem	Urinal	Major	2433,3
3,0	2,3	9703000,0	Berat	5166000,0	128,7	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Critical	1943,5
4,0	59,3	16088000,0	Sedang	8616000,0	165,5	KDK	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1347,7
4,0	155,0	25987000,0	Ringan	24915000,0	198,0	Import	Sistem Telekomunikasi Gedung	Telephone System	PABX	Critical	2374,7
1,0	,0	8090000,0	Berat	8090000,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Minor	2186,1
1,0	1,0	315000,0	Ringan	315000,0	,0	Generic	Security Sistem	Sistem Keamanan	Ror Rate Of Rise Heat Detector	Major	1482,6
,0	,0	,0	0	,0	,0	Import	Security Sistem	Sistem Keamanan	Ror Rate Of Rise Heat Detector	Minor	1822,8
1,0	1,0	705000,0	Sedang	705000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	1407,7
,0	,0	,0	0	,0	,0	Import	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Major	1097,3
1,0	,0	3767000,0	Berat	3767000,0	,0	Import	Electrical	Lampu Penerangan	Lampu TL LED	Minor	1844,5
1,0	1,0	215000,0	Ringan	215000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Batu Alam	Minor	2237,3
1,0	,0	1759000,0	Sedang	1759000,0	,0	Lokal	Electrical	Transformator (Trafo)	Trafo IT UPS	Minor	1642,9
1,0	119,0	953000,0	Sedang	953000,0	,0	Import	Mechanical	Tata Udara	FCU	Minor	1037,7
3,0	30,0	2621000,0	Sedang	1606000,0	218,0	Generic	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Minor	2736,8
1,0	59,0	244000,0	Ringan	244000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	1059,1
,0	,0	,0	0	,0	,0	Import	Mechanical	Tata Udara	FCU	Major	1119,4
,0	,0	,0	0	,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	2139,8
1,0	1,0	7776000,0	Berat	7776000,0	,0	Import	Mechanical	Tata Udara	FCU	Critical	2617,5
2,0	1,0	13402000,0	Berat	9380000,0	157,0	Generic	Plumbing	Sanitari Sistem	Jet Shower	Minor	2213,1
1,0	1,0	1730000,0	Sedang	1730000,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Critical	1771,2
2,0	119,5	57310000,0	Fatal	48970000,0	50,0	Generic	Electrical	Signage Gedung	Lampu Pylon Sign	Critical	1939,4
,0	,0	,0	0	,0	,0	Import	Electrical	Signage Gedung	Lampu Wall sign	Minor	1875,2
4,0	,8	14868000,0	Ringan	8106000,0	87,8	Daikin	Mechanical	Tata Udara	AC Split	Critical	2199,2
1,0	1,0	58000,0	Ringan	58000,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu Downlight	Major	1628,0
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu TL LED	Minor	2520,5
1,0	,0	4044000,0	Berat	4044000,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1630,2
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Minor	1626,5
1,0	176,0	1299000,0	Sedang	1299000,0	,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Major	1333,5
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Critical	2345,5
1,0	,0	8326000,0	Berat	8326000,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Minor	1648,2
,0	,0	,0	0	,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	1989,1
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Critical	2820,8
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sanitari Sistem	Jet Shower	Major	1537,4
1,0	206,0	255000,0	Ringan	255000,0	355,0	Samsung	Mechanical	Tata Udara	AC Split	Minor	1470,0
2,0	,5	5017000,0	Sedang	4488000,0	341,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1679,9
5,0	1,2	5805000,0	Ringan	3514000,0	109,0	Shimizu	Mechanical	Pompa	Pompa Air Tanah	Major	1172,8
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu LED Downlight	Critical	2353,6
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Major	1285,8
1,0	2,0	6272000,0	Berat	6272000,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	2265,6
,0	,0	,0	0	,0	,0	LG	Security Sistem	Sistem Pengawasan	Monitor CCTV	Critical	1898,9
,0	,0	,0	0	,0	,0	Import	Electrical	Backup Power System	Uninterruptible Power Supply	Minor	1037,3
,0	,0	,0	0	,0	,0	Import	Plumbing	Sanitari Sistem	Kloset	Minor	1475,8
1,0	2,0	93000,0	Ringan	93000,0	,0	Generic	Plumbing	Sanitari Sistem	Jet Shower	Minor	1076,0
2,0	1,0	1683000,0	Sedang	1213000,0	217,5	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Major	2741,7
2,0	1,5	3082000,0	Sedang	1673000,0	11,5	Generic	Electrical	Control Panel	Control Panel Penerangan	Major	1374,2
3,0	10,7	16729000,0	Berat	9863000,0	59,3	Panasonic	Mechanical	Tata Udara	AC Split	Major	2939,1
2,0	106,5	9445000,0	Ringan	9035000,0	50,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1983,4
,0	,0	,0	0	,0	,0	Samsung	Security Sistem	Sistem Pengawasan	Monitor CCTV	Major	1204,9
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu TL	Major	2007,7
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Downlight	Minor	1908,7
,0	,0	,0	0	,0	,0	Generic	Mechanical	Tata Udara	FCU	Minor	1632,9
3,0	,0	6639000,0	Sedang	4001000,0	262,0	Import	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	1320,0
1,0	89,0	360000,0	Sedang	360000,0	,0	Generic	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Major	2731,0
3,0	50,3	12285000,0	Berat	6792000,0	153,3	Import	Electrical	Transformator (Trafo)	Trafo IT UPS	Minor	1284,3
2,0	,5	48322000,0	Fatal	43046000,0	9,5	Lokal	Electrical	Lampu Penerangan	Lampu TL	Major	1042,8
2,0	3,0	1627000,0	Sedang	1218000,0	94,5	Samsung	Security Sistem	Sistem Pengawasan	Monitor CCTV	Critical	2804,3
,0	,0	,0	0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1807,8
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1295,1
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Critical	1488,3
,0	,0	,0	0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	PABX	Minor	1316,0
1,0	,0	1666000,0	Sedang	1666000,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Major	2227,7
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu LED	Minor	1300,6
1,0	119,0	160000,0	Ringan	160000,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED	Critical	1554,9
,0	,0	,0	0	,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1254,4
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	2574,1
,0	,0	,0	0	,0	,0	Generic	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Monitor/Layar	Major	1898,8
2,0	,0	705000,0	Ringan	359000,0	417,5	Panasonic	Mechanical	Tata Udara	AC Split	Major	1967,4
3,0	2,3	6939000,0	Sedang	5535000,0	110,7	Generic	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Critical	1160,7
4,0	1,5	3133000,0	Ringan	1639000,0	173,5	Gree	Mechanical	Tata Udara	AC Split	Major	1547,2
4,0	1,8	30058000,0	Sedang	25556000,0	60,3	Samsung	Mechanical	Tata Udara	AC Split	Major	1451,8
,0	,0	,0	0	,0	,0	Lokal	Mechanical	Sewage Treatment Plant	Commercial STP	Critical	2147,5
10,0	35,9	35776000,0	Ringan	21717000,0	58,7	Import	Electrical	Lampu Penerangan	Lampu Downlight	Critical	1507,2
2,0	,0	1548000,0	Sedang	1057000,0	184,5	Sharp	Mechanical	Tata Udara	AC Split	Major	1584,2
,0	,0	,0	0	,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	2089,4
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Critical	2002,3
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Critical	1954,9
1,0	119,0	877000,0	Sedang	877000,0	,0	Import	Electrical	Lampu Penerangan	Lampu Esensial	Minor	1446,3
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	2496,7
2,0	30,0	3760000,0	Sedang	1993000,0	97,5	Samsung	Mechanical	Tata Udara	AC Split	Minor	1782,9
5,0	30,0	20385000,0	Sedang	8419000,0	134,8	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Minor	1428,2
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1495,6
,0	,0	,0	0	,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	3077,8
6,0	30,7	108128000,0	Fatal	40545000,0	60,5	Import	Electrical	Lampu Penerangan	Lampu TL	Critical	1515,6
9,0	14,2	13680000,0	Sedang	5857000,0	90,8	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	2738,5
,0	,0	,0	0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Minor	1138,6
2,0	2,0	39715000,0	Fatal	39327000,0	290,5	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Critical	3016,7
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Major	2237,0
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	1211,0
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1827,6
4,0	111,8	53657000,0	Sedang	41486000,0	229,3	Import	Plumbing	Sanitari Sistem	Rooftank	Major	1802,6
,0	,0	,0	0	,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1929,4
1,0	1,0	150000,0	Ringan	150000,0	156,0	Gree	Mechanical	Tata Udara	AC Split	Major	1714,0
,0	,0	,0	0	,0	,0	Onda	Plumbing	Sanitari Sistem	Kran Air	Major	2490,1
,0	,0	,0	0	,0	,0	Import	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	2348,5
4,0	1,3	4583000,0	Sedang	1950000,0	138,8	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	2189,6
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	1934,6
6,0	30,2	2225000,0	Ringan	857000,0	135,2	LG	Mechanical	Tata Udara	AC Cassette	Minor	2569,0
2,0	134,0	3745000,0	Ringan	3323000,0	131,0	LG	Mechanical	Tata Udara	AC Split	Major	1603,9
3,0	1,0	40573000,0	Fatal	34044000,0	221,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1182,4
1,0	237,0	186000,0	Ringan	186000,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	PABX	Major	2499,6
1,0	,0	3463000,0	Berat	3463000,0	,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Minor	2271,6
,0	,0	,0	0	,0	,0	Import	Electrical	Signage Gedung	Lampu Pylon Sign	Minor	1393,4
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1771,4
4,0	,8	17364000,0	Ringan	9018000,0	183,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Minor	2097,1
9,0	53,3	27445000,0	Ringan	9549000,0	93,3	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Critical	1455,5
,0	,0	,0	0	,0	,0	Lokal	Electrical	Control Panel	Control Panel Penerangan	Critical	2552,7
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu TL	Minor	1378,9
4,0	30,0	5764000,0	Sedang	1949000,0	65,8	Daikin	Mechanical	Tata Udara	AC Split	Major	2371,2
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu Downlight	Major	1478,7
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu LED Strip	Major	1661,1
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Strip	Major	1281,5
,0	,0	,0	0	,0	,0	Import	Civil	Lantai Bangunan	Lantai Keramik	Minor	1429,0
,0	,0	,0	0	,0	,0	Lokal	Electrical	Signage Gedung	Lampu Pylon Sign	Minor	1894,5
,0	,0	,0	0	,0	,0	Siemens	Sistem Proteksi Kebakaran Aktif	Sistem Deteksi Kebakaran	Smoke Detector	Major	1915,8
1,0	2,0	376000,0	Ringan	376000,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	2505,4
3,0	89,0	2579000,0	Sedang	1752000,0	18,0	LG	Security Sistem	Sistem Pengawasan	Monitor CCTV	Critical	941,8
1,0	,0	453000,0	Ringan	453000,0	,0	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1419,0
7,0	21,9	35847000,0	Sedang	25513000,0	115,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Critical	1368,1
7,0	43,0	27253000,0	Sedang	16289000,0	76,6	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Critical	1867,2
,0	,0	,0	0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Major	1272,1
,0	,0	,0	0	,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	1233,6
2,0	,5	22990000,0	Fatal	22624000,0	307,5	Import	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	1741,5
3,0	,3	6249000,0	Berat	4277000,0	315,7	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Major	1583,7
1,0	2,0	3427000,0	Berat	3427000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Minor	2987,4
1,0	117,0	4551000,0	Berat	4551000,0	,0	Lokal	Arsitektur	Interior Gedung	Meja kerja	Major	2189,6
,0	,0	,0	0	,0	,0	Generic	Security Sistem	Sistem Keamanan	Push Button	Minor	1317,1
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Critical	1191,1
,0	,0	,0	0	,0	,0	Generic	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Minor	2158,7
,0	,0	,0	0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon	Minor	1302,2
1,0	1,0	1981000,0	Sedang	1981000,0	,0	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Minor	1392,5
3,0	11,0	4554000,0	Sedang	3250000,0	86,7	Import	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	1267,5
,0	,0	,0	0	,0	,0	Generic	Plumbing	Sistem Pemipaan gedung	Pemipaan Air Bersih	Major	1688,5
2,0	,5	5688000,0	Ringan	5484000,0	207,5	Lokal	Sistem Proteksi Kebakaran Aktif	Sistem Alarm Kebakaran	Bell Alarm	Major	3255,2
2,0	89,0	1948000,0	Sedang	1568000,0	424,0	Import	Electrical	Lampu Penerangan	Lampu LED	Major	2481,4
2,0	118,5	21325000,0	Fatal	19549000,0	248,5	Lokal	Plumbing	Sanitari Sistem	Kloset	Major	2404,7
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu Downlight	Minor	1062,8
,0	,0	,0	0	,0	,0	Toto	Plumbing	Sanitari Sistem	Kran Air	Minor	1710,7
,0	,0	,0	0	,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Critical	962,6
,0	,0	,0	0	,0	,0	Lokal	Civil	Lantai Bangunan	Lantai Karpet	Major	1977,2
,0	,0	,0	0	,0	,0	Generic	Arsitektur	Interior Gedung	Meja kerja	Major	2092,9
1,0	121,0	32968000,0	Fatal	32968000,0	,0	Ina	Plumbing	Sanitari Sistem	Wastafel	Major	2122,4
,0	,0	,0	0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Minor	2447,3
7,0	89,0	24942000,0	Berat	8357000,0	122,7	Lokal	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	2290,3
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR CO2	Major	2489,6
4,0	52,5	9203000,0	Sedang	6660000,0	176,5	Generic	Electrical	Lampu Penerangan	Lampu LED Bulb	Major	2016,0
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu TL LED	Major	2136,3
1,0	,0	405000,0	Sedang	405000,0	,0	Import	Plumbing	Sanitari Sistem	Urinal	Minor	2228,2
4,0	60,3	3796000,0	Sedang	1785000,0	145,0	Generic	Electrical	Lampu Penerangan	Lampu TL LED	Major	1254,0
,0	,0	,0	0	,0	,0	Generic	Electrical	Signage Gedung	Lampu Wall sign	Minor	1516,4
2,0	,0	3847000,0	Ringan	3639000,0	138,5	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1176,6
,0	,0	,0	0	,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	1387,8
,0	,0	,0	0	,0	,0	Import	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Minor	2980,0
1,0	2,0	1144000,0	Sedang	1144000,0	,0	Panasonic	Mechanical	Tata Udara	AC Split	Minor	1360,8
,0	,0	,0	0	,0	,0	Ina	Plumbing	Sanitari Sistem	Wastafel	Critical	2504,5
1,0	30,0	362000,0	Ringan	362000,0	,0	Lokal	Plumbing	Sanitari Sistem	Jet Shower	Major	1353,0
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	1535,2
2,0	30,0	7454000,0	Ringan	7097000,0	309,5	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Major	1376,3
1,0	2,0	4630000,0	Berat	4630000,0	,0	Generic	Arsitektur	Interior Gedung	Kursi	Major	1965,9
4,0	59,8	3905000,0	Ringan	2242000,0	223,0	Lokal	Security Sistem	Sistem Keamanan	Access Control 	Major	1691,9
1,0	,0	24284000,0	Fatal	24284000,0	,0	Lokal	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Minor	2392,4
1,0	2,0	387000,0	Sedang	387000,0	,0	Import	Civil	Dinding Bangunan	Dinding Tembok/Mansonry	Minor	1371,0
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED Bulb	Major	1353,9
,0	,0	,0	0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Major	1408,1
23,0	31,7	85644000,0	Sedang	33027000,0	33,8	Lokal	Civil	Lantai Bangunan	Lantai Keramik	Critical	1114,4
3,0	59,0	8426000,0	Sedang	6489000,0	97,0	Generic	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Major	1153,7
3,0	1,0	31481000,0	Fatal	29252000,0	161,7	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Major	1690,9
,0	,0	,0	0	,0	,0	Toto	Plumbing	Sanitari Sistem	Kran Air	Major	1007,5
1,0	1,0	2596000,0	Berat	2596000,0	,0	Lokal	Arsitektur	Interior Gedung	Kursi	Minor	1423,3
1,0	1,0	1098000,0	Sedang	1098000,0	,0	Bosch	Security Sistem	Sistem Pengawasan	Kamera CCTV	Minor	1740,7
,0	,0	,0	0	,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon	Minor	1268,1
1,0	237,0	394000,0	Sedang	394000,0	116,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Bulb	Major	2351,6
,0	,0	,0	0	,0	,0	Lokal	Arsitektur	Interior Gedung	Kursi	Major	1434,9
3,0	1,0	683000,0	Ringan	500000,0	20,0	Generic	Sistem Telekomunikasi Gedung	Telephone System	PABX	Major	1069,8
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu T5	Major	1311,0
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED	Minor	1161,4
,0	,0	,0	0	,0	,0	Generic	Sistem Pemadam Kebakaran	Hydrant System	Valve Control	Critical	1589,2
1,0	,0	1781000,0	Sedang	1781000,0	,0	Generic	Plumbing	Sanitari Sistem	Kloset	Minor	2597,4
3,0	29,7	2984000,0	Sedang	1434000,0	184,3	LG	Mechanical	Tata Udara	AC Split	Major	1641,8
2,0	,0	3718000,0	Sedang	2986000,0	220,5	Import	Mechanical	Pompa	Pompa Chiller Water Primer	Major	1624,7
1,0	,0	940000,0	Sedang	940000,0	,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Major	2340,4
3,0	,7	2721000,0	Sedang	1845000,0	85,0	Generic	Mechanical	Pompa	Pompa Chiller Water Sekunder	Major	2558,5
5,0	2,4	77191000,0	Sedang	43294000,0	51,8	Generic	Mechanical	Pompa	Pompa Chiller Water Sekunder	Critical	1302,2
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1400,3
5,0	24,0	6785000,0	Sedang	1699000,0	180,8	Generic	Sistem Telekomunikasi Gedung	Telephone System	PABX	Critical	2375,7
2,0	134,5	5799000,0	Sedang	4448000,0	41,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Minor	1197,6
1,0	,0	283000,0	Ringan	283000,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Minor	2032,4
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	2306,0
,0	,0	,0	0	,0	,0	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Major	2089,6
,0	,0	,0	0	,0	,0	LG	Mechanical	Tata Udara	AC Split	Major	2238,1
,0	,0	,0	0	,0	,0	Lokal	Arsitektur	Interior Gedung	Kursi	Minor	1615,5
,0	,0	,0	0	,0	,0	Import	Arsitektur	Interior Gedung	Kursi	Major	2272,5
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu Downlight	Critical	1769,2
2,0	1,5	718000,0	Ringan	476000,0	28,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Critical	1942,1
9,0	24,1	56165000,0	Sedang	49589000,0	109,9	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Critical	1999,6
,0	,0	,0	0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Telephone System	Pesawat Telepon	Major	2089,3
1,0	,0	1738000,0	Sedang	1738000,0	,0	Toto	Plumbing	Sanitari Sistem	Wastafel	Major	2283,6
1,0	2,0	159000,0	Ringan	159000,0	,0	American Standard	Plumbing	Sanitari Sistem	Wastafel	Major	2884,4
5,0	18,6	11271000,0	Ringan	4852000,0	169,2	Import	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Major	1375,8
2,0	1,5	7213000,0	Ringan	6829000,0	329,5	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	1196,9
1,0	,0	397000,0	Sedang	397000,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Major	1607,6
,0	,0	,0	0	,0	,0	Generic	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Minor	2173,9
6,0	29,5	20469000,0	Ringan	9258000,0	123,2	Lokal	Plumbing	Sanitari Sistem	Rooftank	Critical	2645,3
,0	,0	,0	0	,0	,0	Import	Distribusi Air	Distributor Air Bersih	Ground Water Tank	Critical	2189,6
3,0	,3	512000,0	Ringan	340000,0	146,0	Panasonic	Mechanical	Tata Udara	AC Split	Major	1803,5
,0	,0	,0	0	,0	,0	Lokal	Plumbing	Sanitari Sistem	Kloset	Critical	1805,9
1,0	60,0	8764000,0	Berat	8764000,0	,0	Import	Sistem Telekomunikasi Gedung	Telephone System	PABX	Major	1667,7
,0	,0	,0	0	,0	,0	Axis	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1870,8
1,0	1,0	9041000,0	Berat	9041000,0	,0	Deutz	Mechanical	Genset	Genset Diesel	Major	1720,9
1,0	1,0	1600000,0	Sedang	1600000,0	,0	Generic	Electrical	Lampu Penerangan	Lampu LED Downlight	Minor	1617,6
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Major	2429,9
,0	,0	,0	0	,0	,0	Generic	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Cartridge	Critical	3035,3
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Major	1734,4
,0	,0	,0	0	,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Critical	1253,8
4,0	9,0	3537000,0	Sedang	1984000,0	131,3	Generic	Sistem Pemadam Kebakaran	Hydrant System	Nozzle	Critical	1366,3
,0	,0	,0	0	,0	,0	Lokal	Sistem Telekomunikasi Gedung	Sistem Audio dan Video	Video Wall	Minor	1933,7
2,0	17,5	3031000,0	Sedang	1921000,0	28,0	Lokal	Sistem Pemadam Kebakaran	Hydrant System	Selang Hidrant	Critical	1812,0
,0	,0	,0	0	,0	,0	American Standard	Plumbing	Sanitari Sistem	Wastafel	Major	1086,8
,0	,0	,0	0	,0	,0	Samsung	Mechanical	Tata Udara	AC Split	Critical	1201,0
,0	,0	,0	0	,0	,0	Grundfos	Mechanical	Pompa	Pompa Air Tanah	Critical	1321,4
2,0	14,5	339000,0	Ringan	251000,0	177,0	Generic	Plumbing	Sanitari Sistem	Kloset	Major	2890,4
,0	,0	,0	0	,0	,0	Lokal	Plumbing	Sanitari Sistem	Kloset	Minor	1376,4
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Critical	1202,4
1,0	1,0	119000,0	Ringan	119000,0	,0	Generic	Arsitektur	Interior Gedung	Meja kerja	Minor	1433,5
4,0	,3	11036000,0	Sedang	9016000,0	226,5	Import	Arsitektur	Interior Gedung	Lemari/Loker	Major	2526,6
1,0	32,0	1218000,0	Sedang	1218000,0	331,0	Generic	Electrical	Lampu Penerangan	Lampu TL	Minor	2597,3
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu LED Bulb	Critical	1863,9
1,0	,0	4423000,0	Berat	4423000,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED Bulb	Major	1561,5
,0	,0	,0	0	,0	,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Bulb	Major	1586,1
2,0	44,5	1507000,0	Sedang	1391000,0	80,5	Panasonic	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	1155,0
3,0	1,3	14770000,0	Berat	7881000,0	146,0	Import	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Major	1113,4
,0	,0	,0	0	,0	,0	Generic	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Major	2035,2
1,0	210,0	1639000,0	Sedang	1639000,0	,0	Import	Plumbing	Sanitari Sistem	Jet Shower	Major	1280,7
2,0	60,0	3963000,0	Berat	2088000,0	81,5	Lokal	Plumbing	Sanitari Sistem	Jet Shower	Major	2446,8
3,0	40,3	1704000,0	Sedang	696000,0	86,3	Generic	Sistem Proteksi Kebakaran Aktif	Sistem Alarm Kebakaran	MCFA	Major	1301,4
3,0	1,3	12123000,0	Sedang	9516000,0	292,0	Lokal	Electrical	Lampu Penerangan	Lampu LED Downlight	Major	2636,2
,0	,0	,0	0	,0	,0	Import	Electrical	Lampu Penerangan	Lampu LED Downlight	Major	1962,7
2,0	1,5	296000,0	Ringan	213000,0	355,0	Import	Arsitektur	Pintu dan Jendela	Pintu Kayu/HPL	Minor	1392,7
,0	,0	,0	0	,0	,0	Daikin	Mechanical	Tata Udara	AC Split	Minor	1238,0
1,0	266,0	6664000,0	Berat	6664000,0	,0	LG	Mechanical	Tata Udara	AC Split	Major	1458,2
,0	,0	,0	0	,0	,0	Generic	Distribusi Air	Distributor Air Bersih	Roof Tank	Major	2373,6
3,0	10,3	2423000,0	Ringan	1859000,0	87,7	Hikvision	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	2314,7
,0	,0	,0	0	,0	,0	Generic	Security Sistem	Sistem Keamanan	Fingerprint	Minor	1460,7
1,0	,0	7514000,0	Berat	7514000,0	,0	Krisbow	Ventilasi Sistem	Sistem Sirkulasi Udara	Exhaust Fan	Minor	2090,6
3,0	81,0	9674000,0	Berat	5356000,0	167,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Critical	1812,4
3,0	70,0	2964000,0	Sedang	1153000,0	193,3	Sharp	Mechanical	Tata Udara	AC Split	Critical	2222,2
,0	,0	,0	0	,0	,0	Import	Electrical	Power Cable & Wiring System	Wiring System (Sistem Instalasi Kabel)	Critical	2200,7
,0	,0	,0	0	,0	,0	Import	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAR Dry Powder Stored Pressure	Critical	1658,5
,0	,0	,0	0	,0	,0	Import	Plumbing	Sanitari Sistem	Kloset	Minor	2507,1
4,0	29,8	1794000,0	Ringan	1044000,0	209,5	American Standard	Plumbing	Sanitari Sistem	Wastafel	Minor	1810,8
,0	,0	,0	0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1245,2
,0	,0	,0	0	,0	,0	Deutz	Mechanical	Genset	Genset Diesel	Critical	2622,8
,0	,0	,0	0	,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1143,3
3,0	30,0	1671000,0	Ringan	931000,0	13,3	Onda	Plumbing	Sanitari Sistem	Kran Air	Major	2044,8
4,0	1,0	6201000,0	Ringan	4310000,0	211,3	Daikin	Mechanical	Tata Udara	AC Split	Critical	1663,8
,0	,0	,0	0	,0	,0	Import	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Minor	1276,2
,0	,0	,0	0	,0	,0	Generic	Electrical	Transformator (Trafo)	Trafo IT UPS	Critical	2744,2
1,0	177,0	723000,0	Sedang	723000,0	,0	Generic	Civil	Atap Bangunan	Atap Seng	Minor	2554,2
1,0	,0	492000,0	Ringan	492000,0	,0	Sharp	Mechanical	Tata Udara	AC Split	Major	1839,6
1,0	1,0	370000,0	Sedang	370000,0	,0	Gree	Mechanical	Tata Udara	AC Split	Major	2010,9
3,0	30,3	6229000,0	Sedang	4185000,0	193,7	Generic	Electrical	Lampu Penerangan	Lampu TL	Major	2200,8
4,0	,8	4098000,0	Sedang	1244000,0	125,5	Import	Electrical	Lampu Penerangan	Lampu UV	Major	2110,6
6,0	20,3	4611000,0	Sedang	1581000,0	135,7	Lokal	Plumbing	Sanitari Sistem	Rooftank	Critical	1177,2
1,0	89,0	1838000,0	Berat	1838000,0	,0	Lokal	Sistem Pemadam Kebakaran	Alat Pemadam Api Portable	APAB Dry Powder	Major	1822,7
,0	,0	,0	0	,0	,0	Generic	Electrical	Lampu Penerangan	Lampu Downlight	Critical	2325,6
,0	,0	,0	0	,0	,0	Generic	Electrical	Backup Power System	Uninterruptible Power Supply	Critical	1082,5
,0	,0	,0	0	,0	,0	Dahua	Security Sistem	Sistem Pengawasan	Kamera CCTV	Major	1079,2
2,0	29,5	9279000,0	Sedang	8197000,0	438,5	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Major	1508,6
1,0	,0	276000,0	Ringan	276000,0	,0	Lokal	Arsitektur	Interior Gedung	Plafon Gypsum / GRC	Minor	1969,0
3,0	,7	3236000,0	Sedang	1717000,0	146,3	Import	Arsitektur	Pintu dan Jendela	Pintu Kaca Hidrolik	Major	1430,5
1,0	,0	239000,0	Ringan	239000,0	,0	Mitsubishi	Mechanical	Tata Udara	AC Split	Major	2154,5
...`;

  // Dataset dipisahkan berdasar baris data utuh baru
  const finalDatasetRows = completeDatasetString.trim().split('\n').map(line => line.split('\t'));

  // ── 2. EKSTRAKSI DAN INSERT DATA REFERENSI (MERK, KATEGORI, DLL) ──────────────────
  console.log('📋  Menyiapkan data lookup dinamis dari dataset...');

  const uniqueMerks = Array.from(new Set(finalDatasetRows.map(r => r[6]?.trim()).filter(Boolean)));
  const uniqueKategoris = Array.from(new Set(finalDatasetRows.map(r => r[7]?.trim()).filter(Boolean)));
  const uniqueSubKats = Array.from(new Set(finalDatasetRows.map(r => r[8]?.trim()).filter(Boolean)));
  const uniqueTipes = Array.from(new Set(finalDatasetRows.map(r => r[9]?.trim()).filter(Boolean)));

  // Distribusi gedung statis / opsional untuk variasi relasi
  const buildingsPool = ['Gedung Utama', 'Gedung A', 'Gedung B', 'Gedung C', 'Gedung D', 'Gedung E', 'Gedung Parkir', 'Gedung Servis'];

  await prisma.merk.createMany({ data: uniqueMerks.map((nama, i) => ({ id: crypto.randomUUID(), kode: `MRK-${String(i+1).padStart(3, '0')}`, nama })) });
  await prisma.kategori.createMany({ data: uniqueKategoris.map((nama, i) => ({ id: crypto.randomUUID(), kode: `KAT-${String(i+1).padStart(3, '0')}`, nama })) });
  await prisma.subKategori.createMany({ data: uniqueSubKats.map((nama, i) => ({ id: crypto.randomUUID(), kode: `SKT-${String(i+1).padStart(3, '0')}`, nama })) });
  await prisma.tipe.createMany({ data: uniqueTipes.map((nama, i) => ({ id: crypto.randomUUID(), kode: `TPE-${String(i+1).padStart(3, '0')}`, nama })) });

  const merkMap = Object.fromEntries((await prisma.merk.findMany()).map(r => [r.nama.toLowerCase(), r.id]));
  const kategoriMap = Object.fromEntries((await prisma.kategori.findMany()).map(r => [r.nama.toLowerCase(), r.id]));
  const subKatMap = Object.fromEntries((await prisma.subKategori.findMany()).map(r => [r.nama.toLowerCase(), r.id]));
  const tipeMap = Object.fromEntries((await prisma.tipe.findMany()).map(r => [r.nama.toLowerCase(), r.id]));

  // ── 3. PREPARASI PENGGUNA DAN PERUSAHAAN UTAMA (PT KIRA) ───────────────────
  console.log(`👤🏢 Menyiapkan data User dan Perusahaan...`);
  const defaultPassword = await bcrypt.hash('admin', 10);
  const mainUserId = '115deaf4-d9f2-45ea-9c07-44d94d05d59c';
  const mainCompanyId = 'c0a80101-1234-4567-89ab-cdef12345678';

  const usersToInsert: any[] = [{ id: mainUserId, name: 'Admin KIRA', email: 'admin@perusahaan.com', password: defaultPassword, role: 'admin' }];
  await prisma.user.createMany({ data: usersToInsert });

  await prisma.company.create({
    data: { id: mainCompanyId, company_name: 'PT KIRA Multi Industri', license_status: 'Active', owner_id: mainUserId },
  });

  await prisma.companyMember.create({
    data: { id_user: mainUserId, id_perusahaan: mainCompanyId, role: 'Admin', joined_at: addMonths(TODAY, -18) },
  });

  // Insert Gedung dari static pool
  const gedungToInsert = buildingsPool.map(nama => ({
    id: crypto.randomUUID(),
    id_perusahaan: mainCompanyId,
    nama: nama,
    kode: nama.replace('Gedung ', '').toUpperCase().replace(/\s/g, '_'),
  }));
  await prisma.gedung.createMany({ data: gedungToInsert });
  const gedungMap = Object.fromEntries(gedungToInsert.map(g => [g.nama.toLowerCase(), g.id]));

  // ── 4. TEKNISI (sebagai User dengan role='teknisi') ───────────────────────
  console.log(`🔩 Menyiapkan data Teknisi sebagai User...`);
  const teknisiPassword = await bcrypt.hash('teknisi', 10);

  const rawTechnicians = [
    { name: 'Budi Santoso',    email: 'budi.santoso@teknisi.kira.id',    phone: '081234560001', specialization: 'Mechanical',      experience_years: 8,  teknisi_status: 'Tersedia' },
    { name: 'Ahmad Fauzi',     email: 'ahmad.fauzi@teknisi.kira.id',     phone: '081234560002', specialization: 'Mechanical',      experience_years: 12, teknisi_status: 'Tersedia' },
    { name: 'Rizki Pratama',   email: 'rizki.pratama@teknisi.kira.id',   phone: '081234560003', specialization: 'Mechanical',      experience_years: 5,  teknisi_status: 'Ditugaskan' },
    { name: 'Rendi Prakoso',   email: 'rendi.prakoso@teknisi.kira.id',   phone: '081234560004', specialization: 'Mechanical',      experience_years: 2,  teknisi_status: 'Tidak Aktif' },
    { name: 'Deni Kurniawan',  email: 'deni.kurniawan@teknisi.kira.id',  phone: '081234560005', specialization: 'Electrical',      experience_years: 10, teknisi_status: 'Tersedia' },
    { name: 'Eko Saputro',     email: 'eko.saputro@teknisi.kira.id',     phone: '081234560006', specialization: 'Electrical',      experience_years: 7,  teknisi_status: 'Tersedia' },
    { name: 'Fajar Nugroho',   email: 'fajar.nugroho@teknisi.kira.id',   phone: '081234560007', specialization: 'Electrical',      experience_years: 3,  teknisi_status: 'Ditugaskan' },
    { name: 'Sigit Purnomo',   email: 'sigit.purnomo@teknisi.kira.id',   phone: '081234560008', specialization: 'Electrical',      experience_years: 11, teknisi_status: 'Tersedia' },
    { name: 'Hendra Wijaya',   email: 'hendra.wijaya@teknisi.kira.id',   phone: '081234560010', specialization: 'HVAC',            experience_years: 9,  teknisi_status: 'Tersedia' },
    { name: 'Irwan Susanto',   email: 'irwan.susanto@teknisi.kira.id',   phone: '081234560011', specialization: 'HVAC',            experience_years: 6,  teknisi_status: 'Tersedia' },
    { name: 'Joko Wibowo',     email: 'joko.wibowo@teknisi.kira.id',     phone: '081234560013', specialization: 'Civil',           experience_years: 15, teknisi_status: 'Tersedia' },
    { name: 'Lukman Hakim',    email: 'lukman.hakim@teknisi.kira.id',    phone: '081234560016', specialization: 'Plumbing',         experience_years: 8,  teknisi_status: 'Tersedia' },
    { name: 'Muhamad Iqbal',   email: 'muhamad.iqbal@teknisi.kira.id',   phone: '081234560018', specialization: 'Security Sistem', experience_years: 6,  teknisi_status: 'Tersedia' },
    { name: 'Ogi Firmansyah',  email: 'ogi.firmansyah@teknisi.kira.id',  phone: '081234560020', specialization: 'Fire Protection', experience_years: 7,  teknisi_status: 'Tersedia' },
  ];

  const techniciansToInsert = rawTechnicians.map((t) => ({
    id: crypto.randomUUID(),
    role: 'teknisi',
    password: teknisiPassword,
    id_perusahaan: mainCompanyId,
    ...t,
  }));
  await prisma.user.createMany({ data: techniciansToInsert });

  await prisma.companyMember.createMany({
    data: techniciansToInsert.map((t) => ({
      id_user: t.id,
      id_perusahaan: mainCompanyId,
      role: 'teknisi',
      joined_at: addMonths(TODAY, -randInt(1, 12)),
    })),
  });

  const techSpecByCategory: Record<string, string[]> = {
    'mechanical':                      ['Mechanical', 'HVAC'],
    'ventilasi sistem':                ['HVAC', 'Mechanical'],
    'electrical':                      ['Electrical'],
    'plumbing':                        ['Plumbing', 'Civil'],
    'civil':                           ['Civil'],
    'arsitektur':                      ['Civil'],
    'security sistem':                 ['Security Sistem'],
    'sistem proteksi kebakaran aktif': ['Fire Protection'],
    'sistem pemadam kebakaran':        ['Fire Protection'],
    'distribusi air':                  ['Plumbing', 'Civil'],
    'sistem telekomunikasi gedung':    ['Electrical'],
    'pencatatan meter':                ['Electrical'],
  };

  // ── 5. GENERATE ASSETS, MAINTENANCE & RUL ────────────────────────────────
  console.log(`📦🔧🔮 Menyiapkan data Asset, Maintenance, dan Prediksi RUL berdasarkan dataset...`);

  const assetsToInsert: any[] = [];
  const maintenancesToInsert: any[] = [];
  const maintenanceLogsToInsert: any[] = [];
  const predictionsToInsert: any[] = [];

  const jenisKerusakanPool = ['Mati mendadak', 'Kebocoran', 'Retak/pecah', 'Getaran berlebihan', 'Koneksi terputus', 'Korsleting', 'Aus/abrasi', 'Overheating'];
  const penyebabPool = ['Overload', 'Kelembaban tinggi', 'Usia pakai', 'Faktor lingkungan', 'Kurang pelumasan', 'Korosi', 'Human error', 'Tegangan tidak stabil'];
  const sparePartPool = ['PCB board', 'Seal ring', 'Kompresor', 'Kapasitor', 'Filter udara', 'Bearing', 'Valve', 'Gasket', null];

  function addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  let assetIndex = 1;

  for (const row of finalDatasetRows) {
    if (row.length < 12) continue;

    // Menyesuaikan mapping kolom dari format dataset baru (kolom 1-12)
    const maint_count = Math.round(parseIndoNum(row[0]));
    const avg_downtime = parseIndoNum(row[1]);
    const total_cost = parseIndoNum(row[2]);
    const mode_severity = row[3].trim();
    const max_cost = parseIndoNum(row[4]);
    const predicted_rul = parseIndoNum(row[5]);
    const merkStr = row[6].trim();
    const kategoriStr = row[7].trim();
    const subKatStr = row[8].trim();
    const tipeStr = row[9].trim();
    const criticality = row[10].trim();
    const noised_umur = parseIndoNum(row[11]);

    // Mengambil gedung random untuk variasi data
    const randomBuildingName = pick(buildingsPool);
    const gedungId = gedungMap[randomBuildingName.toLowerCase()] ?? null;

    const assetId = crypto.randomUUID();
    const merkId = merkMap[merkStr.toLowerCase()] ?? null;
    const kategoriId = kategoriMap[kategoriStr.toLowerCase()] ?? null;
    const subKategoriId = subKatMap[subKatStr.toLowerCase()] ?? null;
    const tipeId = tipeMap[tipeStr.toLowerCase()] ?? null;

    let translatedSeverity = 'Low';
    if (mode_severity === 'Sedang') translatedSeverity = 'Medium';
    if (mode_severity === 'Berat')  translatedSeverity = 'High';
    if (mode_severity === 'Fatal')  translatedSeverity = 'Critical';

    let lastMaintenanceId: string | null = null;
    let lastMaintenanceStatus = 'Completed';

    if (maint_count > 0) {
      const cost_per_maint = total_cost / maint_count;
      const downtimeHours = Math.max(1, avg_downtime);

      for (let m = 0; m < maint_count; m++) {
        const mId = crypto.randomUUID();
        lastMaintenanceId = mId;
        const isLast = m === maint_count - 1;

        let scheduledDate: Date;
        if (!isLast) {
          scheduledDate = new Date(addMonths(TODAY, -randInt(2, 12)));
          scheduledDate.setDate(randInt(1, 27));
        } else {
          scheduledDate = addDays(TODAY, -randInt(0, 45));
        }

        const completionDate = new Date(scheduledDate.getTime() + downtimeHours * 60 * 60 * 1000);
        const daysAgo = (TODAY.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24);
        const scheduledLogAt = addDays(scheduledDate, -randInt(2, 5));

        let mStatus = 'Completed';
        if (isLast && daysAgo <= 10) {
          mStatus = daysAgo >= 2 ? 'In Progress' : 'Scheduled';
        }

        if (isLast) lastMaintenanceStatus = mStatus;

        const assignedUserId = usersToInsert[0].id;
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
          penyebab:              pick(penyebabPool),
          spare_part_digunakan: pick(sparePartPool),
          created_at: scheduledLogAt,
        });

        // Logs timeline
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

    let assetStatus = 'Active';
    if (lastMaintenanceStatus === 'In Progress' || lastMaintenanceStatus === 'Scheduled') {
      assetStatus = 'Maintenance';
    }

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

    predictionsToInsert.push({
      id: crypto.randomUUID(),
      id_asset: assetId,
      id_maintenance: lastMaintenanceId,
      maintenance_count: maint_count,
      average_down_time: avg_downtime,
      total_maintenance_cost: total_cost,
      max_maintenance_cost: max_cost,
      mode_severity: mode_severity === '0' ? 'Normal' : mode_severity,
      predicted_rul: predicted_rul > 0 ? predicted_rul : noised_umur,
      recorded_at: TODAY,
    });

    assetIndex++;
  }

  await prisma.asset.createMany({ data: assetsToInsert });
  await prisma.maintenance.createMany({ data: maintenancesToInsert });
  await prisma.maintenanceLog.createMany({ data: maintenanceLogsToInsert });
  await prisma.assetPredictionHistory.createMany({ data: predictionsToInsert });

  // ── 6. TICKETS ────────────────────────────────────────────────────────────
  console.log(`🎫 Menyiapkan data Ticket...`);

  const ticketTitles = ['AC tidak dingin', 'Kebocoran pipa air', 'Lampu ruangan mati', 'Exhaust fan rusak', 'Panel listrik trip', 'Kamera CCTV offline'];
  const ticketDescriptions = ['Suhu ruangan tidak turun semenjak pagi.', 'Ditemukan rembesan air pada dinding koridor.', 'Lampu utama mati total.', 'Mesin mengeluarkan bunyi kasar.', 'Aliran daya mendadak putus.', 'Koneksi terputus ke server pusat.'];

  const ticketsToInsert = ticketTitles.map((title, i) => {
    const createdDaysAgo = randInt(1, 30);
    const createdAt = addDays(TODAY, -createdDaysAgo);
    return {
      id: crypto.randomUUID(),
      id_perusahaan: mainCompanyId,
      id_asset: assetsToInsert[i % assetsToInsert.length].id,
      id_reporter: pick(techniciansToInsert).id,
      id_assigned: pick(techniciansToInsert).id,
      title,
      description: ticketDescriptions[i],
      priority: pick(['Low', 'Medium', 'High', 'Critical']),
      status: 'Closed',
      maintenance_id: null,
      resolved_at: addDays(createdAt, randInt(1, 5)),
      created_at: createdAt,
      updated_at: createdAt,
    };
  });

  await (prisma as any).ticket.createMany({ data: ticketsToInsert });

  console.log('\n✅ SEEDING SELESAI!');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });