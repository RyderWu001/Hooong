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
  await prisma.supplier.deleteMany()
  await prisma.materialInventory.deleteMany()
  await prisma.ingredient.deleteMany()
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

  console.log('✅ 種子資料完成')
  console.log('📋 測試帳號：')
  console.log('   admin@test.com  / admin123  (管理員)')
  console.log('   lab@test.com    / lab123    (實驗人員)')
  console.log('   manager@test.com/ manager123(經理)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
