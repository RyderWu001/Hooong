import client from './client'

interface ReportParams {
  formulaId?: number
  experimenterId?: number
  dateFrom?: string
  dateTo?: string
  productType?: string
  status?: string
  type?: 'experiment' | 'formula' | 'result'
  page?: number
  limit?: number
}

export const getExperimentReport = (params?: ReportParams) =>
  client.get('/reports/experiments', { params })

export const getFormulaUsageReport = (params?: ReportParams) =>
  client.get('/reports/formulas/usage', { params })

export const getResultSummaryReport = (params?: ReportParams) =>
  client.get('/reports/results/summary', { params })

export const getCustomReport = (params?: ReportParams) =>
  client.get('/reports/custom', { params })

export const exportExcel = (params?: ReportParams) =>
  client.get('/reports/export/excel', {
    params,
    responseType: 'blob',
  })

export const exportPdf = (params?: ReportParams) =>
  client.get('/reports/export/pdf', {
    params,
    responseType: 'blob',
  })
