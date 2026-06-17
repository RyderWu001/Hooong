import {
  mockUsers, mockIngredients, mockFormulas, mockExperiments,
  mockResults, mockFormulaVersions, mockResultSummary, mockFormulaUsage,
} from './data'

function paginate<T>(arr: T[], page = 1, limit = 20) {
  const start = (page - 1) * limit
  return {
    success: true,
    data: arr.slice(start, start + limit),
    pagination: { page, limit, total: arr.length, totalPages: Math.ceil(arr.length / limit) },
  }
}

function ok<T>(data: T) {
  return { success: true, data, message: '操作成功' }
}

type Handler = (url: string, params: URLSearchParams) => unknown

const HANDLERS: [RegExp, Handler][] = [
  // Auth
  [/\/auth\/me$/, () => ok(mockUsers[0])],
  [/\/users$/, (_, p) => paginate(mockUsers, Number(p.get('page') || 1), Number(p.get('limit') || 20))],

  // Ingredients
  [/\/ingredients$/, (_, p) => ok(mockIngredients)],
  [/\/ingredients\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/ingredients\/(\d+)/)?.[1])
    return ok(mockIngredients.find((i) => i.id === id) ?? mockIngredients[0])
  }],

  // Formulas
  [/\/formulas\/(\d+)\/versions\/\d+$/, () => ok(mockFormulaVersions[0])],
  [/\/formulas\/(\d+)\/versions$/, () => ok(mockFormulaVersions)],
  [/\/formulas\/(\d+)\/ingredients$/, (url) => {
    const id = Number(url.match(/\/formulas\/(\d+)/)?.[1])
    return ok(mockFormulas.find((f) => f.id === id)?.ingredients ?? [])
  }],
  [/\/formulas\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/formulas\/(\d+)/)?.[1])
    return ok(mockFormulas.find((f) => f.id === id) ?? mockFormulas[0])
  }],
  [/\/formulas$/, (_, p) => paginate(mockFormulas, Number(p.get('page') || 1), Number(p.get('limit') || 20))],

  // Experiments
  [/\/experiments\/(\d+)\/steps$/, () => ok([])],
  [/\/experiments\/(\d+)\/samples$/, (url) => {
    const id = Number(url.match(/\/experiments\/(\d+)/)?.[1])
    return ok(mockExperiments.find((e) => e.id === id)?.samples ?? [])
  }],
  [/\/experiments\/(\d+)\/result\/attachments/, () => ok({})],
  [/\/experiments\/(\d+)\/result$/, (url) => {
    const id = Number(url.match(/\/experiments\/(\d+)/)?.[1])
    const r = mockResults.find((r) => r.experimentId === id)
    if (!r) return { success: false, error: { code: 'NOT_FOUND', message: '尚未建立結果' } }
    return ok(r)
  }],
  [/\/experiments\/(\d+)\/attachments/, () => ok({})],
  [/\/experiments\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/experiments\/(\d+)/)?.[1])
    return ok(mockExperiments.find((e) => e.id === id) ?? mockExperiments[0])
  }],
  [/\/experiments$/, (_, p) => {
    let list = [...mockExperiments]
    const code = p.get('code')
    const formulaId = p.get('formulaId')
    const experimenterId = p.get('experimenterId')
    const dateFrom = p.get('dateFrom')
    const dateTo = p.get('dateTo')
    if (code) list = list.filter((e) => e.code.includes(code))
    if (formulaId) list = list.filter((e) => e.formulaId === Number(formulaId))
    if (experimenterId) list = list.filter((e) => e.experimenterId === Number(experimenterId))
    if (dateFrom) list = list.filter((e) => e.experimentDate >= dateFrom)
    if (dateTo) list = list.filter((e) => e.experimentDate <= dateTo + 'T23:59:59Z')
    return paginate(list, Number(p.get('page') || 1), Number(p.get('limit') || 20))
  }],

  // Results
  [/\/results$/, (_, p) => {
    let list = [...mockResults]
    const experimentCode = p.get('experimentCode')
    const formulaName = p.get('formulaName')
    const experimenterId = p.get('experimenterId')
    const status = p.get('status')
    const dateFrom = p.get('dateFrom')
    const dateTo = p.get('dateTo')
    if (experimentCode) list = list.filter((r) => r.experimentCode?.includes(experimentCode))
    if (formulaName) list = list.filter((r) => r.formulaName?.includes(formulaName))
    if (experimenterId) list = list.filter((r) => {
      const exp = mockExperiments.find((e) => e.id === r.experimentId)
      return exp?.experimenterId === Number(experimenterId)
    })
    if (status) list = list.filter((r) => r.status === status)
    if (dateFrom) list = list.filter((r) => r.createdAt >= dateFrom)
    if (dateTo) list = list.filter((r) => r.createdAt <= dateTo + 'T23:59:59Z')
    return paginate(list, Number(p.get('page') || 1), Number(p.get('limit') || 20))
  }],

  // Reports — 4.1 實驗紀錄報表
  [/\/reports\/experiments$/, (_, p) => {
    let list = [...mockExperiments]
    const formulaId = p.get('formulaId')
    const experimenterId = p.get('experimenterId')
    const dateFrom = p.get('dateFrom')
    const dateTo = p.get('dateTo')
    if (formulaId) list = list.filter((e) => e.formulaId === Number(formulaId))
    if (experimenterId) list = list.filter((e) => e.experimenterId === Number(experimenterId))
    if (dateFrom) list = list.filter((e) => e.experimentDate >= dateFrom)
    if (dateTo) list = list.filter((e) => e.experimentDate <= dateTo + 'T23:59:59Z')
    return paginate(list, Number(p.get('page') || 1), Number(p.get('limit') || 999))
  }],

  // Reports — 4.2 配方使用報表
  [/\/reports\/formulas\/usage$/, (_, p) => {
    let list = [...mockFormulaUsage]
    const productType = p.get('productType')
    const formulaId = p.get('formulaId')
    if (productType) list = list.filter((f) => f.productType === productType)
    if (formulaId) list = list.filter((f) => f.formulaId === Number(formulaId))
    return ok(list)
  }],

  // Reports — 4.3 實驗結果統計
  [/\/reports\/results\/summary$/, (_, p) => {
    let list = [...mockResults]
    const status = p.get('status')
    const formulaName = p.get('formulaName')
    const experimenterId = p.get('experimenterId')
    const dateFrom = p.get('dateFrom')
    const dateTo = p.get('dateTo')
    if (status) list = list.filter((r) => r.status === status)
    if (formulaName) list = list.filter((r) => r.formulaName?.includes(formulaName))
    if (experimenterId) list = list.filter((r) => {
      const exp = mockExperiments.find((e) => e.id === r.experimentId)
      return exp?.experimenterId === Number(experimenterId)
    })
    if (dateFrom) list = list.filter((r) => r.createdAt >= dateFrom)
    if (dateTo) list = list.filter((r) => r.createdAt <= dateTo + 'T23:59:59Z')
    return ok({
      total: list.length,
      successCount: list.filter((r) => r.status === 'SUCCESS').length,
      failedCount: list.filter((r) => r.status === 'FAILED').length,
      observingCount: list.filter((r) => r.status === 'OBSERVING').length,
      needsAdjustCount: list.filter((r) => r.status === 'NEEDS_ADJUST').length,
      successRate: list.length
        ? `${Math.round((list.filter((r) => r.status === 'SUCCESS').length / list.length) * 100)}%`
        : '0%',
      detail: list,
    })
  }],

  // Reports — 4.4 條件式查詢
  [/\/reports\/custom$/, (_, p) => {
    const type = p.get('type') ?? 'experiment'
    const formulaId = p.get('formulaId')
    const experimenterId = p.get('experimenterId')
    const status = p.get('status')
    const dateFrom = p.get('dateFrom')
    const dateTo = p.get('dateTo')

    if (type === 'formula') {
      let list = [...mockFormulaUsage]
      if (formulaId) list = list.filter((f) => f.formulaId === Number(formulaId))
      return ok(list)
    }

    if (type === 'result') {
      let list = [...mockResults]
      if (status) list = list.filter((r) => r.status === status)
      if (experimenterId) list = list.filter((r) => {
        const exp = mockExperiments.find((e) => e.id === r.experimentId)
        return exp?.experimenterId === Number(experimenterId)
      })
      if (formulaId) list = list.filter((r) => {
        const exp = mockExperiments.find((e) => e.id === r.experimentId)
        return exp?.formulaId === Number(formulaId)
      })
      if (dateFrom) list = list.filter((r) => r.createdAt >= dateFrom)
      if (dateTo) list = list.filter((r) => r.createdAt <= dateTo + 'T23:59:59Z')
      return ok(list)
    }

    // default: experiment
    let list = [...mockExperiments]
    if (formulaId) list = list.filter((e) => e.formulaId === Number(formulaId))
    if (experimenterId) list = list.filter((e) => e.experimenterId === Number(experimenterId))
    if (dateFrom) list = list.filter((e) => e.experimentDate >= dateFrom)
    if (dateTo) list = list.filter((e) => e.experimentDate <= dateTo + 'T23:59:59Z')
    return ok(list)
  }],
]

export function resolveMock(fullUrl: string): unknown | null {
  const [path, query] = fullUrl.split('?')
  const params = new URLSearchParams(query)
  for (const [pattern, handler] of HANDLERS) {
    if (pattern.test(path)) return handler(path, params)
  }
  return null
}
