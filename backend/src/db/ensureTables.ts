import 'dotenv/config'
import { Client } from 'pg'

const DIRECT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? ''

export async function ensureCustomTables() {
  const client = new Client({ connectionString: DIRECT_URL })
  await client.connect()
  try {
    await client.query(`
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
        "formulaId"              INTEGER REFERENCES "Formula"("id") ON DELETE SET NULL,
        "createdAt"              TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"              TIMESTAMP NOT NULL DEFAULT now()
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "MassProductionApproval" (
        "id"                    SERIAL PRIMARY KEY,
        "no"                    TEXT,
        "newFormulaCode"        TEXT,
        "oldFormulaCode"        TEXT,
        "date"                  TIMESTAMP,
        "dept"                  TEXT,
        "applicant"             TEXT,
        "productName"           TEXT,
        "customerUsage"         TEXT,
        "testCode"              TEXT,
        "testContent"           TEXT,
        "testTypePhysical"      BOOLEAN NOT NULL DEFAULT false,
        "testTypeStability"     BOOLEAN NOT NULL DEFAULT false,
        "testTypeApplication"   BOOLEAN NOT NULL DEFAULT false,
        "officialFormula"       TEXT,
        "specStandards"         JSONB,
        "testSummary"           TEXT,
        "meetsInternalSpec"     TEXT,
        "testCompletionDate"    TIMESTAMP,
        "mrsl1"                 TEXT,
        "mrsl2"                 TEXT,
        "zdhcMrsl"              TEXT,
        "zdhcLevel1Required"    BOOLEAN NOT NULL DEFAULT false,
        "zdhcLevel1Result"      TEXT,
        "zdhcLevel3Required"    BOOLEAN NOT NULL DEFAULT false,
        "zdhcLevel3Result"      TEXT,
        "zdhcPidCode"           TEXT,
        "sdsVersions"           JSONB,
        "tdsVersions"           JSONB,
        "coaResult"             TEXT,
        "otherRegulations"      TEXT,
        "massProductionDate"    TIMESTAMP,
        "customerQty"           TEXT,
        "officialProductCode"   TEXT,
        "officialProductName"   TEXT,
        "productionRisks"       TEXT,
        "reportDept"            TEXT,
        "reportPerson"          TEXT,
        "reportDate"            TIMESTAMP,
        "reportTime"            TEXT,
        "completionProductApp"  BOOLEAN NOT NULL DEFAULT false,
        "completionOperation"   BOOLEAN NOT NULL DEFAULT false,
        "completionTechConsult" BOOLEAN NOT NULL DEFAULT false,
        "completionTechService" BOOLEAN NOT NULL DEFAULT false,
        "completionOther"       BOOLEAN NOT NULL DEFAULT false,
        "formulaId"             INTEGER REFERENCES "Formula"("id") ON DELETE SET NULL,
        "createdAt"             TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"             TIMESTAMP NOT NULL DEFAULT now()
      );
    `)

    console.log('✅ Custom tables verified (FormulaChangeApplication, MassProductionApproval)')
  } finally {
    await client.end()
  }
}
