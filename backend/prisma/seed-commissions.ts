import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── 確保有 ADMIN 帳號 ──────────────────────────────────────────────────────
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@hooong.com',
        password: bcrypt.hashSync('admin1234', 10),
        role: 'ADMIN',
      },
    })
    console.log('✅ Created admin user: admin@hooong.com / admin1234')
  } else {
    console.log(`✅ Found existing admin: ${admin.email}`)
  }

  // ── 確保有配方 ──────────────────────────────────────────────────────────────
  let formula = await prisma.formula.findFirst()
  if (!formula) {
    formula = await prisma.formula.create({
      data: { code: 'F-001', name: '標準前處理配方', productType: '前處理', description: '通用前處理', status: 'ACTIVE' },
    })
    console.log('✅ Created default formula')
  }

  // ── 模擬委託單資料 ──────────────────────────────────────────────────────────
  const commissions = [
    {
      code: `EXP-${Date.now()}-01`,
      experimentDate: new Date('2024-11-15'),
      category: '前處理',
      temperature: 25,
      humidity: 65,
      notes: '客戶要求快速乾燥效果，重點測試 Quick dry 指標',
      clientCompany: '旺隆責任有限公司 / WANG LONG (VIET NAM)',
      fabricCode: 'WL-2024-A001',
      clientContact: '陳大明 / Trần Đại Minh',
      commissionType: 'K',
      expectedDate: new Date('2024-11-25'),
      actualDate: new Date('2024-11-22'),
      testItems: [
        {
          chemicalName: 'RC-629',
          lotNo: 'RC629-2411A',
          testPurposes: ['Quick dry', 'Water repellence'],
          description: '低泡精練滲透劑，用量 2% owf，浴比 1:10，60°C × 20min',
          result: '乾燥時間由 180s → 42s（✓達標），斥水角 95°（✓通過 AATCC 22≥80°）',
        },
        {
          chemicalName: 'DF-301',
          lotNo: 'DF301-2411B',
          testPurposes: ['ΔE', 'Appearance'],
          description: '消泡劑，用量 0.5g/L，搭配 RC-629 使用',
          result: 'ΔE = 0.32（✓ < 1.0），外觀均勻無斑',
        },
        {
          chemicalName: 'AW-120 柔軟劑',
          lotNo: 'AW120-2411C',
          testPurposes: ['Handle', 'Wicking'],
          description: '陽離子型柔軟劑，4% owf，80°C 定型 90s',
          result: '手感柔順（✓），吸濕導濕性略降 5%（可接受範圍）',
        },
      ],
      commissionNotes: { waitingForProcessing: false, report: true, cost: 0 },
      conclusionBefore: '布料原始乾燥時間約 180 秒，斥水性未達標（AATCC 22 < 70°），需施加功能助劑。',
      conclusionAfter: '處理後乾燥時間 42 秒，斥水角 95°，手感柔順，外觀正常，建議量產採用 RC-629 + AW-120 組合配方。',
    },
    {
      code: `EXP-${Date.now()}-02`,
      experimentDate: new Date('2024-12-03'),
      category: '染色',
      temperature: 26,
      humidity: 60,
      notes: '替代現有染料配方，降低成本目標 15%',
      clientCompany: '泓利廣紡織股份有限公司',
      fabricCode: 'HLG-2024-B002',
      clientContact: '李曉華',
      commissionType: 'Q',
      expectedDate: new Date('2024-12-15'),
      actualDate: null,
      testItems: [
        {
          chemicalName: 'NS-Dye-Red 替代品',
          lotNo: 'RED-ALT-001',
          testPurposes: ['ΔE', 'Appearance'],
          description: '紅色活性染料替代品，用量依原配方等量代換，染色條件不變（60°C×40min）',
          result: 'ΔE = 1.8（✗ 超標，> 1.0），色光偏橘，尚不合格',
        },
        {
          chemicalName: 'NS-Dye-Red 替代品 v2（調整比例）',
          lotNo: 'RED-ALT-002',
          testPurposes: ['ΔE', 'Appearance'],
          description: '調整紅/藍比例 9:1 → 8:2，其餘條件不變',
          result: '待測試',
        },
      ],
      commissionNotes: { waitingForProcessing: true, report: false, cost: 85000 },
      conclusionBefore: '原配方成本較高，客戶希望找到同色系但成本降低 15% 的替代染料，ΔE 要求 < 1.0。',
      conclusionAfter: '',
    },
    {
      code: `EXP-${Date.now()}-03`,
      experimentDate: new Date('2025-01-08'),
      category: '後整理',
      temperature: 24,
      humidity: 58,
      notes: '新功能布開發，結合抗菌與速乾雙功能',
      clientCompany: '昇豐企業有限公司',
      fabricCode: 'SF-2025-C003',
      clientContact: '王明義',
      commissionType: 'K',
      expectedDate: new Date('2025-01-22'),
      actualDate: new Date('2025-01-20'),
      testItems: [
        {
          chemicalName: 'AM-501 抗菌劑',
          lotNo: 'AM501-2501A',
          testPurposes: ['Appearance', 'Other'],
          description: '銀離子抗菌劑，1.5% owf，130°C × 2min 焙烘',
          result: '抑菌率 99.5%（✓ JIS L1902 標準），外觀無色差',
        },
        {
          chemicalName: 'QD-200 速乾整理劑',
          lotNo: 'QD200-2501B',
          testPurposes: ['Quick dry', 'Wicking'],
          description: '矽氧烷基速乾劑，3% owf，與 AM-501 同浴處理',
          result: '乾燥時間 38s（✓達標），吸濕高度 15.2cm/30min（✓）',
        },
        {
          chemicalName: 'AM-501 + QD-200 複合配方',
          lotNo: 'COMBO-001',
          testPurposes: ['ΔE', 'Handle', 'Tear Strength'],
          description: '複合配方穩定性測試，同浴 vs 分浴對比',
          result: 'ΔE = 0.18（✓），手感略硬（評分 3/5），撕裂強力下降 < 5%（✓）',
        },
        {
          chemicalName: '洗滌耐久性測試（5次洗滌後）',
          lotNo: 'WASH-TEST-01',
          testPurposes: ['Quick dry', 'Other'],
          description: 'AATCC 135 條件洗滌 5 次後重新測試速乾與抗菌效果',
          result: '速乾時間 45s（✓仍達標），抑菌率 97.2%（✓仍合格）',
        },
      ],
      commissionNotes: { waitingForProcessing: false, report: true, cost: 120000 },
      conclusionBefore: '客戶開發高端運動布，要求同時具備抗菌（JIS L1902 抑菌率 > 99%）與速乾（乾燥時間 < 60s）功能。',
      conclusionAfter: 'AM-501 + QD-200 複合同浴配方達成雙重功能要求，5次洗滌後效果仍達標，建議量產採用，定型條件 130°C×2min。',
    },
    {
      code: `EXP-${Date.now()}-04`,
      experimentDate: new Date('2025-02-14'),
      category: '定型',
      temperature: 25,
      humidity: 62,
      notes: '門幅縮率異常問題排查',
      clientCompany: '旺隆責任有限公司 / WANG LONG (VIET NAM)',
      fabricCode: 'WL-2025-D004',
      clientContact: '阮文強 / Nguyễn Văn Cường',
      commissionType: 'B',
      expectedDate: new Date('2025-02-20'),
      actualDate: null,
      testItems: [
        {
          chemicalName: '現行定型條件（對照）',
          lotNo: 'CTRL-2502A',
          testPurposes: ['Appearance', 'Density'],
          description: '溫度 170°C，速度 20m/min，門幅 152cm，無助劑',
          result: '門幅縮率 -4.2%（✗ 超標，客戶要求 < -2.5%）',
        },
        {
          chemicalName: '調整條件一：降溫',
          lotNo: 'TEST-2502B',
          testPurposes: ['Appearance', 'Density'],
          description: '溫度降至 155°C，其他條件不變',
          result: '門幅縮率 -2.1%（✓），但布面略有水紋',
        },
      ],
      commissionNotes: { waitingForProcessing: true, report: false, cost: 0 },
      conclusionBefore: '客戶反映定型後門幅縮率過大（-4.2%），導致成衣尺寸異常，需排查原因並找出最佳定型條件。',
      conclusionAfter: '',
    },
  ]

  let created = 0
  for (const c of commissions) {
    // 避免重複 code
    const existing = await prisma.experiment.findFirst({ where: { code: c.code } })
    if (existing) { console.log(`⚠️  Skip ${c.code} (already exists)`); continue }

    await prisma.experiment.create({
      data: {
        code: c.code,
        formulaId: formula.id,
        experimenterId: admin.id,
        experimentDate: c.experimentDate,
        category: c.category,
        temperature: c.temperature,
        humidity: c.humidity,
        notes: c.notes,
        clientCompany: c.clientCompany,
        fabricCode: c.fabricCode,
        clientContact: c.clientContact,
        commissionType: c.commissionType,
        expectedDate: c.expectedDate,
        actualDate: c.actualDate ?? null,
        testItems: c.testItems,
        commissionNotes: c.commissionNotes,
        conclusionBefore: c.conclusionBefore,
        conclusionAfter: c.conclusionAfter,
      },
    })
    console.log(`✅ Created: ${c.code} — ${c.clientCompany}`)
    created++
  }

  console.log(`\n✅ Done. ${created} 委託單已建立。`)
  console.log('📌 登入帳號: admin@hooong.com / admin1234')
}

main().catch(console.error).finally(() => prisma.$disconnect())
