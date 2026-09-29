import type { Experiment, ExperimentTemplate, User, MaterialInventory, MaterialTransaction, Supplier, SupplierEvaluation, PurchaseRecord, FormulaRisk, IngredientRisk, AbnormalEvent } from '../types'

export const mockUsers: User[] = [
  { id: 1, username: '管理員', email: 'admin@test.com', role: 'ADMIN', isActive: true },
  { id: 2, username: '王實驗', email: 'lab@test.com', role: 'LAB_STAFF', isActive: true },
  { id: 3, username: '李經理', email: 'manager@test.com', role: 'MANAGER', isActive: true },
]

export const mockIngredients = [
  { id: 1, name: '乙醇', unit: 'mL', description: '95% 乙醇' },
  { id: 2, name: '蒸餾水', unit: 'mL', description: '去離子水' },
  { id: 3, name: '甘油', unit: 'g', description: '藥用甘油' },
  { id: 4, name: '氫氧化鈉', unit: 'g', description: '工業級 NaOH' },
  { id: 5, name: '硬脂酸', unit: 'g', description: '皂化原料' },
]

export const mockFormulas = [
  {
    id: 1, code: 'F-2024-001', name: '保濕乳液基底', productType: '乳液',
    description: '適合乾燥肌膚的基底配方', status: 'ACTIVE', currentVersion: 3,
    ingredients: [
      { ingredientId: 1, ingredientName: '乙醇', ratio: 20, unit: '%' },
      { ingredientId: 2, ingredientName: '蒸餾水', ratio: 60, unit: '%' },
      { ingredientId: 3, ingredientName: '甘油', ratio: 20, unit: '%' },
    ],
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-06-01T10:30:00Z',
  },
  {
    id: 2, code: 'F-2024-002', name: '潔顏皂配方', productType: '香皂',
    description: '天然皂化配方，溫和不刺激', status: 'ACTIVE', currentVersion: 1,
    ingredients: [
      { ingredientId: 4, ingredientName: '氫氧化鈉', ratio: 15, unit: '%' },
      { ingredientId: 5, ingredientName: '硬脂酸', ratio: 50, unit: '%' },
      { ingredientId: 2, ingredientName: '蒸餾水', ratio: 35, unit: '%' },
    ],
    createdAt: '2024-03-15T09:00:00Z',
    updatedAt: '2024-03-15T09:00:00Z',
  },
  {
    id: 3, code: 'F-2023-008', name: '抗皺精華液', productType: '精華液',
    description: '舊版配方，已停用', status: 'INACTIVE', currentVersion: 2,
    ingredients: [
      { ingredientId: 1, ingredientName: '乙醇', ratio: 10, unit: '%' },
      { ingredientId: 2, ingredientName: '蒸餾水', ratio: 90, unit: '%' },
    ],
    createdAt: '2023-08-20T08:00:00Z',
    updatedAt: '2023-12-01T14:00:00Z',
  },
]

