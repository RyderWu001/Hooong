import { useEffect, useState, useCallback, useRef } from 'react'
import { getAlertCount, type AlertCategory } from '../api/dashboard'

interface AlertCount {
  total: number
  criticalCount: number
  counts: Record<AlertCategory, number>
}

const EMPTY: AlertCount = {
  total: 0,
  criticalCount: 0,
  counts: { lowStock: 0, expired: 0, expiring: 0, retention: 0, pendingSignature: 0 },
}

/** 背景更新間隔。提醒的來源（庫存、效期）變動不頻繁，不需要即時輪詢。 */
const REFRESH_MS = 5 * 60 * 1000

/**
 * 取得待處理提醒數量，供選單紅點使用。
 *
 * 分頁切到背景時暫停輪詢，避免長時間開著卻無人看的分頁持續發出請求。
 */
export function useAlertCount() {
  const [data, setData] = useState<AlertCount>(EMPTY)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      setData(await getAlertCount())
    } catch {
      // 提醒數量取不到不影響主要操作，靜默略過
    }
  }, [])

  useEffect(() => {
    refresh()

    const start = () => {
      if (timer.current) return
      timer.current = setInterval(refresh, REFRESH_MS)
    }
    const stop = () => {
      if (!timer.current) return
      clearInterval(timer.current)
      timer.current = null
    }

    const onVisibility = () => {
      if (document.hidden) { stop(); return }
      refresh()
      start()
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refresh])

  return { ...data, refresh }
}
