-- AlterTable: maintenances no longer store dates directly — needs a stable column for ordering
ALTER TABLE "maintenances" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: maintenance_logs now also carries the scheduled_date for "Scheduled" status entries
ALTER TABLE "maintenance_logs" ADD COLUMN     "scheduled_date" TIMESTAMP(3);

-- Backfill: copy each maintenance's scheduled_date onto its "Scheduled" status log(s)
UPDATE "maintenance_logs" ml
SET "scheduled_date" = m."scheduled_date"
FROM "maintenances" m
WHERE ml."id_maintenance" = m."id" AND ml."status" = 'Scheduled';

-- AlterTable: drop date columns now derived from maintenance_logs
ALTER TABLE "maintenances" DROP COLUMN "scheduled_date",
DROP COLUMN "start_date",
DROP COLUMN "completion_date";