// 開發用 mock：與後端內建範本精簡對應（正式欄位以 backend/src/db/seedTemplates.ts 為準）
const DYE_SHOW = { key: 'experimentType', notIn: ['定型機', '定型機-物性', '定型機-機能'] }
export const mockTemplates: ExperimentTemplate[] = [
  {
    id: 1, key: 'generic', name: '通用實驗', domain: '通用', isActive: true, isBuiltin: true,
    description: '適用任何領域的基本條件欄位，可複製後自行增減欄位',
    fields: [
      { key: 'temperature', label: '溫度', type: 'number', unit: '°C', section: '基本條件' },
      { key: 'duration', label: '時間', type: 'number', unit: 'min', section: '基本條件' },
      { key: 'ph', label: 'pH', type: 'number', section: '基本條件' },
      { key: 'amount', label: '用量／劑量', type: 'text', placeholder: '例：5 g/L', section: '基本條件' },
      { key: 'method', label: '操作方法', type: 'textarea', section: '操作說明' },
    ],
  },
  {
    id: 2, key: 'food', name: '食品配方開發', domain: '食品', isActive: true, isBuiltin: true,
    description: '食品、飲料等配方的加工條件與品質指標',
    fields: [
      { key: 'heatTemp', label: '加熱溫度', type: 'number', unit: '°C', section: '加工條件' },
      { key: 'heatTime', label: '加熱時間', type: 'number', unit: 'min', section: '加工條件' },
      { key: 'sterilization', label: '殺菌方式', type: 'select', options: ['無', '巴氏殺菌', 'UHT', '高壓殺菌'], section: '加工條件' },
      { key: 'additives', label: '添加物', type: 'multiselect', options: ['防腐劑', '香料', '色素', '乳化劑', '增稠劑', '抗氧化劑', '甜味劑'], section: '加工條件' },
      { key: 'ph', label: 'pH', type: 'number', section: '品質指標' },
      { key: 'brix', label: '糖度', type: 'number', unit: '°Brix', section: '品質指標' },
      { key: 'aw', label: '水活性 (aw)', type: 'number', section: '品質指標' },
      { key: 'sensory', label: '官能評價', type: 'textarea', section: '品質指標' },
    ],
  },
  {
    id: 3, key: 'detergent', name: '清潔劑／洗潔精', domain: '日用化學', isActive: true, isBuiltin: true,
    description: '洗潔精、洗衣精等清潔類配方的性能測試條件',
    fields: [
      { key: 'dilution', label: '稀釋倍率', type: 'text', placeholder: '例：1:100', section: '測試條件' },
      { key: 'washTemp', label: '清洗溫度', type: 'number', unit: '°C', section: '測試條件' },
      { key: 'testMethod', label: '洗淨力測試方法', type: 'select', options: ['油污洗淨', '皂垢去除', '汙布洗淨', '其他'], section: '測試條件' },
      { key: 'ingredients', label: '主要成分', type: 'multiselect', options: ['界面活性劑', '香精', '防腐劑', '酵素', '螯合劑', '增稠劑', '色料'], section: '配方特性' },
      { key: 'ph', label: 'pH', type: 'number', section: '性能指標' },
      { key: 'viscosity', label: '黏度', type: 'number', unit: 'cP', section: '性能指標' },
      { key: 'foamHeight', label: '泡沫高度', type: 'number', unit: 'mm', section: '性能指標' },
    ],
  },
  {
    id: 4, key: 'dyeing', name: '染整（相容舊資料）', domain: '紡織染整', isActive: true, isBuiltin: true,
    description: '紡織染色與定型加工條件；欄位與舊版試驗組欄位相同，舊資料可直接沿用',
    fields: [
      { key: 'experimentType', label: '實驗項目', type: 'select', options: ['染色機', '定型機-物性', '定型機-機能'] },
      { key: 'bathRatio', label: '浴比', type: 'text', placeholder: '1:10', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'startPH', label: '起染 pH', type: 'number', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'endPH', label: '終染 pH', type: 'number', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'acidMethod', label: '加酸方式', type: 'text', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'tempRate', label: '升溫速率', type: 'text', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'holdTime', label: '保溫時間', type: 'number', unit: '分鐘', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'leveler', label: '均染劑（用量）', type: 'text', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'fixer', label: '修補劑（用量）', type: 'text', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'calciumChloride', label: '氯化鈣（用量）', type: 'text', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'colorFixative', label: '固色劑（用量）', type: 'text', section: '染色條件', showWhen: DYE_SHOW },
      { key: 'dyeCombination', label: '染料組合', type: 'text', section: '染料條件', showWhen: DYE_SHOW },
      { key: 'dyeAmount', label: '添加量', type: 'text', section: '染料條件', showWhen: DYE_SHOW },
    ],
  },
]

export const mockExperiments: Experiment[] = [
  {
    id: 1, code: 'EXP-2025-001', formulaId: 1, formulaName: 'RC-2025-001',
    experimenterId: 2, experimenterName: '王實驗',
    experimentDate: '2025-06-05T09:00:00Z', category: '客戶開發',
    temperature: 26.0, humidity: 65.0, notes: 'KASEN 牛巴革深紅色對抗試驗',
    clientCompany: null, fabricCode: null, clientContact: null, commissionType: null,
    expectedDate: null, actualDate: null, testItems: null, commissionNotes: null,
    conclusionBefore: null, conclusionAfter: null,
    groups: [
      {
        id: 1, experimentId: 1, name: 'A組（標準條件）', groupOrder: 1,
        bathRatio: '1:10', startPH: 5.0, endPH: 3.8, acidMethod: '分段加入',
        tempRate: '1.5°C/min', holdTime: 45,
        leveler: 'RC-629 3%', fixer: null, calciumChloride: '0.5%', colorFixative: 'RF-500 2%',
        dyeCombination: '酸性紅 R-380', dyeAmount: '4%', notes: '標準染色條件', isSuccess: false,
        experimentType: null, burningCondition: null, washCondition: null,
        dyeAuxiliaries: null, fixingTemp: null, fixingAuxAmount: null,
        fiberSpec: null, widthShrinkage: null, shrinkTime: null, fixingAuxiliaries: null,
        createdAt: '2025-06-05T09:00:00Z',
        steps: [
          { id: 1, groupId: 1, stepOrder: 1, description: '配置染液：溶解酸性紅 R-380 於 60°C 熱水', notes: '', isHighlight: false, attachments: [] },
          { id: 2, groupId: 1, stepOrder: 2, description: '加入 RC-629 均染劑 3%，攪拌均勻', notes: '', isHighlight: false, attachments: [] },
          { id: 3, groupId: 1, stepOrder: 3, description: '投入皮革，起始 pH 5.0', notes: '', isHighlight: true, attachments: [] },
        ],
        attachments: [], samples: [],
      },
      {
        id: 2, experimentId: 1, name: 'B組（高溫條件）', groupOrder: 2,
        bathRatio: '1:10', startPH: 5.0, endPH: 3.5, acidMethod: '分段加入',
        tempRate: '2°C/min', holdTime: 60,
        leveler: 'RC-629 5%', fixer: null, calciumChloride: '0.5%', colorFixative: 'RF-500 2%',
        dyeCombination: '酸性紅 R-380', dyeAmount: '4%', notes: '提高均染劑用量，延長保溫時間', isSuccess: false,
        experimentType: null, burningCondition: null, washCondition: null,
        dyeAuxiliaries: null, fixingTemp: null, fixingAuxAmount: null,
        fiberSpec: null, widthShrinkage: null, shrinkTime: null, fixingAuxiliaries: null,
        createdAt: '2025-06-05T09:00:00Z',
        steps: [],
        attachments: [], samples: [],
      },
    ],
    attachments: [],
    samples: [],
    createdAt: '2025-06-05T09:00:00Z',
  },
  {
    id: 3, code: 'EXP-2025-003', formulaId: null, templateId: 2, template: null,
    experimenterId: 2, experimenterName: '王實驗',
    experimentDate: '2025-06-12T09:00:00Z', category: '新品開發',
    temperature: 25.0, humidity: 60.0, notes: '無糖茶飲殺菌條件比較（範例：食品範本）',
    clientCompany: null, fabricCode: null, clientContact: null, commissionType: null,
    expectedDate: null, actualDate: null, testItems: null, commissionNotes: null,
    conclusionBefore: null, conclusionAfter: null,
    groups: [
      {
        id: 101, experimentId: 3, name: 'A組（巴氏殺菌）', groupOrder: 1, isSuccess: false, notes: '風味保留較佳',
        conditions: { heatTemp: 85, heatTime: 15, sterilization: '巴氏殺菌', additives: ['抗氧化劑', '香料'], ph: 6.8, brix: 0.2, sensory: '茶香明顯，回甘' },
        createdAt: '2025-06-12T09:00:00Z', steps: [], attachments: [], samples: [],
      },
      {
        id: 102, experimentId: 3, name: 'B組（UHT）', groupOrder: 2, isSuccess: true, notes: '保存期較長',
        conditions: { heatTemp: 135, heatTime: 0.1, sterilization: 'UHT', additives: ['抗氧化劑'], ph: 6.7, brix: 0.2, sensory: '略有蒸煮味' },
        createdAt: '2025-06-12T09:00:00Z', steps: [], attachments: [], samples: [],
      },
    ],
    attachments: [],
    samples: [],
    createdAt: '2025-06-12T09:00:00Z',
  },
  {
    id: 2, code: 'EXP-2025-002', formulaId: 2, formulaName: 'RC-2025-002',
    experimenterId: 2, experimenterName: '王實驗',
    experimentDate: '2025-06-10T10:00:00Z', category: '新原料評估',
    temperature: 25.0, humidity: 60.0, notes: '評估新批次 RC-629 均染劑',
    clientCompany: null, fabricCode: null, clientContact: null, commissionType: null,
    expectedDate: null, actualDate: null, testItems: null, commissionNotes: null,
    conclusionBefore: null, conclusionAfter: null,
    groups: [],
    attachments: [],
    samples: [],
    createdAt: '2025-06-10T10:00:00Z',
  },
]

export const mockResults = [
  {
    id: 1, experimentId: 1, experimentCode: 'EXP-2024-001',
    status: 'SUCCESS',
    description: '乳化穩定，質地均勻，無分層現象',
    reflection: '甘油比例適中，觸感良好',
    issueRecord: '初期攪拌不均，需調整攪拌速度',
    improvement: '建議下次使用均質機提升均勻度',
    clientFeedback: '客戶反映保濕效果佳',
    notes: '可進入啟用評估',
    attachments: [],
    createdAt: '2024-06-11T14:00:00Z',
    updatedAt: '2024-06-11T14:00:00Z',
  },
  {
    id: 2, experimentId: 2, experimentCode: 'EXP-2024-002',
    status: 'NEEDS_ADJUST',
    description: '皂化完成，但硬度不足',
    reflection: 'NaOH 用量偏低，導致皂化不完全',
    issueRecord: '成品偏軟，脫模時易變形',
    improvement: '建議將 NaOH 比例調高至 17%',
    clientFeedback: '',
    notes: '待調整配方後重新實驗',
    attachments: [],
    createdAt: '2024-06-16T15:00:00Z',
    updatedAt: '2024-06-16T15:00:00Z',
  },
]

export const mockInventory: MaterialInventory[] = [
  { id: 1, ingredientId: 1, ingredientName: '乙醇', unit: 'mL', currentStock: 5000, safetyStock: 1000, supplier: '台灣化工', expiryDate: '2025-12-31', lastUpdated: '2024-06-10T08:00:00Z' },
  { id: 2, ingredientId: 2, ingredientName: '蒸餾水', unit: 'mL', currentStock: 20000, safetyStock: 5000, supplier: '自製', lastUpdated: '2024-06-10T08:00:00Z' },
  { id: 3, ingredientId: 3, ingredientName: '甘油', unit: 'g', currentStock: 800, safetyStock: 1000, supplier: '德商化工', expiryDate: '2025-06-30', lastUpdated: '2024-06-10T08:00:00Z' },
  { id: 4, ingredientId: 4, ingredientName: '氫氧化鈉', unit: 'g', currentStock: 200, safetyStock: 500, supplier: '台灣化工', expiryDate: '2026-01-01', lastUpdated: '2024-06-10T08:00:00Z' },
  { id: 5, ingredientId: 5, ingredientName: '硬脂酸', unit: 'g', currentStock: 2500, safetyStock: 500, supplier: '德商化工', expiryDate: '2025-08-01', lastUpdated: '2024-06-10T08:00:00Z' },
]

export const mockTransactions: MaterialTransaction[] = [
  { id: 1, ingredientId: 1, ingredientName: '乙醇', transactionType: 'IN', quantity: 5000, unit: 'mL', operator: '管理員', note: '定期採購', createdAt: '2024-06-01T09:00:00Z' },
  { id: 2, ingredientId: 1, ingredientName: '乙醇', transactionType: 'OUT', quantity: 200, unit: 'mL', relatedExperimentId: 1, relatedExperimentCode: 'EXP-2024-001', operator: '王實驗', note: '實驗使用', createdAt: '2024-06-10T09:30:00Z' },
  { id: 3, ingredientId: 3, ingredientName: '甘油', transactionType: 'OUT', quantity: 200, unit: 'g', relatedExperimentId: 1, relatedExperimentCode: 'EXP-2024-001', operator: '王實驗', note: '實驗使用', createdAt: '2024-06-10T09:30:00Z' },
  { id: 4, ingredientId: 4, ingredientName: '氫氧化鈉', transactionType: 'OUT', quantity: 300, unit: 'g', relatedExperimentId: 2, relatedExperimentCode: 'EXP-2024-002', operator: '王實驗', note: '實驗使用', createdAt: '2024-06-15T10:30:00Z' },
  { id: 5, ingredientId: 5, ingredientName: '硬脂酸', transactionType: 'IN', quantity: 3000, unit: 'g', operator: '管理員', note: '補貨入庫', createdAt: '2024-05-20T14:00:00Z' },
]

export const mockSuppliers: Supplier[] = [
  { id: 1, code: 'SUP-001', name: '台灣化工有限公司', contactPerson: '陳志明', phone: '02-12345678', email: 'chen@twchem.com', address: '台北市中山區化工路1號', supplyItems: '乙醇, 氫氧化鈉', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: 2, code: 'SUP-002', name: '德商化工股份有限公司', contactPerson: '林美華', phone: '04-87654321', email: 'lin@dechem.com', address: '台中市工業區化學路5號', supplyItems: '甘油, 硬脂酸', status: 'ACTIVE', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
  { id: 3, code: 'SUP-003', name: '優質原料行', contactPerson: '王大明', phone: '06-11223344', email: 'wang@yzchem.com', address: '台南市安南區原料路3號', supplyItems: '蒸餾水', status: 'INACTIVE', createdAt: '2023-06-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
]

export const mockEvaluations: SupplierEvaluation[] = [
  { id: 1, supplierId: 1, supplierName: '台灣化工有限公司', evaluationDate: '2024-06-01', qualityScore: 90, deliveryScore: 85, priceScore: 80, serviceScore: 88, totalScore: 86, level: 'A', notes: '品質穩定，交期準時', evaluator: '管理員', createdAt: '2024-06-01T10:00:00Z' },
  { id: 2, supplierId: 2, supplierName: '德商化工股份有限公司', evaluationDate: '2024-06-05', qualityScore: 92, deliveryScore: 78, priceScore: 70, serviceScore: 85, totalScore: 81, level: 'A', notes: '品質優良，價格偏高', evaluator: '管理員', createdAt: '2024-06-05T10:00:00Z' },
  { id: 3, supplierId: 1, supplierName: '台灣化工有限公司', evaluationDate: '2024-03-01', qualityScore: 85, deliveryScore: 80, priceScore: 82, serviceScore: 83, totalScore: 83, level: 'A', notes: '整體表現良好', evaluator: '管理員', createdAt: '2024-03-01T10:00:00Z' },
]

export const mockPurchaseRecords: PurchaseRecord[] = [
  { id: 1, supplierId: 1, supplierName: '台灣化工有限公司', ingredientId: 1, ingredientName: '乙醇', quantity: 10000, unit: 'mL', unitPrice: 0.05, totalAmount: 500, purchaseDate: '2024-06-01', deliveryDate: '2024-06-05', status: 'DELIVERED', notes: '', createdAt: '2024-06-01T08:00:00Z' },
  { id: 2, supplierId: 1, supplierName: '台灣化工有限公司', ingredientId: 4, ingredientName: '氫氧化鈉', quantity: 2000, unit: 'g', unitPrice: 0.1, totalAmount: 200, purchaseDate: '2024-06-01', deliveryDate: '2024-06-05', status: 'DELIVERED', notes: '', createdAt: '2024-06-01T08:00:00Z' },
  { id: 3, supplierId: 2, supplierName: '德商化工股份有限公司', ingredientId: 3, ingredientName: '甘油', quantity: 3000, unit: 'g', unitPrice: 0.15, totalAmount: 450, purchaseDate: '2024-05-20', deliveryDate: '2024-05-25', status: 'DELIVERED', notes: '', createdAt: '2024-05-20T08:00:00Z' },
  { id: 4, supplierId: 2, supplierName: '德商化工股份有限公司', ingredientId: 5, ingredientName: '硬脂酸', quantity: 5000, unit: 'g', unitPrice: 0.08, totalAmount: 400, purchaseDate: '2024-05-20', deliveryDate: '2024-05-25', status: 'DELIVERED', notes: '', createdAt: '2024-05-20T08:00:00Z' },
  { id: 5, supplierId: 1, supplierName: '台灣化工有限公司', ingredientId: 1, ingredientName: '乙醇', quantity: 5000, unit: 'mL', unitPrice: 0.05, totalAmount: 250, purchaseDate: '2024-06-15', status: 'PENDING', notes: '等待供應商確認', createdAt: '2024-06-15T08:00:00Z' },
]

export const mockFormulaRisks: FormulaRisk[] = [
  { id: 1, formulaId: 1, formulaCode: 'F-2024-001', formulaName: '保濕乳液基底', riskLevel: 'LOW', riskType: '皮膚刺激', description: '乙醇成分對敏感肌膚可能造成輕微刺激', mitigation: '建議皮膚測試，可降低乙醇比例', assessedBy: '管理員', assessedAt: '2024-06-01T00:00:00Z', nextReviewAt: '2024-12-01T00:00:00Z' },
  { id: 2, formulaId: 2, formulaCode: 'F-2024-002', formulaName: '潔顏皂配方', riskLevel: 'MEDIUM', riskType: '化學反應', description: 'NaOH 為強鹼，皂化反應需嚴格控制溫度與投料順序', mitigation: '確保操作人員佩戴防護裝備，嚴格控制操作流程', assessedBy: '管理員', assessedAt: '2024-06-05T00:00:00Z', nextReviewAt: '2024-09-05T00:00:00Z' },
]

export const mockIngredientRisks: IngredientRisk[] = [
  { id: 1, ingredientId: 4, ingredientName: '氫氧化鈉', riskLevel: 'HIGH', riskType: '腐蝕性', hazardDescription: '強鹼，接觸皮膚或眼睛會造成嚴重灼傷', safeHandling: '穿戴防護手套、護目鏡、防護衣', storageRequirements: '密封儲存於乾燥陰涼處，遠離酸性物質', assessedBy: '管理員', assessedAt: '2024-01-10T00:00:00Z' },
  { id: 2, ingredientId: 1, ingredientName: '乙醇', riskLevel: 'MEDIUM', riskType: '易燃性', hazardDescription: '高濃度乙醇為易燃液體，需遠離火源', safeHandling: '禁止吸煙，避免靜電，保持通風', storageRequirements: '儲存於陰涼通風處，遠離熱源及火源，容器密封', assessedBy: '管理員', assessedAt: '2024-01-10T00:00:00Z' },
  { id: 3, ingredientId: 3, ingredientName: '甘油', riskLevel: 'LOW', riskType: '一般', hazardDescription: '低毒性，一般情況下安全', safeHandling: '避免大量攝入，保持正常衛生習慣', storageRequirements: '密封儲存於室溫乾燥環境', assessedBy: '管理員', assessedAt: '2024-01-10T00:00:00Z' },
]

export const mockAbnormalEvents: AbnormalEvent[] = [
  { id: 1, eventCode: 'EVT-2024-001', title: '乙醇濃度不合規格', description: '批號 L240610 乙醇純度低於規格（規格 95%，實測 90%）', eventType: '原料品質', severity: 'HIGH', status: 'RESOLVED', relatedIngredientId: 1, relatedIngredientName: '乙醇', occurredAt: '2024-06-10T10:00:00Z', reportedBy: '王實驗', resolution: '退回供應商，重新採購合格批次', resolvedAt: '2024-06-12T14:00:00Z', createdAt: '2024-06-10T10:00:00Z' },
  { id: 2, eventCode: 'EVT-2024-002', title: '皂化實驗結果不合格', description: 'EXP-2024-002 皂化度不足，成品硬度未達標準', eventType: '實驗異常', severity: 'MEDIUM', status: 'INVESTIGATING', relatedFormulaId: 2, relatedFormulaName: '潔顏皂配方', occurredAt: '2024-06-16T09:00:00Z', reportedBy: '王實驗', createdAt: '2024-06-16T09:00:00Z' },
  { id: 3, eventCode: 'EVT-2024-003', title: '甘油庫存低於安全水位', description: '甘油當前庫存 800g，低於安全庫存 1000g，需儘快補貨', eventType: '庫存異常', severity: 'MEDIUM', status: 'OPEN', relatedIngredientId: 3, relatedIngredientName: '甘油', occurredAt: '2024-06-17T08:00:00Z', reportedBy: '系統', createdAt: '2024-06-17T08:00:00Z' },
]

export const mockFormulaVersions = [
  { version: 3, changeNote: '降低甘油比例，增加保水成分', createdAt: '2024-06-01T10:30:00Z', createdBy: '王實驗', ingredients: [] },
  { version: 2, changeNote: '調整乙醇與水的比例', createdAt: '2024-03-10T09:00:00Z', createdBy: '王實驗', ingredients: [] },
  { version: 1, changeNote: '初始版本', createdAt: '2024-01-10T08:00:00Z', createdBy: '管理員', ingredients: [] },
]

export const mockResultSummary = {
  total: 2,
  successCount: 1,
  failedCount: 0,
  observingCount: 0,
  needsAdjustCount: 1,
  successRate: '50%',
}

export const mockFormulaUsage = [
  { formulaId: 1, formulaCode: 'F-2024-001', formulaName: '保濕乳液基底', productType: '乳液', usageCount: 2, successCount: 1, failedCount: 0, observingCount: 1 },
  { formulaId: 2, formulaCode: 'F-2024-002', formulaName: '潔顏皂配方', productType: '香皂', usageCount: 1, successCount: 0, failedCount: 0, observingCount: 1 },
]
