import client from './client'

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertCategory = 'lowStock' | 'expired' | 'expiring' | 'retention' | 'pendingSignature'

export interface AlertItem {
  id: string
  category: AlertCategory
  severity: AlertSeverity
  /** 後端只提供 key 與參數，文字由前端依語系組合 */
  titleKey: string
  titleParams: Record<string, string | number>
  detailKey: string
  detailParams: Record<string, string | number>
  link: string
  date: string | null
  daysLeft: number | null
}

export interface AlertSummary {
  items: AlertItem[]
  counts: Record<AlertCategory, number>
  total: number
  criticalCount: number
}

export interface DashboardSummary {
  experiments: {
    thisMonth: number
    prevMonth: number
    successRate: number | null
    byStatus: Record<string, number>
  }
  totals: {
    formulas: number
    ingredients: number
    activeSamples: number
  }
  recentExperiments: {
    id: number
    code: string
    category: string | null
    formulaName: string
    experimenterName: string
    experimentDate: string
    createdAt: string
    resultStatus: string | null
  }[]
}

export const getAlerts = () =>
  client.get<{ success: boolean; data: AlertSummary }>('/dashboard/alerts').then(r => r.data.data)

export const getAlertCount = () =>
  client.get<{ success: boolean; data: Pick<AlertSummary, 'total' | 'criticalCount' | 'counts'> }>(
    '/dashboard/alerts/count'
  ).then(r => r.data.data)

export const getDashboardSummary = () =>
  client.get<{ success: boolean; data: DashboardSummary }>('/dashboard/summary').then(r => r.data.data)
