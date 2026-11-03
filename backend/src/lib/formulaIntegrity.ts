export const FORMULA_STATUSES = ['DRAFT', 'REVIEWING', 'PUBLISHED', 'ACTIVE', 'ARCHIVED', 'INACTIVE', 'DELETED'] as const
export type FormulaStatus = typeof FORMULA_STATUSES[number]
const legacy: Record<string, FormulaStatus> = { 草稿: 'DRAFT', 審核中: 'REVIEWING', 已發布: 'PUBLISHED', 已凍結: 'INACTIVE' }

export function normalizeFormulaStatus(value: string): FormulaStatus | null {
  return (FORMULA_STATUSES as readonly string[]).includes(value) ? value as FormulaStatus
    : Object.prototype.hasOwnProperty.call(legacy, value) ? legacy[value] : null
}

type FormulaRecord = {
  id: number; code: string; status: string; currentVersion: number
  ingredients: { ingredientId: number; ratio: number; unit: string; ingredient: { name: string; unitPrice: number | null } }[]
  versions: { version: number }[]
}

/** Only capture the current composition. Never reconstruct unrecorded historical versions. */
export function planFormulaRepair(formula: FormulaRecord) {
  const status = normalizeFormulaStatus(formula.status)
  if (!status) throw new Error(`配方 ${formula.id} 狀態無法對應，停止修補`)
  if (!Number.isSafeInteger(formula.currentVersion) || formula.currentVersion < 1) throw new Error(`配方 ${formula.id} 版本編號無效，停止修補`)
  if (new Set(formula.versions.map(v => v.version)).size !== formula.versions.length) throw new Error(`配方 ${formula.id} 有重複版本，需先人工確認`)
  return {
    id: formula.id, code: formula.code, oldStatus: formula.status, status, version: formula.currentVersion,
    changeStatus: status !== formula.status,
    addSnapshot: !formula.versions.some(v => v.version === formula.currentVersion),
    snapshot: formula.ingredients.map(i => ({ ingredientId: i.ingredientId, ingredientName: i.ingredient.name, ratio: i.ratio, unit: i.unit, unitPrice: i.ingredient.unitPrice })),
  }
}
