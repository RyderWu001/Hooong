import {
  mockUsers, mockIngredients, mockFormulas, mockExperiments,
  mockResults, mockFormulaVersions, mockResultSummary, mockFormulaUsage,
  mockInventory, mockTransactions,
  mockSuppliers, mockEvaluations, mockPurchaseRecords,
  mockFormulaRisks, mockIngredientRisks, mockAbnormalEvents,
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
  [/\/ingredients$/, () => ok(mockIngredients)],
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
  [/\/results$/, (_, p) => paginate(mockResults, Number(p.get('page') || 1), Number(p.get('limit') || 20))],

  // Materials - inventory
  [/\/materials\/inventory\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/materials\/inventory\/(\d+)/)?.[1])
    return ok(mockInventory.find((i) => i.id === id) ?? mockInventory[0])
  }],
  [/\/materials\/inventory$/, (_, p) => {
    const ingredientId = p.get('ingredientId')
    const list = ingredientId ? mockInventory.filter((i) => i.ingredientId === Number(ingredientId)) : mockInventory
    return ok(list)
  }],
  // Materials - transactions
  [/\/materials\/transactions$/, (_, p) => {
    const ingredientId = p.get('ingredientId')
    const list = ingredientId ? mockTransactions.filter((t) => t.ingredientId === Number(ingredientId)) : mockTransactions
    return ok([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }],
  // Materials - traceability
  [/\/materials\/traceability\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/materials\/traceability\/(\d+)/)?.[1])
    const ingredient = mockIngredients.find((i) => i.id === id)
    const usedInFormulas = mockFormulas
      .filter((f) => f.ingredients.some((i) => i.ingredientId === id))
      .map((f) => {
        const ing = f.ingredients.find((i) => i.ingredientId === id)!
        return { formulaId: f.id, formulaCode: f.code, formulaName: f.name, ratio: ing.ratio, unit: ing.unit }
      })
    const formulaIds = usedInFormulas.map((f) => f.formulaId)
    const usedInExperiments = mockExperiments
      .filter((e) => formulaIds.includes(e.formulaId))
      .map((e) => ({ experimentId: e.id, experimentCode: e.code, formulaName: e.formulaName ?? '', experimentDate: e.experimentDate }))
    return ok({ ingredientId: id, ingredientName: ingredient?.name ?? '', usedInFormulas, usedInExperiments })
  }],

  // Suppliers
  [/\/suppliers\/(\d+)\/evaluations$/, (url) => {
    const id = Number(url.match(/\/suppliers\/(\d+)/)?.[1])
    return ok(mockEvaluations.filter((e) => e.supplierId === id))
  }],
  [/\/suppliers\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/suppliers\/(\d+)/)?.[1])
    return ok(mockSuppliers.find((s) => s.id === id) ?? mockSuppliers[0])
  }],
  [/\/suppliers$/, (_, p) => {
    let list = [...mockSuppliers]
    const name = p.get('name'); const status = p.get('status')
    if (name) list = list.filter((s) => s.name.includes(name))
    if (status) list = list.filter((s) => s.status === status)
    return paginate(list, Number(p.get('page') || 1), Number(p.get('limit') || 20))
  }],
  [/\/evaluations\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/evaluations\/(\d+)/)?.[1])
    return ok(mockEvaluations.find((e) => e.id === id) ?? mockEvaluations[0])
  }],
  [/\/evaluations$/, (_, p) => {
    let list = [...mockEvaluations]
    const supplierId = p.get('supplierId')
    if (supplierId) list = list.filter((e) => e.supplierId === Number(supplierId))
    return ok([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }],
  [/\/purchases\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/purchases\/(\d+)/)?.[1])
    return ok(mockPurchaseRecords.find((r) => r.id === id) ?? mockPurchaseRecords[0])
  }],
  [/\/purchases$/, (_, p) => {
    let list = [...mockPurchaseRecords]
    const supplierId = p.get('supplierId'); const status = p.get('status')
    const ingredientName = p.get('ingredientName')
    const dateFrom = p.get('dateFrom'); const dateTo = p.get('dateTo')
    if (supplierId) list = list.filter((r) => r.supplierId === Number(supplierId))
    if (status) list = list.filter((r) => r.status === status)
    if (ingredientName) list = list.filter((r) => r.ingredientName.includes(ingredientName))
    if (dateFrom) list = list.filter((r) => r.purchaseDate >= dateFrom)
    if (dateTo) list = list.filter((r) => r.purchaseDate <= dateTo)
    return paginate(list, Number(p.get('page') || 1), Number(p.get('limit') || 20))
  }],

  // Risks
  [/\/risks\/formulas\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/risks\/formulas\/(\d+)/)?.[1])
    return ok(mockFormulaRisks.find((r) => r.id === id) ?? mockFormulaRisks[0])
  }],
  [/\/risks\/formulas$/, (_, p) => {
    let list = [...mockFormulaRisks]
    const level = p.get('riskLevel')
    if (level) list = list.filter((r) => r.riskLevel === level)
    return ok(list)
  }],
  [/\/risks\/ingredients\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/risks\/ingredients\/(\d+)/)?.[1])
    return ok(mockIngredientRisks.find((r) => r.id === id) ?? mockIngredientRisks[0])
  }],
  [/\/risks\/ingredients$/, (_, p) => {
    let list = [...mockIngredientRisks]
    const level = p.get('riskLevel')
    if (level) list = list.filter((r) => r.riskLevel === level)
    return ok(list)
  }],
  [/\/risks\/events\/(\d+)$/, (url) => {
    const id = Number(url.match(/\/risks\/events\/(\d+)/)?.[1])
    return ok(mockAbnormalEvents.find((e) => e.id === id) ?? mockAbnormalEvents[0])
  }],
  [/\/risks\/events$/, (_, p) => {
    let list = [...mockAbnormalEvents]
    const status = p.get('status'); const severity = p.get('severity'); const type = p.get('eventType')
    if (status) list = list.filter((e) => e.status === status)
    if (severity) list = list.filter((e) => e.severity === severity)
    if (type) list = list.filter((e) => e.eventType === type)
    return paginate(list, Number(p.get('page') || 1), Number(p.get('limit') || 20))
  }],
  [/\/risks\/report$/, () => {
    const allEvents = mockAbnormalEvents
    const formulaRiskDist = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    mockFormulaRisks.forEach((r) => { formulaRiskDist[r.riskLevel]++ })
    const ingRiskDist = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    mockIngredientRisks.forEach((r) => { ingRiskDist[r.riskLevel]++ })
    return ok({
      formulaRiskDist, ingRiskDist,
      eventTotal: allEvents.length,
      eventOpen: allEvents.filter((e) => e.status === 'OPEN').length,
      eventInvestigating: allEvents.filter((e) => e.status === 'INVESTIGATING').length,
      eventResolved: allEvents.filter((e) => e.status === 'RESOLVED').length,
      eventClosed: allEvents.filter((e) => e.status === 'CLOSED').length,
      recentEvents: [...allEvents].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 5),
    })
  }],

  // Reports
  [/\/reports\/results\/summary$/, () => ok(mockResultSummary)],
  [/\/reports\/formulas\/usage$/, () => ok(mockFormulaUsage)],
  [/\/reports\/experiments$/, (_, p) => paginate(mockExperiments, Number(p.get('page') || 1), Number(p.get('limit') || 20))],
  [/\/reports\/custom$/, (_, p) => paginate(mockExperiments, Number(p.get('page') || 1), Number(p.get('limit') || 20))],
]

