-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "kategori_id" TEXT,
ADD COLUMN     "merk_id" TEXT,
ADD COLUMN     "sub_kategori_id" TEXT,
ADD COLUMN     "tipe_id" TEXT;

-- CreateTable
CREATE TABLE "merk" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "merk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kategori" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_kategori" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "sub_kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipe" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,

    CONSTRAINT "tipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "merk_kode_key" ON "merk"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "kategori_kode_key" ON "kategori"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "sub_kategori_kode_key" ON "sub_kategori"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "tipe_kode_key" ON "tipe"("kode");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_merk_id_fkey" FOREIGN KEY ("merk_id") REFERENCES "merk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_kategori_id_fkey" FOREIGN KEY ("kategori_id") REFERENCES "kategori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_sub_kategori_id_fkey" FOREIGN KEY ("sub_kategori_id") REFERENCES "sub_kategori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_tipe_id_fkey" FOREIGN KEY ("tipe_id") REFERENCES "tipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
