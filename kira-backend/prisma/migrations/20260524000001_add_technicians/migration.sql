-- CreateTable
CREATE TABLE "technicians" (
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

-- CreateIndex
CREATE UNIQUE INDEX "technicians_email_key" ON "technicians"("email");

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_id_perusahaan_fkey"
    FOREIGN KEY ("id_perusahaan") REFERENCES "companies"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: tambah kolom id_teknisi ke maintenances (nullable)
ALTER TABLE "maintenances" ADD COLUMN "id_teknisi" TEXT;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_id_teknisi_fkey"
    FOREIGN KEY ("id_teknisi") REFERENCES "technicians"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