export function resolveMock(fullUrl: string): unknown | null {
  const [path, query] = fullUrl.split('?')
  const params = new URLSearchParams(query)
  for (const [pattern, handler] of HANDLERS) {
    if (pattern.test(path)) return handler(path, params)
  }
  return null
}

export function resolveWriteMock(url: string, method: string, body: unknown): unknown {
  const m = method.toUpperCase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = body as any

  // Ingredients
  if (m === 'POST' && /\/ingredients$/.test(url)) {
    const newId = Math.max(0, ...mockIngredients.map((i) => i.id)) + 1
    const item = { id: newId, ...data }
    mockIngredients.push(item)
    return ok(item)
  }
  if (m === 'PUT' && /\/ingredients\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/ingredients\/(\d+)/)?.[1])
    const idx = mockIngredients.findIndex((i) => i.id === id)
    if (idx !== -1) { Object.assign(mockIngredients[idx], data); return ok(mockIngredients[idx]) }
  }
  if (m === 'DELETE' && /\/ingredients\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/ingredients\/(\d+)/)?.[1])
    const idx = mockIngredients.findIndex((i) => i.id === id)
    if (idx !== -1) mockIngredients.splice(idx, 1)
    return ok({})
  }

  // Formulas
  if (m === 'POST' && /\/formulas$/.test(url)) {
    const newId = Math.max(0, ...mockFormulas.map((f) => f.id)) + 1
    const now = new Date().toISOString()
    const item = { id: newId, status: 'ACTIVE', currentVersion: 1, createdAt: now, updatedAt: now, ...data }
    mockFormulas.push(item)
    return ok(item)
  }
  if (m === 'PUT' && /\/formulas\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/formulas\/(\d+)/)?.[1])
    const idx = mockFormulas.findIndex((f) => f.id === id)
    if (idx !== -1) {
      Object.assign(mockFormulas[idx], data, { updatedAt: new Date().toISOString(), currentVersion: mockFormulas[idx].currentVersion + 1 })
      return ok(mockFormulas[idx])
    }
  }
  if (m === 'DELETE' && /\/formulas\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/formulas\/(\d+)/)?.[1])
    const idx = mockFormulas.findIndex((f) => f.id === id)
    if (idx !== -1) mockFormulas.splice(idx, 1)
    return ok({})
  }

  // Experiments
  if (m === 'POST' && /\/experiments$/.test(url)) {
    const newId = Math.max(0, ...mockExperiments.map((e) => e.id)) + 1
    const formula = mockFormulas.find((f) => f.id === data.formulaId)
    const now = new Date().toISOString()
    const item = { id: newId, formulaName: formula?.name ?? '', experimenterName: mockUsers[0].username, steps: [], attachments: [], samples: [], createdAt: now, ...data }
    mockExperiments.push(item)
    return ok(item)
  }
  if (m === 'PUT' && /\/experiments\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/experiments\/(\d+)/)?.[1])
    const idx = mockExperiments.findIndex((e) => e.id === id)
    if (idx !== -1) { Object.assign(mockExperiments[idx], data); return ok(mockExperiments[idx]) }
  }
  if (m === 'DELETE' && /\/experiments\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/experiments\/(\d+)/)?.[1])
    const idx = mockExperiments.findIndex((e) => e.id === id)
    if (idx !== -1) mockExperiments.splice(idx, 1)
    return ok({})
  }

  // Materials inventory write
  if (m === 'POST' && /\/materials\/inventory$/.test(url)) {
    const newId = Math.max(0, ...mockInventory.map((i) => i.id)) + 1
    const ingredient = mockIngredients.find((i) => i.id === data.ingredientId)
    const item = { id: newId, ingredientName: ingredient?.name ?? '', unit: ingredient?.unit ?? '', lastUpdated: new Date().toISOString(), ...data }
    mockInventory.push(item)
    return ok(item)
  }
  if (m === 'PUT' && /\/materials\/inventory\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/materials\/inventory\/(\d+)/)?.[1])
    const idx = mockInventory.findIndex((i) => i.id === id)
    if (idx !== -1) {
      Object.assign(mockInventory[idx], data, { lastUpdated: new Date().toISOString() })
      return ok(mockInventory[idx])
    }
  }
  if (m === 'DELETE' && /\/materials\/inventory\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/materials\/inventory\/(\d+)/)?.[1])
    const idx = mockInventory.findIndex((i) => i.id === id)
    if (idx !== -1) mockInventory.splice(idx, 1)
    return ok({})
  }
  if (m === 'POST' && /\/materials\/inventory\/(\d+)\/adjust$/.test(url)) {
    const id = Number(url.match(/\/materials\/inventory\/(\d+)/)?.[1])
    const inv = mockInventory.find((i) => i.id === id)
    if (inv) {
      const qty = Number(data.quantity)
      if (data.transactionType === 'IN') inv.currentStock += qty
      else if (data.transactionType === 'OUT') inv.currentStock = Math.max(0, inv.currentStock - qty)
      else inv.currentStock = qty
      inv.lastUpdated = new Date().toISOString()
      const newTxId = Math.max(0, ...mockTransactions.map((t) => t.id)) + 1
      const tx = { id: newTxId, ingredientId: inv.ingredientId, ingredientName: inv.ingredientName, unit: inv.unit, operator: mockUsers[0].username, createdAt: new Date().toISOString(), ...data }
      mockTransactions.push(tx)
      return ok(inv)
    }
  }

  // Suppliers
  if (m === 'POST' && /\/suppliers$/.test(url)) {
    const newId = Math.max(0, ...mockSuppliers.map((s) => s.id)) + 1
    const now = new Date().toISOString()
    const item = { id: newId, status: 'ACTIVE', createdAt: now, updatedAt: now, ...data }
    mockSuppliers.push(item)
    return ok(item)
  }
  if (m === 'PUT' && /\/suppliers\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/suppliers\/(\d+)/)?.[1])
    const idx = mockSuppliers.findIndex((s) => s.id === id)
    if (idx !== -1) { Object.assign(mockSuppliers[idx], data, { updatedAt: new Date().toISOString() }); return ok(mockSuppliers[idx]) }
  }
  if (m === 'DELETE' && /\/suppliers\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/suppliers\/(\d+)/)?.[1])
    const idx = mockSuppliers.findIndex((s) => s.id === id)
    if (idx !== -1) mockSuppliers.splice(idx, 1)
    return ok({})
  }
  if (m === 'POST' && /\/evaluations$/.test(url)) {
    const newId = Math.max(0, ...mockEvaluations.map((e) => e.id)) + 1
    const supplier = mockSuppliers.find((s) => s.id === data.supplierId)
    const total = Math.round((data.qualityScore + data.deliveryScore + data.priceScore + data.serviceScore) / 4)
    const level = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : 'D'
    const item = { id: newId, supplierName: supplier?.name ?? '', totalScore: total, level, evaluator: mockUsers[0].username, createdAt: new Date().toISOString(), ...data }
    mockEvaluations.push(item)
    return ok(item)
  }
  if (m === 'POST' && /\/purchases$/.test(url)) {
    const newId = Math.max(0, ...mockPurchaseRecords.map((r) => r.id)) + 1
    const supplier = mockSuppliers.find((s) => s.id === data.supplierId)
    const ingredient = mockIngredients.find((i) => i.id === data.ingredientId)
    const total = Number((data.quantity * data.unitPrice).toFixed(2))
    const item = { id: newId, supplierName: supplier?.name ?? '', ingredientName: ingredient?.name ?? '', unit: ingredient?.unit ?? '', totalAmount: total, status: 'PENDING', createdAt: new Date().toISOString(), ...data }
    mockPurchaseRecords.push(item)
    return ok(item)
  }
  if (m === 'PUT' && /\/purchases\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/purchases\/(\d+)/)?.[1])
    const idx = mockPurchaseRecords.findIndex((r) => r.id === id)
    if (idx !== -1) { Object.assign(mockPurchaseRecords[idx], data); return ok(mockPurchaseRecords[idx]) }
  }

  // Risks
  if (m === 'POST' && /\/risks\/formulas$/.test(url)) {
    const newId = Math.max(0, ...mockFormulaRisks.map((r) => r.id)) + 1
    const formula = mockFormulas.find((f) => f.id === data.formulaId)
    const item = { id: newId, formulaCode: formula?.code ?? '', formulaName: formula?.name ?? '', assessedBy: mockUsers[0].username, assessedAt: new Date().toISOString(), ...data }
    mockFormulaRisks.push(item)
    return ok(item)
  }
  if (m === 'PUT' && /\/risks\/formulas\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/risks\/formulas\/(\d+)/)?.[1])
    const idx = mockFormulaRisks.findIndex((r) => r.id === id)
    if (idx !== -1) { Object.assign(mockFormulaRisks[idx], data); return ok(mockFormulaRisks[idx]) }
  }
  if (m === 'DELETE' && /\/risks\/formulas\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/risks\/formulas\/(\d+)/)?.[1])
    const idx = mockFormulaRisks.findIndex((r) => r.id === id)
    if (idx !== -1) mockFormulaRisks.splice(idx, 1)
    return ok({})
  }
  if (m === 'POST' && /\/risks\/ingredients$/.test(url)) {
    const newId = Math.max(0, ...mockIngredientRisks.map((r) => r.id)) + 1
    const ingredient = mockIngredients.find((i) => i.id === data.ingredientId)
    const item = { id: newId, ingredientName: ingredient?.name ?? '', assessedBy: mockUsers[0].username, assessedAt: new Date().toISOString(), ...data }
    mockIngredientRisks.push(item)
    return ok(item)
  }
  if (m === 'PUT' && /\/risks\/ingredients\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/risks\/ingredients\/(\d+)/)?.[1])
    const idx = mockIngredientRisks.findIndex((r) => r.id === id)
    if (idx !== -1) { Object.assign(mockIngredientRisks[idx], data); return ok(mockIngredientRisks[idx]) }
  }
  if (m === 'DELETE' && /\/risks\/ingredients\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/risks\/ingredients\/(\d+)/)?.[1])
    const idx = mockIngredientRisks.findIndex((r) => r.id === id)
    if (idx !== -1) mockIngredientRisks.splice(idx, 1)
    return ok({})
  }
  if (m === 'POST' && /\/risks\/events$/.test(url)) {
    const newId = Math.max(0, ...mockAbnormalEvents.map((e) => e.id)) + 1
    const eventCode = `EVT-${new Date().getFullYear()}-${String(newId).padStart(3, '0')}`
    const item = { id: newId, eventCode, status: 'OPEN', reportedBy: mockUsers[0].username, createdAt: new Date().toISOString(), ...data }
    mockAbnormalEvents.push(item)
    return ok(item)
  }
  if (m === 'PUT' && /\/risks\/events\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/risks\/events\/(\d+)/)?.[1])
    const idx = mockAbnormalEvents.findIndex((e) => e.id === id)
    if (idx !== -1) {
      if (data.status === 'RESOLVED' && !mockAbnormalEvents[idx].resolvedAt) data.resolvedAt = new Date().toISOString()
      Object.assign(mockAbnormalEvents[idx], data)
      return ok(mockAbnormalEvents[idx])
    }
  }
  if (m === 'DELETE' && /\/risks\/events\/(\d+)$/.test(url)) {
    const id = Number(url.match(/\/risks\/events\/(\d+)/)?.[1])
    const idx = mockAbnormalEvents.findIndex((e) => e.id === id)
    if (idx !== -1) mockAbnormalEvents.splice(idx, 1)
    return ok({})
  }

  // Experiment results
  if ((m === 'POST' || m === 'PUT') && /\/experiments\/(\d+)\/result$/.test(url)) {
    const expId = Number(url.match(/\/experiments\/(\d+)/)?.[1])
    const exp = mockExperiments.find((e) => e.id === expId)
    const now = new Date().toISOString()
    const existing = mockResults.findIndex((r) => r.experimentId === expId)
    if (existing !== -1) {
      Object.assign(mockResults[existing], data, { updatedAt: now })
      return ok(mockResults[existing])
    }
    const newId = Math.max(0, ...mockResults.map((r) => r.id)) + 1
    const item = { id: newId, experimentId: expId, experimentCode: exp?.code ?? '', attachments: [], createdAt: now, updatedAt: now, ...data }
    mockResults.push(item)
    return ok(item)
  }

  return ok({})
}
