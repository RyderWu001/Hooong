/**
 * 附件2 QC 模擬資料種子腳本
 * 建立原料、批次，並填入進料品質檢驗（CMS03-07-2B）完整資料
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── 固定 QC 欄位（與 MaterialsPage QC_ITEMS_DEFAULT 一致）────────────────
type QCItem = {
  item: string; supplierStd: string; actualValue: string
  confirmedValue: string; result: 'OK' | 'NG'; equipment: string
}

// ── 模擬原料清單 ──────────────────────────────────────────────────────────
const INGREDIENTS = [
  {
    code: 'RC-629',
    name: 'RC-629 低泡精練滲透劑',
    unit: 'kg',
    category: '精練劑',
    description: '低泡型陰離子界面活性劑，用於前處理精練及滲透，適合高溫短時間製程。',
    solidContent: '45±2%',
    density: '1.05~1.10',
    appearance: '淡黃色至琥珀色透明液體',
    storageCondition: '陰涼乾燥處，避免冷凍，保存溫度 5–40°C',
    shelfLife: '24個月',
  },
  {
    code: 'AW-120',
    name: 'AW-120 陽離子柔軟劑',
    unit: 'kg',
    category: '柔軟劑',
    description: '陽離子型長鏈脂肪醯胺，賦予布料柔順滑爽手感，耐洗性佳。',
    solidContent: '30±2%',
    density: '1.02~1.08',
    appearance: '白色至淡黃色乳狀液',
    storageCondition: '避免高溫及冰凍，保存溫度 10–35°C',
    shelfLife: '18個月',
  },
  {
    code: 'DF-301',
    name: 'DF-301 消泡劑',
    unit: 'kg',
    category: '助劑',
    description: '矽氧烷基消泡劑，少量使用即可有效抑制泡沫，與多數助劑相容性好。',
    solidContent: '20±2%',
    density: '0.95~1.02',
    appearance: '乳白色均勻液體',
    storageCondition: '密封保存，避免直接日曬，保存溫度 5–30°C',
    shelfLife: '12個月',
  },
]

// ── QC 測值模板（每種原料各 2 批次）────────────────────────────────────────
const BATCH_QC: Record<string, Array<{
  batchNo: string; supplierBatch: string; quantity: number
  arrivalDate: Date; expiryDate: Date
  acceptanceNo: string; orderDate: Date; qcNotes: string
  qcPhotoAppearance: string; qcPhotoSolid: string
  qcItems: QCItem[]
}>> = {
  'RC-629': [
    {
      batchNo: 'RC629-2411A',
      supplierBatch: 'SUPRC-241101',
      quantity: 200,
      arrivalDate: new Date('2024-11-08'),
      expiryDate: new Date('2026-11-08'),
      acceptanceNo: 'ACC-2024-1101',
      orderDate: new Date('2024-11-01'),
      qcNotes: '外觀、固成分及各項理化指標均符合供應商規格，批次品質良好，同意全數放行入庫。',
      qcPhotoAppearance: 'https://picsum.photos/seed/rc629-app-01/400/300',
      qcPhotoSolid: 'https://picsum.photos/seed/rc629-sol-01/400/300',
      qcItems: [
        { item: '外觀',       supplierStd: '淡黃色透明液體', actualValue: '淡黃色透明液體', confirmedValue: '淡黃色透明液體', result: 'OK', equipment: '目視' },
        { item: '固成分',     supplierStd: '45±2%',          actualValue: '44.8%',          confirmedValue: '44.8%',          result: 'OK', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',    supplierStd: '5.0~7.0',        actualValue: '6.2',            confirmedValue: '6.2',            result: 'OK', equipment: 'PH計' },
        { item: '比重',       supplierStd: '1.05~1.10',      actualValue: '1.07',           confirmedValue: '1.07',           result: 'OK', equipment: '比重計' },
        { item: '醣度',       supplierStd: '40~50 BRIX',     actualValue: '43.5 BRIX',      confirmedValue: '43.5 BRIX',      result: 'OK', equipment: '醣度計 % BRIX' },
        { item: '黏度(cps)', supplierStd: '200~400 cps',    actualValue: '312 cps',        confirmedValue: '310 cps',        result: 'OK', equipment: '黏度計 CPS' },
        { item: '導電度(mmho/cm)', supplierStd: '<5 mmho/cm', actualValue: '3.2 mmho/cm', confirmedValue: '3.2 mmho/cm', result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)', supplierStd: '<5000 mg/L',     actualValue: '3820 mg/L',      confirmedValue: '3820 mg/L',      result: 'OK', equipment: 'COD測試儀' },
      ],
    },
    {
      batchNo: 'RC629-2501B',
      supplierBatch: 'SUPRC-250103',
      quantity: 150,
      arrivalDate: new Date('2025-01-10'),
      expiryDate: new Date('2027-01-10'),
      acceptanceNo: 'ACC-2025-0103',
      orderDate: new Date('2025-01-03'),
      qcNotes: '黏度略高於上限，二次確認後仍偏高，已回饋供應商改善。本批條件放行，加強下批追蹤。',
      qcPhotoAppearance: 'https://picsum.photos/seed/rc629-app-02/400/300',
      qcPhotoSolid: 'https://picsum.photos/seed/rc629-sol-02/400/300',
      qcItems: [
        { item: '外觀',       supplierStd: '淡黃色透明液體', actualValue: '淡黃色透明液體', confirmedValue: '淡黃色透明液體', result: 'OK', equipment: '目視' },
        { item: '固成分',     supplierStd: '45±2%',          actualValue: '45.3%',          confirmedValue: '45.3%',          result: 'OK', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',    supplierStd: '5.0~7.0',        actualValue: '6.5',            confirmedValue: '6.5',            result: 'OK', equipment: 'PH計' },
        { item: '比重',       supplierStd: '1.05~1.10',      actualValue: '1.08',           confirmedValue: '1.08',           result: 'OK', equipment: '比重計' },
        { item: '醣度',       supplierStd: '40~50 BRIX',     actualValue: '45.0 BRIX',      confirmedValue: '45.0 BRIX',      result: 'OK', equipment: '醣度計 % BRIX' },
        { item: '黏度(cps)', supplierStd: '200~400 cps',    actualValue: '418 cps',        confirmedValue: '415 cps',        result: 'NG', equipment: '黏度計 CPS' },
        { item: '導電度(mmho/cm)', supplierStd: '<5 mmho/cm', actualValue: '4.1 mmho/cm', confirmedValue: '4.1 mmho/cm', result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)', supplierStd: '<5000 mg/L',     actualValue: '4210 mg/L',      confirmedValue: '4210 mg/L',      result: 'OK', equipment: 'COD測試儀' },
      ],
    },
  ],
  'AW-120': [
    {
      batchNo: 'AW120-2411C',
      supplierBatch: 'SUPAW-241115',
      quantity: 300,
      arrivalDate: new Date('2024-11-20'),
      expiryDate: new Date('2026-05-20'),
      acceptanceNo: 'ACC-2024-1115',
      orderDate: new Date('2024-11-15'),
      qcNotes: '各項指標符合規格，外觀均勻，無離水分層現象，批次合格放行。',
      qcPhotoAppearance: 'https://picsum.photos/seed/aw120-app-01/400/300',
      qcPhotoSolid: 'https://picsum.photos/seed/aw120-sol-01/400/300',
      qcItems: [
        { item: '外觀',       supplierStd: '白色乳狀液',    actualValue: '白色均勻乳液',  confirmedValue: '白色均勻乳液',  result: 'OK', equipment: '目視' },
        { item: '固成分',     supplierStd: '30±2%',         actualValue: '30.2%',         confirmedValue: '30.2%',         result: 'OK', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',    supplierStd: '4.5~6.5',       actualValue: '5.5',           confirmedValue: '5.5',           result: 'OK', equipment: 'PH計' },
        { item: '比重',       supplierStd: '1.02~1.08',     actualValue: '1.04',          confirmedValue: '1.04',          result: 'OK', equipment: '比重計' },
        { item: '醣度',       supplierStd: '28~35 BRIX',    actualValue: '29.8 BRIX',     confirmedValue: '29.8 BRIX',     result: 'OK', equipment: '醣度計 % BRIX' },
        { item: '黏度(cps)', supplierStd: '50~150 cps',    actualValue: '98 cps',        confirmedValue: '98 cps',        result: 'OK', equipment: '黏度計 CPS' },
        { item: '導電度(mmho/cm)', supplierStd: '<3 mmho/cm', actualValue: '2.1 mmho/cm', confirmedValue: '2.1 mmho/cm', result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)', supplierStd: '<3000 mg/L',    actualValue: '2450 mg/L',     confirmedValue: '2450 mg/L',     result: 'OK', equipment: 'COD測試儀' },
      ],
    },
    {
      batchNo: 'AW120-2502D',
      supplierBatch: 'SUPAW-250210',
      quantity: 200,
      arrivalDate: new Date('2025-02-15'),
      expiryDate: new Date('2026-08-15'),
      acceptanceNo: 'ACC-2025-0210',
      orderDate: new Date('2025-02-10'),
      qcNotes: '固成分及醣度均低於規格下限，通知供應商確認生產批次紀錄，本批次暫緩放行，待供應商回覆處理。',
      qcPhotoAppearance: 'https://picsum.photos/seed/aw120-app-02/400/300',
      qcPhotoSolid: 'https://picsum.photos/seed/aw120-sol-02/400/300',
      qcItems: [
        { item: '外觀',       supplierStd: '白色乳狀液',    actualValue: '白色乳狀液（稍稀）', confirmedValue: '白色乳狀液（稍稀）', result: 'OK', equipment: '目視' },
        { item: '固成分',     supplierStd: '30±2%',         actualValue: '27.6%',         confirmedValue: '27.5%',         result: 'NG', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',    supplierStd: '4.5~6.5',       actualValue: '5.8',           confirmedValue: '5.8',           result: 'OK', equipment: 'PH計' },
        { item: '比重',       supplierStd: '1.02~1.08',     actualValue: '1.02',          confirmedValue: '1.02',          result: 'OK', equipment: '比重計' },
        { item: '醣度',       supplierStd: '28~35 BRIX',    actualValue: '26.2 BRIX',     confirmedValue: '26.0 BRIX',     result: 'NG', equipment: '醣度計 % BRIX' },
        { item: '黏度(cps)', supplierStd: '50~150 cps',    actualValue: '62 cps',        confirmedValue: '62 cps',        result: 'OK', equipment: '黏度計 CPS' },
        { item: '導電度(mmho/cm)', supplierStd: '<3 mmho/cm', actualValue: '1.8 mmho/cm', confirmedValue: '1.8 mmho/cm', result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)', supplierStd: '<3000 mg/L',    actualValue: '1980 mg/L',     confirmedValue: '1980 mg/L',     result: 'OK', equipment: 'COD測試儀' },
      ],
    },
  ],
  'DF-301': [
    {
      batchNo: 'DF301-2411B',
      supplierBatch: 'SUPDF-241112',
      quantity: 100,
      arrivalDate: new Date('2024-11-18'),
      expiryDate: new Date('2025-11-18'),
      acceptanceNo: 'ACC-2024-1112',
      orderDate: new Date('2024-11-12'),
      qcNotes: '所有檢測項目均在規格範圍內，外觀無分層，消泡效果以小試驗驗證正常，批次合格全數放行。',
      qcPhotoAppearance: 'https://picsum.photos/seed/df301-app-01/400/300',
      qcPhotoSolid: 'https://picsum.photos/seed/df301-sol-01/400/300',
      qcItems: [
        { item: '外觀',       supplierStd: '乳白色均勻液體',  actualValue: '乳白色均勻液體',  confirmedValue: '乳白色均勻液體',  result: 'OK', equipment: '目視' },
        { item: '固成分',     supplierStd: '20±2%',           actualValue: '20.1%',           confirmedValue: '20.1%',           result: 'OK', equipment: '3g×105℃×2hr' },
        { item: 'PH(1%)',    supplierStd: '6.0~8.0',         actualValue: '7.1',             confirmedValue: '7.1',             result: 'OK', equipment: 'PH計' },
        { item: '比重',       supplierStd: '0.95~1.02',       actualValue: '0.98',            confirmedValue: '0.98',            result: 'OK', equipment: '比重計' },
        { item: '醣度',       supplierStd: '18~25 BRIX',      actualValue: '20.5 BRIX',       confirmedValue: '20.5 BRIX',       result: 'OK', equipment: '醣度計 % BRIX' },
        { item: '黏度(cps)', supplierStd: '100~300 cps',     actualValue: '185 cps',         confirmedValue: '185 cps',         result: 'OK', equipment: '黏度計 CPS' },
        { item: '導電度(mmho/cm)', supplierStd: '<2 mmho/cm', actualValue: '0.9 mmho/cm', confirmedValue: '0.9 mmho/cm', result: 'OK', equipment: '導電度計' },
        { item: 'COD(mg/L)', supplierStd: '<2000 mg/L',      actualValue: '1620 mg/L',       confirmedValue: '1620 mg/L',       result: 'OK', equipment: 'COD測試儀' },
      ],
    },
  ],
}

async function main() {
  // 找或建立上傳用 admin
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) {
    console.error('❌ 找不到 ADMIN 使用者，請先建立管理員帳號')
    return
  }
  console.log(`✅ 使用帳號：${admin.email}`)

  let createdIngredients = 0
  let createdBatches = 0

  for (const ing of INGREDIENTS) {
    // 建立或取得原料
    let ingredient = await prisma.ingredient.findFirst({ where: { code: ing.code } })
    if (!ingredient) {
      ingredient = await prisma.ingredient.create({
        data: {
          code: ing.code,
          name: ing.name,
          unit: ing.unit,
          category: ing.category,
          description: ing.description,
          solidContent: ing.solidContent,
          density: ing.density,
          appearance: ing.appearance,
          storageCondition: ing.storageCondition,
          shelfLife: ing.shelfLife,
        },
      })
      console.log(`  🆕 建立原料：${ingredient.code} — ${ingredient.name}`)
      createdIngredients++
    } else {
      console.log(`  ✓  原料已存在：${ingredient.code} — ${ingredient.name}`)
    }

    // 建立批次並填入 QC 資料
    const batches = BATCH_QC[ing.code] ?? []
    for (const b of batches) {
      const existing = await prisma.ingredientBatch.findFirst({
        where: { ingredientId: ingredient.id, batchNo: b.batchNo },
      })

      const data = {
        batchNo: b.batchNo,
        ingredientId: ingredient.id,
        quantity: b.quantity,
        unit: ing.unit,
        supplierBatch: b.supplierBatch,
        arrivalDate: b.arrivalDate,
        expiryDate: b.expiryDate,
        status: 'APPROVED',
        notes: '',
        // QC 欄位
        acceptanceNo: b.acceptanceNo,
        orderDate: b.orderDate,
        qcItems: b.qcItems,
        qcNotes: b.qcNotes,
        qcPhotoAppearance: b.qcPhotoAppearance,
        qcPhotoSolid: b.qcPhotoSolid,
      }

      if (existing) {
        await prisma.ingredientBatch.update({ where: { id: existing.id }, data })
        const ngCount = b.qcItems.filter(i => i.result === 'NG').length
        console.log(`    ↻  更新批次 ${b.batchNo}（${ngCount > 0 ? `⚠ ${ngCount} 項 NG` : '✓ 全部 OK'}）`)
      } else {
        await prisma.ingredientBatch.create({ data })
        const ngCount = b.qcItems.filter(i => i.result === 'NG').length
        console.log(`    🆕 建立批次 ${b.batchNo}（${ngCount > 0 ? `⚠ ${ngCount} 項 NG` : '✓ 全部 OK'}）`)
        createdBatches++
      }
    }
  }

  console.log(`\n✅ 完成！新建原料：${createdIngredients} 個，新建批次：${createdBatches} 筆`)
  console.log('📌 到「原物料管理」→ 點進原料 → 批次的「QC報告」欄位即可查看')
}

main().catch(console.error).finally(() => prisma.$disconnect())
