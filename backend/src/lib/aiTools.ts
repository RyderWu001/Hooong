import { z } from 'zod'
import prisma from '../db/client'
import { hasPermission, type Module } from '../middleware/permission'

/**
 * AI 助理可呼叫的資料查詢工具。
 *
 * 設計原則：
 * 1. 每個工具都對應一個權限模組，使用者無檢視權限時工具不會被提供給模型，
 *    模型也就無從得知該類資料的存在。
 * 2. 工具只做查詢，不做任何寫入——AI 不應該修改實驗室紀錄。
 * 3. 回傳筆數設上限，避免一次撈太多把上下文塞爆。
 *
 * 這些 handler 不依賴任何模型供應商，可獨立測試，換供應商時也不需改動。
 *
 * 註：選填欄位一律加 .nullable()——OpenAI 的 strict function calling
 * 要求 optional 欄位必須同時允許 null，否則 schema 轉換會失敗。
 */

/** 單一工具最多回傳幾筆 */
const MAX_ROWS = 25

export interface ToolSpec {
  name: string
  description: string
  /** 使用此工具所需的檢視權限 */
  module: Module
  inputSchema: z.ZodTypeAny
  run: (input: any) => Promise<unknown>
}

const num = (v: number | null | undefined) => (v == null ? null : Number(v.toFixed(4)))

// ── 配方 ──────────────────────────────────────────────────
const searchFormulas: ToolSpec = {
  name: 'search_formulas',
  description:
    '搜尋配方。可依名稱/代號關鍵字、產品類型、狀態篩選。回傳配方基本資料與成分數量，' +
    '但不含完整成分明細——需要成分請用 get_formula_detail。',
  module: 'formulas',
  inputSchema: z.object({
    keyword: z.string().nullable().optional().describe('配方名稱或代號的關鍵字'),
    productType: z.string().nullable().optional().describe('產品類型，例如「液體洗滌劑」「粉體洗滌劑」'),
    status: z.string().nullable().optional().describe('狀態：草稿/審核中/已發布/已凍結'),
    limit: z.number().int().min(1).max(MAX_ROWS).nullable().optional(),
  }),
  run: async (i) => {
    const rows = await prisma.formula.findMany({
      where: {
        ...(i.keyword && {
          OR: [
            { name: { contains: i.keyword, mode: 'insensitive' } },
            { code: { contains: i.keyword, mode: 'insensitive' } },
          ],
        }),
        ...(i.productType && { productType: { contains: i.productType, mode: 'insensitive' } }),
        ...(i.status && { status: i.status }),
      },
      take: i.limit ?? 10,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, code: true, name: true, productType: true, status: true,
        description: true, _count: { select: { ingredients: true } },
      },
    })
    return rows.map((r) => ({
      id: r.id, code: r.code, name: r.name,
      productType: r.productType, status: r.status,
      description: r.description || null,
      ingredientCount: r._count.ingredients,
    }))
  },
}

const getFormulaDetail: ToolSpec = {
  name: 'get_formula_detail',
  description:
    '取得單一配方的完整成分明細，含每項原料的比例、單價與成本貢獻，以及整體每公斤原料成本。' +
    '要比較兩個配方時，分別呼叫兩次。',
  module: 'formulas',
  inputSchema: z.object({
    formulaId: z.number().int().nullable().optional().describe('配方 ID'),
    code: z.string().nullable().optional().describe('配方代號，例如 DTG-F001'),
  }),
  run: async (i) => {
    const formula = await prisma.formula.findFirst({
      where: i.formulaId ? { id: i.formulaId } : { code: i.code },
      select: { id: true, code: true, name: true, productType: true, status: true, description: true },
    })
    if (!formula) return { error: '找不到指定的配方' }

    const items = await prisma.formulaIngredient.findMany({
      where: { formulaId: formula.id },
      orderBy: { ratio: 'desc' },
      select: {
        ratio: true, unit: true,
        ingredient: {
          select: { id: true, name: true, code: true, category: true, unitPrice: true, casNo: true },
        },
      },
    })

    const totalCost = items.reduce(
      (s, it) => s + (it.ratio / 100) * (it.ingredient.unitPrice ?? 0), 0)

    return {
      ...formula,
      totalRatio: num(items.reduce((s, it) => s + it.ratio, 0)),
      costPerKg: num(totalCost),
      currency: 'TWD',
      ingredients: items.map((it) => ({
        name: it.ingredient.name,
        code: it.ingredient.code,
        category: it.ingredient.category,
        casNo: it.ingredient.casNo,
        ratio: it.ratio,
        unitPrice: it.ingredient.unitPrice,
        costContribution: num((it.ratio / 100) * (it.ingredient.unitPrice ?? 0)),
      })),
    }
  },
}

