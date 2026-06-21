-- Idempotent migration: safe to re-run if partially applied.

-- Step 1: Add teknisi & role fields to users (IF NOT EXISTS)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role"             TEXT NOT NULL DEFAULT 'member';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "specialization"   TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teknisi_status"   TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "experience_years" INTEGER DEFAULT 0;

-- Step 2: Create tickets table (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "tickets" (
  "id"             TEXT        NOT NULL,
  "id_perusahaan"  TEXT        NOT NULL,
  "id_asset"       TEXT        NOT NULL,
  "id_reporter"    TEXT        NOT NULL,
  "id_assigned"    TEXT,
  "title"          TEXT        NOT NULL,
  "description"    TEXT        NOT NULL,
  "priority"       TEXT        NOT NULL DEFAULT 'Medium',
  "status"         TEXT        NOT NULL DEFAULT 'Open',
  "maintenance_id" TEXT,
  "resolved_at"    TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on maintenance_id (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tickets_maintenance_id_key'
  ) THEN
    ALTER TABLE "tickets" ADD CONSTRAINT "tickets_maintenance_id_key" UNIQUE ("maintenance_id");
  END IF;
END $$;

-- Step 3: Drop old FKs from maintenances → technicians (safe with IF EXISTS)
ALTER TABLE "maintenances" DROP CONSTRAINT IF EXISTS "maintenances_id_teknisi_fkey";
ALTER TABLE "maintenances" DROP CONSTRAINT IF EXISTS "maintenances_assigned_technician_id_fkey";

-- Step 4: Drop FK from maintenance_logs → technicians
ALTER TABLE "maintenance_logs" DROP CONSTRAINT IF EXISTS "maintenance_logs_technician_id_fkey";

-- Step 5: NULL out orphaned technician IDs BEFORE adding new FKs
UPDATE "maintenances"
  SET "id_teknisi" = NULL, "assigned_technician_id" = NULL
  WHERE "id_teknisi" IS NOT NULL OR "assigned_technician_id" IS NOT NULL;

UPDATE "maintenance_logs"
  SET "technician_id" = NULL
  WHERE "technician_id" IS NOT NULL;

-- Step 6: Add new FKs maintenances → users (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenances_id_teknisi_fkey') THEN
    ALTER TABLE "maintenances"
      ADD CONSTRAINT "maintenances_id_teknisi_fkey"
      FOREIGN KEY ("id_teknisi") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenances_assigned_technician_id_fkey') THEN
    ALTER TABLE "maintenances"
      ADD CONSTRAINT "maintenances_assigned_technician_id_fkey"
      FOREIGN KEY ("assigned_technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 7: Add new FK maintenance_logs → users (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_logs_technician_id_fkey') THEN
    ALTER TABLE "maintenance_logs"
      ADD CONSTRAINT "maintenance_logs_technician_id_fkey"
      FOREIGN KEY ("technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 8: Add FKs for tickets (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_id_perusahaan_fkey') THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_id_perusahaan_fkey"
      FOREIGN KEY ("id_perusahaan") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_id_asset_fkey') THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_id_asset_fkey"
      FOREIGN KEY ("id_asset") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_id_reporter_fkey') THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_id_reporter_fkey"
      FOREIGN KEY ("id_reporter") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_id_assigned_fkey') THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_id_assigned_fkey"
      FOREIGN KEY ("id_assigned") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_maintenance_id_fkey') THEN
    ALTER TABLE "tickets"
      ADD CONSTRAINT "tickets_maintenance_id_fkey"
      FOREIGN KEY ("maintenance_id") REFERENCES "maintenances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 9: Drop technicians table (all FK references already removed)
DROP TABLE IF EXISTS "technicians";
