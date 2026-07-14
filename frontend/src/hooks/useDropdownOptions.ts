import { useCallback, useEffect, useState } from 'react'
import { getDropdownOptions } from '../api/dropdowns'
import type { DropdownOption } from '../api/dropdowns'

const cache: Record<string, DropdownOption[]> = {}

export function useDropdownOptions(key: string) {
  const [options, setOptions] = useState<DropdownOption[]>(cache[key] ?? [])
  const [loading, setLoading] = useState(!cache[key])

  const fetchOptions = useCallback(() => {
    setLoading(true)
    getDropdownOptions(key)
      .then((res) => {
        cache[key] = res.data.data ?? []
        setOptions([...cache[key]])
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }, [key])

  useEffect(() => {
    if (cache[key]) {
      setOptions(cache[key])
      setLoading(false)
      return
    }
    fetchOptions()
  }, [key, fetchOptions])

  const selectOptions = options.map((o) => ({ value: o.value, label: o.label }))

  const refetch = useCallback(() => {
    delete cache[key]
    fetchOptions()
  }, [key, fetchOptions])

  return { options, selectOptions, loading, refetch }
}

export function clearDropdownCache(key?: string) {
  if (key) {
    delete cache[key]
  } else {
    Object.keys(cache).forEach((k) => delete cache[k])
  }
}
