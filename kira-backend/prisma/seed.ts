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
  // 5. ASSETS
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`📦  Menyiapkan ${TARGET_COUNT} data Asset...`);

  const categoriesPool = [
    {
      category: 'Mechanical',
      sub_cat: 'Tata Udara',
      types: ['AC Split', 'Chiller', 'AHU', 'FCU'],
      brands: ['Sharp', 'Daikin', 'Mitsubishi', 'Trane'],
    },
    {
      category: 'Electrical',
      sub_cat: 'Backup Power',
      types: ['UPS', 'Genset', 'Trafo', 'Panel MDP'],
      brands: ['APC', 'Perkins', 'Schneider', 'ABB'],
    },
    {
      category: 'Sistem Proteksi Kebakaran Aktif',
      sub_cat: 'Deteksi Kebakaran',
      types: ['Smoke Detector', 'Heat Detector', 'Sprinkler', 'APAR'],
      brands: ['Hochiki', 'Notifier', 'Kidde', 'Siemens'],
    },
    {
      category: 'Plumbing',
      sub_cat: 'Distribusi Air',
      types: ['Pompa Air', 'Booster Pump', 'Water Tank', 'Pressure Pump'],
      brands: ['Grundfos', 'DAB', 'Ebara', 'Wilo'],
    },
    {
      category: 'Lifting',
      sub_cat: 'Transportasi Vertikal',
      types: ['Elevator', 'Eskalator', 'Dumbwaiter'],
      brands: ['Schindler', 'Otis', 'KONE', 'ThyssenKrupp'],
    },
  ];

  const statuses = ['Active', 'Maintenance', 'Inactive', 'Active', 'Active']; // skewed toward Active

  const assetsToInsert: any[] = [];
  for (let i = 1; i <= TARGET_COUNT; i++) {
    const pool = categoriesPool[(i - 1) % categoriesPool.length];
    const isMainCompany = i <= 70;
    const compId = isMainCompany
      ? mainCompanyId
      : companiesToInsert[randInt(1, TARGET_COUNT - 1)].id;
    const gedungId = isMainCompany
      ? gedungToInsert[(i - 1) % gedungToInsert.length].id
      : null;
    const typeVal = pool.types[(i - 1) % pool.types.length];
    const brandVal = pool.brands[(i - 1) % pool.brands.length];

    assetsToInsert.push({
      id: crypto.randomUUID(),
      id_perusahaan: compId,
      gedung_id: gedungId,
      asset_name: `${typeVal} ${brandVal} - ${String(i).padStart(3, '0')}`,
      purchase_date: addMonths(TODAY, -randInt(6, 60)),
      initial_useful_life: 60,
      brand: brandVal,
      category: pool.category,
      sub_category: pool.sub_cat,
      type: typeVal,
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

  // Also add 1 snapshot per non-main-company asset (remaining 30)
  assetsToInsert
    .filter((a) => a.id_perusahaan !== mainCompanyId)
    .forEach((asset) => {
      predictionsToInsert.push({
        id: crypto.randomUUID(),
        id_asset: asset.id,
        id_maintenance: null,
        maintenance_count: randInt(1, 5),
        average_down_time: randInt(1, 15),
        total_maintenance_cost: randInt(500_000, 10_000_000),
        max_maintenance_cost: randInt(2_000_000, 5_000_000),
        mode_severity: pick(['Ringan', 'Sedang', 'Berat']),
        predicted_rul: randInt(6, 55),
        recorded_at: addMonths(TODAY, -randInt(0, 6)),
      });
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
  console.log(`  Assets           : ${assetsToInsert.length} (70 milik PT KIRA)`);
  console.log(`  Technicians      : ${techniciansToInsert.length}`);
  console.log(`  Maintenances     : ${maintenancesToInsert.length} (tersebar 15 bulan)`);
  console.log(`  RUL Predictions  : ${predictionsToInsert.length} (multi-snapshot per aset)`);
  console.log('----------------------------------------------------');
  console.log('Dashboard alert zones (PT KIRA, 70 aset):');
  console.log('  Critical (RUL ≤ 6)   : ~7  aset (zone 0 × 7 gedung)');
  console.log('  High     (RUL 7–12)  : ~14 aset (zone 1-2)');
  console.log('  Watch    (RUL 13–24) : ~21 aset (zone 3-5)');
  console.log('  OK       (RUL 25–60) : ~28 aset (zone 6-9)');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
