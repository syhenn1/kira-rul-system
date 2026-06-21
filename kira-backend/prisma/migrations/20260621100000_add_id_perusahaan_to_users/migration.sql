-- Migration: add id_perusahaan FK to users table
-- Idempotent — safe to re-run if partially applied.

-- Step 1: Add nullable column
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_perusahaan" TEXT;

-- Step 2: Add FK constraint (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_perusahaan_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_id_perusahaan_fkey"
      FOREIGN KEY ("id_perusahaan") REFERENCES "companies"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 3: Backfill existing teknisi rows that are already in company_members
-- so they get the direct FK too (avoids needing to re-seed)
UPDATE "users" u
SET "id_perusahaan" = cm."id_perusahaan"
FROM "company_members" cm
WHERE cm."id_user" = u."id"
  AND u."role" = 'teknisi'
  AND u."id_perusahaan" IS NULL;
