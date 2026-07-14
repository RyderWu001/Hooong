import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const del = await prisma.formSignature.deleteMany({ where: { signedByName: null } })
  console.log(`✅ 已刪除 ${del.count} 筆 signedByName 為 null 的舊測試資料`)
  const all = await prisma.formSignature.findMany({ orderBy: { id: 'asc' } })
  console.log(`剩餘 ${all.length} 筆`)
  all.forEach(r => console.log(`  id=${r.id} ${r.formType} formId=${r.formId} slot=${r.slotName} by=${r.signedByName}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
