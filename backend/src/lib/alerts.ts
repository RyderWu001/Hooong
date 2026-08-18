import { Prisma } from '@prisma/client'
import prisma from '../db/client'
import { APPROVAL_CHAINS, FORM_LABEL_KEYS, FORM_ROUTES, slotsForRole, totalSlots } from './approvalChains'

/**
 * 待辦提醒的彙整邏輯。
 *
 * 安全庫存、原料效期、留樣到期這些資料原本就存在，但只在各自的分頁裡被動呈現，
 * 要有人主動點進去才看得到。這裡集中算出所有需要處理的事項，讓它們能被推到使用者面前。
 */

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertCategory = 'lowStock' | 'expired' | 'expiring' | 'retention' | 'pendingSignature'

/**
 * 提醒項目。
 *
 * 只回傳 i18n key 與參數，不回傳組好的句子——文字組合交給前端，
 * 才能隨介面語系（中／越）切換，而不是永遠顯示後端寫死的語言。
 */
export interface AlertItem {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  /** 前端翻譯用的 key 與插值參數 */
  titleKey: string
  titleParams: Record<string, string | number>
  detailKey: string
  detailParams: Record<string, string | number>
  /** 點擊後導向的前端路由 */
  link: string
  /** 排序用：到期日或相關日期 */
  date: string | null
  /** 剩餘天數，負數代表已逾期 */
  daysLeft: number | null
}

/** 即將到期的判定天數，對應需求文件「即將失效：30 天到期」 */
export const EXPIRING_SOON_DAYS = 30

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 距離目標日期還有幾天（負數代表已逾期）。
 *
 * 用無條件捨去而非進位：到期日若帶有時間（例如 15:30 到期），進位會回報成
 * 比實際多一天，讓使用者以為還有時間。效期提醒寧可保守。
 */
const daysBetween = (target: Date) =>
  Math.floor((target.getTime() - startOfToday().getTime()) / 86_400_000)

const fmt = (d: Date) => d.toISOString().slice(0, 10)

/** 庫存低於安全庫存量 */
async function lowStockAlerts(): Promise<AlertItem[]> {
  // Prisma 無法直接比較兩個欄位，改以原生查詢取得需要的列
  const rows = await prisma.$queryRaw<
    { id: number; name: string; code: string | null; currentStock: number; safetyStock: number; unit: string }[]
  >`
    SELECT mi."id", i."name", i."code", mi."currentStock", mi."safetyStock", i."unit"
    FROM "MaterialInventory" mi
    JOIN "Ingredient" i ON i."id" = mi."ingredientId"
    WHERE mi."currentStock" < mi."safetyStock"
    ORDER BY (mi."safetyStock" - mi."currentStock") DESC
  `

  return rows.map((r) => {
    const shortfall = r.safetyStock - r.currentStock
    return {
      id: `lowStock-${r.id}`,
      category: 'lowStock' as const,
      // 完全沒庫存比只是低於安全量嚴重
      severity: r.currentStock <= 0 ? ('critical' as const) : ('warning' as const),
      titleKey: 'alertItem.lowStock.title',
      titleParams: { name: r.name, code: r.code ?? '' },
      detailKey: 'alertItem.lowStock.detail',
      detailParams: {
        current: r.currentStock,
        safety: r.safetyStock,
        shortfall: Number(shortfall.toFixed(2)),
        unit: r.unit,
      },
      link: '/materials',
      date: null,
      daysLeft: null,
    }
  })
}

/** 原料批號已過期或即將到期 */
async function batchExpiryAlerts(): Promise<AlertItem[]> {
  const cutoff = new Date(startOfToday())
  cutoff.setDate(cutoff.getDate() + EXPIRING_SOON_DAYS)

  const batches = await prisma.ingredientBatch.findMany({
    where: {
      expiryDate: { not: null, lte: cutoff },
      status: { not: '報廢' },
    },
    include: { ingredient: { select: { name: true, code: true } } },
    orderBy: { expiryDate: 'asc' },
  })

  return batches.map((b) => {
    const left = daysBetween(b.expiryDate!)
    const expired = left < 0
    return {
      id: `batch-${b.id}`,
      category: expired ? ('expired' as const) : ('expiring' as const),
      severity: expired ? ('critical' as const) : ('warning' as const),
      titleKey: expired ? 'alertItem.batch.titleExpired' : 'alertItem.batch.titleExpiring',
      titleParams: { name: b.ingredient.name, batchNo: b.batchNo },
      detailKey: expired ? 'alertItem.batch.detailExpired' : 'alertItem.batch.detailExpiring',
      detailParams: {
        days: Math.abs(left),
        date: fmt(b.expiryDate!),
        remaining: b.remainingQty ?? b.quantity,
        unit: b.unit,
      },
      link: '/materials',
      date: fmt(b.expiryDate!),
      daysLeft: left,
    }
  })
}

