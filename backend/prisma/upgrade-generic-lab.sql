BEGIN;
-- AlterTable
ALTER TABLE "Experiment" ADD COLUMN     "templateId" INTEGER;

-- AlterTable
ALTER TABLE "ExperimentGroup" ADD COLUMN     "conditions" JSONB;

-- CreateTable
CREATE TABLE "ExperimentTemplate" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "fields" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperimentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExperimentTemplate_key_key" ON "ExperimentTemplate"("key");

-- CreateIndex
CREATE INDEX "Experiment_templateId_idx" ON "Experiment"("templateId");

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExperimentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;


COMMIT;
