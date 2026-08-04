/**
 * 列印文件的共用工具。
 *
 * 各表單頁原本各自帶一份幾乎相同的 HTML/CSS 樣板，改動列印樣式時必須逐檔修改，
 * 且使用者輸入是直接字串插值進 document.write，任何含 HTML 的欄位都會被當成標籤執行。
 * 這裡集中處理跳脫、樣板與開窗流程。
 */

/** 將使用者輸入跳脫為純文字，避免備註等欄位的內容被當成 HTML 執行。 */
export function esc(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 跳脫後把換行轉成 <br>，供備註類多行欄位使用。 */
export function escMultiline(v: unknown): string {
  return esc(v).replace(/\n/g, '<br>')
}

/**
 * 遞迴跳脫物件/陣列中所有字串欄位，回傳結構相同的新值。
 *
 * 列印函式有數百處 `${row.x}` 插值，逐一包 esc() 容易漏。改為在資料進入樣板前
 * 一次跳脫，之後所有插值（含用 map 組出的 <tr> 片段）都已是安全內容。
 * 數字、布林、Date 保持原型別，因此 dayjs()、算術與比較都不受影響。
 */
export function escapeDeep<T>(value: T): T {
  if (typeof value === 'string') return esc(value) as unknown as T
  if (value === null || value === undefined) return value
  if (value instanceof Date) return value
  if (Array.isArray(value)) return value.map(escapeDeep) as unknown as T
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = escapeDeep(v)
    }
    return out as T
  }
  return value
}

/**
 * 所有列印文件都需要的 CSS 重置。
 *
 * print-color-adjust 讓瀏覽器列印時保留背景色，表頭的灰底才不會變成全白。
 * 這段先前散落在 13 個檔案各自的樣板裡，改主題色時因為寫法有細微差異
 * （`*{...}` 與 `* { ... }`）而漏改了其中三個。
 */
const RESET_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }`

export interface PrintDocOptions {
  /** 瀏覽器分頁標題，通常是「表單名稱 表單編號」 */
  title: string
  /** 該表單自己的完整 CSS（含 body 與版面設定）。各表單字級與邊距不同，不共用。 */
  css: string
  /** <body> 內容 */
  body: string
  /**
   * 延後叫出列印對話框的毫秒數。
   * 版面較複雜的表單需要等渲染完成，太早列印會抓到未排版完的畫面。
   * 未指定時採用 onload 觸發。
   */
  printDelayMs?: number
}

/**
 * 組出完整列印文件並開新視窗，載入後自動叫出列印對話框。
 *
 * 回傳 false 表示開窗被瀏覽器攔截，呼叫端應提示使用者允許彈出視窗。
 */
export function openPrintWindow({ title, css, body, printDelayMs }: PrintDocOptions): boolean {
  // 指定延遲時改由呼叫端計時觸發，此處不再掛 onload，否則會叫出兩次列印對話框
  const autoPrint = printDelayMs === undefined
    ? '\n<script>window.onload = () => window.print()<\/script>'
    : ''

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>${RESET_CSS}
${css}
</style>
</head>
<body>
${body}${autoPrint}
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) return false
  w.document.write(html)
  w.document.close()

  if (printDelayMs !== undefined) {
    w.focus()
    setTimeout(() => w.print(), printDelayMs)
  }
  return true
}
