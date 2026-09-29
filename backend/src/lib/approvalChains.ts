/**
 * 各表單的簽核關卡定義。
 *
 * 前端 constants/approvalChains.ts 也有一份，內容需保持一致。
 * 後端需要它才能算出「還差幾關」這類待簽核統計。
 */

export interface ApprovalSlot {
  name: string
  order: number
  roles: string[]
}

export const APPROVAL_CHAINS: Record<string, ApprovalSlot[]> = {
  SampleSubmission: [
    { name: '承辦人', order: 1, roles: ['LAB_STAFF'] },
    { name: '化驗室', order: 2, roles: ['LAB_STAFF', 'MANAGER'] },
    { name: '管理部', order: 3, roles: ['MANAGER'] },
    { name: '行管部', order: 4, roles: ['MANAGER'] },
    { name: '財務部', order: 5, roles: ['MANAGER'] },
    { name: '核准', order: 6, roles: ['MANAGER', 'ADMIN'] },
    { name: '總經理', order: 7, roles: ['ADMIN'] },
  ],
  ChemicalEvaluation: [
    { name: '評估人員', order: 1, roles: ['LAB_STAFF'] },
    { name: '化驗室主管', order: 2, roles: ['MANAGER'] },
    { name: '廠長', order: 3, roles: ['ADMIN'] },
  ],
  ChemicalRequest: [
    { name: '申請人', order: 1, roles: ['LAB_STAFF'] },
    { name: '技術主管', order: 2, roles: ['MANAGER'] },
    { name: '廠長', order: 3, roles: ['MANAGER', 'ADMIN'] },
    { name: '總經理', order: 4, roles: ['ADMIN'] },
  ],
  QcReport: [
    { name: '檢測員', order: 1, roles: ['LAB_STAFF'] },
    { name: '審核', order: 2, roles: ['MANAGER'] },
    { name: '單位主管', order: 3, roles: ['ADMIN'] },
  ],
  FormulaChange: [
    { name: '技術經理', order: 1, roles: ['MANAGER'] },
    { name: '管理部', order: 2, roles: ['MANAGER', 'ADMIN'] },
    { name: '總經理', order: 3, roles: ['ADMIN'] },
    { name: '董事長', order: 4, roles: ['ADMIN'] },
  ],
  MassProduction: [
    { name: '管理部', order: 1, roles: ['MANAGER', 'ADMIN'] },
    { name: '總經理', order: 2, roles: ['ADMIN'] },
    { name: '董事長', order: 3, roles: ['ADMIN'] },
  ],
}

/** 表單類型 → 前端路由，供提醒項目導向對應頁面 */
export const FORM_ROUTES: Record<string, string> = {
  SampleSubmission: '/sample-submissions',
  ChemicalEvaluation: '/chemical-evaluations',
  ChemicalRequest: '/chemical-requests',
  QcReport: '/materials',
  FormulaChange: '/formula-changes',
  MassProduction: '/mass-production-approvals',
}

/**
 * 表單類型 → 前端 i18n key。
 * 這裡不放中文，讓提醒文字能隨介面語系切換。
 */
export const FORM_LABEL_KEYS: Record<string, string> = {
  SampleSubmission: 'menu.sampleSubmissions',
  ChemicalEvaluation: 'menu.chemicalEvaluations',
  ChemicalRequest: 'menu.chemicalRequests',
  QcReport: 'formType.qcReport',
  FormulaChange: 'menu.formulaChanges',
  MassProduction: 'menu.massProductionApprovals',
}

export function totalSlots(formType: string): number {
  return APPROVAL_CHAINS[formType]?.length ?? 0
}

/** 該角色在此表單類型中可簽的關卡順序 */
export function slotsForRole(formType: string, role: string): number[] {
  return (APPROVAL_CHAINS[formType] ?? [])
    .filter((s) => s.roles.includes(role))
    .map((s) => s.order)
}