// ── 原料 ──────────────────────────────────────────────────
const searchIngredients: ToolSpec = {
  name: 'search_ingredients',
  description:
    '搜尋原料。可依名稱、代號、英文名、CAS 號、分類篩選。回傳原料屬性與目前庫存狀況。',
  module: 'materials',
  inputSchema: z.object({
    keyword: z.string().nullable().optional().describe('名稱、代號、英文名或 CAS 號的關鍵字'),
    category: z.string().nullable().optional().describe('原料分類，例如「主原料」「助劑」「抗菌劑（防腐劑）」'),
    lowStockOnly: z.boolean().nullable().optional().describe('只列出庫存低於安全庫存的原料'),
    limit: z.number().int().min(1).max(MAX_ROWS).nullable().optional(),
  }),
  run: async (i) => {
    const rows = await prisma.ingredient.findMany({
      where: {
        ...(i.keyword && {
          OR: [
            { name: { contains: i.keyword, mode: 'insensitive' } },
            { code: { contains: i.keyword, mode: 'insensitive' } },
            { englishName: { contains: i.keyword, mode: 'insensitive' } },
            { casNo: { contains: i.keyword, mode: 'insensitive' } },
          ],
        }),
        ...(i.category && { category: i.category }),
      },
      // lowStockOnly 需在取回後才能判斷（Prisma 無法直接比較兩個欄位），
      // 因此先放寬取回筆數，過濾完再套用 limit，否則會漏掉排序在後面的項目
      take: i.lowStockOnly ? 500 : (i.limit ?? 15),
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, code: true, englishName: true, casNo: true,
        category: true, status: true, unit: true, unitPrice: true,
        solidContent: true, appearance: true, storageCondition: true,
        inventory: { select: { currentStock: true, safetyStock: true } },
      },
    })

    const mapped = rows.map((r) => ({
      id: r.id, name: r.name, code: r.code, englishName: r.englishName,
      casNo: r.casNo, category: r.category, status: r.status,
      unit: r.unit, unitPrice: r.unitPrice,
      solidContent: r.solidContent, appearance: r.appearance,
      storageCondition: r.storageCondition,
      currentStock: r.inventory?.currentStock ?? null,
      safetyStock: r.inventory?.safetyStock ?? null,
      isLowStock: r.inventory
        ? r.inventory.currentStock < r.inventory.safetyStock
        : null,
    }))

    if (!i.lowStockOnly) return mapped
    return mapped.filter((m) => m.isLowStock).slice(0, i.limit ?? 15)
  },
}

