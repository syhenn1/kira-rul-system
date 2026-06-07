-- AlterTable: maintenances no longer store status directly — it is now always derived
-- from the most recent entry in maintenance_logs (every maintenance gets a "Scheduled"
-- log on creation, and every later transition is recorded there too).
ALTER TABLE "maintenances" DROP COLUMN "status";
