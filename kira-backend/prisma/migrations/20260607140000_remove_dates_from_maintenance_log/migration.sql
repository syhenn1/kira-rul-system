-- AlterTable: maintenance_logs no longer store scheduled_date/start_date/completion_date —
-- created_at (the moment a status was logged) now serves as the single timestamp basis,
-- combined with status, for deriving every Maintenance date downstream.
ALTER TABLE "maintenance_logs" DROP COLUMN "scheduled_date";
ALTER TABLE "maintenance_logs" DROP COLUMN "start_date";
ALTER TABLE "maintenance_logs" DROP COLUMN "completion_date";
