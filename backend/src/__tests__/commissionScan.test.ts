import { describe, it, expect, vi } from 'vitest'

// 路由檔會載入 auth 中介層（需要 JWT_SECRET）與 PDF 解析，此測試只驗證文字解析
vi.mock('../middleware/auth', () => ({ requireAuth: () => {}, requireRole: () => () => {} }))
vi.mock('../middleware/upload', () => ({ uploadPdf: { single: () => () => {} } }))
vi.mock('pdf-parse', () => ({ PDFParse: class {} }))

import { parseCommissionPDF } from '../routes/commissionScan'

describe('parseCommissionPDF 標籤相容', () => {
  it('新版標籤：委託單位／樣品編號／聯絡人', () => {
    const r = parseCommissionPDF(
      'No: EXP-2025-001\n試驗編號：EXP-2025-001\n委託單位 / Đơn vị ủy thác：甲乙實驗有限公司\n申請日期：2025-01-02\n' +
      '樣品編號 / Mã số mẫu：S-100\n預計完成日：2025-01-10\n聯絡人 / Người liên lạc：王小明\n類型：K\n成本 giá thành 1500\n',
    ) as any
    expect(r.code).toBe('EXP-2025-001')
    expect(r.clientCompany).toBe('甲乙實驗有限公司')
    expect(r.fabricCode).toBe('S-100')
    expect(r.clientContact).toBe('王小明')
  })

  it('舊版標籤仍可解析（客戶公司名稱／布料代碼）', () => {
    const r = parseCommissionPDF(
      'No: EXP-2024-009\n客戶公司名稱 / Tên Cty Khách Hàng：丙丁公司\n申請日期：2024-01-02\n' +
      '布料代碼 / Mã số vải：WL-1\n客戶名稱 / Người Liên lạc：陳大明\n',
    ) as any
    expect(r.clientCompany).toBe('丙丁公司')
    expect(r.fabricCode).toBe('WL-1')
    expect(r.clientContact).toBe('陳大明')
  })
})
