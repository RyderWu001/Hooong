import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { hasPermission, type Module } from '../middleware/permission'

const router = Router()

/**
 * 跨模組全域查詢。
 *
 * 各頁面原本各自有搜尋，且大多是前端過濾——分頁後只搜得到當頁，資料一多就失效。
 * 這裡在資料庫層查詢，並依權限矩陣過濾使用者無權檢視的模組。
 */

/** 每個類別最多回傳幾筆，避免單一類別洗版 */
const PER_TYPE_LIMIT = 5

export type SearchType =
  | 'formula' | 'ingredient' | 'experiment'
  | 'sample' | 'supplier' | 'knowledge'

export interface SearchHit {
  type: SearchType
  id: number
  /** 主要顯示文字（代號或名稱）*/
  title: string
  /** 次要說明 */
  subtitle: string
  /** 命中欄位的 i18n key，讓使用者知道為什麼這筆會被找到（文字由前端翻譯）*/
  matchedFieldKey: string
  link: string
}

/** 各類別對應的權限模組，無檢視權限者不會拿到該類別結果 */
const TYPE_MODULE: Record<SearchType, Module> = {
  formula: 'formulas',
  ingredient: 'materials',
  experiment: 'experiments',
  sample: 'samples',
  supplier: 'suppliers',
  knowledge: 'knowledge',
}

const contains = (q: string) => ({ contains: q, mode: 'insensitive' as const })

/**
 * 找出第一個實際命中的欄位，回傳其 i18n key。
 * 這裡不回傳中文，讓命中原因能隨介面語系顯示。
 */
function whichField(q: string, fields: Record<string, string | null | undefined>): string {
  const lower = q.toLowerCase()
  for (const [key, value] of Object.entries(fields)) {
    if (value && value.toLowerCase().includes(lower)) return `searchField.${key}`
  }
  return ''
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const q = String(req.query.q ?? '').trim()
  const role = req.user!.role

  // 單一字元的查詢幾乎會命中所有資料，沒有參考價值
  if (q.length < 2) {
    res.json({ success: true, data: { query: q, hits: [], total: 0 } })
    return
  }

  const allowed = await Promise.all(
    (Object.keys(TYPE_MODULE) as SearchType[]).map(async (t) => ({
      type: t,
      ok: await hasPermission(role, TYPE_MODULE[t], 'view'),
    }))
  )
  const can = new Set(allowed.filter((a) => a.ok).map((a) => a.type))

  const tasks: Promise<SearchHit[]>[] = []

  if (can.has('formula')) {
    tasks.push(
      prisma.formula.findMany({
        where: { OR: [{ code: contains(q) }, { name: contains(q) }, { description: contains(q) }] },
        take: PER_TYPE_LIMIT,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, code: true, name: true, description: true, productType: true },
      }).then((rows) => rows.map((r) => ({
        type: 'formula' as const,
        id: r.id,
        title: `${r.code} ${r.name}`,
        subtitle: r.productType ?? '',
        matchedFieldKey: whichField(q, { formulaCode: r.code, formulaName: r.name, description: r.description }),
        link: `/formulas/${r.id}`,
      })))
    )
  }

  if (can.has('ingredient')) {
    tasks.push(
      prisma.ingredient.findMany({
        where: {
          OR: [
            { name: contains(q) }, { code: contains(q) },
            { englishName: contains(q) }, { casNo: contains(q) },
          ],
        },
        take: PER_TYPE_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, code: true, englishName: true, casNo: true, category: true },
      }).then((rows) => rows.map((r) => ({
        type: 'ingredient' as const,
        id: r.id,
        title: `${r.code ?? ''} ${r.name}`.trim(),
        subtitle: r.category ?? '',
        matchedFieldKey: whichField(q, {
          ingredientName: r.name, ingredientCode: r.code, englishName: r.englishName, casNo: r.casNo,
        }),
        link: '/materials',
      })))
    )
  }

  if (can.has('experiment')) {
    tasks.push(
      prisma.experiment.findMany({
        where: {
          OR: [
            { code: contains(q) }, { notes: contains(q) },
            { clientCompany: contains(q) }, { fabricCode: contains(q) },
          ],
        },
        take: PER_TYPE_LIMIT,
        orderBy: { experimentDate: 'desc' },
        select: {
          id: true, code: true, notes: true, clientCompany: true, fabricCode: true,
          category: true, formula: { select: { name: true } },
        },
      }).then((rows) => rows.map((r) => ({
        type: 'experiment' as const,
        id: r.id,
        title: r.code,
        subtitle: [r.formula?.name, r.category].filter(Boolean).join(' · '),
        matchedFieldKey: whichField(q, {
          experimentCode: r.code, client: r.clientCompany, fabricCode: r.fabricCode, notes: r.notes,
        }),
        link: `/experiments/${r.id}`,
      })))
    )
  }

  if (can.has('sample')) {
    tasks.push(
      prisma.sample.findMany({
        where: {
          OR: [
            { sampleCode: contains(q) }, { clientName: contains(q) },
            { label: contains(q) }, { targetItem: contains(q) },
          ],
        },
        take: PER_TYPE_LIMIT,
        orderBy: { sampleDate: 'desc' },
        select: {
          id: true, sampleCode: true, clientName: true, label: true,
          targetItem: true, status: true, experimentId: true,
        },
      }).then((rows) => rows.map((r) => ({
        type: 'sample' as const,
        id: r.id,
        title: r.sampleCode,
        subtitle: [r.clientName, r.status].filter(Boolean).join(' · '),
        matchedFieldKey: whichField(q, {
          sampleCode: r.sampleCode, clientName: r.clientName, label: r.label, targetItem: r.targetItem,
        }),
        link: `/experiments/${r.experimentId}`,
      })))
    )
  }

  if (can.has('supplier')) {
    tasks.push(
      prisma.supplier.findMany({
        where: {
          OR: [
            { name: contains(q) }, { code: contains(q) },
            { contactPerson: contains(q) }, { supplyItems: contains(q) },
          ],
        },
        take: PER_TYPE_LIMIT,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, code: true, contactPerson: true, supplyItems: true },
      }).then((rows) => rows.map((r) => ({
        type: 'supplier' as const,
        id: r.id,
        title: `${r.code} ${r.name}`,
        subtitle: r.contactPerson || '',
        matchedFieldKey: whichField(q, {
          supplierName: r.name, supplierCode: r.code, contactPerson: r.contactPerson, supplyItems: r.supplyItems,
        }),
        link: '/suppliers',
      })))
    )
  }

  if (can.has('knowledge')) {
    tasks.push(
      prisma.knowledgeArticle.findMany({
        where: {
          OR: [{ title: contains(q) }, { content: contains(q) }, { tags: contains(q) }],
        },
        take: PER_TYPE_LIMIT,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, content: true, tags: true, category: true },
      }).then((rows) => rows.map((r) => ({
        type: 'knowledge' as const,
        id: r.id,
        title: r.title,
        subtitle: r.category || '',
        matchedFieldKey: whichField(q, { title: r.title, tags: r.tags, content: r.content }),
        link: '/knowledge',
      })))
    )
  }

  const hits = (await Promise.all(tasks)).flat()

  res.json({ success: true, data: { query: q, hits, total: hits.length } })
})

export default router
