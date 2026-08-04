import type { Response, Router } from 'express'

/**
 * 查詢參數的共用解析工具。
 *
 * 原本各路由直接用 Number(req.query.limit)，沒有上限也沒有 NaN 檢查：
 * ?limit=999999 會一次撈出整張表，?id=abc 則讓 Prisma 收到 NaN 後拋錯回 500。
 */

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 200

export interface Pagination {
  page: number
  limit: number
  skip: number
}

/** 解析並箝制分頁參數，任何非法輸入都會退回預設值而非造成錯誤。 */
export function parsePagination(query: Record<string, unknown>, defaultLimit = DEFAULT_PAGE_SIZE): Pagination {
  const rawPage = Number(query.page)
  const rawLimit = Number(query.limit)

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1
    ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE)
    : defaultLimit

  return { page, limit, skip: (page - 1) * limit }
}

/**
 * 解析路由上的數字 ID。非法時直接回 400 並回傳 null，呼叫端據此提早返回。
 *
 * 用法：
 *   const id = parseId(req.params.id, res)
 *   if (id === null) return
 */
export function parseId(raw: string | undefined, res: Response): number | null {
  const id = Number(raw)
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: '無效的 ID' },
    })
    return null
  }
  return id
}

/** 所有代表資料列 ID 的路由參數名稱。 */
const NUMERIC_PARAMS = [
  'id', 'gid', 'sid', 'aid', 'attId', 'docId', 'stepId',
  'sampleId', 'attachmentId', 'batchId', 'ingredientId',
] as const

/**
 * 為 router 上所有數字型路由參數註冊驗證。
 *
 * 直接在 handler 內做 Number(req.params.id) 而不檢查時，/formulas/abc 會讓 Prisma
 * 收到 NaN 後拋錯，回應變成 500 而非 400。在 router.param 層攔截可一次涵蓋該檔
 * 所有路由，不必逐一修改 handler。
 */
export function validateNumericParams(router: Router) {
  for (const name of NUMERIC_PARAMS) {
    router.param(name, (req, res, next, value) => {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 1) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: `無效的參數 ${name}` },
        })
        return
      }
      next()
    })
  }
  return router
}

/**
 * 建立 Prisma update 用的資料物件，略過未提供的欄位。
 *
 * 原本寫法是 `field: body.field ?? null`，前端若只送出部分欄位，
 * 其餘欄位會被寫成 null 而遺失既有資料。
 */
export function patchData<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  fields: readonly (keyof T & string)[]
): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = body[f]
  }
  return out as Partial<T>
}

/** 同上，但針對日期欄位額外轉成 Date。 */
export function patchDates(
  body: Record<string, unknown>,
  fields: readonly string[]
): Record<string, Date | null> {
  const out: Record<string, Date | null> = {}
  for (const f of fields) {
    if (body[f] !== undefined) {
      out[f] = body[f] ? new Date(body[f] as string) : null
    }
  }
  return out
}
