import bcrypt from 'bcryptjs'
import prisma from './client'

// 下拉選項類別定義
const DROPDOWN_SEED = [
  {
    key: 'formula_category',
    label: '配方類別',
    options: ['原料', '製成品', '半成品'],
  },
  {
    key: 'formula_type',
    label: '配方類型',
    options: ['樣品', '實驗', '正式產品'],
  },
  {
    key: 'ingredient_category',
    label: '原料分類',
    options: ['主原料', '助劑', '溶劑', '抗菌劑（防腐劑）', '消泡劑', '染整助劑', '包材', '危害化學品', 'ZDHC管制原料'],
  },
  {
    key: 'ingredient_industry',
    label: '原料產業分類',
    options: ['皮革業', '鞋業', '紡織業', '電子業', '其他'],
  },
  {
    key: 'ingredient_status',
    label: '原料狀態',
    options: ['使用中', '停用', '禁用'],
  },
  {
    key: 'ingredient_package',
    label: '規格資訊',
    options: ['鐵桶', '塑膠桶', 'IBC桶', '包'],
  },
  {
    key: 'ingredient_unit',
    label: '原料單位',
    options: ['KG', 'L', 'g', 'mL', '其他'],
  },
  {
    key: 'experiment_category',
    label: '實驗分類',
    options: [
      '客戶開發', '客戶產品對抗', '客戶問題改善', '原料對抗',
      '新原料評估', '原料替代評估', '進料檢驗', '成品檢驗',
      '留樣複驗', '客退品檢驗', '配方優化', '製程優化',
      '染色條件優化', '技術專案研究', '客訴分析',
      '生產異常分析', '染色異常分析', '穩定性異常分析',
    ],
  },
  {
    key: 'result_status',
    label: '實驗結果判定',
    options: ['成功', '失敗', '待驗證'],
  },
  {
    key: 'result_abnormal_reason',
    label: '異常原因',
    options: ['色花', '條痕', '色差', '沉澱', '泡沫'],
  },
  {
    key: 'result_improvement',
    label: '改善措施',
    options: ['延後加酸', '降低升溫速率', '增加均染劑'],
  },
  {
    key: 'result_client_feedback',
    label: '客戶反饋結果',
    options: ['通過', '不通過'],
  },
  {
    key: 'sample_category',
    label: '樣品分類',
    options: ['供應商來樣', '客戶來樣', '實驗樣品', '成品留樣', '對抗樣品', '生產原料留樣', '客戶樣布'],
  },
  {
    key: 'sample_attribute',
    label: '樣品屬性',
    options: ['陰離子', '陽離子', '非離子', '弱陽離子', '弱陰離子'],
  },
  {
    key: 'sample_industry',
    label: '樣品產業別',
    options: ['皮革業', '鞋業', '紡織業', '電子業', '其他'],
  },
  {
    key: 'sample_status',
    label: '樣品狀態',
    options: ['待測試', '測試中', '完成', '報廢'],
  },
  {
    key: 'batch_status',
    label: '批號狀態',
    options: ['正常', '異常', '報廢'],
  },
  {
    key: 'storage_condition',
    label: '保存條件',
    options: ['常溫', '冷藏', '避光'],
  },
  {
    key: 'dyeing_acid_method',
    label: '加酸方式',
    options: ['一次性加入', '分段加入', '緩慢滴加'],
  },
  {
    key: 'formula_freeze_status',
    label: '配方凍結狀態',
    options: ['草稿', '審核中', '已發布', '已凍結'],
  },
  {
    key: 'abnormal_event_type',
    label: '異常事件類型',
    options: ['原物料品質', '實驗異常', '庫存異常', '設備故障', '色差異常', '分層異常', '沉澱異常', '客訴異常', '其他'],
  },
]

