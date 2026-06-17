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
  unit: string
  description: string
}

export interface FormulaIngredient {
  ingredientId: number
  ingredientName?: string
  ratio: number
  unit: string
}

export interface Formula {
  id: number
  code: string
  name: string
  productType: string
  description: string
  status: FormulaStatus
  currentVersion: number
  ingredients: FormulaIngredient[]
  createdAt: string
  updatedAt: string
}

export interface FormulaVersion {
  version: number
  changeNote: string
  createdAt: string
  createdBy: string
  ingredients: FormulaIngredient[]
}

// Experiment
export interface ExperimentStep {
  id: number
  stepOrder: number
  description: string
}

export interface Sample {
  id: number
  sampleCode: string
  clientName: string
  label: string
  targetItem: string
  sampleDate: string
  notes: string
  photoUrl?: string
}

export interface Attachment {
  id: number
  fileUrl: string
  fileType: 'image' | 'video'
  fileName: string
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
  temperature: number
  humidity: number
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
  description: string
  reflection: string
  issueRecord: string
  improvement: string
  clientFeedback: string
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
