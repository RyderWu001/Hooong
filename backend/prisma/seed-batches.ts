import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 取得前 3 筆原料
  const ingredients = await prisma.ingredient.findMany({
    select: { id: true, name: true, unit: true },
    take: 3,
  })

  if (ingredients.length < 3) {
    console.error('原料數量不足，請先建立原料')
    return
  }

  const [ing1, ing2, ing3] = ingredients

  // 確保這些原料有庫存記錄
  for (const ing of ingredients) {
    await prisma.materialInventory.upsert({
      where: { ingredientId: ing.id },
      update: {},
      create: {
        ingredientId: ing.id,
        currentStock: 0,
        safetyStock: 10,
        supplier: '泓利廣化工',
      },
    })
  }

  // 1. 待驗收 — 沒有 qcItems
  const b1 = await prisma.ingredientBatch.create({
    data: {
      ingredientId: ing1.id,
      batchNo: `${ing1.name.substring(0, 6)}-2507001`,
      supplierBatch: 'SUP-2025-A001',
      arrivalDate: new Date('2025-07-10'),
      mfgDate: new Date('2025-06-20'),
      expiryDate: new Date('2026-06-20'),
      quantity: 50,
      unit: ing1.unit,
      status: '正常',
      notes: '新進貨，尚未驗收',
    },
  })
  console.log(`✅ 建立「待驗收」批次：${b1.batchNo}`)

  // 2. 驗收失敗 — qcItems 有 NG 項目
  const b2 = await prisma.ingredientBatch.create({
    data: {
      ingredientId: ing2.id,
      batchNo: `${ing2.name.substring(0, 6)}-2507002`,
      supplierBatch: 'SUP-2025-B002',
      arrivalDate: new Date('2025-07-12'),
      mfgDate: new Date('2025-05-15'),
      expiryDate: new Date('2026-05-15'),
      quantity: 30,
      unit: ing2.unit,
      status: '異常',
      acceptanceNo: 'ACC-2025-002',
      orderDate: new Date('2025-07-05'),
      qcItems: [
        { name: '外觀', standard: '澄清透明液體', result: 'OK', note: '' },
        { name: 'pH值', standard: '5.5 ~ 6.5', result: 'NG', note: '實測 pH 7.2，超出範圍' },
        { name: '固含量(%)', standard: '≥ 25%', result: 'NG', note: '實測 21%，未達標準' },
        { name: '黏度(cps)', standard: '< 500', result: 'OK', note: '' },
      ],
      qcNotes: '批次 pH 值及固含量不符規格，建議退貨或重新確認規格書。',
      notes: '驗收失敗，聯絡供應商處理中',
    },
  })
  console.log(`✅ 建立「驗收失敗」批次：${b2.batchNo}`)

  // 3. 驗收成功 — qcItems 全部 OK + 建立 3 筆簽核紀錄
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, username: true } })
  const managerUser = await prisma.user.findFirst({ where: { role: 'MANAGER' }, select: { id: true, username: true } })
  const labUser = await prisma.user.findFirst({ where: { role: 'LAB_STAFF' }, select: { id: true, username: true } })

  const b3 = await prisma.ingredientBatch.create({
    data: {
      ingredientId: ing3.id,
      batchNo: `${ing3.name.substring(0, 6)}-2507003`,
      supplierBatch: 'SUP-2025-C003',
      arrivalDate: new Date('2025-07-08'),
      mfgDate: new Date('2025-04-10'),
      expiryDate: new Date('2026-04-10'),
      quantity: 100,
      unit: ing3.unit,
      status: '正常',
      acceptanceNo: 'ACC-2025-003',
      orderDate: new Date('2025-07-01'),
      qcItems: [
        { name: '外觀', standard: '澄清透明液體', result: 'OK', note: '' },
        { name: 'pH值', standard: '5.0 ~ 7.0', result: 'OK', note: '實測 pH 5.8' },
        { name: '固含量(%)', standard: '≥ 30%', result: 'OK', note: '實測 32%' },
        { name: '黏度(cps)', standard: '100 ~ 300', result: 'OK', note: '實測 185 cps' },
      ],
      qcNotes: '各項檢驗均符合規格，可正式入庫使用。',
      notes: '驗收完成，入庫使用',
    },
  })
  console.log(`✅ 建立「驗收成功」批次：${b3.batchNo}`)

  // 建立 3 個簽核（模擬全部簽完）
  const sigUsers = [
    { slot: '檢測員', order: 1, user: labUser ?? adminUser },
    { slot: '審核', order: 2, user: managerUser ?? adminUser },
    { slot: '單位主管', order: 3, user: adminUser },
  ]
  for (const s of sigUsers) {
    if (!s.user) continue
    await prisma.formSignature.upsert({
      where: { formType_formId_slotName: { formType: 'QcReport', formId: b3.id, slotName: s.slot } },
      update: {},
      create: {
        formType: 'QcReport',
        formId: b3.id,
        slotName: s.slot,
        slotOrder: s.order,
        signedById: s.user.id,
        signedByName: s.user.username,
        signedAt: new Date('2025-07-09'),
      },
    })
  }
  console.log(`✅ 建立「驗收成功」批次的 3 筆簽核`)

  console.log('\n完成！3 筆批次資料已建立：')
  console.log(`  待驗收   → ${b1.batchNo} (${ing1.name})`)
  console.log(`  驗收失敗 → ${b2.batchNo} (${ing2.name})`)
  console.log(`  驗收成功 → ${b3.batchNo} (${ing3.name})`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
