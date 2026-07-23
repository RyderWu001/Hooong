import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FormulaChangeApplication" (
      "id"                     SERIAL PRIMARY KEY,
      "no"                     TEXT,
      "date"                   TIMESTAMP,
      "customerName"           TEXT,
      "productName"            TEXT,
      "problem"                TEXT,
      "oldFormula"             TEXT,
      "newFormula"             TEXT,
      "productUsage"           TEXT,
      "responseContent"        TEXT,
      "specChanges"            JSONB,
      "notes"                  TEXT,
      "reportDept"             TEXT,
      "reportPerson"           TEXT,
      "reportDate"             TIMESTAMP,
      "reportTime"             TEXT,
      "completionProductUsage" BOOLEAN NOT NULL DEFAULT false,
      "completionOperation"    BOOLEAN NOT NULL DEFAULT false,
      "completionTechConsult"  BOOLEAN NOT NULL DEFAULT false,
      "completionTechService"  BOOLEAN NOT NULL DEFAULT false,
      "completionOther"        BOOLEAN NOT NULL DEFAULT false,
      "createdAt"              TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt"              TIMESTAMP NOT NULL DEFAULT now()
    );
  `)
  console.log('✅ FormulaChangeApplication 資料表建立完成')
}

main().catch(console.error).finally(() => prisma.$disconnect())
