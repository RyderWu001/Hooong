/**
 * 入庫模擬資料：建立一筆剛到貨、尚未填寫驗收的批次（待驗收狀態）
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 找或建立原料 RC-629
  let ingredient = await prisma.ingredient.findFirst({ where: { code: 'RC-629' } })
  if (!ingredient) {
    ingredient = await prisma.ingredient.create({
      data: {
        code: 'RC-629',
        name: 'RC-629 低泡精練滲透劑',
        unit: 'kg',
        category: '精練劑',
        solidContent: '45±2%',
        density: '1.05~1.10',
        appearance: '淡黃色至琥珀色透明液體',
        storageCondition: '陰涼乾燥處，避免冷凍，保存溫度 5–40°C',
        shelfLife: '24個月',
        description: '低泡型陰離子界面活性劑，用於前處理精練及滲透，適合高溫短時間製程。',
      },
    })
    console.log('✅ 建立原料 RC-629')
  } else {
    console.log('ℹ️  找到現有原料 RC-629 (id:', ingredient.id, ')')
  }

  // 建立入庫批次（無 QC 資料 → 待驗收）
  const batch = await prisma.ingredientBatch.create({
    data: {
      ingredientId:   ingredient.id,
      batchNo:        'RC629-2507A',
      supplierBatch:  'VN-RC629-250701',
      quantity:       200,
      unit:           'kg',
      remainingQty:   200,
      arrivalDate:    new Date('2025-07-10'),
      warehousingDate: new Date('2025-07-10'),
      mfgDate:        new Date('2025-04-15'),
      expiryDate:     new Date('2027-04-14'),
      openedExpiry:   90,
      status:         '正常',
      notes:          '越南廠商第三季首批進貨，隨附 COA 文件。',
      // QC 欄位刻意留空，顯示為「待驗收」
    },
  })

  console.log(`✅ 入庫批次已建立：${batch.batchNo} (id: ${batch.id})`)
  console.log(`   原料：${ingredient.name}  |  數量：${batch.quantity} ${batch.unit}`)
  console.log(`   到貨日：${batch.arrivalDate?.toISOString().slice(0, 10)}`)
  console.log(`   驗收狀態：待驗收（QC 尚未填寫）`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
