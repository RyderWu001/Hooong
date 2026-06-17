import bcrypt from 'bcryptjs'
import prisma from './client'

async function main() {
  console.log('🌱 開始匯入種子資料...')

  // 清空資料
  await prisma.attachment.deleteMany()
  await prisma.experimentResult.deleteMany()
  await prisma.sample.deleteMany()
  await prisma.experimentStep.deleteMany()
  await prisma.experiment.deleteMany()
  await prisma.formulaVersion.deleteMany()
  await prisma.formulaIngredient.deleteMany()
  await prisma.formula.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.user.deleteMany()

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

  // 原料
  const ing1 = await prisma.ingredient.create({ data: { name: '乙醇', unit: 'mL', description: '95% 乙醇' } })
  const ing2 = await prisma.ingredient.create({ data: { name: '蒸餾水', unit: 'mL', description: '去離子水' } })
  const ing3 = await prisma.ingredient.create({ data: { name: '甘油', unit: 'g', description: '藥用甘油' } })
  const ing4 = await prisma.ingredient.create({ data: { name: '氫氧化鈉', unit: 'g', description: '工業級 NaOH' } })
  const ing5 = await prisma.ingredient.create({ data: { name: '硬脂酸', unit: 'g', description: '皂化原料' } })

  // 配方
  const f1 = await prisma.formula.create({
    data: {
      code: 'F-2024-001', name: '保濕乳液基底', productType: '乳液',
      description: '適合乾燥肌膚的基底配方', status: 'ACTIVE', currentVersion: 3,
      ingredients: {
        create: [
          { ingredientId: ing1.id, ratio: 20, unit: '%' },
          { ingredientId: ing2.id, ratio: 60, unit: '%' },
          { ingredientId: ing3.id, ratio: 20, unit: '%' },
        ],
      },
      versions: {
        create: [
          { version: 1, changeNote: '初始版本', userId: admin.id, createdAt: new Date('2024-01-10') },
          { version: 2, changeNote: '調整乙醇與水的比例', userId: lab.id, createdAt: new Date('2024-03-10') },
          { version: 3, changeNote: '降低甘油比例，增加保水成分', userId: lab.id, createdAt: new Date('2024-06-01') },
        ],
      },
    },
  })

  const f2 = await prisma.formula.create({
    data: {
      code: 'F-2024-002', name: '潔顏皂配方', productType: '香皂',
      description: '天然皂化配方，溫和不刺激', status: 'ACTIVE', currentVersion: 1,
      ingredients: {
        create: [
          { ingredientId: ing4.id, ratio: 15, unit: '%' },
          { ingredientId: ing5.id, ratio: 50, unit: '%' },
          { ingredientId: ing2.id, ratio: 35, unit: '%' },
        ],
      },
      versions: {
        create: [{ version: 1, changeNote: '初始版本', userId: admin.id, createdAt: new Date('2024-03-15') }],
      },
    },
  })

  await prisma.formula.create({
    data: {
      code: 'F-2023-008', name: '抗皺精華液', productType: '精華液',
      description: '舊版配方，已停用', status: 'INACTIVE', currentVersion: 2,
      ingredients: {
        create: [
          { ingredientId: ing1.id, ratio: 10, unit: '%' },
          { ingredientId: ing2.id, ratio: 90, unit: '%' },
        ],
      },
      versions: {
        create: [
          { version: 1, changeNote: '初始版本', userId: admin.id, createdAt: new Date('2023-08-20') },
          { version: 2, changeNote: '調整配比', userId: lab.id, createdAt: new Date('2023-12-01') },
        ],
      },
    },
  })

  // 實驗
  const exp1 = await prisma.experiment.create({
    data: {
      code: 'EXP-2024-001', formulaId: f1.id, experimenterId: lab.id,
      experimentDate: new Date('2024-06-10'),
      temperature: 25.5, humidity: 62.0, notes: '第一次試做，觀察乳化效果',
      steps: {
        create: [
          { stepOrder: 1, description: '將蒸餾水加熱至 70°C' },
          { stepOrder: 2, description: '緩慢加入甘油，持續攪拌' },
          { stepOrder: 3, description: '降溫至 40°C 後加入乙醇' },
          { stepOrder: 4, description: '靜置 24 小時觀察穩定性' },
        ],
      },
    },
  })

  const exp2 = await prisma.experiment.create({
    data: {
      code: 'EXP-2024-002', formulaId: f2.id, experimenterId: lab.id,
      experimentDate: new Date('2024-06-15'),
      temperature: 28.0, humidity: 55.0, notes: '皂化實驗，確認 NaOH 比例',
      steps: {
        create: [
          { stepOrder: 1, description: '配製 NaOH 水溶液，冷卻至室溫' },
          { stepOrder: 2, description: '將硬脂酸加熱融化' },
          { stepOrder: 3, description: '緩慢混合兩液，持續攪拌至 trace 狀態' },
        ],
      },
      samples: {
        create: [{
          sampleCode: 'SMP-001', clientName: '泓利廣', label: '第一批皂樣',
          targetItem: '硬脂酸', sampleDate: new Date('2024-06-15'), notes: '切片後觀察截面',
        }],
      },
    },
  })

  await prisma.experiment.create({
    data: {
      code: 'EXP-2024-003', formulaId: f1.id, experimenterId: lab.id,
      experimentDate: new Date('2024-06-17'),
      temperature: 24.0, humidity: 58.0, notes: '調整配比，降低乙醇用量',
    },
  })

  // 實驗結果
  await prisma.experimentResult.create({
    data: {
      experimentId: exp1.id, status: 'SUCCESS',
      description: '乳化穩定，質地均勻，無分層現象',
      reflection: '甘油比例適中，觸感良好',
      issueRecord: '初期攪拌不均，需調整攪拌速度',
      improvement: '建議下次使用均質機提升均勻度',
      clientFeedback: '客戶反映保濕效果佳',
      notes: '可進入量產評估',
      createdAt: new Date('2024-06-11'),
    },
  })

  await prisma.experimentResult.create({
    data: {
      experimentId: exp2.id, status: 'NEEDS_ADJUST',
      description: '皂化完成，但硬度不足',
      reflection: 'NaOH 用量偏低，導致皂化不完全',
      issueRecord: '成品偏軟，脫模時易變形',
      improvement: '建議將 NaOH 比例調高至 17%',
      clientFeedback: '',
      notes: '待調整配方後重新實驗',
      createdAt: new Date('2024-06-16'),
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