/** 留樣到期：留樣日期 + 留樣期限（天） */
async function retentionAlerts(): Promise<AlertItem[]> {
  const samples = await prisma.sample.findMany({
    where: {
      retentionDate: { not: null },
      retentionPeriod: { not: null },
      status: { not: '報廢' },
    },
    select: {
      id: true, sampleCode: true, clientName: true,
      retentionDate: true, retentionPeriod: true, retentionLocation: true,
      experimentId: true,
    },
  })

  const out: AlertItem[] = []
  for (const s of samples) {
    const due = new Date(s.retentionDate!)
    due.setDate(due.getDate() + s.retentionPeriod!)
    const left = daysBetween(due)
    if (left > EXPIRING_SOON_DAYS) continue

    const expired = left < 0
    out.push({
      id: `retention-${s.id}`,
      category: 'retention',
      severity: expired ? 'warning' : 'info',
      titleKey: expired ? 'alertItem.retention.titleExpired' : 'alertItem.retention.titleExpiring',
      titleParams: { code: s.sampleCode },
      detailKey: expired ? 'alertItem.retention.detailExpired' : 'alertItem.retention.detailExpiring',
      detailParams: {
        days: Math.abs(left),
        date: fmt(due),
        location: s.retentionLocation ?? '',
        client: s.clientName ?? '',
      },
      link: `/experiments/${s.experimentId}`,
      date: fmt(due),
      daysLeft: left,
    })
  }
  return out.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
}

/**
 * 待本人簽核的表單。
 *
 * 簽核是循序的：只有前一關已完成、且下一關的角色包含本人時才算「輪到你」。
 */
async function pendingSignatureAlerts(role: string): Promise<AlertItem[]> {
  const formTypes = Object.keys(APPROVAL_CHAINS)
  const mySlots = new Map(formTypes.map((t) => [t, new Set(slotsForRole(t, role))]))

  // 一次取出所有已簽紀錄，避免逐張表單查詢
  const signed = await prisma.formSignature.findMany({
    where: { formType: { in: formTypes }, signedAt: { not: null } },
    select: { formType: true, formId: true, slotOrder: true },
  })

  // formType -> formId -> 已簽的最大連續關卡
  const progress = new Map<string, Map<number, Set<number>>>()
  for (const s of signed) {
    if (!progress.has(s.formType)) progress.set(s.formType, new Map())
    const byId = progress.get(s.formType)!
    if (!byId.has(s.formId)) byId.set(s.formId, new Set())
    byId.get(s.formId)!.add(s.slotOrder)
  }

  const out: AlertItem[] = []

  for (const formType of formTypes) {
    const slots = mySlots.get(formType)!
    if (slots.size === 0) continue

    const total = totalSlots(formType)
    const byId = progress.get(formType) ?? new Map<number, Set<number>>()

    // 尚未有任何簽核的表單也需納入（第 1 關就輪到本人時）
    const ids = await formIds(formType)

    for (const id of ids) {
      const done = byId.get(id) ?? new Set<number>()
      if (done.size >= total) continue

      // 下一個待簽關卡 = 已連續完成的關卡數 + 1
      let nextSlot = 1
      while (done.has(nextSlot)) nextSlot++
      if (!slots.has(nextSlot)) continue

      const slotName = APPROVAL_CHAINS[formType].find((s) => s.order === nextSlot)?.name ?? ''
      const slotKey = `approvalSlot.${formType}.${nextSlot}`
      out.push({
        id: `sign-${formType}-${id}`,
        category: 'pendingSignature',
        severity: 'info',
        titleKey: 'alertItem.signature.title',
        // 表單名稱與關卡名同樣以 key 傳遞，由前端依語系翻譯
        titleParams: { formKey: FORM_LABEL_KEYS[formType] ?? '', id },
        detailKey: 'alertItem.signature.detail',
        detailParams: { slotKey, slotFallback: slotName, current: nextSlot, total },
        link: FORM_ROUTES[formType] ?? '/',
        date: null,
        daysLeft: null,
      })
    }
  }
  return out
}

/** 取得各表單類型的所有紀錄 ID */
async function formIds(formType: string): Promise<number[]> {
  const pick = (rows: { id: number }[]) => rows.map((r) => r.id)
  switch (formType) {
    case 'SampleSubmission':
      return pick(await prisma.sampleSubmission.findMany({ select: { id: true } }))
    case 'ChemicalEvaluation':
      return pick(await prisma.chemicalEvaluation.findMany({ select: { id: true } }))
    case 'ChemicalRequest':
      return pick(await prisma.chemicalRequest.findMany({ select: { id: true } }))
    case 'FormulaChange':
      return pick(await prisma.formulaChangeApplication.findMany({ select: { id: true } }))
    case 'MassProduction':
      return pick(await prisma.massProductionApproval.findMany({ select: { id: true } }))
    case 'QcReport':
      // 只有已填寫檢驗項目的批號才需要簽核
      return pick(await prisma.ingredientBatch.findMany({
        where: { qcItems: { not: Prisma.DbNull } },
        select: { id: true },
      }))
    default:
      return []
  }
}

export interface AlertSummary {
  items: AlertItem[]
  counts: Record<AlertCategory, number>
  total: number
  criticalCount: number
}

/** 取得指定角色可見的所有待辦提醒 */
export async function collectAlerts(role: string): Promise<AlertSummary> {
  const [stock, batches, retention, signatures] = await Promise.all([
    lowStockAlerts(),
    batchExpiryAlerts(),
    retentionAlerts(),
    pendingSignatureAlerts(role),
  ])

  const items = [...stock, ...batches, ...retention, ...signatures]

  const counts: Record<AlertCategory, number> = {
    lowStock: 0, expired: 0, expiring: 0, retention: 0, pendingSignature: 0,
  }
  for (const i of items) counts[i.category]++

  // 嚴重程度優先，其次是到期日近的排前面
  const rank = { critical: 0, warning: 1, info: 2 }
  items.sort((a, b) =>
    rank[a.severity] - rank[b.severity] ||
    (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999)
  )

  return {
    items,
    counts,
    total: items.length,
    criticalCount: items.filter((i) => i.severity === 'critical').length,
  }
}
