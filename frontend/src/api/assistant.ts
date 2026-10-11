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
  templateAllowed?: boolean
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
  reviewRequired: boolean
  completionLevel: 'faithful' | 'common'
  token: string
  code: string
  answer: string
  missing: string[]
  templateName: string | null
  fields: { key: string; label: string; unit?: string }[]
  draft: {
    plan: { objective: string; equipment: string[]; measurements: string[]; checks: string[] }
    inferredTemplate: boolean
    title: string
    templateKey: string | null
    experimentDate: string | null
    formulaCode: string | null
    notes: string
    groups: { name: string; conditions: Record<string, string | number | string[]>; steps: string[]; repeats: number; inferred: { conditions: string[]; steps: number[]; repeats: boolean } }[]
    suggestions: string[]
  }
}
export const prepareExperimentDraft = (question: string, token?: string, completionLevel: 'faithful' | 'common' = 'common') =>
  client.post<{ data: ExperimentDraftReply }>('/assistant/experiment-draft', { question, token, completionLevel }).then(r => {
    const data = r.data.data
    if (!data?.draft || !Array.isArray(data.draft.groups) || !Array.isArray(data.missing) || typeof data.token !== 'string') throw new Error('無效的草稿回應')
    return data
  })
export const confirmExperimentDraft = (token: string, reviewedSuggestions = false) =>
  client.post<{ data: { id: number; code: string } }>('/assistant/experiment-draft/confirm', { token, confirmed: true, reviewedSuggestions }).then(r => {
    if (!Number.isInteger(r.data.data?.id)) throw new Error('未收到實驗建立結果')
    return r.data.data
  })

export interface TemplateDraft {
  name: string; domain: string; description: string
  fields: { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'date'; unit: string; section: string; options: string[]; placeholder: string }[]
  protocol: string[]; checks: string[]
}
export interface TemplateReply {
  draft: TemplateDraft; token: string; engine: 'rules' | 'local' | 'cloud'; target: 'rules' | 'local' | 'cloud'; reason: string
  disclosed: string[]; cloudSummary: { topic: string; goals: string[] } | null
}
export const prepareTemplateDraft = (question: string, signal: AbortSignal) => client.post<{ data: TemplateReply }>('/assistant/template-draft', { question }, { signal, timeout: 10000 }).then(r => r.data.data)
export const enrichTemplateDraft = (token: string, signal: AbortSignal) => client.post<{ data: TemplateReply }>('/assistant/template-draft/enrich', { token }, { signal, timeout: 25000 }).then(r => r.data.data)
export const saveTemplateDraft = (token: string, draft: TemplateDraft) => client.post<{ data: { id: number; name: string } }>('/assistant/template-draft/confirm', { token, draft, reviewed: true, confirmed: true }, { timeout: 20000 }).then(r => r.data.data)

export const supplementTemplateDraft = (token: string, draft: TemplateDraft) => client.post<{ data: TemplateReply }>('/assistant/template-draft/supplement', { token, draft }, { timeout: 10000 }).then(r => r.data.data)
