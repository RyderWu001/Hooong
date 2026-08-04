import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧺 開始寫入洗衣精 demo 資料...')

  // ── 建立配方 ─────────────────────────────────────────────────────────────
  const [fA, fB, fC] = await Promise.all([
    prisma.formula.create({
      data: {
        code: 'LD-2025-A',
        name: '高效濃縮洗衣精配方',
        category: '濃縮型',
        formulaType: '液態',
        productType: '洗衣精',
        description: '採用高純度 LAS + 非離子界面活性劑複配，去污力強、泡沫適中，適合滾筒與直立式洗衣機。',
        status: 'ACTIVE',
        currentVersion: 2,
      },
    }),
    prisma.formula.create({
      data: {
        code: 'LD-2025-B',
        name: '植物酵素洗衣精配方',
        category: '天然系',
        formulaType: '液態',
        productType: '洗衣精',
        description: '添加蛋白酶、脂肪酶、纖維素酶三重酵素，低溫高效去除蛋白質與油脂汙漬，植物來源界面活性劑佔比 80%。',
        status: 'ACTIVE',
        currentVersion: 1,
      },
    }),
    prisma.formula.create({
      data: {
        code: 'LD-2025-C',
        name: '嬰幼兒低敏洗衣精配方',
        category: '敏感肌',
        formulaType: '液態',
        productType: '洗衣精',
        description: '不含螢光增白劑、人工香料、防腐劑。以椰子油來源 APG 為主要界面活性劑，pH 近中性，皮膚科測試認證。',
        status: 'ACTIVE',
        currentVersion: 3,
      },
    }),
  ])
  console.log('✅ 配方建立完成')

  const adminId = 20  // 管理員
  const labId   = 21  // 王實驗
  const mgr     = 22  // 李經理

  // ── 實驗 1：去污力效能比較測試 ─────────────────────────────────────────────
  const exp1 = await prisma.experiment.create({
    data: {
      code: 'EXP-2025-006',
      formulaId: fA.id,
      experimenterId: labId,
      experimentDate: new Date('2025-09-10T09:00:00Z'),
      category: '去污力測試',
      temperature: 40.0,
      humidity: 55.0,
      notes: '比較三種 LAS 用量對棉布去污率的影響，測試污漬涵蓋草漬、醬油、口紅。',
    },
  })

  const g1A = await prisma.experimentGroup.create({
    data: {
      experimentId: exp1.id,
      name: 'A組（LAS 12% 節能型）',
      groupOrder: 1,
      bathRatio: '1:30',
      startPH: 8.2,
      endPH: 7.9,
      holdTime: 30,
      notes: '符合環保標準的低界面活性劑配方，主打節能訴求市場。',
      isSuccess: false,
    },
  })
  await prisma.experimentGroupStep.createMany({
    data: [
      { groupId: g1A.id, stepOrder: 1, description: '依配方秤取各原料：LAS 12%、AEO-9 5%、6501 3%，加入去離子水調配至 1L', notes: '', isHighlight: false },
      { groupId: g1A.id, stepOrder: 2, description: '以 40°C 溫水充分攪拌溶解，確認外觀澄清透明', notes: '溫度不超過 45°C，避免酵素失活', isHighlight: true },
      { groupId: g1A.id, stepOrder: 3, description: '取 5g 樣品洗衣精加入 1.5L 洗衣水，投入標準污布（草漬、醬油、口紅各 3 塊）', notes: '', isHighlight: false },
      { groupId: g1A.id, stepOrder: 4, description: '40°C 洗滌 30 分鐘，清水漂洗 2 次，晾乾後以色差計量測去污率', notes: '', isHighlight: false },
      { groupId: g1A.id, stepOrder: 5, description: '記錄去污率：草漬 82%、醬油 74%、口紅 61%，整體去污率 72%', notes: '未達目標 80%', isHighlight: false },
    ],
  })

  const g1B = await prisma.experimentGroup.create({
    data: {
      experimentId: exp1.id,
      name: 'B組（LAS 15% 標準型）',
      groupOrder: 2,
      bathRatio: '1:30',
      startPH: 8.5,
      endPH: 8.1,
      holdTime: 30,
      notes: '市售主流配方濃度，兼顧去污力與成本。',
      isSuccess: true,
    },
  })
  await prisma.experimentGroupStep.createMany({
    data: [
      { groupId: g1B.id, stepOrder: 1, description: '依配方秤取各原料：LAS 15%、AEO-9 7%、6501 3%，加入去離子水調配至 1L', notes: '', isHighlight: false },
      { groupId: g1B.id, stepOrder: 2, description: '以 40°C 溫水充分攪拌溶解，確認外觀澄清透明，pH 調整至 8.5', notes: '', isHighlight: false },
      { groupId: g1B.id, stepOrder: 3, description: '取 5g 樣品洗衣精加入 1.5L 洗衣水，投入標準污布（草漬、醬油、口紅各 3 塊）', notes: '', isHighlight: false },
      { groupId: g1B.id, stepOrder: 4, description: '40°C 洗滌 30 分鐘，清水漂洗 2 次，晾乾後以色差計量測去污率', notes: '', isHighlight: false },
      { groupId: g1B.id, stepOrder: 5, description: '記錄去污率：草漬 91%、醬油 87%、口紅 78%，整體去污率 85%', notes: '達到目標 80%，確定為優選配方', isHighlight: true },
    ],
  })

  const g1C = await prisma.experimentGroup.create({
    data: {
      experimentId: exp1.id,
      name: 'C組（LAS 18% 強效型）',
      groupOrder: 3,
      bathRatio: '1:30',
      startPH: 8.8,
      endPH: 8.4,
      holdTime: 30,
      notes: '高濃度配方，去污力最強但原料成本較高，泡沫略多。',
      isSuccess: false,
    },
  })
  await prisma.experimentGroupStep.createMany({
    data: [
      { groupId: g1C.id, stepOrder: 1, description: '依配方秤取各原料：LAS 18%、AEO-9 8%、6501 4%，加入去離子水調配至 1L', notes: '', isHighlight: false },
      { groupId: g1C.id, stepOrder: 2, description: '以 40°C 溫水充分攪拌溶解，確認外觀澄清，pH 調整至 8.8', notes: '', isHighlight: false },
      { groupId: g1C.id, stepOrder: 3, description: '取 5g 樣品洗衣精加入 1.5L 洗衣水，投入標準污布（草漬、醬油、口紅各 3 塊）', notes: '', isHighlight: false },
      { groupId: g1C.id, stepOrder: 4, description: '40°C 洗滌 30 分鐘，清水漂洗 2 次，晾乾後以色差計量測去污率', notes: '', isHighlight: false },
      { groupId: g1C.id, stepOrder: 5, description: '記錄去污率：草漬 94%、醬油 91%、口紅 83%，整體去污率 89%，但泡沫殘留量超標', notes: '泡沫殘留超標，需評估消泡劑添加', isHighlight: false },
    ],
  })
  console.log('✅ 實驗 006 建立完成')

  // ── 實驗 2：低溫洗滌酵素穩定性測試 ─────────────────────────────────────────
  const exp2 = await prisma.experiment.create({
    data: {
      code: 'EXP-2025-007',
      formulaId: fB.id,
      experimenterId: labId,
      experimentDate: new Date('2025-10-03T09:30:00Z'),
      category: '酵素穩定性',
      temperature: 25.0,
      humidity: 60.0,
      notes: '測試三種酵素配方在不同洗滌溫度（15°C / 30°C / 45°C）下的蛋白質去污效果。',
    },
  })

  const g2A = await prisma.experimentGroup.create({
    data: {
      experimentId: exp2.id,
      name: 'A組（標準蛋白酶 30°C）',
      groupOrder: 1,
      bathRatio: '1:30',
      startPH: 8.0,
      endPH: 7.8,
      holdTime: 30,
      leveler: '標準蛋白酶 0.3%',
      notes: '市售常規蛋白酶，適用溫度 30–50°C。',
      isSuccess: false,
    },
  })
  await prisma.experimentGroupStep.createMany({
    data: [
      { groupId: g2A.id, stepOrder: 1, description: '調配基礎洗衣精（LAS 15%、AEO-9 7%），加入標準蛋白酶 Savinase 0.3%', notes: '', isHighlight: false },
      { groupId: g2A.id, stepOrder: 2, description: '恆溫水浴設定 30°C，投入蛋黃漬、血漬、奶漬標準污布各 3 塊', notes: '', isHighlight: false },
      { groupId: g2A.id, stepOrder: 3, description: '洗滌 30 分鐘，清水漂洗，量測去污率', notes: '', isHighlight: false },
      { groupId: g2A.id, stepOrder: 4, description: '結果：蛋黃漬 85%、血漬 79%、奶漬 83%，整體 82%', notes: '30°C 下表現正常', isHighlight: false },
    ],
  })

  const g2B = await prisma.experimentGroup.create({
    data: {
      experimentId: exp2.id,
      name: 'B組（低溫強化酵素 15°C）',
      groupOrder: 2,
      bathRatio: '1:30',
      startPH: 8.0,
      endPH: 7.8,
      holdTime: 30,
      leveler: '低溫蛋白酶 0.4%',
      notes: '專為低溫洗滌設計的冷水型酵素，活性溫度 10–35°C。',
      isSuccess: true,
    },
  })
  await prisma.experimentGroupStep.createMany({
    data: [
      { groupId: g2B.id, stepOrder: 1, description: '調配基礎洗衣精，加入低溫活性蛋白酶 Coronase 0.4%（適用 10–35°C）', notes: '注意：酵素在 45°C 以上會失活，需確保溶液溫度', isHighlight: true },
      { groupId: g2B.id, stepOrder: 2, description: '恆溫水浴設定 15°C，投入蛋黃漬、血漬、奶漬標準污布各 3 塊', notes: '', isHighlight: false },
      { groupId: g2B.id, stepOrder: 3, description: '洗滌 30 分鐘，清水漂洗，量測去污率', notes: '', isHighlight: false },
      { groupId: g2B.id, stepOrder: 4, description: '結果：蛋黃漬 88%、血漬 84%、奶漬 90%，整體 87%', notes: '低溫下去污率反超標準酵素，確定為最佳低溫配方', isHighlight: true },
    ],
  })

  const g2C = await prisma.experimentGroup.create({
    data: {
      experimentId: exp2.id,
      name: 'C組（廣溫域酵素 45°C）',
      groupOrder: 3,
      bathRatio: '1:30',
      startPH: 8.0,
      endPH: 7.7,
      holdTime: 30,
      leveler: '廣溫域蛋白酶 0.35%',
      notes: '適用 10–55°C 廣溫域，但高溫下活性略低於標準酵素。',
      isSuccess: false,
    },
  })
  await prisma.experimentGroupStep.createMany({
    data: [
      { groupId: g2C.id, stepOrder: 1, description: '調配基礎洗衣精，加入廣溫域蛋白酶 Durazym 0.35%', notes: '', isHighlight: false },
      { groupId: g2C.id, stepOrder: 2, description: '恆溫水浴設定 45°C，投入蛋黃漬、血漬、奶漬標準污布各 3 塊', notes: '', isHighlight: false },
      { groupId: g2C.id, stepOrder: 3, description: '洗滌 30 分鐘，清水漂洗，量測去污率', notes: '', isHighlight: false },
      { groupId: g2C.id, stepOrder: 4, description: '結果：蛋黃漬 83%、血漬 80%、奶漬 81%，整體 81%', notes: '廣溫域酵素在 45°C 表現略低於預期，建議搭配助洗劑', isHighlight: false },
    ],
  })
  console.log('✅ 實驗 007 建立完成')

  // ── 實驗 3：pH 值對嬰兒洗衣精皮膚刺激性影響 ────────────────────────────────
  const exp3 = await prisma.experiment.create({
    data: {
      code: 'EXP-2025-008',
      formulaId: fC.id,
      experimenterId: labId,
      experimentDate: new Date('2025-11-14T10:00:00Z'),
      category: '皮膚安全性',
      temperature: 25.0,
      humidity: 60.0,
      notes: '針對嬰幼兒洗衣精測試三種 pH 值（6.5 / 7.0 / 7.5）對皮膚刺激性與去污效果的影響。',
    },
  })

  const g3A = await prisma.experimentGroup.create({
    data: {
      experimentId: exp3.id,
      name: 'A組（pH 6.5 弱酸性）',
      groupOrder: 1,
      bathRatio: '1:30',
      startPH: 6.5,
      endPH: 6.4,
      holdTime: 25,
      colorFixative: '檸檬酸 0.3%（pH 調節）',
      notes: '弱酸性配方，與皮膚 pH 接近，最低刺激，但去污力略受影響。',
      isSuccess: false,
    },
  })
  await prisma.experimentGroupStep.createMany({
    data: [
      { groupId: g3A.id, stepOrder: 1, description: '調配 APG 0814 6%、月桂醇醚硫酸鈉 SLES 4%，不添加螢光增白劑與人工香料', notes: '', isHighlight: false },
      { groupId: g3A.id, stepOrder: 2, description: '以檸檬酸調節 pH 至 6.5，加入甘油 2% 保濕', notes: '', isHighlight: false },
      { groupId: g3A.id, stepOrder: 3, description: '進行人工皮膚貼片測試（48h Patch Test）及標準污布去污測試', notes: '', isHighlight: false },
      { groupId: g3A.id, stepOrder: 4, description: '去污率 73%（低於目標 80%），皮膚刺激性 Grade 0（無刺激）', notes: '去污力不足，皮膚安全性最佳', isHighlight: false },
    ],
  })

  const g3B = await prisma.experimentGroup.create({
    data: {
      experimentId: exp3.id,
      name: 'B組（pH 7.0 中性）',
      groupOrder: 2,
      bathRatio: '1:30',
      startPH: 7.0,
      endPH: 6.9,
      holdTime: 25,
      colorFixative: '碳酸氫鈉微量（pH 調節）',
      notes: '中性配方，兼顧安全性與去污效果，適合嬰幼兒衣物日常洗滌。',
      isSuccess: true,
    },
  })
  await prisma.experimentGroupStep.createMany({
    data: [
      { groupId: g3B.id, stepOrder: 1, description: '調配 APG 0814 8%、SLES 5%，不添加螢光增白劑與人工香料', notes: '', isHighlight: false },
      { groupId: g3B.id, stepOrder: 2, description: '以碳酸氫鈉微量調節 pH 至 7.0，加入甘油 2%、泛醇 0.5%', notes: '泛醇可增加織物柔軟度，對嬰兒皮膚有舒緩作用', isHighlight: true },
      { groupId: g3B.id, stepOrder: 3, description: '進行人工皮膚貼片測試（48h Patch Test）及標準污布去污測試', notes: '', isHighlight: false },
      { groupId: g3B.id, stepOrder: 4, description: '去污率 83%，皮膚刺激性 Grade 0（無刺激）', notes: '去污力與安全性兼顧，確定為最終配方', isHighlight: true },
      { groupId: g3B.id, stepOrder: 5, description: '送第三方檢測機構進行台灣 CNS 15003 嬰幼兒洗劑安全認證申請', notes: '', isHighlight: false },
    ],
  })

  const g3C = await prisma.experimentGroup.create({
    data: {
      experimentId: exp3.id,
      name: 'C組（pH 7.5 微鹼性）',
      groupOrder: 3,
      bathRatio: '1:30',
      startPH: 7.5,
      endPH: 7.3,
      holdTime: 25,
      colorFixative: '碳酸鈉微量（pH 調節）',
      notes: '微鹼性提升去污力，但對皮膚刺激性略高於中性配方。',
      isSuccess: false,
    },
  })
  await prisma.experimentGroupStep.createMany({
    data: [
      { groupId: g3C.id, stepOrder: 1, description: '調配 APG 0814 8%、SLES 6%，不添加螢光增白劑與人工香料', notes: '', isHighlight: false },
      { groupId: g3C.id, stepOrder: 2, description: '以碳酸鈉微量調節 pH 至 7.5，加入甘油 2%', notes: '', isHighlight: false },
      { groupId: g3C.id, stepOrder: 3, description: '進行人工皮膚貼片測試（48h Patch Test）及標準污布去污測試', notes: '', isHighlight: false },
      { groupId: g3C.id, stepOrder: 4, description: '去污率 88%，皮膚刺激性 Grade 1（輕微）', notes: '去污力最強，但嬰幼兒用途下 Grade 1 不符合安全標準', isHighlight: false },
    ],
  })
  console.log('✅ 實驗 008 建立完成')

  // ── 建立樣品 ─────────────────────────────────────────────────────────────────
  await prisma.sample.createMany({
    data: [
      {
        experimentId: exp1.id, groupId: g1B.id,
        sampleCode: 'SMP-2025-018', clientName: '清淨海股份有限公司',
        label: '高效濃縮洗衣精 — B組優選樣', targetItem: '市售 1L 包裝評估',
        sampleDate: new Date('2025-09-12'), status: '待客戶回饋',
        notes: 'LAS 15% 標準型，去污率 85%，推薦量產配方',
      },
      {
        experimentId: exp2.id, groupId: g2B.id,
        sampleCode: 'SMP-2025-019', clientName: '清淨海股份有限公司',
        label: '低溫植物酵素洗衣精 — B組優選樣', targetItem: '冬季低溫市場評估',
        sampleDate: new Date('2025-10-06'), status: '已送出',
        notes: '低溫 15°C 去污率 87%，節能洗衣訴求明確',
      },
      {
        experimentId: exp3.id, groupId: g3B.id,
        sampleCode: 'SMP-2025-020', clientName: '清淨海股份有限公司',
        label: '嬰幼兒低敏洗衣精 — B組優選樣', targetItem: '嬰幼兒用品通路送樣',
        sampleDate: new Date('2025-11-18'), status: '送驗中',
        notes: 'pH 7.0 中性配方，皮膚刺激性 Grade 0，已送 CNS 認證',
      },
    ],
  })
  console.log('✅ 樣品建立完成')

  console.log('\n🎉 Demo 資料寫入完成！')
  console.log('  配方：LD-2025-A / LD-2025-B / LD-2025-C')
  console.log('  實驗：EXP-2025-006 / EXP-2025-007 / EXP-2025-008')
  console.log('  每個實驗各 3 個試驗組，B組均標示為成功組')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
