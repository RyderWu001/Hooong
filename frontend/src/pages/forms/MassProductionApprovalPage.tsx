import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, DatePicker,
  Popconfirm, message, Divider, Checkbox, Row, Col, Select, Tag, Radio,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, AuditOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getMassProductionApprovals, createMassProductionApproval,
  updateMassProductionApproval, deleteMassProductionApproval,
} from '../../api/massProduction'
import { getFormulas } from '../../api/formulas'
import { getFormSignatures } from '../../api/formSignatures'
import ApprovalChain from '../../components/ApprovalChain'

const { TextArea } = Input

const TOTAL_SLOTS = 3  // 管理部 → 總經理 → 董事長

interface SpecStandards {
  appearance: string; ph: string; solidContent: string
  brix: string; density: string; casNo: string
}

interface DocVersions { zh: boolean; en: boolean; vi: boolean; date: string }

interface MPA {
  id: number; no: string | null
  newFormulaCode: string | null; oldFormulaCode: string | null
  date: string | null; dept: string | null; applicant: string | null
  productName: string | null; customerUsage: string | null
  testCode: string | null; testContent: string | null
  testTypePhysical: boolean; testTypeStability: boolean; testTypeApplication: boolean
  officialFormula: string | null
  specStandards: SpecStandards | null
  testSummary: string | null; meetsInternalSpec: string | null
  testCompletionDate: string | null
  mrsl1: string | null; mrsl2: string | null; zdhcMrsl: string | null
  zdhcLevel1Required: boolean; zdhcLevel1Result: string | null
  zdhcLevel3Required: boolean; zdhcLevel3Result: string | null
  zdhcPidCode: string | null
  sdsVersions: DocVersions | null; tdsVersions: DocVersions | null; coaResult: string | null
  otherRegulations: string | null
  massProductionDate: string | null; customerQty: string | null
  officialProductCode: string | null; officialProductName: string | null
  productionRisks: string | null
  reportDept: string | null; reportPerson: string | null
  reportDate: string | null; reportTime: string | null
  completionProductApp: boolean; completionOperation: boolean
  completionTechConsult: boolean; completionTechService: boolean; completionOther: boolean
  formulaId: number | null; createdAt: string
}

const DEFAULT_SPEC: SpecStandards = { appearance: '', ph: '', solidContent: '', brix: '', density: '', casNo: '' }
const DEFAULT_DOC: DocVersions = { zh: false, en: false, vi: false, date: '' }

function ck(v: boolean) { return v ? '☑' : '☐' }
function radio(val: string | null, opt: string) { return val === opt ? '◉' : '○' }

