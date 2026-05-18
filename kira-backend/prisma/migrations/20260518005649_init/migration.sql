-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "google_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "license_status" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_members" (
    "id_user" TEXT NOT NULL,
    "id_perusahaan" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_members_pkey" PRIMARY KEY ("id_user","id_perusahaan")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "id_perusahaan" TEXT NOT NULL,
    "asset_name" TEXT NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "initial_useful_life" INTEGER NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sub_category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "criticality_level" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" TEXT NOT NULL,
    "id_asset" TEXT NOT NULL,
    "id_user" TEXT NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "start_date" TIMESTAMP(3),
    "completion_date" TIMESTAMP(3),
    "down_time" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_prediction_history" (
    "id" TEXT NOT NULL,
    "id_asset" TEXT NOT NULL,
    "id_maintenance" TEXT,
    "maintenance_count" INTEGER NOT NULL DEFAULT 0,
    "average_down_time" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total_maintenance_cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "max_maintenance_cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "mode_severity" TEXT NOT NULL DEFAULT '',
    "predicted_rul" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_prediction_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_id_perusahaan_fkey" FOREIGN KEY ("id_perusahaan") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_id_perusahaan_fkey" FOREIGN KEY ("id_perusahaan") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_id_asset_fkey" FOREIGN KEY ("id_asset") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_prediction_history" ADD CONSTRAINT "asset_prediction_history_id_asset_fkey" FOREIGN KEY ("id_asset") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_prediction_history" ADD CONSTRAINT "asset_prediction_history_id_maintenance_fkey" FOREIGN KEY ("id_maintenance") REFERENCES "maintenances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
