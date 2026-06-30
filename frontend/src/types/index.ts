export type Role = 'ADMIN' | 'LAB_STAFF' | 'MANAGER'

export interface User {
  id: number
  username: string
  email: string
  role: Role
  isActive: boolean
}

export interface AuthState {
  token: string | null
  user: User | null
}

// Formula
export type FormulaStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED'

export interface Ingredient {
  id: number
  name: string
  code: string | null
  casNo: string | null
  englishName: string | null
  category: string | null
  industry: string | null
  status: string
  packageSpec: string | null
  unit: string
  unitPrice: number | null
  description: string
  createdAt: string
}

export interface IngredientDocument {
  id: number
  ingredientId: number
  fileUrl: string
  fileName: string
  fileType: string
  uploadedAt: string
  uploaderName: string
}

export interface IngredientBatch {
  id: number
  ingredientId: number
  batchNo: string
  supplierBatch: string | null
  mfgDate: string | null
  expiryDate: string | null
  quantity: number
  unit: string
  status: string
  notes: string
  createdAt: string
  ingredientName?: string
}

export interface FormulaIngredient {
  ingredientId: number
  ingredientName?: string
  ratio: number
  unit: string
  unitPrice?: number | null
}

export interface Formula {
  id: number
  code: string
  name: string
  category: string | null
  formulaType: string | null
  productType: string
  description: string
  status: FormulaStatus
  currentVersion: number
  ingredients: FormulaIngredient[]
  createdAt: string
  updatedAt: string
}

export interface FormulaVersion {
  id: number
  version: number
  changeNote: string
  createdAt: string
  createdBy: string
  ingredientsSnapshot?: FormulaIngredient[] | null
}

// Experiment
export interface ExperimentStep {
  id: number
  stepOrder: number
  description: string
}

export interface Sample {
  id: number
  experimentId: number
  experimentCode?: string
  experimentDate?: string
  sampleCode: string
  clientName: string
  label: string
  targetItem: string
  sampleDate: string
  notes: string
  photoUrl?: string
  category: string | null
  attribute: string | null
  industry: string | null
  status: string | null
  attachments?: Attachment[]
}

export interface Attachment {
  id: number
  fileUrl: string
  fileType: 'image' | 'video' | 'pdf' | 'excel'
  fileName: string
  imageCategory: string | null
  createdAt: string
}

export interface Experiment {
  id: number
  code: string
  formulaId: number
  formulaName?: string
  experimenterId: number
  experimenterName?: string
  experimentDate: string
  category: string | null
  temperature: number
  humidity: number
  dyeingMethod: string | null
  acidAddingMethod: string | null
  bathRatio: string | null
  dyeingTemp: number | null
  dyeingTime: number | null
  pH: number | null
  notes: string
  steps: ExperimentStep[]
  attachments: Attachment[]
  samples: Sample[]
  createdAt: string
}

// Result
export type ResultStatus = 'SUCCESS' | 'FAILED' | 'OBSERVING' | 'NEEDS_ADJUST'