function printMPA(row: MPA, formulaName?: string) {
  const spec = row.specStandards ?? DEFAULT_SPEC
  const sds = row.sdsVersions ?? DEFAULT_DOC
  const tds = row.tdsVersions ?? DEFAULT_DOC

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>新配方量產核准紀錄表 CMS03-07-4A</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft JhengHei','Times New Roman',Arial,sans-serif; font-size: 10px; color: #000; padding: 8mm; }
  .outer { border: 2px solid #000; }
  .header { display: flex; align-items: center; padding: 6px 10px; border-bottom: 2px solid #000; gap: 10px; }
  .logo-brand { font-size: 22px; font-weight: 900; }
  .logo-sub { font-size: 9px; color: #333; }
  .header-center { flex: 1; text-align: center; }
  .header-center h1 { font-size: 12px; font-weight: 900; }
  .header-center h2 { font-size: 13px; font-weight: 900; margin-top: 2px; }
  .header-no { border: 1px solid #000; padding: 4px 10px; font-size: 10px; min-width: 80px; text-align: center; }
  .stamp-box { border: 1px solid #000; width: 80px; min-height: 55px; text-align: center; padding: 4px; }
  .stamp-label { font-size: 9px; }
  .stamp-sub { font-size: 8px; color: #555; }
  .section-title { background: #d9d9d9; text-align: center; font-weight: bold; font-size: 10.5px; padding: 3px; border-top: 1px solid #000; border-bottom: 1px solid #000; }
  .grid-row { display: flex; border-bottom: 1px solid #000; }
  .cell { padding: 3px 6px; border-right: 1px solid #000; font-size: 10px; }
  .cell:last-child { border-right: none; }
  .cell-label { font-size: 8.5px; color: #555; display: block; }
  .cell-value { font-size: 10px; min-height: 13px; }
  .full-row { border-bottom: 1px solid #000; padding: 3px 6px; }
  .two-col { display: flex; border-bottom: 1px solid #000; }
  .col-main { flex: 2; border-right: 1px solid #000; }
  .col-side { flex: 1; }
  .spec-table { width: 100%; border-collapse: collapse; }
  .spec-table th, .spec-table td { border: 1px solid #000; padding: 2px 4px; font-size: 9.5px; text-align: center; }
  .spec-table th { background: #e8e8e8; }
  .summary-row { border-top: 1px solid #000; border-bottom: 1px solid #000; display: flex; }
  .summary-left { flex: 2; padding: 3px 6px; border-right: 1px solid #000; }
  .summary-right { flex: 1; padding: 3px 6px; }
  .reg-section { border-top: 1px solid #000; }
  .reg-row { display: flex; border-bottom: 1px solid #000; }
  .reg-cell { flex: 1; padding: 3px 6px; border-right: 1px solid #000; font-size: 9.5px; }
  .reg-cell:last-child { border-right: none; }
  .decision-section { border-top: 1px solid #000; }
  .decision-row { display: flex; border-bottom: 1px solid #000; }
  .decision-cell { flex: 1; padding: 3px 6px; border-right: 1px solid #000; font-size: 9.5px; }
  .decision-cell:last-child { border-right: none; }
  .risk-row { border-bottom: 1px solid #000; padding: 3px 6px; min-height: 40px; font-size: 9.5px; white-space: pre-wrap; }
  .result-section { border-top: 1px solid #000; }
  .result-header { display: flex; border-bottom: 1px solid #000; background: #e8e8e8; }
  .result-h-cell { flex: 1; padding: 2px 4px; border-right: 1px solid #000; font-size: 9.5px; font-weight: bold; text-align: center; }
  .result-h-cell:last-child { border-right: none; }
  .result-row { display: flex; border-bottom: 1px solid #000; }
  .result-cell { flex: 1; padding: 4px 6px; border-right: 1px solid #000; font-size: 9.5px; }
  .result-cell:last-child { border-right: none; }
  .sig-section { border-top: 2px solid #000; }
  .sig-title { display: flex; border-bottom: 1px solid #000; }
  .sig-title-cell { flex: 1; background: #e8e8e8; text-align: center; padding: 3px; font-weight: bold; font-size: 10px; border-right: 1px solid #000; }
  .sig-title-cell:last-child { border-right: none; }
  .sig-row { display: flex; border-bottom: 1px solid #000; }
  .sig-cell { flex: 1; min-height: 45px; border-right: 1px solid #000; padding: 4px; text-align: center; }
  .sig-cell:last-child { border-right: none; }
  .sig-date-row { display: flex; }
  .sig-date-cell { flex: 1; padding: 3px 6px; border-right: 1px solid #000; font-size: 9px; text-align: center; }
  .sig-date-cell:last-child { border-right: none; }
  @media print { @page { margin: 6mm; size: A4 portrait; } }
</style>
</head>
<body>
<div class="outer">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo-brand">RICH<sup style="font-size:12px">®</sup></div>
      <div class="logo-sub">旺隆責任有限公司<br>CÔNG TY TNHH WANG LONG (VIỆT NAM)</div>
    </div>
    <div class="header-center">
      <h1>BIỂU MẪU PHÊ DUYỆT ÁP DỤNG CÔNG THỨC MỚI SẢN XUẤT ĐẠI TRÀ</h1>
      <h2>新配方量產核准紀錄表</h2>
    </div>
    <div>
      <div class="header-no">No: ${row.no ?? ''}</div>
      <div class="stamp-box" style="margin-top:4px">
        <div class="stamp-label">核 準 章</div>
        <div class="stamp-sub">無 章 無 效</div>
      </div>
    </div>
  </div>

  <!-- 基本資料 -->
  <div class="section-title">THÔNG TIN CƠ BẢN 基本資料</div>
  <div class="grid-row">
    <div class="cell" style="flex:1.5"><span class="cell-label">MÃ CÔNG THỨC MỚI 新配方編號</span><div class="cell-value">${row.newFormulaCode ?? ''}</div></div>
    <div class="cell" style="flex:1.5"><span class="cell-label">MÃ CÔNG THỨC CŨ 舊配方編號</span><div class="cell-value">${row.oldFormulaCode ?? ''}</div></div>
    <div class="cell" style="flex:1"><span class="cell-label">NGÀY 申請日期</span><div class="cell-value">${row.date ? dayjs(row.date).format('YYYY-MM-DD') : ''}</div></div>
    <div class="cell" style="flex:1"><span class="cell-label">BỘ PHẬN ĐỀ NGHỊ 申請部門</span><div class="cell-value">${row.dept ?? ''}</div></div>
    <div class="cell" style="flex:1"><span class="cell-label">NGƯỜI ĐỀ NGHỊ 申請人</span><div class="cell-value">${row.applicant ?? ''}</div></div>
  </div>
  <div class="grid-row">
    <div class="cell" style="flex:2"><span class="cell-label">TÊN SẢN PHẨM 產品名稱${formulaName ? ` (關聯配方: ${formulaName})` : ''}</span><div class="cell-value">${row.productName ?? ''}</div></div>
    <div class="cell" style="flex:3"><span class="cell-label">KHÁCH HÀNG ÁP DỤNG / MỤC ĐÍCH SỬ DỤNG 適用客戶/用途</span><div class="cell-value">${row.customerUsage ?? ''}</div></div>
  </div>

  <!-- 試驗確認 -->
  <div class="section-title">XÁC NHẬN THỬ NGHIỆM VÀ KỸ THUẬT 試驗與技術確認</div>
  <div class="grid-row">
    <div class="cell" style="flex:1.5"><span class="cell-label">MÃ THỬ NGHIỆM 試驗編號</span><div class="cell-value">${row.testCode ?? ''}</div></div>
    <div class="cell" style="flex:3"><span class="cell-label">NỘI DUNG 試驗內容</span><div class="cell-value">${row.testContent ?? ''}</div></div>
    <div class="cell" style="flex:2; font-size:9.5px">
      ${ck(row.testTypePhysical)} TÍNH CHẤT VẬT LÝ物性<br>
      ${ck(row.testTypeStability)} ĐỘ ỔN ĐỊNH穩定性<br>
      ${ck(row.testTypeApplication)} THỬ NGHIỆM ỨNG DỤNG應用測試
    </div>
  </div>
  <div class="two-col">
    <div class="col-main" style="display:flex">
      <div style="flex:1; padding:4px 6px; border-right:1px solid #000; min-height:80px">
        <span class="cell-label">CÔNG THỨC CHÍNH THỨC 正式配方</span>
        <div style="font-size:9.5px; white-space:pre-wrap; margin-top:2px">${row.officialFormula ?? ''}</div>
      </div>
      <div style="flex:0.8; padding:4px 6px; display:flex; align-items:center; justify-content:center; color:#999; font-size:9px">
        HÌNH ẢNH NGOẠI QUAN<br>外觀照片
      </div>
    </div>
    <div class="col-side" style="padding:4px 6px">
      <div style="font-size:9px; font-weight:bold; margin-bottom:4px">TIÊU CHUẨN標準</div>
      <table class="spec-table">
        <tr><th>項目</th><th>標準值</th></tr>
        <tr><td>NGOẠI QUAN 外觀</td><td>${spec.appearance}</td></tr>
        <tr><td>pH (1%aq)</td><td>${spec.ph}</td></tr>
        <tr><td>CHẤT RẮN 固成份</td><td>${spec.solidContent}</td></tr>
        <tr><td>ĐỘ(Brix) 糖度值</td><td>${spec.brix}</td></tr>
        <tr><td>TỶ TRỌNG 比重</td><td>${spec.density}</td></tr>
        <tr><td>CAS NO</td><td>${spec.casNo}</td></tr>
      </table>
    </div>
  </div>
  <div class="summary-row">
    <div class="summary-left">
      <span class="cell-label">TÓM TẮT KẾT QUẢ THỬ NGHIỆM 測試結果摘要</span>
      <div style="font-size:9.5px; white-space:pre-wrap; margin-top:2px; min-height:30px">${row.testSummary ?? ''}</div>
    </div>
    <div class="summary-right">
      <div style="font-size:9px; margin-bottom:3px">PHÙ HỢP TC NỘI BỘ 是否符合內控規格</div>
      <div style="font-size:9.5px">${radio(row.meetsInternalSpec, '符合')} PHÙ HỢP符合 &nbsp; ${radio(row.meetsInternalSpec, '不符合')} KHÔNG PHÙ HỢP不符合</div>
      <div style="font-size:9px; margin-top:6px"><span class="cell-label">NGÀY HOÀN THÀNH THỬ NGHIỆM 試驗完成日期</span>
        <div>${row.testCompletionDate ? dayjs(row.testCompletionDate).format('YYYY-MM-DD') : ''}</div>
      </div>
    </div>
  </div>

  <!-- 法規與文件確認 -->
  <div class="section-title">XÁC NHẬN PHÁP QUY VÀ TÀI LIỆU 法規與文件確認</div>
  <div class="reg-section">
    <div class="reg-row">
      <div class="reg-cell" style="flex:2">
        <strong>TÍNH ÁP DỤNG MRSL 適用性</strong><br>
        化學局限用物質清單附錄1: ${radio(row.mrsl1,'符合')} 符合 ${radio(row.mrsl1,'不適用')} 不適用<br>
        化學局限用物質清單附錄2: ${radio(row.mrsl2,'符合')} 符合 ${radio(row.mrsl2,'不適用')} 不適用<br>
        ZDHC限用物質清單: ${radio(row.zdhcMrsl,'符合')} 符合 ${radio(row.zdhcMrsl,'不適用')} 不適用
      </div>
      <div class="reg-cell" style="flex:3">
        <strong>SDS / TDS / COA</strong><br>
        SDS: ${ck(sds.zh)} 中文版 ${ck(sds.en)} 英文版 ${ck(sds.vi)} 越文版，完成日期：${sds.date}<br>
        TDS: ${ck(tds.zh)} 中文版 ${ck(tds.en)} 英文版 ${ck(tds.vi)} 越文版，完成日期：${tds.date}<br>
        COA: ${radio(row.coaResult,'合格')} 合格 ${radio(row.coaResult,'不合格')} 不合格
      </div>
    </div>
    <div class="reg-row">
      <div class="reg-cell" style="flex:2">
        <strong>TÌNH TRẠNG ZDHC Gateway 狀態</strong><br>
        ${ck(row.zdhcLevel1Required)} 需申請ZDHC Level 1: ${radio(row.zdhcLevel1Result,'通過')} 通過 ${radio(row.zdhcLevel1Result,'未通過')} 未通過<br>
        ${ck(row.zdhcLevel3Required)} 需申請ZDHC Level 3: ${radio(row.zdhcLevel3Result,'通過')} 通過 ${radio(row.zdhcLevel3Result,'未通過')} 未通過<br>
        ZDHC PID CODE: ${row.zdhcPidCode ?? ''}
      </div>
      <div class="reg-cell" style="flex:3">
        <strong>CÁC YÊU CẦU PHÁP QUY KHÁC 其他法規客戶要求說明</strong><br>
        <span style="white-space:pre-wrap">${row.otherRegulations ?? ''}</span>
      </div>
    </div>
  </div>

  <!-- 量產導入決策 -->
  <div class="section-title">QUYẾT ĐỊNH TRIỂN KHAI SẢN XUẤT ĐẠI TRÀ 量產導入決策</div>
  <div class="decision-section">
    <div class="decision-row">
      <div class="decision-cell"><span class="cell-label">NGÀY BẮT ĐẦU SX 建議量產起始日</span><div>${row.massProductionDate ? dayjs(row.massProductionDate).format('YYYY-MM-DD') : ''}</div></div>
      <div class="decision-cell"><span class="cell-label">KHÁCH HÀNG / SL 應用客戶/數量</span><div>${row.customerQty ?? ''}</div></div>
      <div class="decision-cell"><span class="cell-label">MÃ TP CHÍNH THỨC 正式成品編碼</span><div>${row.officialProductCode ?? ''}</div></div>
      <div class="decision-cell"><span class="cell-label">TÊN TP CHÍNH THỨC (CN) 正式成品中文名</span><div>${row.officialProductName ?? ''}</div></div>
    </div>
    <div class="risk-row">
      <span class="cell-label">LƯU Ý SX (RỦI RO) 量產注意事項（風險說明）</span><br>
      ${row.productionRisks ?? ''}
    </div>
  </div>

  <!-- 實際處理結果彙總 -->
  <div class="section-title">TỔNG HỢP KẾT QUẢ XỬ LÝ THỰC TẾ 實際處理結果彙總</div>
  <div class="result-section">
    <div class="result-header">
      <div class="result-h-cell" style="flex:3">ĐƠN VỊ TRÌNH BÁO 呈報單位</div>
      <div class="result-h-cell" style="flex:4">HOÀN THÀNH NỘI DUNG ĐƯỢC GIAO 完成交辦事項</div>
    </div>
    <div class="result-header" style="background:#fff; border-bottom:1px solid #000;">
      <div class="result-h-cell" style="flex:1; background:#f0f0f0">部門</div>
      <div class="result-h-cell" style="flex:1; background:#f0f0f0">呈報人</div>
      <div class="result-h-cell" style="flex:1; background:#f0f0f0">回報日期</div>
      <div class="result-h-cell" style="flex:1; background:#f0f0f0">回報時間</div>
      <div class="result-h-cell" style="flex:1; background:#f0f0f0">產品應用</div>
      <div class="result-h-cell" style="flex:1; background:#f0f0f0">操作使用</div>
      <div class="result-h-cell" style="flex:1; background:#f0f0f0">技術諮詢</div>
      <div class="result-h-cell" style="flex:1; background:#f0f0f0">技術服務</div>
      <div class="result-h-cell" style="background:#f0f0f0">其他</div>
    </div>
    <div class="result-row">
      <div class="result-cell" style="flex:1">${row.reportDept ?? ''}</div>
      <div class="result-cell" style="flex:1">${row.reportPerson ?? ''}</div>
      <div class="result-cell" style="flex:1">${row.reportDate ? dayjs(row.reportDate).format('YYYY-MM-DD') : ''}</div>
      <div class="result-cell" style="flex:1">${row.reportTime ?? ''}</div>
      <div class="result-cell" style="flex:1; text-align:center">${ck(row.completionProductApp)}</div>
      <div class="result-cell" style="flex:1; text-align:center">${ck(row.completionOperation)}</div>
      <div class="result-cell" style="flex:1; text-align:center">${ck(row.completionTechConsult)}</div>
      <div class="result-cell" style="flex:1; text-align:center">${ck(row.completionTechService)}</div>
      <div class="result-cell" style="text-align:center">${ck(row.completionOther)}</div>
    </div>
  </div>

  <!-- 簽核欄 -->
  <div class="sig-section">
    <div class="sig-title">
      <div class="sig-title-cell">CHỦ TỊCH HĐQT 董事長</div>
      <div class="sig-title-cell">TỔNG GIÁM ĐỐC 總經理</div>
      <div class="sig-title-cell">PHÒNG QUẢN LÝ 管理部</div>
    </div>
    <div class="sig-row">
      <div class="sig-cell"></div>
      <div class="sig-cell"></div>
      <div class="sig-cell"></div>
    </div>
    <div class="sig-date-row">
      <div class="sig-date-cell">年 &nbsp;&nbsp; 月 &nbsp;&nbsp; 日</div>
      <div class="sig-date-cell">年 &nbsp;&nbsp; 月 &nbsp;&nbsp; 日</div>
      <div class="sig-date-cell">年 &nbsp;&nbsp; 月 &nbsp;&nbsp; 日</div>
    </div>
  </div>

  <div style="text-align:center; font-size:8.5px; color:#555; padding:2px; border-top:1px solid #ccc">CMS03-07-4A｜泓利廣實驗室系統</div>
</div>
</body>
</html>`

  const w = window.open('', '_blank')
  if (!w) { message.error('請允許彈出視窗'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 600)
}

interface FormulaOption { id: number; code: string; name: string }

export default function MassProductionApprovalPage() {
  const [records, setRecords] = useState<MPA[]>([])
  const [sigCountMap, setSigCountMap] = useState<Record<number, number>>({})
  const [formulaOptions, setFormulaOptions] = useState<FormulaOption[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MPA | null>(null)
  const [sigTarget, setSigTarget] = useState<MPA | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMassProductionApprovals()
      const list: MPA[] = res.data.data ?? []
      setRecords(list)
      const counts: Record<number, number> = {}
      await Promise.all(list.map(async r => {
        try {
          const sigs = await getFormSignatures('MassProduction', r.id)
          counts[r.id] = (sigs ?? []).length
        } catch { counts[r.id] = 0 }
      }))
      setSigCountMap(counts)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    getFormulas({ limit: 200 }).then(res => {
      setFormulaOptions((res.data.data ?? []).map((f: any) => ({ id: f.id, code: f.code, name: f.name })))
    }).catch(() => {})
  }, [])

  function getFormulaName(id: number | null) {
    if (!id) return undefined
    const f = formulaOptions.find(o => o.id === id)
    return f ? `${f.code} ${f.name}` : undefined
  }

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  function openEdit(row: MPA) {
    setEditing(row)
    form.setFieldsValue({
      ...row,
      date: row.date ? dayjs(row.date) : null,
      testCompletionDate: row.testCompletionDate ? dayjs(row.testCompletionDate) : null,
      massProductionDate: row.massProductionDate ? dayjs(row.massProductionDate) : null,
      reportDate: row.reportDate ? dayjs(row.reportDate) : null,
      specAppearance: row.specStandards?.appearance ?? '',
      specPh: row.specStandards?.ph ?? '',
      specSolid: row.specStandards?.solidContent ?? '',
      specBrix: row.specStandards?.brix ?? '',
      specDensity: row.specStandards?.density ?? '',
      specCasNo: row.specStandards?.casNo ?? '',
      sdsZh: row.sdsVersions?.zh ?? false,
      sdsEn: row.sdsVersions?.en ?? false,
      sdsVi: row.sdsVersions?.vi ?? false,
      sdsDate: row.sdsVersions?.date ?? '',
      tdsZh: row.tdsVersions?.zh ?? false,
      tdsEn: row.tdsVersions?.en ?? false,
      tdsVi: row.tdsVersions?.vi ?? false,
      tdsDate: row.tdsVersions?.date ?? '',
    })
    setModalOpen(true)
  }

  async function handleOk() {
    try {
      const v = await form.validateFields()
      const payload = {
        ...v,
        date: v.date?.toISOString() ?? null,
        testCompletionDate: v.testCompletionDate?.toISOString() ?? null,
        massProductionDate: v.massProductionDate?.toISOString() ?? null,
        reportDate: v.reportDate?.toISOString() ?? null,
        specStandards: {
          appearance: v.specAppearance ?? '',
          ph: v.specPh ?? '',
          solidContent: v.specSolid ?? '',
          brix: v.specBrix ?? '',
          density: v.specDensity ?? '',
          casNo: v.specCasNo ?? '',
        },
        sdsVersions: { zh: !!v.sdsZh, en: !!v.sdsEn, vi: !!v.sdsVi, date: v.sdsDate ?? '' },
        tdsVersions: { zh: !!v.tdsZh, en: !!v.tdsEn, vi: !!v.tdsVi, date: v.tdsDate ?? '' },
      }
      if (editing) {
        await updateMassProductionApproval(editing.id, payload)
        message.success('已更新')
      } else {
        await createMassProductionApproval(payload)
        message.success('已建立')
      }
      setModalOpen(false)
      load()
    } catch (e: any) {
      if (e?.errorFields) return
      message.error('儲存失敗')
    }
  }

  async function handleDelete(id: number) {
    try { await deleteMassProductionApproval(id); message.success('已刪除'); load() }
    catch { message.error('刪除失敗') }
  }

  const columns: ColumnsType<MPA> = [
    { title: 'No', dataIndex: 'no', key: 'no', width: 160, render: v => v ?? '-' },
    { title: '申請日期', dataIndex: 'date', key: 'date', width: 110, render: v => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
    { title: '產品名稱', dataIndex: 'productName', key: 'productName', render: v => v ?? '-' },
    { title: '新配方編號', dataIndex: 'newFormulaCode', key: 'newFormulaCode', width: 130, render: v => v ?? '-' },
    { title: '申請人', dataIndex: 'applicant', key: 'applicant', width: 90, render: v => v ?? '-' },
    {
      title: '關聯配方', dataIndex: 'formulaId', key: 'formulaId', width: 160,
      render: (id: number | null) => {
        const name = getFormulaName(id)
        return name ? <Tag color="blue">{name}</Tag> : <span style={{ color: '#64748b' }}>未關聯</span>
      },
    },
    {
      title: '審核狀態', key: 'status', width: 130,
      render: (_, row) => {
        const count = sigCountMap[row.id] ?? 0
        if (count >= TOTAL_SLOTS) return <Tag color="success">核准完成 {count}/{TOTAL_SLOTS}</Tag>
        if (count > 0) return <Tag color="processing">審核中 {count}/{TOTAL_SLOTS}</Tag>
        return <Tag color="default">待審核</Tag>
      },
    },
    {
      title: '操作', key: 'action', width: 160, fixed: 'right',
      render: (_, row) => (
        <Space size="small">
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printMPA(row, getFormulaName(row.formulaId))}>列印</Button>
          <Button size="small" icon={<AuditOutlined />} onClick={() => setSigTarget(row)}>簽核</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>編輯</Button>
          <Popconfirm title="確定刪除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>刪除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="新配方量產核准紀錄表 (CMS03-07-4A)"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增記錄</Button>}
    >
      <Table rowKey="id" columns={columns} dataSource={records} loading={loading} scroll={{ x: 1100 }} pagination={{ pageSize: 20 }} />

      {/* 建立/編輯 Modal */}
      <Modal
        title={editing ? '編輯量產核准記錄' : '新增量產核准記錄'}
        open={modalOpen} onOk={handleOk} onCancel={() => setModalOpen(false)}
        width={860} okText="儲存" cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Divider>基本資料</Divider>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="No (文件編號)" name="no"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="新配方編號" name="newFormulaCode"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="舊配方編號" name="oldFormulaCode"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="申請日期" name="date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="申請部門" name="dept"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="申請人" name="applicant"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item label="產品名稱" name="productName"><Input /></Form.Item></Col>
            <Col span={12}>
              <Form.Item label="關聯配方" name="formulaId" help="選擇系統中對應的配方記錄">
                <Select showSearch allowClear placeholder="搜尋配方..."
                  filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={formulaOptions.map(f => ({ value: f.id, label: `${f.code} - ${f.name}` }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="適用客戶/用途" name="customerUsage"><Input /></Form.Item>

          <Divider>試驗與技術確認</Divider>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="試驗編號" name="testCode"><Input /></Form.Item></Col>
            <Col span={16}><Form.Item label="試驗內容" name="testContent"><Input /></Form.Item></Col>
          </Row>
          <Form.Item label="試驗類型">
            <Space>
              <Form.Item name="testTypePhysical" valuePropName="checked" noStyle><Checkbox>物性 (TÍNH CHẤT VẬT LÝ)</Checkbox></Form.Item>
              <Form.Item name="testTypeStability" valuePropName="checked" noStyle><Checkbox>穩定性 (ĐỘ ỔN ĐỊNH)</Checkbox></Form.Item>
              <Form.Item name="testTypeApplication" valuePropName="checked" noStyle><Checkbox>應用測試 (THỬ NGHIỆM ỨNG DỤNG)</Checkbox></Form.Item>
            </Space>
          </Form.Item>
          <Form.Item label="正式配方 (CÔNG THỨC CHÍNH THỨC)" name="officialFormula">
            <TextArea rows={4} />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 12 }}>規格標準 (TIÊU CHUẨN)</Divider>
          <Row gutter={12}>
            <Col span={8}><Form.Item label="外觀 (NGOẠI QUAN)" name="specAppearance"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="pH (1%aq)" name="specPh"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="固成份 (CHẤT RẮN)" name="specSolid"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}><Form.Item label="糖度值 ĐỘ(Brix)" name="specBrix"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="比重 (TỶ TRỌNG)" name="specDensity"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="CAS NO" name="specCasNo"><Input /></Form.Item></Col>
          </Row>

          <Form.Item label="測試結果摘要" name="testSummary"><TextArea rows={3} /></Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="是否符合內控規格" name="meetsInternalSpec">
                <Radio.Group>
                  <Radio value="符合">符合 (PHÙ HỢP)</Radio>
                  <Radio value="不符合">不符合 (KHÔNG PHÙ HỢP)</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="試驗完成日期" name="testCompletionDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>

          <Divider>法規與文件確認</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="化學局限用物質清單附錄1" name="mrsl1">
                <Radio.Group><Radio value="符合">符合</Radio><Radio value="不適用">不適用</Radio></Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="化學局限用物質清單附錄2" name="mrsl2">
                <Radio.Group><Radio value="符合">符合</Radio><Radio value="不適用">不適用</Radio></Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="ZDHC限用物質清單" name="zdhcMrsl">
                <Radio.Group><Radio value="符合">符合</Radio><Radio value="不適用">不適用</Radio></Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Form.Item name="zdhcLevel1Required" valuePropName="checked" noStyle><Checkbox>需申請ZDHC Level 1</Checkbox></Form.Item>
                  <Form.Item name="zdhcLevel1Result" noStyle>
                    <Radio.Group><Radio value="通過">通過</Radio><Radio value="未通過">未通過</Radio></Radio.Group>
                  </Form.Item>
                </Space>
                <Space>
                  <Form.Item name="zdhcLevel3Required" valuePropName="checked" noStyle><Checkbox>需申請ZDHC Level 3</Checkbox></Form.Item>
                  <Form.Item name="zdhcLevel3Result" noStyle>
                    <Radio.Group><Radio value="通過">通過</Radio><Radio value="未通過">未通過</Radio></Radio.Group>
                  </Form.Item>
                </Space>
                <Form.Item label="ZDHC PID CODE" name="zdhcPidCode" style={{ marginBottom: 0 }}><Input /></Form.Item>
              </Space>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ marginBottom: 4, color: '#94a3b8', fontSize: 12 }}>SDS 版本</div>
                <Space>
                  <Form.Item name="sdsZh" valuePropName="checked" noStyle><Checkbox>中文版</Checkbox></Form.Item>
                  <Form.Item name="sdsEn" valuePropName="checked" noStyle><Checkbox>英文版</Checkbox></Form.Item>
                  <Form.Item name="sdsVi" valuePropName="checked" noStyle><Checkbox>越文版</Checkbox></Form.Item>
                  <Form.Item name="sdsDate" noStyle><Input size="small" placeholder="完成日期" style={{ width: 100 }} /></Form.Item>
                </Space>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ marginBottom: 4, color: '#94a3b8', fontSize: 12 }}>TDS 版本</div>
                <Space>
                  <Form.Item name="tdsZh" valuePropName="checked" noStyle><Checkbox>中文版</Checkbox></Form.Item>
                  <Form.Item name="tdsEn" valuePropName="checked" noStyle><Checkbox>英文版</Checkbox></Form.Item>
                  <Form.Item name="tdsVi" valuePropName="checked" noStyle><Checkbox>越文版</Checkbox></Form.Item>
                  <Form.Item name="tdsDate" noStyle><Input size="small" placeholder="完成日期" style={{ width: 100 }} /></Form.Item>
                </Space>
              </div>
              <Form.Item label="COA" name="coaResult">
                <Radio.Group><Radio value="合格">合格</Radio><Radio value="不合格">不合格</Radio></Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="其他法規/客戶要求說明" name="otherRegulations"><TextArea rows={2} /></Form.Item>

          <Divider>量產導入決策</Divider>
          <Row gutter={16}>
            <Col span={8}><Form.Item label="建議量產起始日" name="massProductionDate"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={8}><Form.Item label="應用客戶/數量" name="customerQty"><Input /></Form.Item></Col>
            <Col span={8}><Form.Item label="正式成品編碼" name="officialProductCode"><Input /></Form.Item></Col>
          </Row>
          <Form.Item label="正式成品中文名" name="officialProductName"><Input /></Form.Item>
          <Form.Item label="量產注意事項（風險說明）" name="productionRisks"><TextArea rows={3} /></Form.Item>

          <Divider>實際處理結果彙總</Divider>
          <Row gutter={16}>
            <Col span={6}><Form.Item label="呈報部門" name="reportDept"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item label="呈報人" name="reportPerson"><Input /></Form.Item></Col>
            <Col span={6}><Form.Item label="回報日期" name="reportDate"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={6}><Form.Item label="回報時間" name="reportTime"><Input placeholder="例: 14:30" /></Form.Item></Col>
          </Row>
          <Form.Item label="完成交辦事項">
            <Space>
              <Form.Item name="completionProductApp" valuePropName="checked" noStyle><Checkbox>產品應用</Checkbox></Form.Item>
              <Form.Item name="completionOperation" valuePropName="checked" noStyle><Checkbox>操作使用</Checkbox></Form.Item>
              <Form.Item name="completionTechConsult" valuePropName="checked" noStyle><Checkbox>技術諮詢</Checkbox></Form.Item>
              <Form.Item name="completionTechService" valuePropName="checked" noStyle><Checkbox>技術服務</Checkbox></Form.Item>
              <Form.Item name="completionOther" valuePropName="checked" noStyle><Checkbox>其他</Checkbox></Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 簽核 Modal */}
      <Modal
        title={`簽核 - 量產核准 #${sigTarget?.id ?? ''}${sigTarget?.no ? ` (${sigTarget.no})` : ''}`}
        open={!!sigTarget} onCancel={() => { setSigTarget(null); load() }} footer={null} width={700}
      >
        {sigTarget && (
          <ApprovalChain formType="MassProduction" formId={sigTarget.id} onUpdate={load} />
        )}
      </Modal>
    </Card>
  )
}
