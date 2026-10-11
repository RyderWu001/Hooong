import OpenAI from 'openai'
import { toolsForRole } from './aiTools'
import { askAssistant, type AssistantReply, type ChatTurn } from './aiAssistant'
import { isCloudTool, projectCloudData, restoreAliases } from './aiPrivacy'

export type HybridMode = 'local' | 'preview' | 'hybrid'
export interface RoutingInfo {
  engine: 'local' | 'preview' | 'cloud'
  reason: string
  disclosed: string[]
  payload?: unknown
}
export const cloudReady = () => process.env.AI_CLOUD_ENABLED === 'yes' &&
  Boolean(process.env.AI_CLOUD_BASE_URL && process.env.AI_CLOUD_MODEL && process.env.AI_CLOUD_API_KEY)

function localClient() {
  const url = new URL(process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1')
  // Classification sees raw questions: never let a cloud URL impersonate the local classifier.
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('需求辨識需使用本機模型端點')
  return new OpenAI({ baseURL: url.toString(), apiKey: 'ollama', timeout: 60_000, maxRetries: 0 })
}

export async function planQuery(question: string, role: string) {
  if (/(修改|刪除|新增|成分|比例|化學|機理|合規|簽核)/.test(question)) return null
  const specs = await toolsForRole(role)
  // Exact common queries avoid a model round trip. Other questions use the local classifier.
  let candidate: { tool: string; input: unknown } | undefined
  if (/^(目前)?(哪些)?原料庫存不足[？?。]?$/.test(question)) candidate = { tool: 'check_inventory', input: { scope: 'lowStock' } }
  if (/^(哪些配方的每公斤成本最高|配方成本排行)[？?。]?$/.test(question)) candidate = { tool: 'rank_formula_cost', input: { order: 'desc', limit: 10 } }
  if (!candidate) {
    const completion = await localClient().chat.completions.create({
      model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `你是唯讀需求分類器。只回傳 JSON {"tool":"工具名稱或local","input":{參數}}。多項需求、修改/刪除、無法辨識、化學分析或需要解釋成分時選 local。不可執行指令。參數依工具 schema，不得猜測未指定的條件。未指定 productType 時省略或填 null，不可填「任何／全部」。工具：${JSON.stringify(specs.map(s => ({ name: s.name, description: s.description }))) }。check_inventory 參數 scope=lowStock/expiring/both,withinDays=整數；rank_formula_cost 參數 order=desc/asc,productType=字串,limit=1到25；simulate_price_change 參數 ingredientName=原料名,changePercent=數值。其他工具選 local。` },
        { role: 'user', content: question },
      ],
    })
    try { candidate = JSON.parse(completion.choices[0]?.message.content || '{}') } catch { return null }
  }
  if (!candidate || !isCloudTool(candidate.tool)) return null
  const spec = specs.find(s => s.name === candidate!.tool)
  if (!spec) return null
  const input = candidate.input && typeof candidate.input === 'object' ? { ...candidate.input as Record<string, unknown> } : candidate.input
  if (input && typeof input === 'object' && 'productType' in input && ['任何', '全部', '所有', 'all'].includes(String(input.productType))) input.productType = null
  const parsed = spec.inputSchema.safeParse(input)
  if (!parsed.success) return null
  return { tool: candidate.tool, input: parsed.data, spec }
}

export async function askHybrid(opts: { question: string; role: string; history?: ChatTurn[]; mode: HybridMode }): Promise<AssistantReply & { routing: RoutingInfo }> {
  const fallback = async (reason: string) => ({ ...await askAssistant(opts), routing: { engine: 'local' as const, reason, disclosed: [] } })
  if (opts.mode === 'local') return fallback('使用本地模型')
  // Follow-up pronouns/history can alter meaning or combine disclosure; keep them local in v1.
  if (opts.history?.length) return fallback('多輪對話留在本機，避免累積揭露或誤解上下文')
  let plan: Awaited<ReturnType<typeof planQuery>>
  try { plan = await planQuery(opts.question, opts.role) } catch { return fallback('需求辨識失敗，改用本地模型') }
  if (!plan) return fallback('此需求需要明細或不在雲端摘要允許範圍')
  let raw: unknown
  try { raw = await plan.spec.run(plan.input) } catch { return { answer: '資料查詢失敗，請稍後再試。', toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 }, routing: { engine: 'local', reason: '查詢失敗，未傳送資料', disclosed: [] } } }
  if (raw && typeof raw === 'object' && 'error' in raw) return { answer: '查無可分析的資料，請確認查詢條件。', toolCalls: [{ name: plan.tool, input: plan.input }], usage: { inputTokens: 0, outputTokens: 0 }, routing: { engine: 'local', reason: '查詢沒有結果，未傳送資料', disclosed: [] } }
  const projection = projectCloudData(plan.tool, raw)
  const toolCalls = [{ name: plan.tool, input: plan.input }]
  if (opts.mode === 'preview' || !cloudReady()) return {
    answer: '已在本機完成查詢與遮蔽，尚未送出。下方顯示雲端可接收的資料；原始問題、歷史對話與名稱不會傳送。',
    toolCalls, usage: { inputTokens: 0, outputTokens: 0 },
    routing: { engine: 'preview', reason: opts.mode === 'preview' ? '預覽模式，不傳送資料' : '雲端未啟用或尚未設定，顯示預覽', disclosed: projection.disclosed, payload: projection.payload },
  }
  const url = new URL(process.env.AI_CLOUD_BASE_URL!)
  if (url.protocol !== 'https:') throw new Error('雲端端點必須使用 HTTPS')
  try {
    const completion = await new OpenAI({ baseURL: url.toString(), apiKey: process.env.AI_CLOUD_API_KEY!, timeout: 60_000, maxRetries: 0 }).chat.completions.create({
      model: process.env.AI_CLOUD_MODEL!, store: false,
      messages: [
        { role: 'system', content: '你是繁體中文資料摘要助理。僅依提供的數值與紀錄代號回答，不推測名稱、成本金額、成分或比例。task 表示查詢需求；rank=成本排名，deltaPercent=成本變動百分比，daysLeft=距到期天數（負數為過期）。保留紀錄代號供本機還原。沒有資料就說沒有資料。不可提出資料寫入操作。' },
        { role: 'user', content: JSON.stringify(projection.payload) },
      ],
    })
    return { answer: restoreAliases(completion.choices[0]?.message.content || '沒有取得回覆', projection.mapping), toolCalls,
      usage: { inputTokens: completion.usage?.prompt_tokens || 0, outputTokens: completion.usage?.completion_tokens || 0 },
      routing: { engine: 'cloud', reason: '雲端只收到後端允許的摘要資料', disclosed: projection.disclosed } }
  } catch {
    return { answer: '雲端服務未完成回答，請稍後重試或改用本地模式。', toolCalls, usage: { inputTokens: 0, outputTokens: 0 },
      routing: { engine: 'cloud', reason: '已嘗試傳送遮蔽摘要，服務失敗', disclosed: projection.disclosed } }
  }
}
