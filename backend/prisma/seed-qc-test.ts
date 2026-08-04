import prisma from '../src/db/client'

async function main() {
  // Use ingredients found in DB
  const ingredients = await prisma.ingredient.findMany({
    take: 5,
    orderBy: { id: 'asc' },
    select: { id: true, name: true },
  })

  if (ingredients.length < 3) {
    console.error('需要至少 3 筆原料，請先建立原料資料')
    process.exit(1)
  }

  const [ing1, ing2, ing3] = ingredients

  // Clean up old test batches to avoid duplicates
  await prisma.ingredientBatch.deleteMany({
    where: { batchNo: { in: ['QC-TEST-001', 'QC-TEST-002', 'QC-TEST-003', 'QC-TEST-004', 'QC-TEST-005'] } },
  })

  // Batch 1: 待驗收 — 完整供應商資訊，尚未填寫 QC
  await prisma.ingredientBatch.create({
    data: {
      ingredientId: ing1.id,
      batchNo: 'QC-TEST-001',
      supplierBatch: 'SUP-2026-A001',
      mfgDate: new Date('2026-05-01'),
      expiryDate: new Date('2027-05-01'),
      arrivalDate: new Date('2026-06-10'),
      warehousingDate: new Date('2026-06-11'),
      quantity: 500,
      unit: 'kg',
      status: '正常',
      notes: '待驗收測試批次，請驗證儲存後供應商批號不消失',
      acceptanceNo: 'ACC-2026-001',
      orderDate: new Date('2026-05-15'),
      qcItems: null,
      qcNotes: null,
    },
  })
  console.log(`✅ 批次 QC-TEST-001 建立 (${ing1.name}) — 待驗收，有完整供應商資訊`)

  // Batch 2: 驗收中 — 有 QC 項目但 pH 不合格
  await prisma.ingredientBatch.create({
    data: {
      ingredientId: ing2.id,
      batchNo: 'QC-TEST-002',
      supplierBatch: 'SUP-2026-B005',
      mfgDate: new Date('2026-04-20'),
      expiryDate: new Date('2027-04-20'),
      arrivalDate: new Date('2026-05-28'),
      warehousingDate: new Date('2026-05-29'),
      quantity: 200,
      unit: 'kg',
      status: '正常',
      notes: '部分 QC 項目待確認',
      acceptanceNo: 'ACC-2026-002',
      orderDate: new Date('2026-04-25'),
      qcItems: [
        { item: '外觀',       supplierStd: '透明均勻液體', actualValue: '透明',  confirmedValue: '',     result: 'OK', equipment: '目視' },
        { item: '固成分',     supplierStd: '27–30%',       actualValue: '28.3%', confirmedValue: '',     result: 'OK', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',    supplierStd: '4.5–5.5',      actualValue: '4.2',   confirmedValue: '4.2',  result: 'NG', equipment: 'PH計' },
        { item: '比重',       supplierStd: '1.05–1.10',    actualValue: '1.07',  confirmedValue: '',     result: 'OK', equipment: '比重計' },
        { item: '黏度(cps)', supplierStd: '300–400',       actualValue: '350',   confirmedValue: '',     result: 'OK', equipment: '黏度計 CPS' },
        { item: '醣度',       supplierStd: '',              actualValue: '',      confirmedValue: '',     result: 'OK', equipment: '醣度計 % BRIX' },
        { item: '導電度(mmho/cm)', supplierStd: '',         actualValue: '',      confirmedValue: '',     result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)', supplierStd: '',              actualValue: '',      confirmedValue: '',     result: 'OK', equipment: 'COD測試儀' },
      ],
      qcNotes: 'pH 值偏低（4.2），規格需 4.5–5.5，需再確認',
    },
  })
  console.log(`✅ 批次 QC-TEST-002 建立 (${ing2.name}) — 驗收中，pH NG`)

  // Batch 3: 驗收成功 — 全部通過
  await prisma.ingredientBatch.create({
    data: {
      ingredientId: ing3.id,
      batchNo: 'QC-TEST-003',
      supplierBatch: 'SUP-2026-C012',
      mfgDate: new Date('2026-03-15'),
      expiryDate: new Date('2027-03-15'),
      arrivalDate: new Date('2026-04-02'),
      warehousingDate: new Date('2026-04-03'),
      quantity: 1000,
      unit: 'kg',
      status: '正常',
      notes: '全部 QC 項目通過',
      acceptanceNo: 'ACC-2026-003',
      orderDate: new Date('2026-03-20'),
      qcItems: [
        { item: '外觀',       supplierStd: '透明液體，無異物', actualValue: '透明，無異物', confirmedValue: '', result: 'OK', equipment: '目視' },
        { item: '固成分',     supplierStd: '27–31%',          actualValue: '29.1%',       confirmedValue: '', result: 'OK', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',    supplierStd: '4.8–5.5',          actualValue: '5.1',          confirmedValue: '', result: 'OK', equipment: 'PH計' },
        { item: '比重',       supplierStd: '1.06–1.12',        actualValue: '1.08',         confirmedValue: '', result: 'OK', equipment: '比重計' },
        { item: '黏度(cps)', supplierStd: '300–380',           actualValue: '320',          confirmedValue: '', result: 'OK', equipment: '黏度計 CPS' },
        { item: '醣度',       supplierStd: '',                  actualValue: '',             confirmedValue: '', result: 'OK', equipment: '醣度計 % BRIX' },
        { item: '導電度(mmho/cm)', supplierStd: '',             actualValue: '',             confirmedValue: '', result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)', supplierStd: '< 500',             actualValue: '312',          confirmedValue: '', result: 'OK', equipment: 'COD測試儀' },
      ],
      qcNotes: '各項目均符合驗收標準',
    },
  })
  console.log(`✅ 批次 QC-TEST-003 建立 (${ing3.name}) — 驗收成功，全項 OK`)

  // Batch 4: 驗收失敗 — 多項 NG，狀態異常
  await prisma.ingredientBatch.create({
    data: {
      ingredientId: ing1.id,
      batchNo: 'QC-TEST-004',
      supplierBatch: 'SUP-2026-A009',
      mfgDate: new Date('2026-02-01'),
      expiryDate: new Date('2027-02-01'),
      arrivalDate: new Date('2026-03-05'),
      warehousingDate: new Date('2026-03-06'),
      quantity: 300,
      unit: 'kg',
      status: '異常',
      notes: '多項不合格，退貨處理中',
      acceptanceNo: 'ACC-2026-004',
      orderDate: new Date('2026-02-10'),
      qcItems: [
        { item: '外觀',       supplierStd: '透明液體',  actualValue: '有沉澱物', confirmedValue: '有沉澱物', result: 'NG', equipment: '目視' },
        { item: '固成分',     supplierStd: '27–31%',   actualValue: '22.1%',   confirmedValue: '22.1%',   result: 'NG', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',    supplierStd: '4.5–5.5',  actualValue: '6.8',     confirmedValue: '6.8',     result: 'NG', equipment: 'PH計' },
        { item: '比重',       supplierStd: '1.05–1.10', actualValue: '1.04',   confirmedValue: '',         result: 'NG', equipment: '比重計' },
        { item: '黏度(cps)', supplierStd: '300–400',   actualValue: '360',     confirmedValue: '',         result: 'OK', equipment: '黏度計 CPS' },
        { item: '醣度',       supplierStd: '',          actualValue: '',        confirmedValue: '',         result: 'OK', equipment: '醣度計 % BRIX' },
        { item: '導電度(mmho/cm)', supplierStd: '',     actualValue: '',        confirmedValue: '',         result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)', supplierStd: '',          actualValue: '',        confirmedValue: '',         result: 'OK', equipment: 'COD測試儀' },
      ],
      qcNotes: '外觀、固成分、pH、比重均不合格，建議退貨',
    },
  })
  console.log(`✅ 批次 QC-TEST-004 建立 (${ing1.name}) — 驗收失敗，多項 NG`)

  // Batch 5: 有開封記錄的批次，QC 全通過
  await prisma.ingredientBatch.create({
    data: {
      ingredientId: ing2.id,
      batchNo: 'QC-TEST-005',
      supplierBatch: 'SUP-2025-B088',
      mfgDate: new Date('2025-10-01'),
      expiryDate: new Date('2026-10-01'),
      arrivalDate: new Date('2025-11-15'),
      warehousingDate: new Date('2025-11-16'),
      openedDate: new Date('2026-01-05'),
      openedExpiry: 180,
      usageDate: new Date('2026-01-10'),
      usageQuantity: 50,
      remainingQty: 150,
      quantity: 200,
      unit: 'kg',
      status: '正常',
      notes: '已開封使用，剩餘 150 kg',
      acceptanceNo: 'ACC-2025-088',
      orderDate: new Date('2025-10-20'),
      qcItems: [
        { item: '外觀',       supplierStd: '透明液體', actualValue: '透明', confirmedValue: '', result: 'OK', equipment: '目視' },
        { item: '固成分',     supplierStd: '27–30%',  actualValue: '28.5%', confirmedValue: '', result: 'OK', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',    supplierStd: '4.5–5.5', actualValue: '4.8',  confirmedValue: '', result: 'OK', equipment: 'PH計' },
        { item: '比重',       supplierStd: '',         actualValue: '',     confirmedValue: '', result: 'OK', equipment: '比重計' },
        { item: '黏度(cps)', supplierStd: '',         actualValue: '',     confirmedValue: '', result: 'OK', equipment: '黏度計 CPS' },
        { item: '醣度',       supplierStd: '',         actualValue: '',     confirmedValue: '', result: 'OK', equipment: '醣度計 % BRIX' },
        { item: '導電度(mmho/cm)', supplierStd: '',    actualValue: '',     confirmedValue: '', result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)', supplierStd: '',         actualValue: '',     confirmedValue: '', result: 'OK', equipment: 'COD測試儀' },
      ],
      qcNotes: '驗收合格，已正常領用',
    },
  })
  console.log(`✅ 批次 QC-TEST-005 建立 (${ing2.name}) — 有開封記錄，含剩餘量`)

  console.log('\n🎉 測試資料建立完成！共 5 筆批次')
  console.log('   QC-TEST-001: 待驗收（可測試儲存後供應商資訊是否保留）')
  console.log('   QC-TEST-002: 驗收中（有 pH NG）')
  console.log('   QC-TEST-003: 驗收成功（全項通過）')
  console.log('   QC-TEST-004: 驗收失敗（多項 NG，狀態異常）')
  console.log('   QC-TEST-005: 已開封（含剩餘量與使用記錄）')
}

main().catch(console.error).finally(() => prisma.$disconnect())
