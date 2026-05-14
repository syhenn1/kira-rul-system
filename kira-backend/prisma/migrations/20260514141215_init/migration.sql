-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_name" TEXT NOT NULL,
    "license_status" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "company_members" (
    "id_user" TEXT NOT NULL,
    "id_perusahaan" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id_user", "id_perusahaan"),
    CONSTRAINT "company_members_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "company_members_id_perusahaan_fkey" FOREIGN KEY ("id_perusahaan") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_perusahaan" TEXT NOT NULL,
    "asset_name" TEXT NOT NULL,
    "purchase_date" DATETIME NOT NULL,
    "initial_useful_life" INTEGER NOT NULL,
    "current_rul" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "assets_id_perusahaan_fkey" FOREIGN KEY ("id_perusahaan") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_asset" TEXT NOT NULL,
    "id_user" TEXT NOT NULL,
    "maintenance_type" TEXT NOT NULL,
    "scheduled_date" DATETIME NOT NULL,
    "completion_date" DATETIME,
    "rul_impact" INTEGER NOT NULL,
    "cost" REAL NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "maintenances_id_asset_fkey" FOREIGN KEY ("id_asset") REFERENCES "assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "maintenances_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "asset_rul_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "id_asset" TEXT NOT NULL,
    "id_maintenance" TEXT,
    "previous_rul" INTEGER NOT NULL,
    "new_rul" INTEGER NOT NULL,
    "change_reason" TEXT NOT NULL,
    "recorded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_rul_history_id_asset_fkey" FOREIGN KEY ("id_asset") REFERENCES "assets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "asset_rul_history_id_maintenance_fkey" FOREIGN KEY ("id_maintenance") REFERENCES "maintenances" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
