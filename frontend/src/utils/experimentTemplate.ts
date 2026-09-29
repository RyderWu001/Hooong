import dayjs from 'dayjs'
import type { ExperimentGroup, ExperimentTemplate, TemplateField } from '../types'

type Conditions = Record<string, unknown>

const isEmpty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0)

/**
 * 取得試驗組的條件值。新資料存在 group.conditions；舊資料（conditions 為 null）
 * 的染整欄位存在 group 本身的欄位，而內建「染整」範本的 key 與這些欄位同名，
 * 因此可直接依範本欄位補讀，舊資料不需要遷移就能在新表單中顯示與編輯。
 */
export function getGroupConditions(group: ExperimentGroup, fields: TemplateField[]): Conditions {
  const out: Conditions = { ...(group.conditions ?? {}) }
  const legacy = group as unknown as Conditions
  for (const f of fields) {
    if (isEmpty(out[f.key]) && !isEmpty(legacy[f.key])) out[f.key] = legacy[f.key]
  }
  return out
}

/** 舊資料判斷：沒有 conditions 但有任一染整欄位 */
export function hasLegacyConditions(group: ExperimentGroup): boolean {
  if (group.conditions) return false
  const g = group as unknown as Conditions
  return ['experimentType', 'bathRatio', 'dyeAuxiliaries', 'fixingTemp', 'fixingAuxiliaries'].some((k) => !isEmpty(g[k]))
}

/**
 * 決定實驗要用哪個範本：實驗自己的範本 > 有舊資料時用內建染整範本 > 空白通用範本。
 */
export function resolveTemplate(
  experiment: { template?: ExperimentTemplate | null; groups?: ExperimentGroup[] } | null,
  templates: ExperimentTemplate[],
): ExperimentTemplate | null {
  if (experiment?.template) return experiment.template
  if (experiment?.groups?.some(hasLegacyConditions)) {
    const dyeing = templates.find((t) => t.key === 'dyeing')
    if (dyeing) return dyeing
  }
  return templates.find((t) => t.key === 'generic') ?? null
}

/** 判斷欄位在目前條件值下是否顯示 */
export function isFieldVisible(field: TemplateField, values: Conditions): boolean {
  const w = field.showWhen
  if (!w) return true
  const v = values[w.key]
  if (w.in) return w.in.includes(v)
  if (w.notIn) return !w.notIn.includes(v)
  return true
}

export function formatConditionValue(field: TemplateField, value: unknown): string | null {
  if (isEmpty(value)) return null
  const text = Array.isArray(value) ? value.join('、') : String(value)
  return field.unit && field.type === 'number' ? `${text} ${field.unit}` : text
}

/** 產生唯讀顯示與列印用的 [標籤, 值] 列，自動略過未顯示與空值的欄位 */
export function conditionRows(fields: TemplateField[], values: Conditions): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []
  for (const f of fields) {
    if (!isFieldVisible(f, values)) continue
    const text = formatConditionValue(f, values[f.key])
    if (text != null) rows.push({ label: f.label, value: text })
  }
  return rows
}

/** 後端條件值 → 表單值（日期欄位轉 dayjs） */
export function toFormConditions(fields: TemplateField[], values: Conditions): Conditions {
  const out: Conditions = { ...values }
  for (const f of fields) {
    if (f.type === 'date' && typeof out[f.key] === 'string') out[f.key] = dayjs(out[f.key] as string)
  }
  return out
}

/** 表單值 → 送後端的條件值：只保留範本定義且目前可見的欄位，日期轉 YYYY-MM-DD，空值移除 */
export function fromFormConditions(fields: TemplateField[], values: Conditions | undefined): Conditions {
  const src = values ?? {}
  const out: Conditions = {}
  for (const f of fields) {
    if (!isFieldVisible(f, src)) continue
    let v = src[f.key]
    if (f.type === 'date' && v && dayjs.isDayjs(v)) v = v.format('YYYY-MM-DD')
    if (!isEmpty(v)) out[f.key] = v
  }
  return out
}
