import { randomUUID } from 'crypto'

export const CLOUD_TOOLS = ['check_inventory', 'rank_formula_cost', 'simulate_price_change'] as const
export type CloudTool = typeof CLOUD_TOOLS[number]
export const isCloudTool = (name: string): name is CloudTool => CLOUD_TOOLS.includes(name as CloudTool)
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const list = (v: unknown) => Array.isArray(v) ? v.slice(0, 25) : []
const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null
const unit = (v: unknown) => typeof v === 'string' && ['g', 'kg', 'KG', 'mL', 'L', '個', '件', '其他'].includes(v) ? v : '未提供'

/** Only explicit numeric projections leave the server. Never copy arbitrary text/errors. */
export function projectCloudData(tool: CloudTool, result: unknown) {
  const root = obj(result)
  const mapping: Record<string, string> = {}
  const prefix = randomUUID().replace(/-/g, '').slice(0, 12)
  let serial = 0
  const alias = (value: unknown) => {
    const row = obj(value)
    const token = `R_${prefix}_${++serial}`
    const name = row.formulaName ?? row.name ?? row.ingredientName
    const code = row.formulaCode ?? row.code ?? row.ingredientCode
    mapping[token] = [code, name, row.batchNo].filter(x => typeof x === 'string' && x).join(' ／ ') || '未命名紀錄'
    return token
  }
  let data: unknown
  let disclosed: string[]
  if (tool === 'rank_formula_cost') {
    data = { rows: list(root.formulas).map((row, i) => ({ record: alias(row), rank: i + 1 })) }
    disclosed = ['隨機紀錄代號', '成本排名（不含金額）']
  } else if (tool === 'simulate_price_change') {
    data = { changePercent: number(root.changePercent), affectedFormulaCount: number(root.affectedFormulaCount),
      rows: list(root.formulas).map(row => ({ record: alias(row), deltaPercent: number(obj(row).deltaPercent) })) }
    disclosed = ['隨機紀錄代號', '漲價及成本影響百分比', '受影響配方數']
  } else {
    data = {
      lowStock: list(root.lowStock).map(row => ({ record: alias(row), shortfall: number(obj(row).shortfall), unit: unit(obj(row).unit) })),
      expiringBatches: list(root.expiringBatches).map(row => ({ record: alias(row), daysLeft: number(obj(row).daysLeft), remaining: number(obj(row).remaining), unit: unit(obj(row).unit) })),
    }
    disclosed = ['隨機紀錄代號', '庫存缺口／批號剩餘量與單位', '距到期天數']
  }
  return { payload: { task: tool, data }, mapping, disclosed }
}

export function restoreAliases(answer: string, mapping: Record<string, string>) {
  return answer.replace(/R_[a-f0-9]{12}_\d+/g, token => mapping[token] ?? '[未知紀錄]')
}

// 這個路徑從頭到尾不離開伺服器，不需要 unit() 那種為了送雲端而設計的白名單限制，照實顯示資料庫裡的原始單位即可。
const rawUnit = (v: unknown) => typeof v === 'string' && v ? v : '未提供'
// 對齊系統其他地方「數字保留兩位小數，金額標明幣別」的慣例。
const decimal = (v: unknown) => { const n = number(v); return n == null ? '未提供' : n.toFixed(2) }

/**
 * 這三個工具的輸出本來就是算好的結構化數字，造句不需要任何推理，
 * 寫死模板即可——不呼叫任何模型（本地或雲端），資料也完全不離開伺服器。
 * 回傳 null 表示這個工具沒有對應模板，維持原本送雲端的路徑。
 */
export function formatTemplateAnswer(tool: CloudTool, raw: unknown, input?: unknown): string | null {
  const root = obj(raw)
  if (typeof root.error === 'string') return root.error

  if (tool === 'check_inventory') {
    const lowStock = list(root.lowStock)
    const expiring = list(root.expiringBatches)
    const parts: string[] = []
    if (lowStock.length) parts.push(`目前有 ${lowStock.length} 項原料低於安全庫存：` +
      lowStock.map(v => { const r = obj(v); return `${r.name}（${r.code}）缺口 ${number(r.shortfall)} ${rawUnit(r.unit)}` }).join('；'))
    if (expiring.length) parts.push(`另有 ${expiring.length} 批原料即將到期或已過期：` +
      expiring.map(v => {
        const r = obj(v); const days = number(r.daysLeft)
        const when = days != null && days < 0 ? `已過期 ${-days} 天` : `${days} 天後到期`
        return `${r.ingredientName} 批號 ${r.batchNo}，剩餘 ${number(r.remaining)} ${rawUnit(r.unit)}，${when}`
      }).join('；'))
    return parts.length ? parts.join('。') + '。' : '目前查無庫存不足或即將到期的原料。'
  }

  if (tool === 'rank_formula_cost') {
    const formulas = list(root.formulas)
    if (!formulas.length) return typeof root.message === 'string' ? root.message : '沒有符合條件的配方。'
    const order = obj(input).order === 'asc' ? 'asc' : 'desc'
    const label = order === 'asc' ? '由低到高' : '由高到低'
    return `每公斤成本排行（${label}）：` + formulas.map((v, i) => { const f = obj(v); return `第 ${i + 1} 名 ${f.name}（${f.code}）${decimal(f.costPerKg)} 元/kg` }).join('；') + '。'
  }

  // simulate_price_change
  const ing = obj(root.ingredient)
  if (typeof root.message === 'string') return `${ing.name ?? ''} ${root.message}`
  const formulas = list(root.formulas)
  if (!formulas.length) return '沒有受影響的配方。'
  const changePercent = number(root.changePercent) ?? 0
  const direction = changePercent >= 0 ? '漲價' : '跌價'
  return `${ing.name} ${direction} ${decimal(Math.abs(changePercent))}%，影響 ${number(root.affectedFormulaCount)} 個配方，受影響最大的是：` +
    formulas.slice(0, 5).map(v => { const f = obj(v); return `${f.formulaName}（${f.formulaCode}）成本變動 ${decimal(f.deltaPercent)}%` }).join('；') + '。'
}