async function main() {
  console.log('🌱 開始匯入種子資料...')

  // 清空資料（依外鍵相依順序）
  await prisma.dropdownOption.deleteMany()
  await prisma.dropdownCategory.deleteMany()
  await prisma.ingredientDocument.deleteMany()
  await prisma.ingredientBatch.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.experimentResult.deleteMany()
  await prisma.sample.deleteMany()
  await prisma.experimentGroupStep.deleteMany()
  await prisma.experimentGroup.deleteMany()
  await prisma.materialTransaction.deleteMany()
  await prisma.experiment.deleteMany()
  await prisma.abnormalEvent.deleteMany()
  await prisma.formulaRisk.deleteMany()
  await prisma.ingredientRisk.deleteMany()
  await prisma.formulaVersion.deleteMany()
  await prisma.formulaIngredient.deleteMany()
  await prisma.formula.deleteMany()
  await prisma.purchaseRecord.deleteMany()
  await prisma.supplierEvaluation.deleteMany()
  await prisma.supplierComplianceAudit.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.materialInventory.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.qcDailyLog.deleteMany()
  await prisma.productCounterPlan.deleteMany()
  await prisma.chemPreparation.deleteMany()
  await prisma.productRework.deleteMany()
  await prisma.user.deleteMany()

  // 下拉選項
  for (const cat of DROPDOWN_SEED) {
    await prisma.dropdownCategory.create({
      data: {
        key: cat.key,
        label: cat.label,
        options: {
          create: cat.options.map((opt, i) => ({
            value: opt,
            label: opt,
            sortOrder: i,
          })),
        },
      },
    })
  }
  console.log(`✅ 下拉選項：${DROPDOWN_SEED.length} 個類別`)

  // 使用者
  const hash = (p: string) => bcrypt.hashSync(p, 10)
  const admin = await prisma.user.create({
    data: { username: '管理員', email: 'admin@test.com', password: hash('admin123'), role: 'ADMIN' },
  })
  const lab = await prisma.user.create({
    data: { username: '王實驗', email: 'lab@test.com', password: hash('lab123'), role: 'LAB_STAFF' },
  })
  await prisma.user.create({
    data: { username: '李經理', email: 'manager@test.com', password: hash('manager123'), role: 'MANAGER' },
  })

  // ── 原料（染整相關）──
  const levelerIng = await prisma.ingredient.create({
    data: { name: 'RC-629 均染劑', code: 'ING-001', englishName: 'Leveling Agent RC-629', casNo: '61791-26-2',
      category: '染整助劑', industry: '皮革業,鞋業', status: '使用中', unit: 'g',
      solidContent: '45%', density: '1.03 g/mL', appearance: '淡黃色透明液體',
      storageCondition: '陰涼乾燥，5-35°C', shelfLife: '24 個月',
      description: '弱陰離子型，耐酸耐鹽，低泡均染劑', createdById: admin.id },
  })
  const fixerIng = await prisma.ingredient.create({
    data: { name: 'RC-210 修補劑', code: 'ING-002', category: '染整助劑', industry: '皮革業', status: '使用中',
      unit: 'g', solidContent: '30%', appearance: '無色液體', storageCondition: '常溫儲存',
      description: '用於修補色花、條痕缺陷', createdById: admin.id },
  })
  const colorFixIng = await prisma.ingredient.create({
    data: { name: 'RF-500 固色劑', code: 'ING-003', category: '染整助劑', industry: '皮革業,紡織業', status: '使用中',
      unit: 'g', solidContent: '50%', appearance: '淡棕色液體', storageCondition: '常溫，避免冷凍',
      description: '陽離子固色劑，提升耐洗牢度', createdById: admin.id },
  })
  const dyeRedIng = await prisma.ingredient.create({
    data: { name: '酸性紅 R-380', code: 'ING-004', category: '主原料', industry: '皮革業', status: '使用中',
      unit: 'g', appearance: '深紅色粉末', description: '酸性染料，耐光牢度 5 級', createdById: admin.id },
  })
  const dyeBlackIng = await prisma.ingredient.create({
    data: { name: '酸性黑 A-200', code: 'ING-005', category: '主原料', industry: '皮革業', status: '使用中',
      unit: 'g', appearance: '黑色粉末', description: '酸性黑染料，遮蓋力強', createdById: admin.id },
  })
  const dyeNavyIng = await prisma.ingredient.create({
    data: { name: '酸性藍 B-150', code: 'ING-006', category: '主原料', industry: '皮革業', status: '使用中',
      unit: 'g', appearance: '藍色粉末', description: '藍色酸性染料，耐濕牢度 4 級', createdById: admin.id },
  })

  // ── 配方（染整配方）──
  const f1 = await prisma.formula.create({
    data: {
      code: 'RC-2025-001', name: '均染劑低泡型配方 A', productType: '染整助劑',
      description: '耐酸鹼乳化精練滲透劑，適用皮革染色', status: 'ACTIVE', currentVersion: 2,
      ingredients: {
        create: [
          { ingredientId: levelerIng.id, ratio: 5, unit: '%' },
          { ingredientId: fixerIng.id, ratio: 2, unit: '%' },
          { ingredientId: colorFixIng.id, ratio: 3, unit: '%' },
        ],
      },
      versions: {
        create: [
          { version: 1, changeNote: '初始版本', userId: admin.id, createdAt: new Date('2025-01-10') },
          { version: 2, changeNote: '調整均染劑用量，改善泡沫問題', userId: lab.id, createdAt: new Date('2025-04-01') },
        ],
      },
    },
  })
  const f2 = await prisma.formula.create({
    data: {
      code: 'RC-2025-002', name: '酸性紅深色配方', productType: '染色配方',
      description: '皮革深紅色染色標準配方', status: 'ACTIVE', currentVersion: 1,
      ingredients: {
        create: [
          { ingredientId: dyeRedIng.id, ratio: 4, unit: '%' },
          { ingredientId: levelerIng.id, ratio: 3, unit: '%' },
          { ingredientId: colorFixIng.id, ratio: 2, unit: '%' },
        ],
      },
      versions: {
        create: [{ version: 1, changeNote: '初始版本', userId: lab.id, createdAt: new Date('2025-02-20') }],
      },
    },
  })
  const f3 = await prisma.formula.create({
    data: {
      code: 'RC-2025-003', name: '黑色皮革染色配方', productType: '染色配方',
      description: '酸性黑深染配方，遮蓋力強', status: 'ACTIVE', currentVersion: 3,
      ingredients: {
        create: [
          { ingredientId: dyeBlackIng.id, ratio: 6, unit: '%' },
          { ingredientId: dyeNavyIng.id, ratio: 2, unit: '%' },
          { ingredientId: levelerIng.id, ratio: 5, unit: '%' },
          { ingredientId: fixerIng.id, ratio: 1, unit: '%' },
        ],
      },
      versions: {
        create: [
          { version: 1, changeNote: '初始版本', userId: admin.id, createdAt: new Date('2024-11-01') },
          { version: 2, changeNote: '增加藍色比例修正色光', userId: lab.id, createdAt: new Date('2025-01-15') },
          { version: 3, changeNote: '降低固色劑用量，減少硬化感', userId: lab.id, createdAt: new Date('2025-05-10') },
        ],
      },
    },
  })

  // ── 實驗 1：客戶開發（3 組對比）──
  const exp1 = await prisma.experiment.create({
    data: {
      code: 'EXP-2025-001', formulaId: f2.id, experimenterId: lab.id,
      experimentDate: new Date('2025-06-05'), category: '客戶開發',
      temperature: 26.0, humidity: 65.0,
      notes: 'KASEN 牛巴革深紅色對抗試驗，客戶要求色光偏暖、手感柔軟',
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp1.id, name: 'A組（標準條件）', groupOrder: 1,
      bathRatio: '1:10', startPH: 5.0, endPH: 3.8,
      acidMethod: '分段加入', tempRate: '1.5°C/min', holdTime: 45,
      leveler: 'RC-629 3%', fixer: null, calciumChloride: '0.5%', colorFixative: 'RF-500 2%',
      dyeCombination: '酸性紅 R-380', dyeAmount: '4%',
      notes: '標準染色條件',
      steps: {
        create: [
          { stepOrder: 1, description: '配置染液：溶解酸性紅 R-380 於 60°C 熱水' },
          { stepOrder: 2, description: '加入 RC-629 均染劑 3%，攪拌均勻' },
          { stepOrder: 3, description: '投入皮革，浴比 1:10，起始 pH 5.0' },
          { stepOrder: 4, description: '升溫至 60°C，速率 1.5°C/min' },
          { stepOrder: 5, description: '分段加入醋酸降至 pH 3.8，每 10 分鐘一次' },
          { stepOrder: 6, description: '保溫 45 分鐘後水洗' },
          { stepOrder: 7, description: '加入固色劑 RF-500 2%，固色 20 分鐘' },
        ],
      },
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp1.id, name: 'B組（高溫條件）', groupOrder: 2,
      bathRatio: '1:10', startPH: 5.0, endPH: 3.5,
      acidMethod: '分段加入', tempRate: '2°C/min', holdTime: 60,
      leveler: 'RC-629 5%', fixer: null, calciumChloride: '0.5%', colorFixative: 'RF-500 2%',
      dyeCombination: '酸性紅 R-380', dyeAmount: '4%',
      notes: '提高均染劑用量，延長保溫時間',
      steps: {
        create: [
          { stepOrder: 1, description: '配置染液：溶解酸性紅 R-380 於 60°C 熱水' },
          { stepOrder: 2, description: '加入 RC-629 均染劑 5%（加倍），攪拌均勻' },
          { stepOrder: 3, description: '投入皮革，浴比 1:10，起始 pH 5.0' },
          { stepOrder: 4, description: '升溫至 65°C，速率 2°C/min' },
          { stepOrder: 5, description: '分段加入醋酸降至 pH 3.5' },
          { stepOrder: 6, description: '保溫 60 分鐘，觀察色光均勻性' },
          { stepOrder: 7, description: '加入固色劑 RF-500 2%，固色 20 分鐘' },
        ],
      },
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp1.id, name: 'C組（對照：客戶配方）', groupOrder: 3,
      bathRatio: '1:12', startPH: 5.5, endPH: 4.0,
      acidMethod: '一次性加入', tempRate: '1°C/min', holdTime: 30,
      leveler: 'RC-629 2%', fixer: 'RC-210 1%', calciumChloride: null, colorFixative: 'RF-500 3%',
      dyeCombination: '酸性紅 R-380', dyeAmount: '4.5%',
      notes: '依照客戶提供之原配方操作，作為對照樣',
      steps: {
        create: [
          { stepOrder: 1, description: '依客戶配方配置染液（含 RC-210 修補劑）' },
          { stepOrder: 2, description: '投入皮革，浴比 1:12' },
          { stepOrder: 3, description: '一次性加入醋酸至 pH 4.0' },
          { stepOrder: 4, description: '升溫至 60°C，速率 1°C/min' },
          { stepOrder: 5, description: '保溫 30 分鐘' },
          { stepOrder: 6, description: '加固色劑 3% 固色' },
        ],
      },
    },
  })
  await prisma.experimentResult.create({
    data: {
      experimentId: exp1.id, status: 'OBSERVING',
      handFeelScore: 8, colorShadeScore: 7, fastnessScore: 8, moistureScore: 7,
      description: 'A組色光最接近客戶樣，B組色深度略深，C組有輕微色花',
      reflection: 'B組均染劑加倍後顯著改善均勻度，但色光偏深，需微調染料量',
      issueRecord: 'C組出現輕微條痕，疑為加酸方式問題',
      abnormalReason: '條痕', improvement: '建議改用分段加酸',
      clientFeedback: '客戶看過A組樣品，色光接近，手感需改善', notes: '待客戶確認',
      createdAt: new Date('2025-06-06'),
    },
  })
  await prisma.sample.create({
    data: {
      experimentId: exp1.id, sampleCode: 'SMP-2025-001', clientName: 'KASEN 製革廠',
      label: '深紅色對抗樣 A組', targetItem: '酸性紅 R-380', category: '對抗樣品',
      attribute: '陰離子', industry: '皮革業', status: '完成',
      sampleDate: new Date('2025-06-06'), notes: 'A組最佳，提供客戶確認',
    },
  })

  // ── 實驗 2：新原料評估（2 組）──
  const exp2 = await prisma.experiment.create({
    data: {
      code: 'EXP-2025-002', formulaId: f1.id, experimenterId: lab.id,
      experimentDate: new Date('2025-06-10'), category: '新原料評估',
      temperature: 25.0, humidity: 60.0,
      notes: '評估新批次 RC-629 均染劑（批號 B250601）與舊批效能比較',
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp2.id, name: 'A組（舊批 RC-629）', groupOrder: 1,
      bathRatio: '1:10', startPH: 5.0, endPH: 4.0,
      acidMethod: '分段加入', tempRate: '1.5°C/min', holdTime: 40,
      leveler: 'RC-629 4%（舊批 B250101）', calciumChloride: '0.3%', colorFixative: 'RF-500 2%',
      dyeCombination: '酸性黑 A-200 + 酸性藍 B-150', dyeAmount: '6% + 2%',
      notes: '對照組，使用舊批次原料',
      steps: {
        create: [
          { stepOrder: 1, description: '秤取舊批 RC-629（批號 B250101）4%' },
          { stepOrder: 2, description: '溶解酸性黑、酸性藍染料於熱水' },
          { stepOrder: 3, description: '加入均染劑，投入皮革（浴比 1:10）' },
          { stepOrder: 4, description: '升溫至 60°C，分段加酸至 pH 4.0' },
          { stepOrder: 5, description: '保溫 40 分鐘，水洗，加固色劑' },
        ],
      },
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp2.id, name: 'B組（新批 RC-629）', groupOrder: 2,
      bathRatio: '1:10', startPH: 5.0, endPH: 4.0,
      acidMethod: '分段加入', tempRate: '1.5°C/min', holdTime: 40,
      leveler: 'RC-629 4%（新批 B250601）', calciumChloride: '0.3%', colorFixative: 'RF-500 2%',
      dyeCombination: '酸性黑 A-200 + 酸性藍 B-150', dyeAmount: '6% + 2%',
      notes: '測試組，使用新批次原料，其餘條件完全相同',
      steps: {
        create: [
          { stepOrder: 1, description: '秤取新批 RC-629（批號 B250601）4%' },
          { stepOrder: 2, description: '溶解酸性黑、酸性藍染料於熱水' },
          { stepOrder: 3, description: '加入均染劑，投入皮革（浴比 1:10）' },
          { stepOrder: 4, description: '升溫至 60°C，分段加酸至 pH 4.0' },
          { stepOrder: 5, description: '保溫 40 分鐘，水洗，加固色劑' },
        ],
      },
    },
  })

  // ── 實驗 3：染色條件優化（3 組 pH 對比）──
  const exp3 = await prisma.experiment.create({
    data: {
      code: 'EXP-2025-003', formulaId: f3.id, experimenterId: lab.id,
      experimentDate: new Date('2025-06-15'), category: '染色條件優化',
      temperature: 27.0, humidity: 63.0,
      notes: '黑色皮革染色 pH 終點對色深的影響，找出最佳 pH 條件',
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp3.id, name: 'pH 3.5 組', groupOrder: 1,
      bathRatio: '1:10', startPH: 5.5, endPH: 3.5,
      acidMethod: '緩慢滴加', tempRate: '1°C/min', holdTime: 50,
      leveler: 'RC-629 5%', calciumChloride: '0.5%', colorFixative: 'RF-500 2%',
      dyeCombination: '酸性黑 A-200 + 酸性藍 B-150', dyeAmount: '6% + 2%',
      steps: {
        create: [
          { stepOrder: 1, description: '配置黑色染液，酸黑 6% + 酸藍 2%' },
          { stepOrder: 2, description: '加入 RC-629 均染劑 5%' },
          { stepOrder: 3, description: '投料，浴比 1:10，起始 pH 5.5' },
          { stepOrder: 4, description: '緩慢升溫至 60°C（1°C/min）' },
          { stepOrder: 5, description: '緩慢滴加醋酸，終點 pH 3.5' },
          { stepOrder: 6, description: '保溫 50 分鐘，出料水洗' },
        ],
      },
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp3.id, name: 'pH 4.0 組', groupOrder: 2,
      bathRatio: '1:10', startPH: 5.5, endPH: 4.0,
      acidMethod: '緩慢滴加', tempRate: '1°C/min', holdTime: 50,
      leveler: 'RC-629 5%', calciumChloride: '0.5%', colorFixative: 'RF-500 2%',
      dyeCombination: '酸性黑 A-200 + 酸性藍 B-150', dyeAmount: '6% + 2%',
      steps: {
        create: [
          { stepOrder: 1, description: '配置黑色染液，同 pH 3.5 組' },
          { stepOrder: 2, description: '加入 RC-629 均染劑 5%' },
          { stepOrder: 3, description: '投料，浴比 1:10，起始 pH 5.5' },
          { stepOrder: 4, description: '緩慢升溫至 60°C（1°C/min）' },
          { stepOrder: 5, description: '緩慢滴加醋酸，終點 pH 4.0（較溫和）' },
          { stepOrder: 6, description: '保溫 50 分鐘，出料水洗' },
        ],
      },
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp3.id, name: 'pH 4.5 組', groupOrder: 3,
      bathRatio: '1:10', startPH: 5.5, endPH: 4.5,
      acidMethod: '緩慢滴加', tempRate: '1°C/min', holdTime: 50,
      leveler: 'RC-629 5%', calciumChloride: '0.5%', colorFixative: 'RF-500 2%',
      dyeCombination: '酸性黑 A-200 + 酸性藍 B-150', dyeAmount: '6% + 2%',
      steps: {
        create: [
          { stepOrder: 1, description: '配置黑色染液，同 pH 3.5 組' },
          { stepOrder: 2, description: '加入 RC-629 均染劑 5%' },
          { stepOrder: 3, description: '投料，浴比 1:10，起始 pH 5.5' },
          { stepOrder: 4, description: '緩慢升溫至 60°C（1°C/min）' },
          { stepOrder: 5, description: '緩慢滴加醋酸，終點 pH 4.5（最溫和）' },
          { stepOrder: 6, description: '保溫 50 分鐘，出料水洗' },
        ],
      },
    },
  })
  await prisma.experimentResult.create({
    data: {
      experimentId: exp3.id, status: 'SUCCESS',
      handFeelScore: 9, colorShadeScore: 8, fastnessScore: 9, moistureScore: 8,
      description: 'pH 3.5 組色深最深，均勻度最佳；pH 4.5 組色較淺但手感最佳',
      reflection: '綜合考量，建議採用 pH 4.0 作為標準條件，兼顧色深與手感',
      issueRecord: 'pH 3.5 組末期出現輕微色花，可能原因為加酸速度過快',
      improvement: '建議 pH 3.5 改為更緩慢的逐滴加酸方式',
      clientFeedback: '', notes: '已更新 RC-2025-003 配方步驟說明',
      createdAt: new Date('2025-06-16'),
    },
  })

  // ── 實驗 4：進料檢驗（2 組）──
  const exp4 = await prisma.experiment.create({
    data: {
      code: 'EXP-2025-004', formulaId: f1.id, experimenterId: lab.id,
      experimentDate: new Date('2025-06-18'), category: '進料檢驗',
      temperature: 25.5, humidity: 62.0,
      notes: '新到貨 RC-629 批號 B250610 進料品質驗收',
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp4.id, name: '標準樣對照', groupOrder: 1,
      bathRatio: '1:10', startPH: 5.0, endPH: 4.0,
      acidMethod: '分段加入', tempRate: '1.5°C/min', holdTime: 40,
      leveler: 'RC-629 4%（標準樣 STD-001）', calciumChloride: '0.3%',
      dyeCombination: '酸性紅 R-380', dyeAmount: '3%',
      notes: '使用已驗收之標準樣品作對照',
      steps: {
        create: [
          { stepOrder: 1, description: '取標準樣 STD-001，4%' },
          { stepOrder: 2, description: '依標準染色程序操作' },
          { stepOrder: 3, description: '染色完成，記錄上染率與色光' },
        ],
      },
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp4.id, name: '進料樣 B250610', groupOrder: 2,
      bathRatio: '1:10', startPH: 5.0, endPH: 4.0,
      acidMethod: '分段加入', tempRate: '1.5°C/min', holdTime: 40,
      leveler: 'RC-629 4%（批號 B250610）', calciumChloride: '0.3%',
      dyeCombination: '酸性紅 R-380', dyeAmount: '3%',
      notes: '待驗收之進料批號',
      steps: {
        create: [
          { stepOrder: 1, description: '取進料樣 B250610，4%' },
          { stepOrder: 2, description: '依標準染色程序操作（條件與對照組完全相同）' },
          { stepOrder: 3, description: '染色完成，記錄上染率與色光，與標準樣對比' },
        ],
      },
    },
  })

  // ── 實驗 5：客戶問題改善（2 組）──
  const exp5 = await prisma.experiment.create({
    data: {
      code: 'EXP-2025-005', formulaId: f3.id, experimenterId: lab.id,
      experimentDate: new Date('2025-06-20'), category: '客訴分析',
      temperature: 26.5, humidity: 64.0,
      notes: '客戶反映本批黑色皮革出現色差，調查原因並提出改善方案',
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp5.id, name: '原始配方重現', groupOrder: 1,
      bathRatio: '1:12', startPH: 5.5, endPH: 4.0,
      acidMethod: '一次性加入', tempRate: '2°C/min', holdTime: 30,
      leveler: 'RC-629 3%', colorFixative: 'RF-500 2%',
      dyeCombination: '酸性黑 A-200 + 酸性藍 B-150', dyeAmount: '6% + 2%',
      notes: '還原客戶生產條件，確認問題根源',
      steps: {
        create: [
          { stepOrder: 1, description: '依客戶生產記錄重現染色條件' },
          { stepOrder: 2, description: '一次性加入醋酸至 pH 4.0（問題操作）' },
          { stepOrder: 3, description: '觀察色差出現時間與位置' },
          { stepOrder: 4, description: '記錄染液吸收情況' },
        ],
      },
    },
  })
  await prisma.experimentGroup.create({
    data: {
      experimentId: exp5.id, name: '改善配方驗證', groupOrder: 2,
      bathRatio: '1:12', startPH: 5.5, endPH: 4.0,
      acidMethod: '分段加入', tempRate: '1°C/min', holdTime: 45,
      leveler: 'RC-629 5%', fixer: 'RC-210 0.5%', colorFixative: 'RF-500 2%',
      dyeCombination: '酸性黑 A-200 + 酸性藍 B-150', dyeAmount: '6% + 2%',
      notes: '改善：加酸方式改分段、均染劑加量、降低升溫速率',
      steps: {
        create: [
          { stepOrder: 1, description: '均染劑提高至 5%，並加入修補劑 RC-210 0.5%' },
          { stepOrder: 2, description: '升溫速率降至 1°C/min（較慢，提升均染性）' },
          { stepOrder: 3, description: '分段加酸：每 15 分鐘調降 0.5 pH' },
          { stepOrder: 4, description: '保溫延長至 45 分鐘' },
          { stepOrder: 5, description: '觀察色差是否消除，比對原始組樣品' },
        ],
      },
    },
  })
  await prisma.experimentResult.create({
    data: {
      experimentId: exp5.id, status: 'SUCCESS',
      handFeelScore: 8, colorShadeScore: 9, fastnessScore: 8, moistureScore: 7,
      description: '改善組成功消除色差，色光均勻，與原始組對比明顯改善',
      reflection: '問題根源為一次性加酸導致局部過度固著，改用分段加酸可有效解決',
      issueRecord: '原始組重現了色差問題，確認為加酸方式造成',
      abnormalReason: '色差異常', improvement: '建議所有黑色品項改用分段加酸',
      improvementAction: '已更新標準操作程序 SOP-003',
      clientFeedback: '客戶已確認改善樣品符合要求', clientFeedbackResult: '通過',
      notes: '已通知生產部門更新操作方式', createdAt: new Date('2025-06-21'),
    },
  })

  // ── 附件14：供應商資料（含擴充欄位）──────────────────────────
  const supplier1 = await prisma.supplier.create({
    data: {
      name: '台灣化工原料有限公司',
      code: 'SUP-001',
      contactPerson: '王大明',
      phone: '02-2345-6789',
      email: 'sales@twchem.com.tw',
      address: '新北市新莊區化工路100號',
      supplyItems: '均染劑、固色劑、酸性染料',
      status: '合格',
      taxNo: '12345678',
      factoryAddress: '新北市新莊區工業路88號',
      hasBizLicense: true,
      supplierTypes: ['助劑供應商', '原料供應商'],
      certifications: ['ISO 9001', 'ISO 14001'],
      complianceDocs: { mrsl: true, sds: true, tds: true },
      tradingProducts: ['均染劑RC-629', '固色劑RC-210', '酸性染料'],
    },
  })
  const supplier2 = await prisma.supplier.create({
    data: {
      name: '越南化學材料股份公司',
      code: 'SUP-002',
      contactPerson: 'Nguyễn Văn An',
      phone: '+84-28-3456-7890',
      email: 'contact@vnchem.vn',
      address: 'Khu Công Nghiệp Bình Dương, Việt Nam',
      supplyItems: '酸性黑A-200、酸性藍B-150、分散染料',
      status: '合格',
      taxNo: '98765432',
      factoryAddress: 'Lô B5, KCN Bình Dương, Việt Nam',
      hasBizLicense: true,
      supplierTypes: ['原料供應商'],
      certifications: ['ZDHC Gateway Level 1', 'OEKO-TEX'],
      complianceDocs: { mrsl: true, sds: true, tds: false },
      tradingProducts: ['酸性黑A-200', '酸性藍B-150', '分散染料'],
    },
  })

  // ── 附件15：供應商合規評鑑 ────────────────────────────────────
  await prisma.supplierComplianceAudit.create({
    data: {
      supplierId: supplier1.id,
      supplierName: '台灣化工原料有限公司',
      supplierType: '助劑供應商',
      mainProducts: '均染劑、固色劑',
      auditDate: new Date('2025-03-15'),
      supplierCategory: '化工原料',
      qualificationResult: '合格',
      priceResult: '合理',
      zdhcGateway: 2,
      chemCheckReport: 2,
      mrslDoc: 2,
      sdsTds: 2,
      envCertification: 1,
      complianceSubtotal: 9,
      advancedAudit: {
        productQuality: 2,
        deliveryTimeliness: 2,
        serviceResponse: 1,
        priceCompetitiveness: 1,
      },
      advancedSubtotal: 6,
      totalScore: 15,
      notes: '供應商配合度高，文件齊全，建議列為優先供應商',
    },
  })
  await prisma.supplierComplianceAudit.create({
    data: {
      supplierId: supplier2.id,
      supplierName: '越南化學材料股份公司',
      supplierType: '原料供應商',
      mainProducts: '酸性染料、分散染料',
      auditDate: new Date('2025-04-10'),
      supplierCategory: '染料',
      qualificationResult: '有條件合格',
      priceResult: '具競爭力',
      zdhcGateway: 1,
      chemCheckReport: 1,
      mrslDoc: 2,
      sdsTds: 2,
      envCertification: 0,
      complianceSubtotal: 6,
      advancedAudit: {
        productQuality: 2,
        deliveryTimeliness: 1,
        serviceResponse: 1,
        priceCompetitiveness: 2,
      },
      advancedSubtotal: 6,
      totalScore: 12,
      notes: 'ZDHC Gateway尚未達Level 2，建議要求供應商於6個月內完成升級 / Nhà cung cấp chưa đạt ZDHC Gateway Level 2, yêu cầu nâng cấp trong 6 tháng',
    },
  })

  // ── 附件10：QC每日工作日誌 ────────────────────────────────────
  await prisma.qcDailyLog.create({
    data: {
      logDate: new Date('2025-06-02'),
      // section1 欄位對應前端 Section1Row: { no, productionDate, chemCode, lot, ph, brix, solidContent, result }
      section1: [
        { no: 1, productionDate: '2025-05-20', chemCode: 'RC-629', lot: 'B250520-01', ph: '6.8', brix: '28.5', solidContent: '28.5%', result: '合格' },
        { no: 2, productionDate: '2025-05-20', chemCode: 'RC-210', lot: 'B250520-02', ph: '6.2', brix: '35.2', solidContent: '35.2%', result: '合格' },
        { no: 3, productionDate: '2025-05-18', chemCode: 'A-200', lot: 'B250518-01', ph: '—', brix: '—', solidContent: '95.3%', result: '合格' },
        { no: 4, productionDate: '2025-05-19', chemCode: 'DF-100', lot: 'B250519-03', ph: '7.0', brix: '—', solidContent: '—', result: '合格' },
        { no: 5, productionDate: '2025-05-21', chemCode: 'PN-50', lot: 'B250521-01', ph: '6.5', brix: '—', solidContent: '—', result: '合格' },
        { no: 6, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 7, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 8, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 9, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 10, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
      ],
      // section2 欄位同 section1
      section2: [
        { no: 1, productionDate: '2025-05-10', chemCode: 'B-150', lot: 'RM250510-01', ph: '—', brix: '—', solidContent: '95.8%', result: '合格' },
        { no: 2, productionDate: '2025-05-15', chemCode: '醋酸', lot: 'RM250515-02', ph: '—', brix: '—', solidContent: '98.5%', result: '合格' },
        { no: 3, productionDate: '2025-05-12', chemCode: '硫酸銨', lot: 'RM250512-01', ph: '—', brix: '—', solidContent: '99.1%', result: '合格' },
        { no: 4, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 5, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 6, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 7, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 8, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 9, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 10, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
      ],
      // section3 欄位對應前端 Section3Row: { no, productionDate, chemCode, lot, quantity, result, notes }
      section3: [
        { no: 1, productionDate: '2025-06-01', chemCode: 'RD-2210', lot: 'FG250601-01', quantity: '500KG', result: '合格', notes: '固含量28-32%，pH 6.5-7.5，外觀淡黃透明' },
        { no: 2, productionDate: '2025-06-01', chemCode: 'RD-3050', lot: 'FG250601-02', quantity: '250KG', result: '合格', notes: '固含量35±2%，外觀微黃液體' },
        { no: 3, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 4, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 5, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 6, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 7, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 8, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 9, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 10, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
      ],
      section4: '今日工作順利完成，所有檢測項目均符合規格。建議明日追蹤A-200批次後續色光一致性。',
    },
  })
  await prisma.qcDailyLog.create({
    data: {
      logDate: new Date('2025-06-03'),
      section1: [
        { no: 1, productionDate: '2025-05-22', chemCode: 'ZN-800', lot: 'B250522-01', ph: '7.2', brix: '—', solidContent: '13.2%', result: '不合格' },
        { no: 2, productionDate: '2025-05-20', chemCode: 'FW-100', lot: 'B250520-04', ph: '—', brix: '—', solidContent: '—', result: '合格' },
        { no: 3, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 4, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 5, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 6, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 7, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 8, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 9, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 10, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
      ],
      section2: [
        { no: 1, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 2, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 3, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 4, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 5, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 6, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 7, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 8, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 9, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
        { no: 10, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' },
      ],
      section3: [
        { no: 1, productionDate: '2025-06-02', chemCode: 'RD-5500', lot: 'FG250602-01', quantity: '1000KG', result: '合格', notes: '防水等級≥4級，外觀乳白色液體' },
        { no: 2, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 3, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 4, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 5, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 6, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 7, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 8, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 9, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
        { no: 10, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' },
      ],
      section4: 'ZN-800 B250522-01批不合格，已通知採購發出不合格品通知單並要求供應商確認原因。其餘項目正常。',
    },
  })

  // ── 附件11：產品對抗計劃 ──────────────────────────────────────
  await prisma.productCounterPlan.create({
    data: {
      date: new Date('2025-05-10'),
      productModel: 'RD-2210',
      productName: '均染助劑',
      proposingDept: '業務部',
      // measureType 對應前端 Radio: 'temporary' | 'permanent'
      measureType: 'permanent',
      clientName: '東成染整有限公司',
      proposer: '張業務',
      expectedDate: new Date('2025-06-15'),
      // issueSource 對應前端 Checkbox.Group，值為 ISSUE_SOURCE_OPTIONS 字串陣列
      issueSource: ['客戶 / Khách hàng'],
      issueDesc: '客戶現有供應商均染助劑RC-629使用效果不穩定，色花問題時有發生，希望尋找替代品，提升穩定性並降低成本5%以上。',
      // abnormalType 對應前端 Checkbox.Group，值為 ABNORMAL_TYPE_OPTIONS 字串陣列
      abnormalType: ['物性 / Vật lý', '穩定性 / Ổn định'],
      // counterFormulas 對應前端 FormulaEntry[]: [{ label, materials: [{ name, ratio }] }]
      counterFormulas: [
        { label: 'CT1-A：直接替代', materials: [{ name: 'RD均染助劑', ratio: '3%' }, { name: '去離子水', ratio: '補至100%' }] },
        { label: 'CT2-B：加量', materials: [{ name: 'RD均染助劑', ratio: '4%' }, { name: '去離子水', ratio: '補至100%' }] },
        { label: 'CT3-C：降量', materials: [{ name: 'RD均染助劑', ratio: '2%' }, { name: '去離子水', ratio: '補至100%' }] },
        { label: 'CT4-D：複配', materials: [{ name: 'RD均染助劑', ratio: '2%' }, { name: '滲透劑PN-50', ratio: '0.5%' }, { name: '去離子水', ratio: '補至100%' }] },
        { label: '', materials: [{ name: '', ratio: '' }] },
      ],
      // counterMaterials 對應前端 CounterMaterial: { supplier, name, model, composition, tds, appearance, solid, ph, brix, ionic, solubility }
      counterMaterials: [
        { supplier: '旺隆自製', name: 'RD均染助劑', model: 'RD-2210', composition: '陰離子型聚合物', tds: '有', appearance: '淡黃透明液', solid: '28-32%', ph: '6.5-7.5', brix: '30', ionic: '陰離子', solubility: '水溶' },
        { supplier: '台灣化工', name: '滲透劑PN-50', model: 'PN-50', composition: '非離子界面活性劑', tds: '有', appearance: '透明液', solid: '—', ph: '6.5', brix: '—', ionic: '非離子', solubility: '水溶' },
        { supplier: '', name: '', model: '', composition: '', tds: '', appearance: '', solid: '', ph: '', brix: '', ionic: '', solubility: '' },
        { supplier: '', name: '', model: '', composition: '', tds: '', appearance: '', solid: '', ph: '', brix: '', ionic: '', solubility: '' },
        { supplier: '', name: '', model: '', composition: '', tds: '', appearance: '', solid: '', ph: '', brix: '', ionic: '', solubility: '' },
      ],
      // rankings 對應前端 RankingRow: { rank, supplier, name, model, pros, cons }
      rankings: [
        { rank: 1, supplier: '旺隆自製', name: 'RD均染助劑', model: 'RD-2210（CT4-D複配）', pros: '色花率降至0%，成本較對手低7%', cons: '需配合滲透劑使用' },
        { rank: 2, supplier: '旺隆自製', name: 'RD均染助劑', model: 'RD-2210（CT2-B加量）', pros: '穩定性高', cons: '用量高，成本略高' },
        { rank: 3, supplier: '旺隆自製', name: 'RD均染助劑', model: 'RD-2210（CT1-A）', pros: '效果可接受', cons: '性價比普通' },
        { rank: 4, supplier: '', name: '', model: '', pros: '', cons: '' },
        { rank: 5, supplier: '', name: '', model: '', pros: '', cons: '' },
      ],
      conclusion: '建議推薦CT4-D複配方案，達成客戶降低色花異常率及降低成本5%以上的雙重目標。',
      // executionResult 對應前端 Select: 'effective' | 'ineffective' | 'monitoring'
      executionResult: 'monitoring',
      notes: '客戶需於2025/06/30前確認，否則本案延至Q3重啟。',
    },
  })

  // ── 附件12：藥劑泡製紀錄 ──────────────────────────────────────
  await prisma.chemPreparation.create({
    data: {
      prepDate: new Date('2025-06-02'),
      // weekday 對應前端 Select WEEKDAY_OPTIONS: '星期一'~'星期日'
      weekday: '星期一',
      chemName: 'RD-2210 均染助劑',
      formulaRef: 'F-RD2210-Rev3',
      // materials 對應前端 MaterialEntry: { col: 1|2|3, name, ratio, lot }（3欄佈局）
      materials: [
        { col: 1, name: '去離子水', ratio: '60KG', lot: '' },
        { col: 1, name: '均染主劑A', ratio: '25KG', lot: 'B250501-A' },
        { col: 1, name: '乳化劑EM-20', ratio: '10KG', lot: 'B250510-EM' },
        { col: 2, name: '防腐劑KR-15', ratio: '2KG', lot: 'B250505-KR' },
        { col: 2, name: '醋酸（pH調整）', ratio: '3KG', lot: 'B250508-AC' },
        { col: 2, name: '', ratio: '', lot: '' },
        { col: 3, name: '', ratio: '', lot: '' },
        { col: 3, name: '', ratio: '', lot: '' },
        { col: 3, name: '', ratio: '', lot: '' },
      ],
      purpose: '補充生產庫存，應對東成染整客戶訂單出貨需求',
      prepRecord: '1. 投入去離子水60KG至配製槽，啟動攪拌（60rpm）\n2. 緩慢加入均染主劑A 25KG，攪拌30分鐘至均勻\n3. 加入乳化劑EM-20 10KG，提升至80rpm攪拌20分鐘\n4. 加入防腐劑KR-15 2KG，持續攪拌10分鐘\n5. 以醋酸調整pH至6.5-7.0，實測pH 6.8\n6. 取樣送QC檢測：固含量28.5%（規格28-32%），合格\n7. 分裝入100KG鐵桶，貼標、入庫',
      notes: '配製過程順利，產出量100KG，批號FG250602-RD2210-001',
    },
  })
  await prisma.chemPreparation.create({
    data: {
      prepDate: new Date('2025-06-04'),
      weekday: '星期三',
      chemName: 'RD-3050 固色劑',
      formulaRef: 'F-RD3050-Rev2',
      materials: [
        { col: 1, name: '去離子水', ratio: '55KG', lot: '' },
        { col: 1, name: '固色主劑B', ratio: '35KG', lot: 'B250520-B' },
        { col: 1, name: '交聯劑CL-5', ratio: '8KG', lot: 'B250515-CL5' },
        { col: 2, name: '消泡劑DF-100', ratio: '0.5KG', lot: 'B250518-DF' },
        { col: 2, name: '醋酸（pH調整）', ratio: '1.5KG', lot: 'B250508-AC' },
        { col: 2, name: '', ratio: '', lot: '' },
        { col: 3, name: '', ratio: '', lot: '' },
        { col: 3, name: '', ratio: '', lot: '' },
        { col: 3, name: '', ratio: '', lot: '' },
      ],
      purpose: '定期補充庫存，維持最低安全庫存量',
      prepRecord: '1. 投入去離子水55KG\n2. 加入固色主劑B 35KG，攪拌40分鐘\n3. 緩慢加入交聯劑CL-5 8KG（需緩慢加入避免結塊）\n4. 加入消泡劑DF-100 0.5KG\n5. 以醋酸調pH至6.0-6.5，實測pH 6.3，合格\n6. QC檢測：固含量35.2%（規格35±2%），合格\n7. 分裝50KG×2桶，批號FG250604-RD3050-001',
      notes: 'Ngày 04/06/2025: Chuẩn bị chất cố màu RD-3050, sản lượng 100KG, đạt yêu cầu chất lượng',
    },
  })
  await prisma.chemPreparation.create({
    data: {
      prepDate: new Date('2025-06-09'),
      weekday: '星期一',
      chemName: 'RD-5500 防水劑',
      formulaRef: 'F-RD5500-Rev1',
      materials: [
        { col: 1, name: '去離子水', ratio: '40KG', lot: '' },
        { col: 1, name: '氟素防水主劑', ratio: '50KG', lot: 'B250530-FF' },
        { col: 1, name: '交聯劑CL-10', ratio: '6KG', lot: 'B250525-CL10' },
        { col: 2, name: '乳化劑EM-10', ratio: '3KG', lot: 'B250520-EM10' },
        { col: 2, name: '醋酸（pH調整）', ratio: '1KG', lot: 'B250508-AC' },
        { col: 2, name: '', ratio: '', lot: '' },
        { col: 3, name: '', ratio: '', lot: '' },
        { col: 3, name: '', ratio: '', lot: '' },
        { col: 3, name: '', ratio: '', lot: '' },
      ],
      purpose: '客戶訂單出貨，防水劑庫存不足緊急補製',
      prepRecord: '1. 投入去離子水40KG，加入乳化劑EM-10 3KG預先乳化\n2. 緩慢加入氟素防水主劑50KG，維持攪拌速度80rpm\n3. 攪拌60分鐘至外觀呈均勻乳白色\n4. 加入交聯劑CL-10 6KG\n5. 調整pH至5.5-6.5，實測pH 5.9，合格\n6. QC檢測：防水等級5級（規格≥4級），合格\n7. 產出100KG，分裝入桶，批號FG250609-RD5500-001',
      notes: '此批次為緊急生產，已優先安排QC當日檢驗',
    },
  })

  // ── 附件13：產品重修紀錄 ──────────────────────────────────────
  await prisma.productRework.create({
    data: {
      productModel: 'RD-2210',
      productName: '均染助劑',
      originalDate: new Date('2025-05-28'),
      originalLot: 'FG250528-RD2210-002',
      newLot: 'FG250603-RD2210-R01',
      tank: 'A槽（配製槽#1）',
      originalQty: 200,
      reworkQty: 200,
      // reworkReasons 對應前端 Checkbox.Group，值為 REWORK_REASON_OPTIONS 字串陣列
      reworkReasons: ['固成分不足 / HLCR KHÔNG ĐẠT', '配方誤差 / SAI CT'],
      abnormalDesc: 'QC檢測固含量26.5%，低於規格28%下限。追查原因為計量誤差，均染主劑A投料量少投2KG（實投23KG，應投25KG）。',
      // materialDetails 對應前端 MaterialDetail: { no, name, batchNo, barrelNo, originalRatio, adjustQty, totalQty }
      materialDetails: [
        { no: 1, name: '均染主劑A', batchNo: 'B250501-A', barrelNo: 'A-03', originalRatio: '25%（25KG）', adjustQty: '+4KG', totalQty: '29KG' },
        { no: 2, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
        { no: 3, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
        { no: 4, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
        { no: 5, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
        { no: 6, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
      ],
      reworkMethod: '1. 將不合格品200KG置入配製槽#1\n2. 啟動攪拌（60rpm）\n3. 補投均染主劑A 4KG\n4. 攪拌30分鐘至均勻\n5. 取樣送QC複測',
      // qcResults 對應前端 QcResult: { item, itemVn, standard, reworkSpec, result }
      qcResults: [
        { item: '外觀', itemVn: 'NGOẠI QUAN', standard: '淡黃色透明液體', reworkSpec: '同規格', result: 'OK' },
        { item: 'pH1%aq', itemVn: 'pH', standard: '6.5-7.5', reworkSpec: '6.8', result: 'OK' },
        { item: '固成份', itemVn: 'CHẤT RẮN', standard: '28-32%', reworkSpec: '29.1%', result: 'OK' },
        { item: '糖度值', itemVn: 'ĐỘ Brix', standard: '依規格', reworkSpec: '—', result: 'OK' },
        { item: '比重', itemVn: 'TỶ TRỌNG', standard: '依規格', reworkSpec: '—', result: 'OK' },
      ],
      finalJudgment: '合格，可出貨',
      notes: '已修訂投料確認表SOP，要求雙人核對計量',
    },
  })
  await prisma.productRework.create({
    data: {
      productModel: 'RD-5500',
      productName: '防水劑',
      originalDate: new Date('2025-06-01'),
      originalLot: 'FG250601-RD5500-001',
      newLot: 'FG250605-RD5500-R01',
      tank: 'B槽（配製槽#2）',
      originalQty: 300,
      reworkQty: 300,
      reworkReasons: ['生產操作異常 / SX BT'],
      abnormalDesc: '防水等級實測3級，未達規格4級要求。追查為交聯劑CL-10投料時混入水分（約5KG），導致交聯不足。',
      materialDetails: [
        { no: 1, name: '交聯劑CL-10', batchNo: 'B250525-CL10', barrelNo: 'C-07', originalRatio: '6KG（原配方）', adjustQty: '+9KG', totalQty: '15KG' },
        { no: 2, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
        { no: 3, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
        { no: 4, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
        { no: 5, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
        { no: 6, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' },
      ],
      reworkMethod: '1. 將不合格品300KG置入配製槽#2\n2. 確認槽體及攪拌軸乾燥無積水\n3. 緩慢加入交聯劑CL-10 9KG\n4. 提高攪拌至100rpm，攪拌45分鐘\n5. 靜置30分鐘\n6. 取樣送QC複測防水等級',
      qcResults: [
        { item: '外觀', itemVn: 'NGOẠI QUAN', standard: '均勻乳白色液體', reworkSpec: '均勻乳白色', result: 'OK' },
        { item: 'pH1%aq', itemVn: 'pH', standard: '5.5-6.5', reworkSpec: '5.9', result: 'OK' },
        { item: '固成份', itemVn: 'CHẤT RẮN', standard: '依規格', reworkSpec: '—', result: 'OK' },
        { item: '糖度值', itemVn: 'ĐỘ Brix', standard: '依規格', reworkSpec: '—', result: 'OK' },
        { item: '比重', itemVn: 'TỶ TRỌNG', standard: '≥4級防水', reworkSpec: '4.5級', result: 'OK' },
      ],
      finalJudgment: '合格，可出貨',
      notes: '已更新防水劑配製SOP，要求交聯劑投料前確認槽體完全乾燥並記錄。/ Đã cập nhật SOP pha chế chất chống thấm, yêu cầu kiểm tra bể khô ráo trước khi thêm chất liên kết.',
    },
  })

  console.log('✅ 種子資料完成')
  console.log('📋 測試帳號：')
  console.log('   admin@test.com  / admin123  (管理員)')
  console.log('   lab@test.com    / lab123    (實驗人員)')
  console.log('   manager@test.com/ manager123(經理)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
