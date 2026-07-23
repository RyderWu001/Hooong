import type { Role } from '../types'

export interface ApprovalSlot {
  name: string
  order: number
  roles: Role[]   // 哪些角色才能簽這一欄
}

export const APPROVAL_CHAINS: Record<string, ApprovalSlot[]> = {
  SampleSubmission: [
    { name: '承辦人',  order: 1, roles: ['LAB_STAFF'] },
    { name: '化驗室',  order: 2, roles: ['LAB_STAFF', 'MANAGER'] },
    { name: '廠務部',  order: 3, roles: ['MANAGER'] },
    { name: '行管部',  order: 4, roles: ['MANAGER'] },
    { name: '財務部',  order: 5, roles: ['MANAGER'] },
    { name: '核准',    order: 6, roles: ['MANAGER', 'ADMIN'] },
    { name: '總經理',  order: 7, roles: ['ADMIN'] },
  ],
  ChemicalEvaluation: [
    { name: '評估人員',   order: 1, roles: ['LAB_STAFF'] },
    { name: '化驗室主管', order: 2, roles: ['MANAGER'] },
    { name: '廠長',       order: 3, roles: ['ADMIN'] },
  ],
  ChemicalRequest: [
    { name: '申請人',   order: 1, roles: ['LAB_STAFF'] },
    { name: '技術主管', order: 2, roles: ['MANAGER'] },
    { name: '廠長',     order: 3, roles: ['MANAGER', 'ADMIN'] },
    { name: '總經理',   order: 4, roles: ['ADMIN'] },
  ],
  QcReport: [
    { name: '檢測員',   order: 1, roles: ['LAB_STAFF'] },
    { name: '審核',     order: 2, roles: ['MANAGER'] },
    { name: '單位主管', order: 3, roles: ['ADMIN'] },
  ],
  FormulaChange: [
    { name: '技術經理', order: 1, roles: ['MANAGER'] },
    { name: '管理部',   order: 2, roles: ['MANAGER', 'ADMIN'] },
    { name: '總經理',   order: 3, roles: ['ADMIN'] },
    { name: '董事長',   order: 4, roles: ['ADMIN'] },
  ],
  MassProduction: [
    { name: '管理部', order: 1, roles: ['MANAGER', 'ADMIN'] },
    { name: '總經理', order: 2, roles: ['ADMIN'] },
    { name: '董事長', order: 3, roles: ['ADMIN'] },
  ],
}
