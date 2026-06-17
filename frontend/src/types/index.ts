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
