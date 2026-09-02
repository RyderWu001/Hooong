import OpenAI from 'openai'
import { zodFunction } from 'openai/helpers/zod'
import { toolsForRole, type ToolSpec } from './aiTools'

/**
 * AI 助理：讓使用者用自然語言查詢實驗室資料。
 *
 * 採用 function calling 而非把資料塞進提示詞——模型自己決定要查什麼、查幾次，
 * 因此能回答需要多步驟推理的問題（例如「LAS 漲價後哪個配方最該調整」
 * 需要先試算成本、再看配方組成）。
 *
 * 查詢工具定義在 aiTools.ts，與模型供應商無關；本檔只負責串接 OpenAI。
 */

const MODEL = 'gpt-4o'

/** 單次對話最多讓模型呼叫幾輪工具，避免異常情況下無限循環 */
const MAX_ITERATIONS = 8

/** 問題長度上限——每次呼叫都是實際費用 */
export const MAX_QUESTION_LENGTH = 2000

/** 保留最近幾輪對話作為上下文 */
const HISTORY_TURNS = 6

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
  /** 這次回答實際查了哪些資料，讓使用者能驗證來源 */
  toolCalls: ToolCallRecord[]
  usage: { inputTokens: number; outputTokens: number }
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super('尚未設定 OPENAI_API_KEY，AI 助理無法使用')
    this.name = 'AiNotConfiguredError'
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

const SYSTEM_PROMPT = `你是泓利廣實驗室資訊系統的 AI 助理，協助實驗室與業務人員查詢配方、原料、庫存與實驗資料。

工作方式：
- 回答前先用工具查詢實際資料，不要憑印象回答。使用者問的是他們自己系統裡的資料。
- 需要多步驟時就多次呼叫工具。例如比較兩個配方要分別查詢兩次。
- 用繁體中文回答，語氣專業、簡潔。數字保留兩位小數，金額標明幣別。
- 條列資料時用表格或清單，不要寫成一大段文字。

務必遵守：
- 只根據查到的資料回答。查不到就說查不到，不要臆測或編造數值。
- 明確說出你的結論是根據哪些配方／原料，讓使用者能自行驗證。
- 實驗成敗的樣本數目前很少，不要用它推論「某配方比較好」這類結論。
  若使用者這樣問，說明樣本不足以支持該推論。
- 你只能查詢，不能修改任何資料。使用者要求變更時，請他們到對應頁面操作。
- 涉及法規合規（MRSL／ZDHC）、品質判定是否合格時，只提供資料供人判斷，
  不要代替使用者做出合規結論。`

/** 把工具規格轉成 OpenAI 的 function 定義（由 zod schema 自動產生 JSON Schema）*/
function buildTools(specs: ToolSpec[]) {
  return specs.map((spec) =>
    zodFunction({
      name: spec.name,
      description: spec.description,
      parameters: spec.inputSchema as never,
    })
  )
}

export async function askAssistant(opts: {
  question: string
  history?: ChatTurn[]
  role: string
}): Promise<AssistantReply> {
  if (!isAiConfigured()) throw new AiNotConfiguredError()

  const client = new OpenAI()
  const specs = await toolsForRole(opts.role)
  const specByName = new Map(specs.map((s) => [s.name, s]))
  const toolCalls: ToolCallRecord[] = []

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(opts.history ?? []).slice(-HISTORY_TURNS).map((h) => ({
      role: h.role,
      content: h.content,
    })),
    { role: 'user' as const, content: opts.question },
  ]

  let inputTokens = 0
  let outputTokens = 0
  let answer = ''

  // OpenAI 的 SDK 不提供自動工具迴圈，需自行處理 呼叫 → 執行 → 回填 的循環
  for (let round = 0; round < MAX_ITERATIONS; round++) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: buildTools(specs),
      // 累計整段對話的用量，而不是只算最後一次
    })
    inputTokens += completion.usage?.prompt_tokens ?? 0
    outputTokens += completion.usage?.completion_tokens ?? 0

    const choice = completion.choices[0]
    const msg = choice.message

    // 沒有工具呼叫代表模型已經有答案了
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      answer = msg.content ?? ''
      break
    }

    // 助理的工具呼叫必須原樣放回對話，下一輪模型才對得上 tool_call_id
    messages.push(msg)

    for (const call of msg.tool_calls) {
      // 只處理 function 型別的呼叫
      if (call.type !== 'function') continue

      const spec = specByName.get(call.function.name)
      let result: unknown

      if (!spec) {
        result = { error: `未知的工具：${call.function.name}` }
      } else {
        try {
          // 參數是模型產生的 JSON 字串，一律用 JSON.parse 解析
          const input = JSON.parse(call.function.arguments || '{}')
          toolCalls.push({ name: spec.name, input })
          // 用 zod 驗證，避免模型給出不合規格的參數導致查詢出錯
          const parsed = spec.inputSchema.safeParse(input)
          result = parsed.success
            ? await spec.run(parsed.data)
            : { error: '參數格式不正確', detail: parsed.error.issues }
        } catch (e) {
          // 查詢失敗時回傳錯誤訊息而非拋出，讓模型能換個方式再試
          result = { error: (e as Error).message }
        }
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }
  }

  return {
    answer: answer.trim() || '（沒有取得回覆內容，請重新提問）',
    toolCalls,
    usage: { inputTokens, outputTokens },
  }
}

/** 供前端顯示：目前有哪些工具可用 */
export async function describeTools(role: string) {
  const specs = await toolsForRole(role)
  return specs.map((s) => ({ name: s.name, description: s.description }))
}