export interface ExperimentResult {
  id: number
  experimentId: number
  experimentCode?: string
  status: ResultStatus
  score: number | null
  handFeelScore: number | null
  colorShadeScore: number | null
  fastnessScore: number | null
  moistureScore: number | null
  otherScoreName: string | null
  otherScore: number | null
  description: string
  reflection: string
  issueRecord: string
  abnormalReason: string | null
  improvement: string
  improvementAction: string | null
  clientFeedback: string
  clientFeedbackResult: string | null
  notes: string
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

// Report
export interface FormulaUsageReport {
  formulaId: number
  formulaCode: string
  formulaName: string
  productType: string
  usageCount: number
  successCount: number
  failedCount: number
  observingCount: number
}

export interface ResultSummaryReport {
  total: number
  successCount: number
  failedCount: number
  observingCount: number
  needsAdjustCount: number
  successRate: string
}

// Material / Inventory
export interface MaterialInventory {
  id: number
  ingredientId: number
  ingredientName: string
  unit: string
  currentStock: number
  safetyStock: number
  supplier: string
  expiryDate?: string
  lastUpdated: string
}

export type TransactionType = 'IN' | 'OUT' | 'ADJUST'

export interface MaterialTransaction {
  id: number
  ingredientId: number
  ingredientName: string
  transactionType: TransactionType
  quantity: number
  unit: string
  relatedExperimentId?: number
  relatedExperimentCode?: string
  operator: string
  note: string
  createdAt: string
}

export interface TraceabilityFormula {
  formulaId: number
  formulaCode: string
  formulaName: string
  ratio: number
  unit: string
}

export interface TraceabilityExperiment {
  experimentId: number
  experimentCode: string
  formulaName: string
  experimentDate: string
}

export interface MaterialTraceability {
  ingredientId: number
  ingredientName: string
  usedInFormulas: TraceabilityFormula[]
  usedInExperiments: TraceabilityExperiment[]
}

// Supplier
export type SupplierStatus = 'ACTIVE' | 'INACTIVE'

export interface Supplier {
  id: number
  code: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  supplyItems: string
  status: SupplierStatus
  createdAt: string
  updatedAt: string
}

export type EvaluationLevel = 'A' | 'B' | 'C' | 'D'

export interface SupplierEvaluation {
  id: number
  supplierId: number
  supplierName: string
  evaluationDate: string
  qualityScore: number
  deliveryScore: number
  priceScore: number
  serviceScore: number
  totalScore: number
  level: EvaluationLevel
  notes: string
  evaluator: string
  createdAt: string
}

export type PurchaseStatus = 'PENDING' | 'DELIVERED' | 'CANCELLED'

export interface PurchaseRecord {
  id: number
  supplierId: number
  supplierName: string
  ingredientId: number
  ingredientName: string
  quantity: number
  unit: string
  unitPrice: number
  totalAmount: number
  purchaseDate: string
  deliveryDate?: string
  status: PurchaseStatus
  notes: string
  createdAt: string
}

// Risk
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface FormulaRisk {
  id: number
  formulaId: number
  formulaCode: string
  formulaName: string
  riskLevel: RiskLevel
  riskType: string
  description: string
  mitigation: string
  assessedBy: string
  assessedAt: string
  nextReviewAt: string
}

export interface IngredientRisk {
  id: number
  ingredientId: number
  ingredientName: string
  riskLevel: RiskLevel
  riskType: string
  hazardDescription: string
  safeHandling: string
  storageRequirements: string
  assessedBy: string
  assessedAt: string
}

export type AbnormalEventStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED'

export interface AbnormalEvent {
  id: number
  eventCode: string
  title: string
  description: string
  eventType: string
  severity: RiskLevel
  status: AbnormalEventStatus
  relatedFormulaId?: number
  relatedFormulaName?: string
  relatedIngredientId?: number
  relatedIngredientName?: string
  occurredAt: string
  reportedBy: string
  resolution?: string
  resolvedAt?: string
  createdAt: string
}

// Traceability
export interface FormulaTraceability {
  formula: { id: number; code: string; name: string; productType: string; status: string; currentVersion: number; createdAt: string }
  versions: Array<{ id: number; version: number; changeNote: string; createdAt: string; createdBy: string; ingredientsSnapshot: any }>
  experiments: Array<{ id: number; code: string; experimentDate: string; experimenterName: string; result: { status: string; score: number | null } | null; samplesCount: number }>
}

export interface IngredientTraceability {
  ingredient: { id: number; name: string; code: string | null; unit: string; status: string }
  // 1.6.1 反查配方
  formulaUsage: Array<{
    formulaId: number; formulaCode: string; formulaName: string; formulaStatus: string
    ratio: number; unit: string; experimentCount: number
  }>
  // 1.6.2 反查產品客戶
  clientUsage: Array<{
    clientName: string; sampleCount: number; formulaNames: string[]
    samples: Array<{ sampleCode: string; status: string | null; experimentCode: string; formulaName: string; experimentDate: string }>
  }>
  // 1.6.3 實驗統計
  experimentStats: {
    total: number; successCount: number; failedCount: number
    observingCount: number; needsAdjustCount: number; successRate: string
    experiments: Array<{ id: number; code: string; experimentDate: string; experimenterName: string; formulaName: string; resultStatus: string | null }>
  }
  // 1.6.4 異常追溯
  anomalyEvents: Array<{
    id: number; eventCode: string; title: string; description: string
    eventType: string; severity: string; status: string
    occurredAt: string; resolution: string; resolvedAt: string | null; createdAt: string
  }>
  // 1.6.5 批號追溯
  batches: IngredientBatch[]
}

// Knowledge
export interface KnowledgeArticle {
  id: number
  title: string
  content: string
  category: string
  tags: string
  createdById: number
  createdByName?: string
  createdAt: string
  updatedAt: string
}

// Permissions
export interface RolePermission {
  id: number
  role: string
  module: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

// Pagination
export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: Pagination
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
  }
}
