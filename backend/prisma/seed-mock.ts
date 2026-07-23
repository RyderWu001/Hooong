import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 找配方 RC-2025-001
  const formula = await prisma.formula.findFirst({ where: { code: 'RC-2025-001' } })
  if (!formula) { console.error('找不到配方 RC-2025-001'); return }
  console.log(`使用配方 id=${formula.id} ${formula.name}`)

  // ── 1. 配方變更核准申請書 (CMS03-07-3A) ──────────────────────────────────────
  const fc = await prisma.formulaChangeApplication.create({
    data: {
      no: 'CMS03-07-3A-2507001',
      date: new Date('2025-07-15'),
      customerName: '越南富達紡織有限公司',
      productName: '均染劑低泡型 RC-2025-001',
      formulaId: formula.id,
      problem: '客戶反映現有配方在低溫（35°C以下）染浴中均染效果不穩定，深色布料出現色花與條紋問題，且泡沫量偏高影響生產效率，要求調整配方以改善低溫均染性能並降低起泡率。',
      oldFormula: '均染劑主劑（非離子型）：45%\n分散劑A：20%\n消泡劑（矽型）：5%\n溶劑（乙醇）：15%\n去離子水：補足至100%',
      newFormula: '均染劑主劑（非離子型）：48%\n低溫活化助劑：8%\n分散劑A：18%\n消泡劑（改性矽型）：7%\n溶劑（乙醇）：10%\n去離子水：補足至100%',
      productUsage: '適用於聚酯纖維（PET）及混紡布料之分散染料染色製程，操作溫度60～130°C，建議用量為布重之0.5～1.5%（o.w.f.）。',
      responseContent: '化驗室評估後確認：新增低溫活化助劑可在60°C時提前啟動均染機制，預計改善低溫色花問題約70%。改性矽型消泡劑泡沫抑制效果較原矽型提升約35%。建議先進行小批量試產（50kg）驗證。',
      specChanges: [
        { item: '固成分含量', oldSpec: '42～46', newSpec: '45～50', unit: '%', remarks: '因主劑比例提高' },
        { item: '泡沫高度（Ross-Miles）', oldSpec: '≤80', newSpec: '≤50', unit: 'mm', remarks: '改性消泡劑效果' },
        { item: '低溫均染指數（60°C）', oldSpec: '≥3級', newSpec: '≥4級', unit: '級', remarks: '新增低溫活化助劑' },
        { item: 'pH值（1%水溶液）', oldSpec: '5.0～7.0', newSpec: '5.0～6.5', unit: '-', remarks: '微調酸鹼範圍' },
        { item: '比重（25°C）', oldSpec: '1.02～1.06', newSpec: '1.03～1.07', unit: 'g/cm³', remarks: '成分調整影響' },
      ],
      notes: '本次配方變更已取得主劑供應商技術支援確認文件（RICH-2025-TC-0089）。建議於2025年8月完成小批試產驗證後正式切換。',
      reportDept: '化驗室',
      reportPerson: '王實驗',
      reportDate: new Date('2025-07-15'),
      reportTime: '10:30',
      completionProductUsage: true,
      completionOperation: true,
      completionTechConsult: true,
      completionTechService: false,
      completionOther: false,
    },
  })
  console.log(`✅ 配方變更申請書 id=${fc.id}  (${fc.no})`)

  // ── 2. 新配方量產核准紀錄表 (CMS03-07-4A) ────────────────────────────────────
  const mp = await prisma.massProductionApproval.create({
    data: {
      no: 'CMS03-07-4A-2507001',
      newFormulaCode: 'RC-2025-001-v2',
      oldFormulaCode: 'RC-2025-001',
      date: new Date('2025-07-20'),
      dept: '化驗室',
      applicant: '王實驗',
      productName: '均染劑低泡型配方 A（改良版）',
      customerUsage: '越南富達紡織有限公司 / 聚酯纖維分散染料染色製程',
      formulaId: formula.id,
      testCode: 'TEST-2507-RC001',
      testContent: '低溫均染性能測試、泡沫控制測試、穩定性加速老化試驗',
      testTypePhysical: true,
      testTypeStability: true,
      testTypeApplication: true,
      officialFormula: '均染劑主劑（非離子型）：48%\n低溫活化助劑：8%\n分散劑A：18%\n消泡劑（改性矽型）：7%\n溶劑（乙醇）：10%\n去離子水：補足至100%',
      specStandards: {
        appearance: '透明至淡黃色液體',
        ph: '5.0～6.5',
        solidContent: '45～50%',
        brix: '48～53',
        density: '1.03～1.07 g/cm³',
        casNo: 'N/A（混合物）',
      },
      testSummary: '1. 低溫均染測試（60°C）：染色均勻度由3級提升至4級，達到客戶要求。\n2. 泡沫控制（Ross-Miles法）：泡沫高度由78mm降至42mm，符合新規格≤50mm。\n3. 穩定性試驗（45°C×30天）：無分層、無沉澱，外觀合格。\n4. 應用測試（客戶布料）：深色布料色花現象消除，獲客戶確認通過。',
      meetsInternalSpec: '符合',
      testCompletionDate: new Date('2025-07-18'),
      mrsl1: '符合',
      mrsl2: '符合',
      zdhcMrsl: '符合',
      zdhcLevel1Required: true,
      zdhcLevel1Result: '通過',
      zdhcLevel3Required: false,
      zdhcLevel3Result: null,
      zdhcPidCode: 'RICH-RC001-V2-2025',
      sdsVersions: { zh: true, en: true, vi: true, date: '2025-07-19' },
      tdsVersions: { zh: true, en: false, vi: true, date: '2025-07-19' },
      coaResult: '合格',
      otherRegulations: '符合越南化工品管制法規（Decree 113/2017/ND-CP）。客戶要求提供越文版SDS，已完成。',
      massProductionDate: new Date('2025-08-01'),
      customerQty: '越南富達紡織 / 首批500kg',
      officialProductCode: 'RICH-EQ-001-V2',
      officialProductName: '低泡均染劑改良版',
      productionRisks: '1. 低溫活化助劑需在55°C以上加入，避免過早析出。\n2. 改性消泡劑用量超過10%時可能影響均染效果，嚴格控制配比。\n3. 首批量產建議由技術人員現場監督，確認操作參數正確。',
      reportDept: '化驗室',
      reportPerson: '王實驗',
      reportDate: new Date('2025-07-20'),
      reportTime: '14:00',
      completionProductApp: true,
      completionOperation: true,
      completionTechConsult: true,
      completionTechService: false,
      completionOther: false,
    },
  })
  console.log(`✅ 量產核准紀錄表 id=${mp.id}  (${mp.no})`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
