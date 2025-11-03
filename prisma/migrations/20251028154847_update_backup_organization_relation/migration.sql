-- AlterTable
ALTER TABLE "backups" ADD COLUMN     "organizationId" TEXT;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
