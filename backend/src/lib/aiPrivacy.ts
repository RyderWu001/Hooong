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
