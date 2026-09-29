const FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'multiselect', 'date'] as const


/** 驗證 fields 結構，回傳錯誤訊息；合法時回傳 null。 */
export function validateTemplateFields(fields: unknown): string | null {
  if (!Array.isArray(fields)) return 'fields 必須是陣列'
  const keys = new Set<string>()
  for (const [i, f] of fields.entries()) {
    const n = `第 ${i + 1} 個欄位`
    if (!f || typeof f !== 'object') return `${n}格式錯誤`
    const { key, label, type, options, showWhen } = f as Record<string, any>
    if (typeof key !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) return `${n}的 key 只能使用英數字與底線，且須以英文字母開頭`
    if (keys.has(key)) return `${n}的 key「${key}」重複`
    keys.add(key)
    if (typeof label !== 'string' || !label.trim()) return `${n}缺少顯示名稱`
    if (!FIELD_TYPES.includes(type)) return `${n}的類型不合法`
    if ((type === 'select' || type === 'multiselect') && (!Array.isArray(options) || options.some((o) => typeof o !== 'string'))) {
      return `${n}是選擇題，options 必須是字串陣列`
    }
    if (showWhen != null && (typeof showWhen.key !== 'string' || !(Array.isArray(showWhen.in) || Array.isArray(showWhen.notIn)))) return `${n}的 showWhen 需指定 key 與 in 或 notIn 陣列`
  }
  return null
}

