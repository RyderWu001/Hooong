import client from './client'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ToolCallRecord {
  name: string
  input: unknown
}

export type AssistantMode = 'local' | 'preview' | 'hybrid'
export interface RoutingInfo {
  engine: 'local' | 'preview' | 'cloud'
  reason: string
  disclosed: string[]
  payload?: unknown
}
export interface AssistantReply {
  routing?: RoutingInfo
  answer: string
  /** 這次回答查了哪些資料，供使用者驗證來源 */
  toolCalls: ToolCallRecord[]
  usage: { inputTokens: number; outputTokens: number }
}

export interface AssistantStatus {
  draftAllowed?: boolean
  enabled: boolean
  cloudReady?: boolean
  cloudHost?: string | null
  hybridAllowed?: boolean
  tools: { name: string; description: string }[]
}

export const getAssistantStatus = () =>
  client.get<{ success: boolean; data: AssistantStatus }>('/assistant/status')
    .then(r => r.data.data)

export const askAssistant = (question: string, history: ChatTurn[] = [], mode: AssistantMode = 'local') =>
  client.post<{ success: boolean; data: AssistantReply }>('/assistant/ask', { question, history, mode })
    .then(r => r.data.data)

/** 工具名稱 → 顯示用的中文說明 */
export const TOOL_LABEL: Record<string, string> = {
  search_formulas: '搜尋配方',
  get_formula_detail: '查看配方成分',
  search_ingredients: '搜尋原料',
  where_ingredient_used: '查詢原料用於哪些配方',
  simulate_price_change: '試算價格變動影響',
  rank_formula_cost: '配方成本排行',
  check_inventory: '查詢庫存與效期',
  search_experiments: '搜尋實驗紀錄',
}

export interface ExperimentDraftReply {
  token: string
  code: string
  answer: string
  missing: string[]
  templateName: string | null
  fields: { key: string; label: string; unit?: string }[]
  draft: {
    title: string
    templateKey: string | null
    experimentDate: string | null
    formulaCode: string | null
    notes: string
    groups: { name: string; conditions: Record<string, string | number | string[]>; steps: string[]; repeats: number }[]
    suggestions: string[]
  }
}
export const prepareExperimentDraft = (question: string, token?: string) =>
  client.post<{ data: ExperimentDraftReply }>('/assistant/experiment-draft', { question, token }).then(r => {
    const data = r.data.data
    if (!data?.draft || !Array.isArray(data.draft.groups) || !Array.isArray(data.missing) || typeof data.token !== 'string') throw new Error('無效的草稿回應')
    return data
  })
export const confirmExperimentDraft = (token: string) =>
  client.post<{ data: { id: number; code: string } }>('/assistant/experiment-draft/confirm', { token, confirmed: true }).then(r => {
    if (!Number.isInteger(r.data.data?.id)) throw new Error('未收到實驗建立結果')
    return r.data.data
  })
