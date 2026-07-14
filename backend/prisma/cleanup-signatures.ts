import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const deleted = await prisma.formSignature.deleteMany({ where: { signedAt: null } })
  console.log(`✅ 已刪除 ${deleted.count} 筆 signedAt 為 null 的殘留記錄`)

  const remaining = await prisma.formSignature.findMany({ orderBy: { id: 'asc' } })
  console.log(`\n目前剩餘 ${remaining.length} 筆有效簽核：`)
  remaining.forEach(r => console.log(`  id=${r.id} formType=${r.formType} formId=${r.formId} slot=${r.slotName}(${r.slotOrder}) signedBy=${r.signedByName} at=${r.signedAt?.toISOString().slice(0,19)}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