const whereIngredientUsed: ToolSpec = {
  name: 'where_ingredient_used',
  description:
    '查詢某原料被用在哪些配方裡，以及各配方中的使用比例。' +
    '適合回答「這支原料停產／漲價會影響哪些產品」這類問題。',
  module: 'formulas',
  inputSchema: z.object({
    ingredientName: z.string().describe('原料名稱或代號的關鍵字'),
  }),
  run: async (i) => {
    const ing = await prisma.ingredient.findFirst({
      where: {
        OR: [
          { name: { contains: i.ingredientName, mode: 'insensitive' } },
          { code: { contains: i.ingredientName, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, code: true, unitPrice: true, unit: true },
    })
    if (!ing) return { error: `找不到原料：${i.ingredientName}` }

    const uses = await prisma.formulaIngredient.findMany({
      where: { ingredientId: ing.id },
      orderBy: { ratio: 'desc' },
      take: MAX_ROWS,
      select: {
        ratio: true,
        formula: { select: { id: true, code: true, name: true, status: true, productType: true } },
      },
    })

    return {
      ingredient: ing,
      usedInFormulaCount: uses.length,
      usages: uses.map((u) => ({
        formulaCode: u.formula.code,
        formulaName: u.formula.name,
        status: u.formula.status,
        productType: u.formula.productType,
        ratio: u.ratio,
        costContribution: num((u.ratio / 100) * (ing.unitPrice ?? 0)),
      })),
    }
  },
}

// ── 成本試算 ──────────────────────────────────────────────
const simulatePriceChange: ToolSpec = {
  name: 'simulate_price_change',
  description:
    '試算某原料漲跌價對所有配方成本的影響，回傳受影響最大的配方排序。' +
    '例如「LAS-96 漲價 20% 影響多大」。不會實際修改任何資料。',
  module: 'formulas',
  inputSchema: z.object({
    ingredientName: z.string().describe('原料名稱或代號'),
    changePercent: z.number().describe('價格變動百分比，漲價填正數（20 代表漲 20%），跌價填負數'),
  }),
  run: async (i) => {
    const ing = await prisma.ingredient.findFirst({
      where: {
        OR: [
          { name: { contains: i.ingredientName, mode: 'insensitive' } },
          { code: { contains: i.ingredientName, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, code: true, unitPrice: true, unit: true },
    })
    if (!ing) return { error: `找不到原料：${i.ingredientName}` }
    if (ing.unitPrice == null) return { error: `原料「${ing.name}」尚未設定單價，無法試算` }

    const newPrice = ing.unitPrice * (1 + i.changePercent / 100)

    const affected = await prisma.formulaIngredient.findMany({
      where: { ingredientId: ing.id },
      select: { formulaId: true, ratio: true },
    })
    if (affected.length === 0) {
      return { ingredient: ing, message: '此原料目前未被任何配方使用，價格變動不影響成本' }
    }

    // 一次撈出受影響配方的全部成分，才能算出變動前後的總成本
    const formulaIds = affected.map((a) => a.formulaId)
    const allItems = await prisma.formulaIngredient.findMany({
      where: { formulaId: { in: formulaIds } },
      select: {
        formulaId: true, ratio: true, ingredientId: true,
        ingredient: { select: { unitPrice: true } },
        formula: { select: { code: true, name: true, status: true } },
      },
    })

    const byFormula = new Map<number, typeof allItems>()
    for (const it of allItems) {
      if (!byFormula.has(it.formulaId)) byFormula.set(it.formulaId, [])
      byFormula.get(it.formulaId)!.push(it)
    }

    const results = [...byFormula.entries()].map(([fid, items]) => {
      const before = items.reduce((s, it) => s + (it.ratio / 100) * (it.ingredient.unitPrice ?? 0), 0)
      const after = items.reduce((s, it) => {
        const price = it.ingredientId === ing.id ? newPrice : (it.ingredient.unitPrice ?? 0)
        return s + (it.ratio / 100) * price
      }, 0)
      const f = items[0].formula
      return {
        formulaCode: f.code,
        formulaName: f.name,
        status: f.status,
        costBefore: num(before),
        costAfter: num(after),
        costDelta: num(after - before),
        deltaPercent: before > 0 ? num(((after - before) / before) * 100) : null,
      }
    }).sort((a, b) => (b.costDelta ?? 0) - (a.costDelta ?? 0))

    return {
      ingredient: { ...ing, newUnitPrice: num(newPrice) },
      changePercent: i.changePercent,
      affectedFormulaCount: results.length,
      currency: 'TWD',
      formulas: results.slice(0, MAX_ROWS),
    }
  },
}

const rankFormulaCost: ToolSpec = {
  name: 'rank_formula_cost',
  description:
    '列出配方的每公斤原料成本排行，可指定由高至低或由低至高。適合回答「哪些配方最貴／最便宜」。',
  module: 'formulas',
  inputSchema: z.object({
    order: z.enum(['desc', 'asc']).nullable().optional().describe('desc = 成本高的在前（預設）'),
    productType: z.string().nullable().optional().describe('限定產品類型'),
    limit: z.number().int().min(1).max(MAX_ROWS).nullable().optional(),
  }),
  run: async (i) => {
    const formulas = await prisma.formula.findMany({
      where: i.productType
        ? { productType: { contains: i.productType, mode: 'insensitive' } }
        : {},
      select: { id: true, code: true, name: true, productType: true, status: true },
    })
    if (formulas.length === 0) return { formulas: [], message: '沒有符合條件的配方' }

    const items = await prisma.formulaIngredient.findMany({
      where: { formulaId: { in: formulas.map((f) => f.id) } },
      select: { formulaId: true, ratio: true, ingredient: { select: { unitPrice: true } } },
    })
    const cost = new Map<number, number>()
    for (const it of items) {
      cost.set(it.formulaId,
        (cost.get(it.formulaId) ?? 0) + (it.ratio / 100) * (it.ingredient.unitPrice ?? 0))
    }

    const ranked = formulas
      .map((f) => ({ ...f, costPerKg: num(cost.get(f.id) ?? 0) }))
      .sort((a, b) => (i.order === 'asc'
        ? (a.costPerKg ?? 0) - (b.costPerKg ?? 0)
        : (b.costPerKg ?? 0) - (a.costPerKg ?? 0)))

    return { currency: 'TWD', formulas: ranked.slice(0, i.limit ?? 10) }
  },
}

// ── 庫存與效期 ────────────────────────────────────────────
const checkInventory: ToolSpec = {
  name: 'check_inventory',
  description:
    '查詢庫存狀況，包含低於安全庫存的原料、以及即將到期或已過期的進料批號。',
  module: 'materials',
  inputSchema: z.object({
    scope: z.enum(['lowStock', 'expiring', 'both']).nullable().optional()
      .describe('lowStock = 庫存不足；expiring = 效期問題；both = 兩者（預設）'),
    withinDays: z.number().int().nullable().optional().describe('效期查詢的天數範圍，預設 30 天'),
  }),
  run: async (i) => {
    const scope = i.scope ?? 'both'
    const out: Record<string, unknown> = {}

    if (scope === 'lowStock' || scope === 'both') {
      const rows = await prisma.$queryRaw<
        { name: string; code: string | null; currentStock: number; safetyStock: number; unit: string }[]
      >`
        SELECT i."name", i."code", mi."currentStock", mi."safetyStock", i."unit"
        FROM "MaterialInventory" mi
        JOIN "Ingredient" i ON i."id" = mi."ingredientId"
        WHERE mi."currentStock" < mi."safetyStock"
        ORDER BY (mi."safetyStock" - mi."currentStock") DESC
        LIMIT ${MAX_ROWS}
      `
      out.lowStock = rows.map((r) => ({
        ...r, shortfall: num(r.safetyStock - r.currentStock),
      }))
    }

    if (scope === 'expiring' || scope === 'both') {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + (i.withinDays ?? 30))
      const batches = await prisma.ingredientBatch.findMany({
        where: { expiryDate: { not: null, lte: cutoff }, status: { not: '報廢' } },
        orderBy: { expiryDate: 'asc' },
        take: MAX_ROWS,
        select: {
          batchNo: true, expiryDate: true, remainingQty: true, quantity: true, unit: true,
          ingredient: { select: { name: true, code: true } },
        },
      })
      const today = new Date(); today.setHours(0, 0, 0, 0)
      out.expiringBatches = batches.map((b) => ({
        ingredientName: b.ingredient.name,
        ingredientCode: b.ingredient.code,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate!.toISOString().slice(0, 10),
        daysLeft: Math.floor((b.expiryDate!.getTime() - today.getTime()) / 86_400_000),
        remaining: b.remainingQty ?? b.quantity,
        unit: b.unit,
      }))
    }

    return out
  },
}

// ── 實驗 ──────────────────────────────────────────────────
const searchExperiments: ToolSpec = {
  name: 'search_experiments',
  description:
    '搜尋實驗紀錄與結果。可依關鍵字、結果狀態、配方篩選。' +
    '注意：回傳的成敗結果僅供參考，樣本數不足時不應據此推論配方優劣。',
  module: 'experiments',
  inputSchema: z.object({
    keyword: z.string().nullable().optional().describe('實驗編號、備註或客戶名稱的關鍵字'),
    resultStatus: z.enum(['SUCCESS', 'FAILED', 'OBSERVING', 'NEEDS_ADJUST']).nullable().optional(),
    formulaCode: z.string().nullable().optional().describe('限定某個配方的實驗'),
    limit: z.number().int().min(1).max(MAX_ROWS).nullable().optional(),
  }),
  run: async (i) => {
    const rows = await prisma.experiment.findMany({
      where: {
        ...(i.keyword && {
          OR: [
            { code: { contains: i.keyword, mode: 'insensitive' } },
            { notes: { contains: i.keyword, mode: 'insensitive' } },
            { clientCompany: { contains: i.keyword, mode: 'insensitive' } },
          ],
        }),
        ...(i.resultStatus && { result: { status: i.resultStatus } }),
        ...(i.formulaCode && { formula: { code: { contains: i.formulaCode, mode: 'insensitive' } } }),
      },
      take: i.limit ?? 10,
      orderBy: { experimentDate: 'desc' },
      select: {
        id: true, code: true, category: true, experimentDate: true,
        notes: true, clientCompany: true,
        formula: { select: { code: true, name: true } },
        experimenter: { select: { username: true } },
        result: { select: { status: true, score: true, description: true, improvement: true } },
      },
    })
    return rows.map((r) => ({
      code: r.code,
      category: r.category,
      date: r.experimentDate.toISOString().slice(0, 10),
      formula: r.formula ? `${r.formula.code} ${r.formula.name}` : null,
      experimenter: r.experimenter.username,
      client: r.clientCompany,
      notes: r.notes || null,
      result: r.result
        ? {
            status: r.result.status,
            score: r.result.score,
            description: r.result.description || null,
            improvement: r.result.improvement || null,
          }
        : null,
    }))
  },
}

// ── 註冊表 ────────────────────────────────────────────────
export const ALL_TOOLS: ToolSpec[] = [
  searchFormulas,
  getFormulaDetail,
  searchIngredients,
  whereIngredientUsed,
  simulatePriceChange,
  rankFormulaCost,
  checkInventory,
  searchExperiments,
]

/** 依角色的檢視權限過濾出可用的工具 */
export async function toolsForRole(role: string): Promise<ToolSpec[]> {
  const checks = await Promise.all(
    ALL_TOOLS.map(async (t) => ({ tool: t, ok: await hasPermission(role, t.module, 'view') }))
  )
  return checks.filter((c) => c.ok).map((c) => c.tool)
}
