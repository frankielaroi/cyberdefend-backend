-- CreateEnum
CREATE TYPE "CSITier" AS ENUM ('BASIC', 'FOUNDATIONAL', 'ORGANIZATIONAL', 'ADVANCED', 'PROGRESSIVE', 'INNOVATIVE');

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "overallPercentage" DOUBLE PRECISION NOT NULL,
    "tier" "CSITier" NOT NULL,
    "categoryScores" TEXT NOT NULL,
    "sectionScores" TEXT NOT NULL,
    "industryPercentile" DOUBLE PRECISION,
    "sizePercentile" DOUBLE PRECISION,
    "regionPercentile" DOUBLE PRECISION,
    "questionsAnswered" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "totalTimeMinutes" INTEGER,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assessmentId" TEXT NOT NULL,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_results_assessmentId_key" ON "assessment_results"("assessmentId");

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
