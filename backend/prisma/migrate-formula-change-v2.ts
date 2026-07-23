import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "FormulaChangeApplication"
    ADD COLUMN IF NOT EXISTS "formulaId" INTEGER REFERENCES "Formula"("id") ON DELETE SET NULL;
  `)
  console.log('✅ 已加入 formulaId 欄位')
}

main().catch(console.error).finally(() => prisma.$disconnect())
