import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ─── 送樣連絡單 (SampleSubmission) ────────────────────────────────────────

  await prisma.sampleSubmission.createMany({
    data: [
      {
        formNo: 'SS-2025-001',
        companyName: '宏遠興業股份有限公司',
        factoryLocation: '台南市麻豆區',
        contactPerson: '林志明',
        phone: '06-570-1234',
        formDate: new Date('2025-06-10'),
        sampleTakenDate: new Date('2025-06-12'),
        submissionDate: new Date('2025-06-13'),
        submissionMethod: '宅配',
        businessRequirements: '布面要求耐水洗 30 次以上，色牢度達 4 級，無 ZDHC MRSL 禁用物質',
        sampleItems: [
          { name: '防水劑 RC-629', code: 'RC629', qty: '200g', hasTDS: true, hasCOA: true, submitDate: '2025-06-13', method: '宅配' },
          { name: '柔軟劑 SF-220', code: 'SF220', qty: '100g', hasTDS: true, hasCOA: false, submitDate: '2025-06-13', method: '宅配' },
          { name: '固色劑 FC-101', code: 'FC101', qty: '50g',  hasTDS: false, hasCOA: false, submitDate: '2025-06-13', method: '宅配' },
          { name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '' },
          { name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '' },
        ],
        packaging: [
          { type: '250g瓶', count: 2 },
          { type: '500g瓶', count: 1 },
        ],
        customerFabric: { color: '深藏青', yarnType: 'Nylon 6,6', material: '100% 尼龍', hasReport: true },
        formulaCostTable: {
          formulas: [
            {
              name: '配方一',
              rows: [
                { ingredient: 'RC-629', stock: '現貨', kg: '15' },
                { ingredient: 'SF-220', stock: '現貨', kg: '5' },
                { ingredient: 'FC-101', stock: '現貨', kg: '3' },
                { ingredient: '去離子水', stock: '現貨', kg: '77' },
                { ingredient: '', stock: '', kg: '' },
                { ingredient: '', stock: '', kg: '' },
              ],
            },
            { name: '配方二', rows: Array(6).fill({ ingredient: '', stock: '', kg: '' }) },
            { name: '配方三', rows: Array(6).fill({ ingredient: '', stock: '', kg: '' }) },
            { name: '配方四', rows: Array(6).fill({ ingredient: '', stock: '', kg: '' }) },
          ],
          quoteEval: [
            { estimatedCost: 'NT$85/kg', estimatedPrice: 'NT$110/kg', approvedQuote: 'NT$108/kg' },
            { estimatedCost: '', estimatedPrice: '', approvedQuote: '' },
            { estimatedCost: '', estimatedPrice: '', approvedQuote: '' },
            { estimatedCost: '', estimatedPrice: '', approvedQuote: '' },
          ],
        },
        trackingResults: { week1: '吸水性良好，防水達標', week2: '水洗 10 次後仍維持防水效果', week3: '水洗 30 次後色牢度 4 級', conclusion: '合格，建議量產' },
        orderInfo: { orderTime: '2025-07-01', massProductionModel: 'HC-2025-NW', orderQty: '500kg', formulaNo: 'F-RC629-SF220-01' },
      },
      {
        formNo: 'SS-2025-002',
        companyName: '儒鴻企業股份有限公司',
        factoryLocation: '苗栗縣頭份市',
        contactPerson: '陳美玲',
        phone: '037-668-888',
        formDate: new Date('2025-06-20'),
        sampleTakenDate: new Date('2025-06-22'),
        submissionDate: new Date('2025-06-23'),
        submissionMethod: '快遞',
        businessRequirements: '機能性運動布料，要求透氣、快乾、抗菌，OEKO-TEX Standard 100 認證',
        sampleItems: [
          { name: '抗菌劑 AB-501', code: 'AB501', qty: '200g', hasTDS: true, hasCOA: true, submitDate: '2025-06-23', method: '快遞' },
          { name: '快乾劑 QD-302', code: 'QD302', qty: '100g', hasTDS: true, hasCOA: true, submitDate: '2025-06-23', method: '快遞' },
          { name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '' },
          { name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '' },
          { name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '' },
        ],
        packaging: [
          { type: '500g瓶', count: 2 },
        ],
        customerFabric: { color: '螢光黃', yarnType: 'Polyester', material: '100% 聚酯纖維', hasReport: false },
        formulaCostTable: {
          formulas: [
            {
              name: '配方一',
              rows: [
                { ingredient: 'AB-501', stock: '現貨', kg: '8' },
                { ingredient: 'QD-302', stock: '現貨', kg: '12' },
                { ingredient: '分散劑', stock: '現貨', kg: '2' },
                { ingredient: '去離子水', stock: '現貨', kg: '78' },
                { ingredient: '', stock: '', kg: '' },
                { ingredient: '', stock: '', kg: '' },
              ],
            },
            { name: '配方二', rows: Array(6).fill({ ingredient: '', stock: '', kg: '' }) },
            { name: '配方三', rows: Array(6).fill({ ingredient: '', stock: '', kg: '' }) },
            { name: '配方四', rows: Array(6).fill({ ingredient: '', stock: '', kg: '' }) },
          ],
          quoteEval: [
            { estimatedCost: 'NT$92/kg', estimatedPrice: 'NT$120/kg', approvedQuote: '' },
            { estimatedCost: '', estimatedPrice: '', approvedQuote: '' },
            { estimatedCost: '', estimatedPrice: '', approvedQuote: '' },
            { estimatedCost: '', estimatedPrice: '', approvedQuote: '' },
          ],
        },
        trackingResults: { week1: '抗菌效果待確認', week2: '', week3: '', conclusion: '追蹤中' },
        orderInfo: { orderTime: '', massProductionModel: '', orderQty: '', formulaNo: '' },
      },
      {
        formNo: 'SS-2025-003',
        companyName: '台灣永光化學工業股份有限公司',
        factoryLocation: '桃園市楊梅區',
        contactPerson: '王建國',
        phone: '03-489-5566',
        formDate: new Date('2025-07-05'),
        sampleTakenDate: new Date('2025-07-07'),
        submissionDate: null,
        submissionMethod: '自取',
        businessRequirements: '牛仔布後整理用柔軟劑，要求觸感柔滑，不影響染色牢度',
        sampleItems: [
          { name: '矽氧烷柔軟劑 SL-800', code: 'SL800', qty: '500g', hasTDS: true, hasCOA: false, submitDate: '2025-07-07', method: '自取' },
          { name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '' },
          { name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '' },
          { name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '' },
          { name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '' },
        ],
        packaging: [
          { type: '500g瓶', count: 1 },
        ],
        customerFabric: { color: '靛藍', yarnType: 'Cotton', material: '100% 棉', hasReport: false },
        formulaCostTable: {
          formulas: [
            {
              name: '配方一',
              rows: [
                { ingredient: 'SL-800', stock: '現貨', kg: '20' },
                { ingredient: '去離子水', stock: '現貨', kg: '80' },
                { ingredient: '', stock: '', kg: '' },
                { ingredient: '', stock: '', kg: '' },
                { ingredient: '', stock: '', kg: '' },
                { ingredient: '', stock: '', kg: '' },
              ],
            },
            { name: '配方二', rows: Array(6).fill({ ingredient: '', stock: '', kg: '' }) },
            { name: '配方三', rows: Array(6).fill({ ingredient: '', stock: '', kg: '' }) },
            { name: '配方四', rows: Array(6).fill({ ingredient: '', stock: '', kg: '' }) },
          ],
          quoteEval: [
            { estimatedCost: 'NT$78/kg', estimatedPrice: 'NT$100/kg', approvedQuote: '' },
            { estimatedCost: '', estimatedPrice: '', approvedQuote: '' },
            { estimatedCost: '', estimatedPrice: '', approvedQuote: '' },
            { estimatedCost: '', estimatedPrice: '', approvedQuote: '' },
          ],
        },
        trackingResults: { week1: '', week2: '', week3: '', conclusion: '尚未送樣' },
        orderInfo: { orderTime: '', massProductionModel: '', orderQty: '', formulaNo: '' },
      },
    ],
    skipDuplicates: false,
  })

  console.log('✅ SampleSubmission 3 筆已建立')

  // ─── 化學品需求申請單 (ChemicalRequest) ───────────────────────────────────

  await prisma.chemicalRequest.createMany({
    data: [
      {
        no: 'CR-2025-001',
        date: new Date('2025-06-08'),
        chemicalName: '防水劑 RC-629',
        supplierInfo: '台灣泓利廣化工 / 0800-123-456',
        unitPrice: 'NT$85/kg',
        usage: '尼龍布料防水後整理製程',
        expectedQty: '200 kg/月',
        processInfo: '浸軋法，帶液率 70%，溫度 160°C × 60s',
        isReplacement: false,
        replacedProduct: null,
        hasSDS: '有',
        hasTDS: '有',
        hasCOA: '有',
        hasThirdParty: '有（SGS）',
        zdhcMrsl: '符合 Level 1',
        chemAppendix1: '附件已存檔',
        chemAppendix2: null,
        ingredients: [
          { name: '氟碳樹脂', casNo: '27619-97-2', pct: '30%' },
          { name: '異丙醇', casNo: '67-63-0', pct: '5%' },
          { name: '去離子水', casNo: '7732-18-5', pct: '65%' },
        ],
        supplement: '需低溫儲存 (5-25°C)，有效期 12 個月',
        techOpinion: '符合客戶規格要求，建議採購',
        ehsSDS: true,
        ehsMRSL: true,
        supervisorDecision: '同意採購',
        ceoDecision: '核准',
        notes: '首次採購，建議先試買 50kg 評估',
      },
      {
        no: 'CR-2025-002',
        date: new Date('2025-06-18'),
        chemicalName: '抗菌劑 AB-501',
        supplierInfo: '德國 BioCide GmbH 台灣代理 / 02-2345-6789',
        unitPrice: 'NT$320/kg',
        usage: '聚酯纖維運動布料抗菌處理',
        expectedQty: '50 kg/季',
        processInfo: '浸漬法，濃度 2%，溫度 45°C × 20min',
        isReplacement: true,
        replacedProduct: '舊款 AB-300（已停產）',
        hasSDS: '有',
        hasTDS: '有',
        hasCOA: '有',
        hasThirdParty: '有（TÜV SÜD）',
        zdhcMrsl: '符合 Level 3',
        chemAppendix1: '附件已存檔',
        chemAppendix2: '第三方報告已存檔',
        ingredients: [
          { name: '氯化銀', casNo: '7783-90-6', pct: '0.5%' },
          { name: '聚乙烯醇', casNo: '9002-89-5', pct: '10%' },
          { name: '去離子水', casNo: '7732-18-5', pct: '89.5%' },
        ],
        supplement: 'OEKO-TEX 認證，避免與氧化劑接觸',
        techOpinion: '抗菌效果優於現有產品，成本略高但客戶指定規格，建議採購',
        ehsSDS: true,
        ehsMRSL: true,
        supervisorDecision: '同意，需確認年度預算',
        ceoDecision: '核准（特批）',
        notes: '替代品，需通知客戶確認相容性',
      },
      {
        no: 'CR-2025-003',
        date: new Date('2025-07-02'),
        chemicalName: '矽氧烷柔軟劑 SL-800',
        supplierInfo: '信越化學工業（台灣）/ 02-8765-4321',
        unitPrice: 'NT$78/kg',
        usage: '牛仔布後整理，提升觸感柔滑度',
        expectedQty: '100 kg/月',
        processInfo: '軋染法，濃度 3~5%，定型溫度 150°C',
        isReplacement: false,
        replacedProduct: null,
        hasSDS: '有',
        hasTDS: '有',
        hasCOA: '待取得',
        hasThirdParty: '無',
        zdhcMrsl: '待確認',
        chemAppendix1: null,
        chemAppendix2: null,
        ingredients: [
          { name: '二甲基矽氧烷', casNo: '9006-65-9', pct: '40%' },
          { name: '乳化劑', casNo: '—', pct: '8%' },
          { name: '去離子水', casNo: '7732-18-5', pct: '52%' },
        ],
        supplement: 'COA 及 MRSL 確認書請供應商 2025-07-15 前提交',
        techOpinion: '初步評估符合需求，待 COA 及 MRSL 文件到位後再行採購',
        ehsSDS: true,
        ehsMRSL: false,
        supervisorDecision: '暫緩，待文件齊全',
        ceoDecision: null,
        notes: '請化驗室追蹤文件繳交進度',
      },
    ],
    skipDuplicates: false,
  })

  console.log('✅ ChemicalRequest 3 筆已建立')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
