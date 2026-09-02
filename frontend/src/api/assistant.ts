import client from './client'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ToolCallRecord {
  name: string
  input: unknown
}

export interface AssistantReply {
  answer: string
  /** 這次回答查了哪些資料，供使用者驗證來源 */
  toolCalls: ToolCallRecord[]
  usage: { inputTokens: number; outputTokens: number }
}

export interface AssistantStatus {
  enabled: boolean
  tools: { name: string; description: string }[]
}

export const getAssistantStatus = () =>
  client.get<{ success: boolean; data: AssistantStatus }>('/assistant/status')
    .then(r => r.data.data)

export const askAssistant = (question: string, history: ChatTurn[] = []) =>
  client.post<{ success: boolean; data: AssistantReply }>('/assistant/ask', { question, history })
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
