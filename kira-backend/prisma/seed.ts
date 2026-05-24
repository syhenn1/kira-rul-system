import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL || ''),
});

async function main() {
  console.log('🧹 Membersihkan seluruh database...');
  await prisma.assetPredictionHistory.deleteMany({});
  await prisma.maintenance.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.companyMember.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});

  const TARGET_COUNT = 100; // Target 100 data untuk masing-masing tabel

  // ==========================================
  // 1. GENERATE USERS
  // ==========================================
  console.log(`👤 Menyiapkan ${TARGET_COUNT} data User...`);
  const usersToInsert = [];

  const defaultPassword = await bcrypt.hash('admin', 10);

  // User utama Anda (Debug User)
  const mainUserId = '115deaf4-d9f2-45ea-9c07-44d94d05d59c';
  usersToInsert.push({
    id: mainUserId,
    name: 'Mochamad Rifat Syahman Hambali',
    email: 'rifat@perusahaan.com',
    password: defaultPassword,
  });

  for (let i = 2; i <= TARGET_COUNT; i++) {
    usersToInsert.push({
      id: crypto.randomUUID(),
      name: `User Pekerja ${i}`,
      email: `pekerja${i}_${crypto.randomUUID().substring(0, 5)}@mail.com`,
      password: defaultPassword,
    });
  }
  await prisma.user.createMany({ data: usersToInsert });

  // ==========================================
  // 2. GENERATE COMPANIES
  // ==========================================
  console.log(`🏢 Menyiapkan ${TARGET_COUNT} data Company...`);
  const companiesToInsert = [];

  // Company Utama Anda
  const mainCompanyId = 'c0a80101-1234-4567-89ab-cdef12345678';
  companiesToInsert.push({
    id: mainCompanyId,
    company_name: 'PT KIRA Multi Industri',
    license_status: 'Active',
    owner_id: mainUserId,
  });

  for (let i = 2; i <= TARGET_COUNT; i++) {
    // Acak owner dari list user yang ada
    const randomOwnerId = usersToInsert[Math.floor(Math.random() * TARGET_COUNT)].id;
    companiesToInsert.push({
      id: crypto.randomUUID(),
      company_name: `PT Mitra Industri ke-${i}`,
      license_status: i % 10 === 0 ? 'Expired' : 'Active',
      owner_id: randomOwnerId,
    });
  }
  await prisma.company.createMany({ data: companiesToInsert });

  // ==========================================
  // 3. GENERATE COMPANY MEMBERS (Relasi Many-to-Many)
  // ==========================================
  console.log(`🤝 Menyiapkan ${TARGET_COUNT} data Company Member...`);
  const membersToInsert = [];
  const memberSet = new Set(); // Mencegah duplikasi Primary Key ganda (id_user + id_perusahaan)

  while (membersToInsert.length < TARGET_COUNT) {
    const randomUser = usersToInsert[Math.floor(Math.random() * TARGET_COUNT)].id;
    // Berikan bobot 50% untuk masuk ke PT KIRA (perusahaan utama Anda) agar datanya ramai
    const randomCompany = Math.random() > 0.5 ? mainCompanyId : companiesToInsert[Math.floor(Math.random() * TARGET_COUNT)].id;

    const uniqueKey = `${randomUser}-${randomCompany}`;

    if (!memberSet.has(uniqueKey)) {
      memberSet.add(uniqueKey);
      membersToInsert.push({
        id_user: randomUser,
        id_perusahaan: randomCompany,
        role: ['Admin', 'Technician', 'Viewer'][Math.floor(Math.random() * 3)],
        joined_at: new Date(new Date().setDate(new Date().getDate() - Math.floor(Math.random() * 100))),
      });
    }
  }
  await prisma.companyMember.createMany({ data: membersToInsert });

  // ==========================================
  // 4. GENERATE ASSETS
  // ==========================================
  console.log(`📦 Menyiapkan ${TARGET_COUNT} data Asset...`);
  const assetsToInsert = [];
  const categoriesPool = [
    { category: 'Mechanical', sub_cat: 'Tata Udara', types: ['AC Split', 'Chiller'], brands: ['Sharp', 'Daikin'] },
    { category: 'Electrical', sub_cat: 'Backup Power', types: ['UPS', 'Genset'], brands: ['APC', 'Perkins'] },
    { category: 'Sistem Proteksi Kebakaran Aktif', sub_cat: 'Deteksi Kebakaran', types: ['Smoke Detector'], brands: ['Hochiki'] }
  ];

  for (let i = 1; i <= TARGET_COUNT; i++) {
    const pool = categoriesPool[i % categoriesPool.length];
    // Masukkan mayoritas aset ke PT KIRA agar bisa Anda lihat di dashboard
    const compId = i <= 70 ? mainCompanyId : companiesToInsert[Math.floor(Math.random() * TARGET_COUNT)].id;

    assetsToInsert.push({
      id: crypto.randomUUID(),
      id_perusahaan: compId,
      asset_name: `${pool.types[i % pool.types.length]} ${pool.brands[i % pool.brands.length]} - 00${i}`,
      purchase_date: new Date(new Date().setMonth(new Date().getMonth() - Math.floor(Math.random() * 48))),
      initial_useful_life: 60,
      brand: pool.brands[i % pool.brands.length],
      category: pool.category,
      sub_category: pool.sub_cat,
      type: pool.types[i % pool.types.length],
      criticality_level: ['Critical', 'Major', 'Minor'][i % 3],
      status: ['Active', 'Maintenance', 'Replaced'][Math.floor(Math.random() * 3)],
    });
  }
  await prisma.asset.createMany({ data: assetsToInsert });

  // ==========================================
  // 5. GENERATE MAINTENANCE RECORDS
  // ==========================================
  console.log(`🔧 Menyiapkan ${TARGET_COUNT} data Maintenance...`);
  const maintenancesToInsert = [];

  for (let i = 1; i <= TARGET_COUNT; i++) {
    const assetId = assetsToInsert[Math.floor(Math.random() * TARGET_COUNT)].id;
    const userId = usersToInsert[Math.floor(Math.random() * TARGET_COUNT)].id;

    maintenancesToInsert.push({
      id: crypto.randomUUID(),
      id_asset: assetId,
      id_user: userId,
      maintenance_type: ['Preventive', 'Corrective', 'Predictive'][Math.floor(Math.random() * 3)],
      severity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
      scheduled_date: new Date(),
      start_date: new Date(new Date().setDate(new Date().getDate() - Math.floor(Math.random() * 10))),
      completion_date: new Date(),
      down_time: Math.floor(Math.random() * 48) + 1, // 1 - 48 jam
      cost: Math.floor(Math.random() * 5000000) + 500000, // Rp 500rb - 5.5jt
      status: ['Completed', 'In Progress', 'Scheduled'][Math.floor(Math.random() * 3)],
    });
  }
  await prisma.maintenance.createMany({ data: maintenancesToInsert });

  // ==========================================
  // 6. GENERATE ASSET PREDICTION HISTORY
  // ==========================================
  console.log(`🔮 Menyiapkan ${TARGET_COUNT} data Prediksi RUL...`);
  const predictionsToInsert = [];

  for (let i = 0; i < TARGET_COUNT; i++) {
    const isCritical = i % 10 === 0; // Buat 10% data memiliki RUL Kritis

    predictionsToInsert.push({
      id: crypto.randomUUID(),
      id_asset: assetsToInsert[i].id, // Pasangkan 1 prediksi untuk 1 aset secara berurutan
      id_maintenance: i % 2 === 0 ? maintenancesToInsert[i].id : null, // Sebagian terhubung ke log maintenance
      maintenance_count: Math.floor(Math.random() * 5) + 1,
      average_down_time: Math.floor(Math.random() * 20) + 1,
      total_maintenance_cost: Math.floor(Math.random() * 10000000) + 1000000,
      max_maintenance_cost: 5000000,
      mode_severity: ['Ringan', 'Sedang', 'Berat'][Math.floor(Math.random() * 3)],
      predicted_rul: isCritical ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 48) + 12,
      recorded_at: new Date(),
    });
  }
  await prisma.assetPredictionHistory.createMany({ data: predictionsToInsert });

  // ==========================================
  console.log(`\n🎉 SEEDING MASSAL SELESAI!`);
  console.log(`📊 Statistik Data yang Berhasil Disuntikkan:`);
  console.log(`  - Users                  : ${usersToInsert.length}`);
  console.log(`  - Companies              : ${companiesToInsert.length}`);
  console.log(`  - Company Members        : ${membersToInsert.length}`);
  console.log(`  - Assets                 : ${assetsToInsert.length}`);
  console.log(`  - Maintenance Records    : ${maintenancesToInsert.length}`);
  console.log(`  - RUL Predictions        : ${predictionsToInsert.length}`);
  console.log(`-----------------------------------------------`);
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });