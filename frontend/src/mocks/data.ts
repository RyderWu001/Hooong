import type { Formula, Experiment, ExperimentResult, User, Ingredient, Sample } from '../types'

export const mockUsers: User[] = [
  { id: 1, username: '管理員', email: 'admin@test.com', role: 'ADMIN', isActive: true },
  { id: 2, username: '王實驗', email: 'lab@test.com', role: 'LAB_STAFF', isActive: true },
  { id: 3, username: '李經理', email: 'manager@test.com', role: 'MANAGER', isActive: true },
]

export const mockIngredients: Ingredient[] = [
  { id: 1, name: '乙醇', unit: 'mL', description: '95% 乙醇' },
  { id: 2, name: '蒸餾水', unit: 'mL', description: '去離子水' },
  { id: 3, name: '甘油', unit: 'g', description: '藥用甘油' },
  { id: 4, name: '氫氧化鈉', unit: 'g', description: '工業級 NaOH' },
  { id: 5, name: '硬脂酸', unit: 'g', description: '皂化原料' },
]

export const mockFormulas: Formula[] = [
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

export const mockExperiments: Experiment[] = [
  {
    id: 1, code: 'EXP-2024-001', formulaId: 1, formulaName: '保濕乳液基底',
    experimenterId: 2, experimenterName: '王實驗',
    experimentDate: '2024-06-10T09:00:00Z',
    temperature: 25.5, humidity: 62.0, notes: '第一次試做，觀察乳化效果',
    steps: [
      { id: 1, stepOrder: 1, description: '將蒸餾水加熱至 70°C' },
      { id: 2, stepOrder: 2, description: '緩慢加入甘油，持續攪拌' },
      { id: 3, stepOrder: 3, description: '降溫至 40°C 後加入乙醇' },
      { id: 4, stepOrder: 4, description: '靜置 24 小時觀察穩定性' },
    ],
    attachments: [],
    samples: [],
    createdAt: '2024-06-10T09:00:00Z',
  },
  {
    id: 2, code: 'EXP-2024-002', formulaId: 2, formulaName: '潔顏皂配方',
    experimenterId: 2, experimenterName: '王實驗',
    experimentDate: '2024-06-15T10:00:00Z',
    temperature: 28.0, humidity: 55.0, notes: '皂化實驗，確認 NaOH 比例',
    steps: [
      { id: 5, stepOrder: 1, description: '配製 NaOH 水溶液，冷卻至室溫' },
      { id: 6, stepOrder: 2, description: '將硬脂酸加熱融化' },
      { id: 7, stepOrder: 3, description: '緩慢混合兩液，持續攪拌至 trace 狀態' },
    ],
    attachments: [],
    samples: [
      {
        id: 1, sampleCode: 'SMP-001', clientName: '泓利廣',
        label: '第一批皂樣', targetItem: '硬脂酸',
        sampleDate: '2024-06-15', notes: '切片後觀察截面',
      } as Sample,
    ],
    createdAt: '2024-06-15T10:00:00Z',
  },
  {
    id: 3, code: 'EXP-2024-003', formulaId: 1, formulaName: '保濕乳液基底',
    experimenterId: 2, experimenterName: '王實驗',
    experimentDate: '2024-06-17T09:00:00Z',
    temperature: 24.0, humidity: 58.0, notes: '調整配比，降低乙醇用量',
    steps: [],
    attachments: [],
    samples: [],
    createdAt: '2024-06-17T09:00:00Z',
  },
]

export const mockResults: ExperimentResult[] = [
  {
    id: 1, experimentId: 1, experimentCode: 'EXP-2024-001',
    status: 'SUCCESS',
    description: '乳化穩定，質地均勻，無分層現象',
    reflection: '甘油比例適中，觸感良好',
    issueRecord: '初期攪拌不均，需調整攪拌速度',
    improvement: '建議下次使用均質機提升均勻度',
    clientFeedback: '客戶反映保濕效果佳',
    notes: '可進入量產評估',
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
