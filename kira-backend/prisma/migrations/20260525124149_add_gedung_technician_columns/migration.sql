-- CreateTable
CREATE TABLE IF NOT EXISTS "gedung" (
    "id" TEXT NOT NULL,
    "id_perusahaan" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    CONSTRAINT "gedung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "technicians" (
    "id" TEXT NOT NULL,
    "id_perusahaan" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "specialization" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Tersedia',
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "asset_image" TEXT;
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "gedung_id" TEXT;

-- AlterTable
ALTER TABLE "maintenances" ADD COLUMN IF NOT EXISTS "id_teknisi" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_picture" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gedung_id_perusahaan_kode_key" ON "gedung"("id_perusahaan", "kode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "technicians_email_key" ON "technicians"("email");

-- AddForeignKey
ALTER TABLE "gedung" DROP CONSTRAINT IF EXISTS "gedung_id_perusahaan_fkey";
ALTER TABLE "gedung" ADD CONSTRAINT "gedung_id_perusahaan_fkey" FOREIGN KEY ("id_perusahaan") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_gedung_id_fkey";
ALTER TABLE "assets" ADD CONSTRAINT "assets_gedung_id_fkey" FOREIGN KEY ("gedung_id") REFERENCES "gedung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" DROP CONSTRAINT IF EXISTS "maintenances_id_teknisi_fkey";
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_id_teknisi_fkey" FOREIGN KEY ("id_teknisi") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" DROP CONSTRAINT IF EXISTS "technicians_id_perusahaan_fkey";
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_id_perusahaan_fkey" FOREIGN KEY ("id_perusahaan") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
