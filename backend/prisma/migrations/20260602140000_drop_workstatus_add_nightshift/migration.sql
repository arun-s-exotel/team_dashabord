-- DropForeignKey
ALTER TABLE "work_status" DROP CONSTRAINT IF EXISTS "work_status_user_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "work_status";

-- DropEnum
DROP TYPE IF EXISTS "WorkStatusType";

-- DropEnum
DROP TYPE IF EXISTS "LeaveType";

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN "is_night_shift" BOOLEAN NOT NULL DEFAULT false;
