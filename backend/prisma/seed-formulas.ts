import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  const labUser   = await prisma.user.findFirst({ where: { role: 'LAB_STAFF' } })
  const creatorId = (labUser ?? adminUser)!.id

  const ings = await prisma.ingredient.findMany({ select: { id: true, unit: true }, take: 6 })
  if (ings.length < 3) { console.error('原料不足'); return }

  const makeIngredients = (ids: number[]) =>
    ids.map((ingredientId, i) => ({
      ingredientId,
      ratio: [5, 3, 2, 1.5, 1, 0.5][i] ?? 1,
      unit: ings.find(g => g.id === ingredientId)?.unit ?? 'g',
    }))

  // ── 1. 草稿 (DRAFT) ──────────────────────────────────────────
  const draft = await prisma.formula.create({
    data: {
      code: 'RC-2025-D01',
      name: '新型固色劑配方（草稿）',
      category: '固色劑',
      formulaType: '研發配方',
      productType: '紡織染色助劑',
      description: '針對深色系染色開發的高耐洗固色配方，尚在成分比例調整中。',
      status: 'DRAFT',
      currentVersion: 1,
      ingredients: { create: makeIngredients(ings.slice(0, 3).map(i => i.id)) },
      versions: {
        create: {
          version: 1,
          changeNote: '初稿建立，配方比例待確認',
          ingredientsSnapshot: makeIngredients(ings.slice(0, 3).map(i => i.id)),
          userId: creatorId,
        },
      },
    },
  })
  console.log(`✅ 草稿     → ${draft.code} ${draft.name}`)

  // ── 2. 審核中 (REVIEWING) ────────────────────────────────────
  const reviewing = await prisma.formula.create({
    data: {
      code: 'RC-2025-R01',
      name: '環保均染劑配方（審核中）',
      category: '均染劑',
      formulaType: '研發配方',
      productType: '紡織染色助劑',
      description: '採用低 APEO 成分的環保均染配方，已提交技術主管審核，等待批准發布。',
      status: 'REVIEWING',
      currentVersion: 1,
      ingredients: { create: makeIngredients(ings.slice(1, 4).map(i => i.id)) },
      versions: {
        create: {
          version: 1,
          changeNote: '初稿完成，提交審核',
          ingredientsSnapshot: makeIngredients(ings.slice(1, 4).map(i => i.id)),
          userId: creatorId,
        },
      },
    },
  })
  console.log(`✅ 審核中   → ${reviewing.code} ${reviewing.name}`)

  // ── 3. 已發布 (PUBLISHED) ────────────────────────────────────
  const published = await prisma.formula.create({
    data: {
      code: 'RC-2025-P01',
      name: '高溫定型助劑配方（已發布）',
      category: '定型助劑',
      formulaType: '標準配方',
      productType: '紡織加工助劑',
      description: '適用於 180–200°C 高溫定型製程，配方已通過審核並正式發布，尚未投入量產。',
      status: 'PUBLISHED',
      currentVersion: 2,
      ingredients: { create: makeIngredients(ings.slice(2, 5).map(i => i.id)) },
      versions: {
        createMany: {
          data: [
            {
              version: 1,
              changeNote: '初稿',
              ingredientsSnapshot: makeIngredients(ings.slice(2, 5).map(i => i.id)),
              userId: creatorId,
            },
            {
              version: 2,
              changeNote: '調整助劑比例，通過技術審核',
              ingredientsSnapshot: makeIngredients(ings.slice(2, 5).map(i => i.id)),
              userId: creatorId,
            },
          ],
        },
      },
    },
  })
  console.log(`✅ 已發布   → ${published.code} ${published.name}`)

  // ── 4. 封存 (ARCHIVED) ───────────────────────────────────────
  const archived = await prisma.formula.create({
    data: {
      code: 'RC-2024-A01',
      name: '舊版退漿劑配方（已封存）',
      category: '退漿劑',
      formulaType: '正式產品',
      productType: '前處理助劑',
      description: '舊版退漿配方，因應法規更新已於 2024 年底停用，封存保留供參考。',
      status: 'ARCHIVED',
      currentVersion: 3,
      ingredients: { create: makeIngredients(ings.slice(3, 6).map(i => i.id)) },
      versions: {
        createMany: {
          data: [
            { version: 1, changeNote: '初版配方', ingredientsSnapshot: [], userId: creatorId },
            { version: 2, changeNote: '調整成分符合 ZDHC 要求', ingredientsSnapshot: [], userId: creatorId },
            { version: 3, changeNote: '最終版本，後續封存', ingredientsSnapshot: makeIngredients(ings.slice(3, 6).map(i => i.id)), userId: creatorId },
          ],
        },
      },
    },
  })
  console.log(`✅ 已封存   → ${archived.code} ${archived.name}`)

  console.log('\n共新增 4 筆模擬配方（草稿 / 審核中 / 已發布 / 已封存）')
  console.log('（量產階段的配方已有 RC-2025-001/002/003 三筆）')
}

main().catch(console.error).finally(() => prisma.$disconnect())
