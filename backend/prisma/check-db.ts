import prisma from '../src/db/client'

async function main() {
  const total = await prisma.ingredient.count()
  const first = await prisma.ingredient.findMany({ take: 5, orderBy: { id: 'asc' }, select: { id: true, name: true, createdAt: true } })
  const last  = await prisma.ingredient.findMany({ take: 5, orderBy: { id: 'desc' }, select: { id: true, name: true, createdAt: true } })
  const batchCount = await prisma.ingredientBatch.count()
  const batches = await prisma.ingredientBatch.findMany({ take: 5, orderBy: { id: 'desc' }, select: { id: true, batchNo: true, ingredientId: true } })
  console.log('=== 原料 ===')
  console.log('Total:', total)
  console.log('First 5:', JSON.stringify(first, null, 2))
  console.log('Last 5:', JSON.stringify(last, null, 2))
  console.log('=== 批號 ===')
  console.log('Total batches:', batchCount)
  console.log('Last 5 batches:', JSON.stringify(batches, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
