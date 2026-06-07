import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL || ''),
});

// ── helpers ──────────────────────────────────────────────────────────────────

/** Return a Date exactly `months` calendar months offset from `base`. */
function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Random integer in [min, max] inclusive. */
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random element from array. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
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
  // Lookup tables (no FK dependencies at this point — assets already deleted)
  await prisma.merk.deleteMany({});
  await prisma.kategori.deleteMany({});
  await prisma.subKategori.deleteMany({});
  await prisma.tipe.deleteMany({});

  // ──────────────────────────────────────────────────────────────────────────
  // 0. LOOKUP TABLES (merk, kategori, sub_kategori, tipe)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📋  Menyiapkan data lookup (merk, kategori, sub_kategori, tipe)...');

  await prisma.merk.createMany({
    data: [
      { kode: 'MRK-001', nama: 'Generic' },       { kode: 'MRK-002', nama: 'Lokal' },
      { kode: 'MRK-003', nama: 'Import' },         { kode: 'MRK-004', nama: 'Mitsubishi' },
      { kode: 'MRK-005', nama: 'Panasonic' },      { kode: 'MRK-006', nama: 'Daikin' },
      { kode: 'MRK-007', nama: 'LG' },             { kode: 'MRK-008', nama: 'Gree' },
      { kode: 'MRK-009', nama: 'Samsung' },        { kode: 'MRK-010', nama: 'Sharp' },
      { kode: 'MRK-011', nama: 'Hikvision' },      { kode: 'MRK-012', nama: 'Bosch' },
      { kode: 'MRK-013', nama: 'Dahua' },          { kode: 'MRK-014', nama: 'Hochiki' },
      { kode: 'MRK-015', nama: 'Notifier' },       { kode: 'MRK-016', nama: 'Grundfos' },
      { kode: 'MRK-017', nama: 'Krisbow' },        { kode: 'MRK-018', nama: 'Perkins' },
      { kode: 'MRK-019', nama: 'Axis' },           { kode: 'MRK-020', nama: 'Ina' },
      { kode: 'MRK-021', nama: 'KDK' },            { kode: 'MRK-022', nama: 'Onda' },
      { kode: 'MRK-023', nama: 'Toto' },           { kode: 'MRK-024', nama: 'Wasser' },
      { kode: 'MRK-025', nama: 'American Standard' }, { kode: 'MRK-026', nama: 'Cummins' },
      { kode: 'MRK-027', nama: 'Deutz' },          { kode: 'MRK-028', nama: 'Ebara' },
      { kode: 'MRK-029', nama: 'Honeywell' },      { kode: 'MRK-030', nama: 'Siemens' },
      { kode: 'MRK-031', nama: 'Bingkai' },        { kode: 'MRK-032', nama: 'Carrier' },
      { kode: 'MRK-033', nama: 'Caterpillar' },    { kode: 'MRK-034', nama: 'Fuji' },
      { kode: 'MRK-035', nama: 'Honda' },          { kode: 'MRK-036', nama: 'Hyundai' },
      { kode: 'MRK-037', nama: 'Maspion' },        { kode: 'MRK-038', nama: 'Midea' },
      { kode: 'MRK-039', nama: 'Mitsukoshi' },     { kode: 'MRK-040', nama: 'Miyako' },
      { kode: 'MRK-041', nama: 'Nohmi' },          { kode: 'MRK-042', nama: 'Otis' },
      { kode: 'MRK-043', nama: 'Reliable' },       { kode: 'MRK-044', nama: 'Schindler' },
      { kode: 'MRK-045', nama: 'Shimizu' },        { kode: 'MRK-046', nama: 'Trane' },
      { kode: 'MRK-047', nama: 'Tyco' },           { kode: 'MRK-048', nama: 'Viking' },
      { kode: 'MRK-049', nama: 'Wilo' },           { kode: 'MRK-050', nama: 'Yamaha' },
      { kode: 'MRK-051', nama: 'York' },
    ],
    skipDuplicates: true,
  });

  await prisma.kategori.createMany({
    data: [
      { kode: 'KAT-001', nama: 'Mechanical' },
      { kode: 'KAT-002', nama: 'Electrical' },
      { kode: 'KAT-003', nama: 'Arsitektur' },
      { kode: 'KAT-004', nama: 'Security Sistem' },
      { kode: 'KAT-005', nama: 'Civil' },
      { kode: 'KAT-006', nama: 'Plumbing' },
      { kode: 'KAT-007', nama: 'Sistem Pemadam Kebakaran' },
      { kode: 'KAT-008', nama: 'Sistem Telekomunikasi Gedung' },
      { kode: 'KAT-009', nama: 'Sistem Proteksi Kebakaran Aktif' },
      { kode: 'KAT-010', nama: 'Ventilasi Sistem' },
      { kode: 'KAT-011', nama: 'Distribusi Air' },
      { kode: 'KAT-012', nama: 'Pencatatan Meter' },
      { kode: 'KAT-013', nama: 'Latihan Balakar' },
      { kode: 'KAT-014', nama: 'Sistem Energi' },
      { kode: 'KAT-015', nama: 'Sistem Transportasi Gedung' },
    ],
    skipDuplicates: true,
  });

  await prisma.subKategori.createMany({
    data: [
      { kode: 'SKT-001', nama: 'Tata Udara' },           { kode: 'SKT-002', nama: 'Lampu Penerangan' },
      { kode: 'SKT-003', nama: 'Sistem Pengawasan' },     { kode: 'SKT-004', nama: 'Sanitari Sistem' },
      { kode: 'SKT-005', nama: 'Alat Pemadam Api Portable' }, { kode: 'SKT-006', nama: 'Pintu dan Jendela' },
      { kode: 'SKT-007', nama: 'Interior Gedung' },       { kode: 'SKT-008', nama: 'Dinding Bangunan' },
      { kode: 'SKT-009', nama: 'Telephone System' },      { kode: 'SKT-010', nama: 'Sistem Sirkulasi Udara' },
      { kode: 'SKT-011', nama: 'Panel Distribusi' },      { kode: 'SKT-012', nama: 'Sistem Deteksi Kebakaran' },
      { kode: 'SKT-013', nama: 'Signage Gedung' },        { kode: 'SKT-014', nama: 'Control Panel' },
      { kode: 'SKT-015', nama: 'Lantai Bangunan' },       { kode: 'SKT-016', nama: 'Power Cable & Wiring System' },
      { kode: 'SKT-017', nama: 'Distributor Air Bersih' }, { kode: 'SKT-018', nama: 'Pompa' },
      { kode: 'SKT-019', nama: 'Sistem Keamanan' },       { kode: 'SKT-020', nama: 'Genset' },
      { kode: 'SKT-021', nama: 'Sistem Audio dan Video' }, { kode: 'SKT-022', nama: 'Atap Bangunan' },
      { kode: 'SKT-023', nama: 'Sistem Alarm Kebakaran' }, { kode: 'SKT-024', nama: 'Sistem Pemipaan gedung' },
      { kode: 'SKT-025', nama: 'Transformator (Trafo)' }, { kode: 'SKT-026', nama: 'Exterior Gedung' },
      { kode: 'SKT-027', nama: 'Fire Pump System' },      { kode: 'SKT-028', nama: 'Generator Panel' },
      { kode: 'SKT-029', nama: 'Hydrant System' },        { kode: 'SKT-030', nama: 'Backup Power System' },
      { kode: 'SKT-031', nama: 'Meter Air Bersih' },      { kode: 'SKT-032', nama: 'Meter KWH' },
      { kode: 'SKT-033', nama: 'Sewage Treatment Plant' }, { kode: 'SKT-034', nama: 'Sistem Jaringan Internet' },
      { kode: 'SKT-035', nama: 'Tata Lingkungan' },       { kode: 'SKT-036', nama: 'Alat Angkat Angkut' },
      { kode: 'SKT-037', nama: 'Alat Pemadam Api Otomatis' }, { kode: 'SKT-038', nama: 'Capasitor Bank' },
      { kode: 'SKT-039', nama: 'Change Over Switch' },    { kode: 'SKT-040', nama: 'Distributor Air Olahan' },
      { kode: 'SKT-041', nama: 'EV Charging System' },    { kode: 'SKT-042', nama: 'Elevator (Lift)' },
      { kode: 'SKT-043', nama: 'Facade Lighting' },       { kode: 'SKT-044', nama: 'Fire Suppression System' },
      { kode: 'SKT-045', nama: 'Latihan Balakar' },       { kode: 'SKT-046', nama: 'Meter Air Recycle' },
      { kode: 'SKT-047', nama: 'Rangka Atap Bangunan' },  { kode: 'SKT-048', nama: 'Sistem Antrean' },
      { kode: 'SKT-049', nama: 'Sistem Proteksi Kelistrikan' }, { kode: 'SKT-050', nama: 'Solar Power System' },
      { kode: 'SKT-051', nama: 'Struktur Bangunan' },
    ],
    skipDuplicates: true,
  });

  await prisma.tipe.createMany({
    data: [
      { kode: 'TPE-001', nama: 'AC Split' },              { kode: 'TPE-002', nama: 'Kamera CCTV' },
      { kode: 'TPE-003', nama: 'AC Cassette' },           { kode: 'TPE-004', nama: 'Dinding Tembok/Mansonry' },
      { kode: 'TPE-005', nama: 'Exhaust Fan' },           { kode: 'TPE-006', nama: 'Pintu Kayu/HPL' },
      { kode: 'TPE-007', nama: 'Lampu Downlight' },       { kode: 'TPE-008', nama: 'Plafon Gypsum / GRC' },
      { kode: 'TPE-009', nama: 'APAR Dry Powder Stored Pressure' }, { kode: 'TPE-010', nama: 'PABX' },
      { kode: 'TPE-011', nama: 'Smoke Detector' },        { kode: 'TPE-012', nama: 'Wiring System (Sistem Instalasi Kabel)' },
      { kode: 'TPE-013', nama: 'APAR Dry Powder Cartridge' }, { kode: 'TPE-014', nama: 'Jet Shower' },
      { kode: 'TPE-015', nama: 'Kloset' },                { kode: 'TPE-016', nama: 'Lampu TL LED' },
      { kode: 'TPE-017', nama: 'Meja kerja' },            { kode: 'TPE-018', nama: 'Pintu Kaca Hidrolik' },
      { kode: 'TPE-019', nama: 'APAB Dry Powder' },       { kode: 'TPE-020', nama: 'Dinding Partisi, GRC / Gypsum' },
      { kode: 'TPE-021', nama: 'Genset Diesel' },         { kode: 'TPE-022', nama: 'Kran Air' },
      { kode: 'TPE-023', nama: 'Lampu TL' },              { kode: 'TPE-024', nama: 'Pesawat Telepon' },
      { kode: 'TPE-025', nama: 'FCU' },                   { kode: 'TPE-026', nama: 'Lampu LED' },
      { kode: 'TPE-027', nama: 'Lampu LED Bulb' },        { kode: 'TPE-028', nama: 'Lampu Neon Sign' },
      { kode: 'TPE-029', nama: 'Monitor CCTV' },          { kode: 'TPE-030', nama: 'Roof Tank' },
      { kode: 'TPE-031', nama: 'Urinal' },                { kode: 'TPE-032', nama: 'Wastafel' },
      { kode: 'TPE-033', nama: 'APAR CO2' },              { kode: 'TPE-034', nama: 'Bell Alarm' },
      { kode: 'TPE-035', nama: 'DVR CCTV' },              { kode: 'TPE-036', nama: 'Lampu LED Downlight' },
      { kode: 'TPE-037', nama: 'Lampu Pylon Sign' },      { kode: 'TPE-038', nama: 'Lantai Granit' },
      { kode: 'TPE-039', nama: 'Lemari/Loker' },          { kode: 'TPE-040', nama: 'Panel UPS' },
      { kode: 'TPE-041', nama: 'SDP' },                   { kode: 'TPE-042', nama: 'Trafo IT UPS' },
      { kode: 'TPE-043', nama: 'Atap Beton' },            { kode: 'TPE-044', nama: 'Automatic Transfer Switch (ATS Panel)' },
      { kode: 'TPE-045', nama: 'Control Panel AC' },      { kode: 'TPE-046', nama: 'Control Panel Penerangan' },
      { kode: 'TPE-047', nama: 'Diesel Fire Pump' },      { kode: 'TPE-048', nama: 'Dinding Batu Alam' },
      { kode: 'TPE-049', nama: 'Fingerprint' },           { kode: 'TPE-050', nama: 'Ground Water Tank' },
      { kode: 'TPE-051', nama: 'Kursi' },                 { kode: 'TPE-052', nama: 'LVMDP' },
      { kode: 'TPE-053', nama: 'Lantai Keramik' },        { kode: 'TPE-054', nama: 'Pagar Besi' },
      { kode: 'TPE-055', nama: 'Pemipaan Air Bersih' },   { kode: 'TPE-056', nama: 'Pintu Besi' },
      { kode: 'TPE-057', nama: 'Pompa Boster' },          { kode: 'TPE-058', nama: 'Push Button' },
      { kode: 'TPE-059', nama: 'Rolling Door' },          { kode: 'TPE-060', nama: 'Speaker' },
      { kode: 'TPE-061', nama: 'AC VRV' },                { kode: 'TPE-062', nama: 'AHU' },
      { kode: 'TPE-063', nama: 'APAR Wet Chemical' },     { kode: 'TPE-064', nama: 'Access Control' },
      { kode: 'TPE-065', nama: 'Air Purifier' },          { kode: 'TPE-066', nama: 'Atap Seng' },
      { kode: 'TPE-067', nama: 'Breker Panel' },          { kode: 'TPE-068', nama: 'Commercial STP' },
      { kode: 'TPE-069', nama: 'Control Panel Hydrant Diesel Pump' }, { kode: 'TPE-070', nama: 'Dinding Kaca Non Tempered' },
      { kode: 'TPE-071', nama: 'Floor Drain' },           { kode: 'TPE-072', nama: 'Heat Detector' },
      { kode: 'TPE-073', nama: 'Kick Bar' },              { kode: 'TPE-074', nama: 'Kusen Jendela Berbahan Alumunium' },
      { kode: 'TPE-075', nama: 'LAN (Local Area Network)' }, { kode: 'TPE-076', nama: 'Lampu Backlit Sign' },
      { kode: 'TPE-077', nama: 'Lampu UV' },              { kode: 'TPE-078', nama: 'Lantai Batu' },
      { kode: 'TPE-079', nama: 'Lantai Karpet' },         { kode: 'TPE-080', nama: 'Lantai Parkir Beton' },
      { kode: 'TPE-081', nama: 'MDP' },                   { kode: 'TPE-082', nama: 'Meter PDAM' },
      { kode: 'TPE-083', nama: 'Meter PLN' },             { kode: 'TPE-084', nama: 'Monitor/Layar' },
      { kode: 'TPE-085', nama: 'Panel PP-ME' },           { kode: 'TPE-086', nama: 'Pemipaan Air Kotor' },
      { kode: 'TPE-087', nama: 'Pintu Kaca Otomatis' },   { kode: 'TPE-088', nama: 'Plafon' },
      { kode: 'TPE-089', nama: 'Pompa Air Tanah' },       { kode: 'TPE-090', nama: 'Pompa Chiller Water Sekunder' },
      { kode: 'TPE-091', nama: 'Pompa Sampit' },          { kode: 'TPE-092', nama: 'Pompa Transfer' },
      { kode: 'TPE-093', nama: 'Rooftank' },              { kode: 'TPE-094', nama: 'Selang Hidrant' },
      { kode: 'TPE-095', nama: 'Uninterruptible Power Supply' }, { kode: 'TPE-096', nama: 'Valve Control' },
      { kode: 'TPE-097', nama: 'Video Wall' },
    ],
    skipDuplicates: true,
  });

  const TARGET_COUNT = 100;
  const TODAY = new Date('2026-05-26T12:00:00Z'); // fixed "now" for reproducibility

  // ──────────────────────────────────────────────────────────────────────────
  // 1. USERS
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`👤  Menyiapkan ${TARGET_COUNT} data User...`);
  const defaultPassword = await bcrypt.hash('admin', 10);

  const mainUserId = '115deaf4-d9f2-45ea-9c07-44d94d05d59c';
  const usersToInsert: any[] = [
    {
      id: mainUserId,
      name: 'Admin',
      email: 'admin@perusahaan.com',
      password: defaultPassword,
    },
  ];

  for (let i = 2; i <= TARGET_COUNT; i++) {
    usersToInsert.push({
      id: crypto.randomUUID(),
      name: `User Pekerja ${i}`,
      email: `pekerja${i}_${crypto.randomUUID().substring(0, 5)}@mail.com`,
      password: defaultPassword,
    });
  }
  await prisma.user.createMany({ data: usersToInsert });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. COMPANIES
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`🏢  Menyiapkan ${TARGET_COUNT} data Company...`);
  const mainCompanyId = 'c0a80101-1234-4567-89ab-cdef12345678';
  const companiesToInsert: any[] = [
    {
      id: mainCompanyId,
      company_name: 'PT KIRA Multi Industri',
      license_status: 'Active',
      owner_id: mainUserId,
    },
  ];

  for (let i = 2; i <= TARGET_COUNT; i++) {
    const randomOwnerId = usersToInsert[randInt(0, TARGET_COUNT - 1)].id;
    companiesToInsert.push({
      id: crypto.randomUUID(),
      company_name: `PT Mitra Industri ke-${i}`,
      license_status: i % 10 === 0 ? 'Expired' : 'Active',
      owner_id: randomOwnerId,
    });
  }
  await prisma.company.createMany({ data: companiesToInsert });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. COMPANY MEMBERS
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`🤝  Menyiapkan ${TARGET_COUNT} data Company Member...`);
  const membersToInsert: any[] = [];
  const memberSet = new Set<string>();

  // Always add main user as Admin of main company
  membersToInsert.push({
    id_user: mainUserId,
    id_perusahaan: mainCompanyId,
    role: 'Admin',
    joined_at: addMonths(TODAY, -18),
  });
  memberSet.add(`${mainUserId}-${mainCompanyId}`);

  while (membersToInsert.length < TARGET_COUNT) {
    const uid = usersToInsert[randInt(0, TARGET_COUNT - 1)].id;
    const cid = Math.random() > 0.5
      ? mainCompanyId
      : companiesToInsert[randInt(0, TARGET_COUNT - 1)].id;
    const key = `${uid}-${cid}`;
    if (!memberSet.has(key)) {
      memberSet.add(key);
      membersToInsert.push({
        id_user: uid,
        id_perusahaan: cid,
        role: pick(['Admin', 'Technician', 'Viewer']),
        joined_at: addMonths(TODAY, -randInt(0, 18)),
      });
    }
  }
  await prisma.companyMember.createMany({ data: membersToInsert });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. GEDUNG
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🏗️  Menyiapkan data Gedung...');
  const gedungDefs = [
    { kode: 'A',      nama: 'Gedung A' },
    { kode: 'B',      nama: 'Gedung B' },
    { kode: 'C',      nama: 'Gedung C' },
    { kode: 'D',      nama: 'Gedung D' },
    { kode: 'E',      nama: 'Gedung E' },
    { kode: 'PARKIR', nama: 'Gedung Parkir' },
    { kode: 'SERVIS', nama: 'Gedung Servis' },
    { kode: 'UTAMA',  nama: 'Gedung Utama' },
  ];

  const gedungToInsert = gedungDefs.map((g) => ({
    id: crypto.randomUUID(),
    id_perusahaan: mainCompanyId,
    nama: g.nama,
    kode: g.kode,
  }));
  await prisma.gedung.createMany({ data: gedungToInsert });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. ASSETS  — semua milik main company, semua punya gedung_id, FK-only
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`📦  Menyiapkan ${TARGET_COUNT} data Asset...`);

  // Build kode → id maps from the just-seeded lookup tables
  const merkMap = Object.fromEntries(
    (await prisma.merk.findMany({ select: { kode: true, id: true } })).map((r) => [r.kode, r.id]),
  );
  const kategoriMap = Object.fromEntries(
    (await prisma.kategori.findMany({ select: { kode: true, id: true } })).map((r) => [r.kode, r.id]),
  );
  const subKategoriMap = Object.fromEntries(
    (await prisma.subKategori.findMany({ select: { kode: true, id: true } })).map((r) => [r.kode, r.id]),
  );
  const tipeMap = Object.fromEntries(
    (await prisma.tipe.findMany({ select: { kode: true, id: true } })).map((r) => [r.kode, r.id]),
  );

  const categoriesPool = [
    {
      kategoriKode: 'KAT-001', subKategoriKode: 'SKT-001',
      tipeKodes: ['TPE-001', 'TPE-062', 'TPE-003', 'TPE-025'],
      merkKodes: ['MRK-010', 'MRK-006', 'MRK-004', 'MRK-046'],
      tipeNames: ['AC Split', 'AHU', 'AC Cassette', 'FCU'],
      merkNames: ['Sharp', 'Daikin', 'Mitsubishi', 'Trane'],
    },
    {
      kategoriKode: 'KAT-002', subKategoriKode: 'SKT-030',
      tipeKodes: ['TPE-095', 'TPE-021', 'TPE-042', 'TPE-081'],
      merkKodes: ['MRK-018', 'MRK-030', 'MRK-033', 'MRK-029'],
      tipeNames: ['UPS', 'Genset Diesel', 'Trafo', 'Panel MDP'],
      merkNames: ['Perkins', 'Siemens', 'Caterpillar', 'Honeywell'],
    },
    {
      kategoriKode: 'KAT-009', subKategoriKode: 'SKT-012',
      tipeKodes: ['TPE-011', 'TPE-072', 'TPE-047', 'TPE-033'],
      merkKodes: ['MRK-014', 'MRK-015', 'MRK-041', 'MRK-030'],
      tipeNames: ['Smoke Detector', 'Heat Detector', 'Diesel Fire Pump', 'APAR CO2'],
      merkNames: ['Hochiki', 'Notifier', 'Nohmi', 'Siemens'],
    },
    {
      kategoriKode: 'KAT-006', subKategoriKode: 'SKT-018',
      tipeKodes: ['TPE-089', 'TPE-057', 'TPE-050', 'TPE-092'],
      merkKodes: ['MRK-016', 'MRK-028', 'MRK-049', 'MRK-022'],
      tipeNames: ['Pompa Air Tanah', 'Pompa Boster', 'Ground Water Tank', 'Pompa Transfer'],
      merkNames: ['Grundfos', 'Ebara', 'Wilo', 'Onda'],
    },
    {
      kategoriKode: 'KAT-015', subKategoriKode: 'SKT-042',
      tipeKodes: ['TPE-062', 'TPE-062', 'TPE-062', 'TPE-062'],
      merkKodes: ['MRK-044', 'MRK-042', 'MRK-036', 'MRK-030'],
      tipeNames: ['Elevator', 'Elevator', 'Elevator', 'Elevator'],
      merkNames: ['Schindler', 'Otis', 'Hyundai', 'Siemens'],
    },
  ];

  const statuses = ['Active', 'Maintenance', 'Inactive', 'Active', 'Active'];

  const assetsToInsert: any[] = [];
  for (let i = 1; i <= TARGET_COUNT; i++) {
    const pool = categoriesPool[(i - 1) % categoriesPool.length];
    const poolIdx = (i - 1) % pool.tipeKodes.length;
    // Semua aset milik main company, gedung di-rotate dari gedungToInsert
    const gedungId = gedungToInsert[(i - 1) % gedungToInsert.length].id;

    assetsToInsert.push({
      id: crypto.randomUUID(),
      id_perusahaan: mainCompanyId,
      gedung_id: gedungId,
      asset_name: `${pool.tipeNames[poolIdx]} ${pool.merkNames[poolIdx]} - ${String(i).padStart(3, '0')}`,
      purchase_date: addMonths(TODAY, -randInt(6, 60)),
      initial_useful_life: 60,
      merk_id:         merkMap[pool.merkKodes[poolIdx]] ?? null,
      kategori_id:     kategoriMap[pool.kategoriKode]   ?? null,
      sub_kategori_id: subKategoriMap[pool.subKategoriKode] ?? null,
      tipe_id:         tipeMap[pool.tipeKodes[poolIdx]] ?? null,
      criticality_level: pick(['Critical', 'Critical', 'Major', 'Major', 'Minor']),
      status: pick(statuses),
    });
  }
  await prisma.asset.createMany({ data: assetsToInsert });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. TECHNICIANS
  // ──────────────────────────────────────────────────────────────────────────
  console.log('👷  Menyiapkan 100 data Teknisi...');

  const firstNames = [
    'Ahmad','Budi','Candra','Dedi','Eko','Fajar','Gunawan','Hendra',
    'Ivan','Joko','Kurniawan','Luthfi','Mulyadi','Nanang','Oki',
    'Pramudya','Rahmat','Slamet','Tri','Ujang','Wahyu','Yudi',
    'Agus','Bayu','Dimas','Firman','Gilang','Hasan','Irfan','Andi',
    'Rudi','Suprapto','Teguh','Zaenal','Faris',
  ];
  const lastNames = [
    'Santoso','Purnomo','Hidayat','Saputra','Wibowo','Prasetyo',
    'Kurniawan','Susanto','Nugroho','Wahyudi','Setiawan','Widodo',
    'Suryadi','Permana','Hartono','Gunawan','Wijaya','Sanjaya',
    'Budiman','Raharjo',
  ];
  const specializations = [
    'Mekanikal','Elektrikal','Sipil','HVAC',
    'IT & Jaringan','Plumbing','Proteksi Kebakaran','Instrumentasi',
  ];

  const techniciansToInsert: any[] = [];
  for (let i = 1; i <= 100; i++) {
    const roll = Math.random();
    techniciansToInsert.push({
      id: crypto.randomUUID(),
      id_perusahaan: mainCompanyId,
      name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
      email: `teknisi${i}.${crypto.randomUUID().substring(0, 5)}@kira.com`,
      phone: `08${String(Math.floor(100000000 + Math.random() * 900000000))}`,
      specialization: specializations[i % specializations.length],
      status: roll < 0.6 ? 'Tersedia' : roll < 0.85 ? 'Ditugaskan' : 'Tidak Aktif',
      experience_years: randInt(1, 15),
    });
  }
  await prisma.technician.createMany({ data: techniciansToInsert });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. MAINTENANCES  —  spread across last 12 months + 3 upcoming months
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`🔧  Menyiapkan ${TARGET_COUNT} data Maintenance (tersebar 15 bulan)...`);

  // Only use main-company assets for realistic dashboard data
  const mainAssets = assetsToInsert.filter((a) => a.id_perusahaan === mainCompanyId);

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

  const maintenancesToInsert: any[] = [];

  for (let i = 0; i < TARGET_COUNT; i++) {
    const asset = mainAssets[i % mainAssets.length];
    const userId = usersToInsert[randInt(0, TARGET_COUNT - 1)].id;

    // Evenly distribute across 15 months: months [-12, -11, …, -1, 0, +1, +2]
    // i=0 → month -12, i=99 → month +2
    const monthOffset = Math.round(((i) / (TARGET_COUNT - 1)) * 14) - 12;
    const dayOfMonth = randInt(1, 27);
    const scheduledDate = new Date(addMonths(TODAY, monthOffset));
    scheduledDate.setDate(dayOfMonth);
    scheduledDate.setHours(randInt(8, 16), 0, 0, 0);

    const isFuture = scheduledDate > TODAY;

    let status: string;
    let startDate: Date | null = null;
    let completionDate: Date | null = null;
    let downTime = 0;
    let cost = 0;

    if (isFuture) {
      // Not started yet
      status = 'Scheduled';
    } else if (Math.random() < 0.82) {
      // Most past records are completed
      status = 'Completed';
      startDate = new Date(scheduledDate.getTime() + randInt(1, 4) * 60 * 60 * 1000);
      completionDate = new Date(startDate.getTime() + randInt(1, 5) * 24 * 60 * 60 * 1000);
      downTime = randInt(1, 48);
      cost = randInt(500_000, 5_500_000);
    } else {
      // A few past records still in progress
      status = 'In Progress';
      startDate = new Date(scheduledDate.getTime() + randInt(1, 2) * 60 * 60 * 1000);
      downTime = randInt(1, 12);
      cost = randInt(200_000, 1_000_000);
    }

    maintenancesToInsert.push({
      id: crypto.randomUUID(),
      id_asset: asset.id,
      id_user: userId,
      maintenance_type: pick(['Preventive', 'Corrective', 'Predictive', 'Condition-Based']),
      severity: pick(['Low', 'Low', 'Medium', 'Medium', 'High', 'Critical']),
      scheduled_date: scheduledDate,
      start_date: startDate,
      completion_date: completionDate,
      down_time: downTime,
      cost,
      status,
      jenis_kerusakan:      pick(jenisKerusakanPool),
      penyebab:             pick(penyebabPool),
      spare_part_digunakan: pick(sparePartPool),
    });
  }
  await prisma.maintenance.createMany({ data: maintenancesToInsert });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. ASSET PREDICTION HISTORY  —  multiple records per asset, spread over time
  //    Gives the dashboard real alert counts (critical / high / watch / ok)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🔮  Menyiapkan data Prediksi RUL (multi-entry per aset)...');

  // RUL zone helper: each asset gets 3–4 snapshots over the last 12 months
  // The latest snapshot is what the dashboard uses for alerts.
  //
  // Distribution across 70 main-company assets:
  //   ~10 → Critical  (RUL ≤ 6)
  //   ~15 → High      (RUL 7–12)
  //   ~20 → Watch     (RUL 13–24)
  //   ~25 → OK        (RUL 25–60)

  function rulForZone(zone: number): number {
    if (zone === 0) return randInt(1, 6);          // Critical
    if (zone <= 2) return randInt(7, 12);          // High
    if (zone <= 5) return randInt(13, 24);         // Watch
    return randInt(25, 58);                         // OK
  }

  const predictionsToInsert: any[] = [];

  mainAssets.forEach((asset, idx) => {
    const zone = idx % 10; // 0=critical, 1-2=high, 3-5=watch, 6-9=ok
    // 3 historical snapshots + 1 current
    const snapshots = 4;

    for (let s = 0; s < snapshots; s++) {
      const isLatest = s === snapshots - 1;
      // Snapshots spread: 9 months ago, 6 months ago, 3 months ago, now
      const monthsAgo = (snapshots - 1 - s) * 3;
      const recordedAt = new Date(addMonths(TODAY, -monthsAgo));
      recordedAt.setDate(randInt(1, 27));

      // RUL trends down as time passes (more recent = lower RUL)
      // Start RUL ~2× the current zone value, ending at zone value
      const latestRul = rulForZone(zone);
      const snapshotRul = isLatest
        ? latestRul
        : Math.min(60, latestRul + (snapshots - 1 - s) * randInt(4, 8));

      // Only the latest and some mid snapshots link to a maintenance record
      const maintRecord = maintenancesToInsert[idx % maintenancesToInsert.length];
      const idMaintenance = isLatest && maintRecord ? maintRecord.id : null;

      predictionsToInsert.push({
        id: crypto.randomUUID(),
        id_asset: asset.id,
        id_maintenance: idMaintenance,
        maintenance_count: randInt(1, 10),
        average_down_time: randInt(2, 20),
        total_maintenance_cost: randInt(1_000_000, 20_000_000),
        max_maintenance_cost: randInt(3_000_000, 8_000_000),
        mode_severity: pick(['Ringan', 'Sedang', 'Sedang', 'Berat']),
        predicted_rul: snapshotRul,
        recorded_at: recordedAt,
      });
    }
  });

  await prisma.assetPredictionHistory.createMany({ data: predictionsToInsert });

  // ──────────────────────────────────────────────────────────────────────────
  // Done
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n✅  SEEDING SELESAI!');
  console.log('Statistik:');
  console.log(`  Users            : ${usersToInsert.length}`);
  console.log(`  Companies        : ${companiesToInsert.length}`);
  console.log(`  Company Members  : ${membersToInsert.length}`);
  console.log(`  Gedung           : ${gedungToInsert.length}`);
  console.log(`  Assets           : ${assetsToInsert.length} (semua milik PT KIRA, tersebar 8 gedung)`);
  console.log(`  Technicians      : ${techniciansToInsert.length}`);
  console.log(`  Maintenances     : ${maintenancesToInsert.length} (tersebar 15 bulan)`);
  console.log(`  RUL Predictions  : ${predictionsToInsert.length} (multi-snapshot per aset)`);
  console.log('----------------------------------------------------');
  console.log('Dashboard alert zones (PT KIRA, 100 aset):');
  console.log('  Critical (RUL ≤ 6)   : ~10 aset (zone 0)');
  console.log('  High     (RUL 7–12)  : ~20 aset (zone 1-2)');
  console.log('  Watch    (RUL 13–24) : ~30 aset (zone 3-5)');
  console.log('  OK       (RUL 25–60) : ~40 aset (zone 6-9)');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
