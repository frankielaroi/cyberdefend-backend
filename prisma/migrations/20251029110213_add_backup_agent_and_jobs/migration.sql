/*
  Warnings:

  - A unique constraint covering the columns `[jobId]` on the table `backups` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jobId` to the `backups` table without a default value. This is not possible if the table is not empty.
  - Made the column `organizationId` on table `backups` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "BackupJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "backups" DROP CONSTRAINT "backups_organizationId_fkey";

-- AlterTable
ALTER TABLE "backups" ADD COLUMN     "jobId" TEXT NOT NULL,
ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateTable
CREATE TABLE "backup_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_jobs" (
    "id" TEXT NOT NULL,
    "status" "BackupJobStatus" NOT NULL DEFAULT 'PENDING',
    "sourcePath" TEXT NOT NULL,
    "backupType" TEXT NOT NULL DEFAULT 'folder',
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT,
    "s3Path" TEXT,
    "message" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "backup_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "backup_agents_token_key" ON "backup_agents"("token");

-- CreateIndex
CREATE UNIQUE INDEX "backups_jobId_key" ON "backups"("jobId");

-- AddForeignKey
ALTER TABLE "backup_agents" ADD CONSTRAINT "backup_agents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "backup_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backups" ADD CONSTRAINT "backups_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "backup_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
