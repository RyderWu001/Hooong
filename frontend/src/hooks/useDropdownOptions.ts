import { useEffect, useState } from 'react'
import { getDropdownOptions } from '../api/dropdowns'
import type { DropdownOption } from '../api/dropdowns'

// 在模組層快取，避免同一個 key 重複呼叫 API
const cache: Record<string, DropdownOption[]> = {}

export function useDropdownOptions(key: string) {
  const [options, setOptions] = useState<DropdownOption[]>(cache[key] ?? [])
  const [loading, setLoading] = useState(!cache[key])

  useEffect(() => {
    if (cache[key]) {
      setOptions(cache[key])
      setLoading(false)
      return
    }
    setLoading(true)
    getDropdownOptions(key)
      .then((res) => {
        cache[key] = res.data.data ?? []
        setOptions(cache[key])
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }, [key])

  // 轉成 antd Select 格式
  const selectOptions = options.map((o) => ({ value: o.value, label: o.label }))

  return { options, selectOptions, loading }
}

// 手動清除快取（選項被修改後呼叫）
export function clearDropdownCache(key?: string) {
  if (key) {
    delete cache[key]
  } else {
    Object.keys(cache).forEach((k) => delete cache[k])
  }
}
