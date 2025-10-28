/*
  Warnings:

  - You are about to drop the column `userId` on the `assessments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_userId_fkey";

-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "userId";
