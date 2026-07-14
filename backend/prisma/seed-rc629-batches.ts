/**
 * 為 RC-629 新增兩筆模擬批次：驗收成功 / 驗收失敗
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const ingredient = await prisma.ingredient.findFirst({ where: { code: 'RC-629' } })
  if (!ingredient) {
    console.error('❌ 找不到原料 RC-629，請先執行 seed-inbound.ts')
    return
  }
  console.log(`✅ 找到原料：${ingredient.name} (id: ${ingredient.id})`)

  // ── 批次 B：驗收成功（全部 OK）────────────────────────────────────────────
  const batchB = await prisma.ingredientBatch.upsert({
    where: { id: -1 },          // 不存在 → 走 create
    update: {},
    create: {
      ingredientId:    ingredient.id,
      batchNo:         'RC629-2507B',
      supplierBatch:   'VN-RC629-250715',
      quantity:        150,
      unit:            'kg',
      remainingQty:    150,
      arrivalDate:     new Date('2025-07-15'),
      warehousingDate: new Date('2025-07-15'),
      mfgDate:         new Date('2025-04-20'),
      expiryDate:      new Date('2027-04-19'),
      openedExpiry:    90,
      status:          '正常',
      notes:           '第二批進貨，與 2507A 同批供應商訂單，已完成驗收。',
      acceptanceNo:    'ACC-2025-0715',
      orderDate:       new Date('2025-07-08'),
      qcNotes:         '各項理化指標均在規格範圍內，外觀色澤均一，無沉澱異物，批次品質良好，全數合格放行。',
      qcPhotoAppearance: 'https://picsum.photos/seed/rc629-b-app/400/300',
      qcPhotoSolid:      'https://picsum.photos/seed/rc629-b-sol/400/300',
      qcItems: [
        { item: '外觀',             supplierStd: '淡黃色透明液體', actualValue: '淡黃色透明液體', confirmedValue: '淡黃色透明液體', result: 'OK', equipment: '目視' },
        { item: '固成分',           supplierStd: '45±2%',          actualValue: '45.1%',          confirmedValue: '45.1%',          result: 'OK', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',          supplierStd: '5.0~7.0',        actualValue: '6.0',            confirmedValue: '6.0',            result: 'OK', equipment: 'PH計' },
        { item: '比重',             supplierStd: '1.05~1.10',      actualValue: '1.06',           confirmedValue: '1.06',           result: 'OK', equipment: '比重計' },
        { item: '醣度',             supplierStd: '40~50 BRIX',     actualValue: '44.2 BRIX',      confirmedValue: '44.2 BRIX',      result: 'OK', equipment: '醣度計 % BRIX' },
        { item: '黏度(cps)',       supplierStd: '200~400 cps',    actualValue: '298 cps',        confirmedValue: '298 cps',        result: 'OK', equipment: '黏度計 CPS' },
        { item: '導電度(mmho/cm)', supplierStd: '<5 mmho/cm',     actualValue: '2.8 mmho/cm',   confirmedValue: '2.8 mmho/cm',   result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)',       supplierStd: '<5000 mg/L',     actualValue: '3650 mg/L',      confirmedValue: '3650 mg/L',      result: 'OK', equipment: 'COD測試儀' },
      ],
    },
  }).catch(async () => {
    // upsert by unique batchNo+ingredientId
    const existing = await prisma.ingredientBatch.findFirst({
      where: { ingredientId: ingredient.id, batchNo: 'RC629-2507B' },
    })
    if (existing) return existing
    return prisma.ingredientBatch.create({
      data: {
        ingredientId:    ingredient.id,
        batchNo:         'RC629-2507B',
        supplierBatch:   'VN-RC629-250715',
        quantity:        150,
        unit:            'kg',
        remainingQty:    150,
        arrivalDate:     new Date('2025-07-15'),
        warehousingDate: new Date('2025-07-15'),
        mfgDate:         new Date('2025-04-20'),
        expiryDate:      new Date('2027-04-19'),
        openedExpiry:    90,
        status:          '正常',
        notes:           '第二批進貨，與 2507A 同批供應商訂單，已完成驗收。',
        acceptanceNo:    'ACC-2025-0715',
        orderDate:       new Date('2025-07-08'),
        qcNotes:         '各項理化指標均在規格範圍內，外觀色澤均一，無沉澱異物，批次品質良好，全數合格放行。',
        qcPhotoAppearance: 'https://picsum.photos/seed/rc629-b-app/400/300',
        qcPhotoSolid:      'https://picsum.photos/seed/rc629-b-sol/400/300',
        qcItems: [
          { item: '外觀',             supplierStd: '淡黃色透明液體', actualValue: '淡黃色透明液體', confirmedValue: '淡黃色透明液體', result: 'OK', equipment: '目視' },
          { item: '固成分',           supplierStd: '45±2%',          actualValue: '45.1%',          confirmedValue: '45.1%',          result: 'OK', equipment: '3g×105℃×2hr' },
          { item: 'PH(1%)',          supplierStd: '5.0~7.0',        actualValue: '6.0',            confirmedValue: '6.0',            result: 'OK', equipment: 'PH計' },
          { item: '比重',             supplierStd: '1.05~1.10',      actualValue: '1.06',           confirmedValue: '1.06',           result: 'OK', equipment: '比重計' },
          { item: '醣度',             supplierStd: '40~50 BRIX',     actualValue: '44.2 BRIX',      confirmedValue: '44.2 BRIX',      result: 'OK', equipment: '醣度計 % BRIX' },
          { item: '黏度(cps)',       supplierStd: '200~400 cps',    actualValue: '298 cps',        confirmedValue: '298 cps',        result: 'OK', equipment: '黏度計 CPS' },
          { item: '導電度(mmho/cm)', supplierStd: '<5 mmho/cm',     actualValue: '2.8 mmho/cm',   confirmedValue: '2.8 mmho/cm',   result: 'OK', equipment: '導電度計' },
          { item: 'COD(mg/L)',       supplierStd: '<5000 mg/L',     actualValue: '3650 mg/L',      confirmedValue: '3650 mg/L',      result: 'OK', equipment: 'COD測試儀' },
        ],
      },
    })
  })
  console.log(`✅ 批次 ${batchB.batchNo}（驗收成功）已建立/找到`)

  // ── 批次 C：驗收失敗（固成分 + 比重 NG）────────────────────────────────────
  const existingC = await prisma.ingredientBatch.findFirst({
    where: { ingredientId: ingredient.id, batchNo: 'RC629-2507C' },
  })
  if (!existingC) {
    await prisma.ingredientBatch.create({
      data: {
        ingredientId:    ingredient.id,
        batchNo:         'RC629-2507C',
        supplierBatch:   'VN-RC629-250720',
        quantity:        200,
        unit:            'kg',
        remainingQty:    200,
        arrivalDate:     new Date('2025-07-20'),
        warehousingDate: new Date('2025-07-20'),
        mfgDate:         new Date('2025-05-01'),
        expiryDate:      new Date('2027-04-30'),
        openedExpiry:    90,
        status:          '暫緩',
        notes:           '固成分及比重不符規格，已通知供應商，本批暫停使用。',
        acceptanceNo:    'ACC-2025-0720',
        orderDate:       new Date('2025-07-10'),
        qcNotes:         '固成分偏低（41.2%，低於規格下限 43%），比重亦偏低（1.04），兩項不合格。外觀正常，PH 合格。已發出不合格通知書，供應商正在調查原因，本批次暫緩放行，禁止投入生產。',
        qcPhotoAppearance: 'https://picsum.photos/seed/rc629-c-app/400/300',
        qcPhotoSolid:      'https://picsum.photos/seed/rc629-c-sol/400/300',
        qcItems: [
          { item: '外觀',             supplierStd: '淡黃色透明液體', actualValue: '淡黃色透明液體', confirmedValue: '淡黃色透明液體', result: 'OK', equipment: '目視' },
          { item: '固成分',           supplierStd: '45±2%',          actualValue: '41.2%',          confirmedValue: '41.2%',          result: 'NG', equipment: '3g×105℃×2hr' },
          { item: 'PH(1%)',          supplierStd: '5.0~7.0',        actualValue: '6.3',            confirmedValue: '6.3',            result: 'OK', equipment: 'PH計' },
          { item: '比重',             supplierStd: '1.05~1.10',      actualValue: '1.04',           confirmedValue: '1.04',           result: 'NG', equipment: '比重計' },
          { item: '醣度',             supplierStd: '40~50 BRIX',     actualValue: '39.1 BRIX',      confirmedValue: '39.1 BRIX',      result: 'NG', equipment: '醣度計 % BRIX' },
          { item: '黏度(cps)',       supplierStd: '200~400 cps',    actualValue: '225 cps',        confirmedValue: '225 cps',        result: 'OK', equipment: '黏度計 CPS' },
          { item: '導電度(mmho/cm)', supplierStd: '<5 mmho/cm',     actualValue: '3.5 mmho/cm',   confirmedValue: '3.5 mmho/cm',   result: 'OK', equipment: '導電度計' },
          { item: 'COD(mg/L)',       supplierStd: '<5000 mg/L',     actualValue: '4890 mg/L',      confirmedValue: '4890 mg/L',      result: 'OK', equipment: 'COD測試儀' },
        ],
      },
    })
    console.log('✅ 批次 RC629-2507C（驗收失敗，3 項 NG）已建立')
  } else {
    console.log('ℹ️  批次 RC629-2507C 已存在，略過')
  }

  console.log('\n📋 RC-629 目前批次：')
  const allBatches = await prisma.ingredientBatch.findMany({
    where: { ingredientId: ingredient.id },
    orderBy: { arrivalDate: 'asc' },
    select: { batchNo: true, arrivalDate: true, qcItems: true, status: true },
  })
  for (const b of allBatches) {
    const items = b.qcItems as any[] | null
    const label = !items?.length ? '待驗收' : items.some((i: any) => i.result === 'NG') ? '不合格' : '合格'
    console.log(`  • ${b.batchNo}  到貨：${b.arrivalDate?.toISOString().slice(0, 10)}  驗收：${label}  狀態：${b.status}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
