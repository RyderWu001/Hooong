import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, DatePicker,
  Popconfirm, message, Divider, Select, Checkbox, Radio,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, AuditOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getChemicalEvaluations, createChemicalEvaluation, updateChemicalEvaluation, deleteChemicalEvaluation,
} from '../../api/chemicalForms'
import ApprovalChain from '../../components/ApprovalChain'

const { TextArea } = Input

const CERT_OPTIONS = [
  'ZDHC MRSL', 'Bluesign', 'REACH', 'OEKO-TEX', 'GHS', 'ISO 9001', 'ISO 14001', '越南當地法規',
]

const YES_NO_OPTIONS = [
  { value: 'YES', label: 'YES' },
  { value: 'NO', label: 'NO' },
  { value: 'N/A', label: 'N/A' },
]

interface SubstanceRow { name: string; casNo: string; percentage: string }

interface ChemEval {
  id: number
  no: string | null
  date: string | null
  supplierCode: string | null
  supplierName: string | null
  chemicalName: string | null
  batchNo: string | null
  unitPrice: string | null
  usage: string | null
  certifications: string[] | null
  hazardClassification: string | null
  substanceType: string | null
  pureSubstance: SubstanceRow[] | null
  mixtures: SubstanceRow[] | null
  cod: string | null
  bod: string | null
  phWater: string | null
  appearance: string | null
  solidContent: string | null
  ph1pct: string | null
  density: string | null
  sugarDegree: string | null
  ionProperty: string | null
  testRecord: string | null
  solidPhoto: string | null
  zdhcMrsl: string | null
  chemAppendix1: string | null
  chemAppendix2: string | null
  result: string | null
  issue: string | null
  notes: string | null
  conclusion: string | null
  createdAt: string
}

const DEFAULT_SUBSTANCE_ROWS: SubstanceRow[] = Array(4).fill(null).map(() => ({ name: '', casNo: '', percentage: '' }))

function cb(val: string | null | undefined): string {
  return val === 'YES' ? '☑ YES  ☐ NO' : val === 'NO' ? '☐ YES  ☑ NO' : '☐ YES  ☐ NO'
}

function printEvaluation(row: ChemEval) {
  const certs = row.certifications ?? []
  const certCheck = (c: string) => certs.includes(c) ? '☑' : '☐'
  const pure = row.pureSubstance ?? DEFAULT_SUBSTANCE_ROWS
  const mix = row.mixtures ?? DEFAULT_SUBSTANCE_ROWS

  const pureRows = pure.map(r => `<tr><td>${r.name}</td><td>${r.casNo}</td><td>${r.percentage}</td></tr>`).join('')
  const mixRows = mix.map(r => `<tr><td>${r.name}</td><td>${r.casNo}</td><td>${r.percentage}</td></tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>化學品評估表 CMS01-01-1B</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft JhengHei','Noto Sans TC',Arial,sans-serif; font-size: 10.5px; color: #000; padding: 10mm; }
  .outer { border: 2px solid #000; }
  .header { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
  .header-logo { width: 140px; min-width: 140px; border-right: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; }
  .logo-brand { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
  .logo-sub { font-size: 9px; color: #333; margin-top: 2px; }
  .header-title { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; padding: 6px; }
  .header-title h1 { font-size: 14px; font-weight: 900; }
  .header-title h2 { font-size: 12px; font-weight: bold; margin-top: 2px; }
  .header-right { width: 160px; min-width: 160px; border-left: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .header-right .field { font-size: 10px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .section { border-top: 1px solid #000; }
  .section-title { background: #e8e8e8; padding: 3px 6px; font-weight: bold; font-size: 10.5px; border-bottom: 1px solid #000; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
  .info-cell { padding: 4px 8px; border-right: 1px solid #000; border-bottom: 1px solid #000; font-size: 10px; }
  .info-cell:nth-child(3n) { border-right: none; }
  .info-label { color: #555; font-size: 9px; margin-bottom: 1px; }
  .info-value { font-size: 10.5px; min-height: 14px; }
  .cert-grid { padding: 4px 8px; display: flex; flex-wrap: wrap; gap: 8px; border-bottom: 1px solid #000; }
  .cert-item { font-size: 10px; white-space: nowrap; }
  .hazard-row { display: flex; border-top: 1px solid #000; }
  .hazard-left { flex: 6; padding: 4px 8px; border-right: 1px solid #000; }
  .hazard-right { flex: 4; padding: 4px 8px; font-size: 9px; color: #555; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #000; padding: 3px 5px; text-align: center; }
  th { background: #e8e8e8; font-size: 9.5px; }
  td.left { text-align: left; }
  .substance-row { display: flex; border-top: 1px solid #000; }
  .substance-half { flex: 1; padding: 4px 8px; }
  .substance-half:first-child { border-right: 1px solid #000; }
  .lab-row { display: flex; border-top: 1px solid #000; }
  .lab-col { flex: 1; border-right: 1px solid #000; padding: 4px 8px; }
  .lab-col:last-child { border-right: none; }
  .lab-field { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; border-bottom: 1px solid #eee; }
  .test-record-row { display: flex; border-top: 1px solid #000; }
  .test-record-half { flex: 1; padding: 4px 8px; border-right: 1px solid #000; }
  .test-record-half:last-child { border-right: none; }
  .restricted-row { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 1px solid #000; }
  .restricted-cell { padding: 4px 8px; border-right: 1px solid #000; font-size: 10px; }
  .restricted-cell:last-child { border-right: none; }
  .result-row { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #000; }
  .result-cell { padding: 4px 8px; border-right: 1px solid #000; min-height: 40px; }
  .result-cell:last-child { border-right: none; }
  .notes-row { border-top: 1px solid #000; padding: 4px 8px; min-height: 36px; }
  .conclusion-row { border-top: 1px solid #000; padding: 4px 8px; min-height: 30px; }
  .sig-row { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 2px solid #000; }
  .sig-cell { padding: 4px 8px; border-right: 1px solid #000; min-height: 50px; text-align: center; }
  .sig-cell:last-child { border-right: none; }
  .sig-label { font-size: 9.5px; font-weight: bold; margin-bottom: 4px; }
  .footer { text-align: center; font-size: 9px; color: #555; padding: 3px; border-top: 1px solid #ccc; }
  @media print { @page { margin: 8mm; size: A4 portrait; } }
</style>
</head>
<body>
<div class="outer">
  <!-- Header -->
  <div class="header">
    <div class="header-logo">
      <div class="logo-brand">RICH<sup>®</sup></div>
      <div class="logo-sub">旺隆責任有限公司</div>
    </div>
    <div class="header-title">
      <h1>PHIẾU ĐÁNH GIÁ HÓA CHẤT</h1>
      <h2>化學品評估表</h2>
    </div>
    <div class="header-right">
      <div class="field"><strong>No:</strong> ${row.no ?? ''}</div>
      <div class="field"><strong>DATE:</strong> ${row.date ? dayjs(row.date).format('YYYY-MM-DD') : ''}</div>
    </div>
  </div>

  <!-- 化學品基本資訊 -->
  <div class="section">
    <div class="section-title">化學品基本資訊 / THÔNG TIN CƠ BẢN HÓA CHẤT</div>
    <div class="info-grid">
      <div class="info-cell"><div class="info-label">MÃ NCC / 供應商代號</div><div class="info-value">${row.supplierCode ?? ''}</div></div>
      <div class="info-cell"><div class="info-label">TÊN NCC / 供應商名稱</div><div class="info-value">${row.supplierName ?? ''}</div></div>
      <div class="info-cell"><div class="info-label">TÊN HÓA CHẤT / 化學品名稱</div><div class="info-value">${row.chemicalName ?? ''}</div></div>
      <div class="info-cell"><div class="info-label">SỐ LÔ / 批號</div><div class="info-value">${row.batchNo ?? ''}</div></div>
      <div class="info-cell"><div class="info-label">GIÁ TIỀN / 單價</div><div class="info-value">${row.unitPrice ?? ''}</div></div>
      <div class="info-cell"><div class="info-label">SỬ DỤNG / 用途</div><div class="info-value">${row.usage ?? ''}</div></div>
    </div>
    <div class="cert-grid">
      <strong style="font-size:9.5px;margin-right:8px">相關認證 / CHỨNG NHẬN:</strong>
      ${CERT_OPTIONS.map(c => `<span class="cert-item">${certCheck(c)} ${c}</span>`).join('')}
    </div>
  </div>

  <!-- 危害辨識 -->
  <div class="section">
    <div class="section-title">危害辨識資料 / NHẬN DẠNG MỐI NGUY HIỂM</div>
    <div class="hazard-row">
      <div class="hazard-left">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:3px">化學品危害分類 / Phân loại nguy hiểm hóa chất:</div>
        <div style="white-space:pre-wrap;min-height:60px;font-size:10px">${row.hazardClassification ?? ''}</div>
      </div>
      <div class="hazard-right">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:3px">GHS 圖示 / Biểu tượng GHS:</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font-size:9px;text-align:center">
          <div style="border:1px solid #999;padding:3px">爆炸物<br>GHS01</div>
          <div style="border:1px solid #999;padding:3px">易燃物<br>GHS02</div>
          <div style="border:1px solid #999;padding:3px">氧化性<br>GHS03</div>
          <div style="border:1px solid #999;padding:3px">加壓氣體<br>GHS04</div>
          <div style="border:1px solid #999;padding:3px">腐蝕性<br>GHS05</div>
          <div style="border:1px solid #999;padding:3px">急性毒性<br>GHS06</div>
          <div style="border:1px solid #999;padding:3px">健康危害<br>GHS07</div>
          <div style="border:1px solid #999;padding:3px">環境危害<br>GHS08</div>
          <div style="border:1px solid #999;padding:3px">感嘆號<br>GHS09</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 成分辨認 -->
  <div class="section">
    <div class="section-title">成分辨認資料 / NHẬN DẠNG THÀNH PHẦN</div>
    <div style="padding:4px 8px;border-bottom:1px solid #000;font-size:10px">
      物質類型 / Loại chất:
      &nbsp;&nbsp;${row.substanceType === 'pure' ? '☑' : '☐'} 純物質 / Chất tinh khiết
      &nbsp;&nbsp;&nbsp;${row.substanceType === 'mixture' ? '☑' : '☐'} 混合物 / Hỗn hợp
    </div>
    <div class="substance-row">
      <div class="substance-half">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:4px">純物質 / Chất tinh khiết</div>
        <table>
          <thead><tr><th>化學名 / Tên hóa học</th><th>CAS No.</th><th>純度 / Độ tinh khiết %</th></tr></thead>
          <tbody>${pureRows}</tbody>
        </table>
      </div>
      <div class="substance-half">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:4px">混合物 / Hỗn hợp</div>
        <table>
          <thead><tr><th>成分名 / Tên thành phần</th><th>CAS No.</th><th>含量 / Hàm lượng %</th></tr></thead>
          <tbody>${mixRows}</tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- 化驗室試驗 -->
  <div class="section">
    <div class="section-title">化驗室試驗 / KẾT QUẢ THÍ NGHIỆM PHÒNG THÍ NGHIỆM</div>
    <div class="lab-row">
      <div class="lab-col">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:3px">廢水處理 / Xử lý nước thải</div>
        <div class="lab-field"><span>COD (mg/L)</span><span>${row.cod ?? '____'}</span></div>
        <div class="lab-field"><span>BOD (mg/L)</span><span>${row.bod ?? '____'}</span></div>
        <div class="lab-field"><span>PH 水 / nước</span><span>${row.phWater ?? '____'}</span></div>
      </div>
      <div class="lab-col">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:3px">進料檢驗 / Kiểm tra nguyên liệu</div>
        <div class="lab-field"><span>外觀 / Ngoại quan</span><span>${row.appearance ?? '____'}</span></div>
        <div class="lab-field"><span>固成分 / Hàm lượng rắn %</span><span>${row.solidContent ?? '____'}</span></div>
        <div class="lab-field"><span>PH (1%)</span><span>${row.ph1pct ?? '____'}</span></div>
      </div>
      <div class="lab-col">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:3px">其他 / Khác</div>
        <div class="lab-field"><span>比重 / Tỷ trọng</span><span>${row.density ?? '____'}</span></div>
        <div class="lab-field"><span>醣度 / Độ đường</span><span>${row.sugarDegree ?? '____'}</span></div>
        <div class="lab-field"><span>離子性 / Tính ion</span><span>${row.ionProperty ?? '____'}</span></div>
      </div>
    </div>
    <div class="test-record-row">
      <div class="test-record-half">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:3px">試驗紀錄 / Hồ sơ thí nghiệm:</div>
        <div style="white-space:pre-wrap;min-height:50px;font-size:10px">${row.testRecord ?? ''}</div>
      </div>
      <div class="test-record-half">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:3px">固化物圖片 / Hình ảnh chất rắn:</div>
        <div style="min-height:50px;font-size:10px">${row.solidPhoto ?? ''}</div>
      </div>
    </div>
  </div>

  <!-- 限用物質 -->
  <div class="section">
    <div class="section-title">限用物質 / CHẤT HẠN CHẾ SỬ DỤNG</div>
    <div class="restricted-row">
      <div class="restricted-cell">
        <div style="font-weight:bold;font-size:9.5px;margin-bottom:3px">ZDHC MRSL</div>
        ${cb(row.zdhcMrsl)}
      </div>
      <div class="restricted-cell">
        <div style="font-weight:bold;font-size:9.5px;margin-bottom:3px">化學品附錄 1 / Phụ lục hóa chất 1</div>
        ${cb(row.chemAppendix1)}
      </div>
      <div class="restricted-cell">
        <div style="font-weight:bold;font-size:9.5px;margin-bottom:3px">化學品附錄 2 / Phụ lục hóa chất 2</div>
        ${cb(row.chemAppendix2)}
      </div>
    </div>
  </div>

  <!-- 結果/問題點 -->
  <div class="section">
    <div class="section-title">結果與問題點 / KẾT QUẢ VÀ VẤN ĐỀ</div>
    <div class="result-row">
      <div class="result-cell">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:3px">結果 / Kết quả:</div>
        <div style="white-space:pre-wrap;font-size:10px">${row.result ?? ''}</div>
      </div>
      <div class="result-cell">
        <div style="font-size:9.5px;font-weight:bold;margin-bottom:3px">問題點 / Vấn đề:</div>
        <div style="white-space:pre-wrap;font-size:10px">${row.issue ?? ''}</div>
      </div>
    </div>
  </div>

  <!-- 備註 -->
  <div class="notes-row">
    <div style="font-size:9.5px;font-weight:bold;margin-bottom:2px">備註 / Ghi chú:</div>
    <div style="white-space:pre-wrap;font-size:10px">${row.notes ?? ''}</div>
  </div>

  <!-- 結論 -->
  <div class="conclusion-row" style="border-top:1px solid #000">
    <div style="font-size:9.5px;font-weight:bold;margin-bottom:2px">結論 / Kết luận:</div>
    <div style="white-space:pre-wrap;font-size:10px">${row.conclusion ?? ''}</div>
  </div>

  <!-- 簽名 -->
  <div class="sig-row">
    <div class="sig-cell"><div class="sig-label">總經理 / Tổng giám đốc</div></div>
    <div class="sig-cell"><div class="sig-label">管理部 / Bộ phận quản lý</div></div>
    <div class="sig-cell"><div class="sig-label">技術經理 / Kỹ thuật trưởng</div></div>
    <div class="sig-cell"><div class="sig-label">填表人 / Người lập phiếu</div></div>
  </div>

  <!-- 頁腳 -->
  <div class="footer">(附件8) CMS01-01-1B 化學品評估表</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function ChemicalEvaluationPage() {
  const [list, setList] = useState<ChemEval[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChemEval | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [pureRows, setPureRows] = useState<SubstanceRow[]>(DEFAULT_SUBSTANCE_ROWS)
  const [mixRows, setMixRows] = useState<SubstanceRow[]>(DEFAULT_SUBSTANCE_ROWS)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [approvalRecord, setApprovalRecord] = useState<ChemEval | null>(null)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getChemicalEvaluations({ page: p, limit: 20 })
      setList(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs(), substanceType: 'mixture' })
    setPureRows(DEFAULT_SUBSTANCE_ROWS.map(r => ({ ...r })))
    setMixRows(DEFAULT_SUBSTANCE_ROWS.map(r => ({ ...r })))
    setModalOpen(true)
  }

  const openEdit = (row: ChemEval) => {
    setEditing(row)
    form.setFieldsValue({
      no: row.no ?? '',
      date: row.date ? dayjs(row.date) : null,
      supplierCode: row.supplierCode ?? '',
      supplierName: row.supplierName ?? '',
      chemicalName: row.chemicalName ?? '',
      batchNo: row.batchNo ?? '',
      unitPrice: row.unitPrice ?? '',
      usage: row.usage ?? '',
      certifications: row.certifications ?? [],
      hazardClassification: row.hazardClassification ?? '',
      substanceType: row.substanceType ?? 'mixture',
      cod: row.cod ?? '',
      bod: row.bod ?? '',
      phWater: row.phWater ?? '',
      appearance: row.appearance ?? '',
      solidContent: row.solidContent ?? '',
      ph1pct: row.ph1pct ?? '',
      density: row.density ?? '',
      sugarDegree: row.sugarDegree ?? '',
      ionProperty: row.ionProperty ?? '',
      testRecord: row.testRecord ?? '',
      solidPhoto: row.solidPhoto ?? '',
      zdhcMrsl: row.zdhcMrsl ?? undefined,
      chemAppendix1: row.chemAppendix1 ?? undefined,
      chemAppendix2: row.chemAppendix2 ?? undefined,
      result: row.result ?? '',
      issue: row.issue ?? '',
      notes: row.notes ?? '',
      conclusion: row.conclusion ?? '',
    })
    setPureRows(row.pureSubstance?.length ? row.pureSubstance : DEFAULT_SUBSTANCE_ROWS.map(r => ({ ...r })))
    setMixRows(row.mixtures?.length ? row.mixtures : DEFAULT_SUBSTANCE_ROWS.map(r => ({ ...r })))
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        no: values.no || null,
        date: values.date ? values.date.format('YYYY-MM-DD') : null,
        supplierCode: values.supplierCode || null,
        supplierName: values.supplierName || null,
        chemicalName: values.chemicalName || null,
        batchNo: values.batchNo || null,
        unitPrice: values.unitPrice || null,
        usage: values.usage || null,
        certifications: values.certifications ?? [],
        hazardClassification: values.hazardClassification || null,
        substanceType: values.substanceType || null,
        pureSubstance: pureRows,
        mixtures: mixRows,
        cod: values.cod || null,
        bod: values.bod || null,
        phWater: values.phWater || null,
        appearance: values.appearance || null,
        solidContent: values.solidContent || null,
        ph1pct: values.ph1pct || null,
        density: values.density || null,
        sugarDegree: values.sugarDegree || null,
        ionProperty: values.ionProperty || null,
        testRecord: values.testRecord || null,
        solidPhoto: values.solidPhoto || null,
        zdhcMrsl: values.zdhcMrsl || null,
        chemAppendix1: values.chemAppendix1 || null,
        chemAppendix2: values.chemAppendix2 || null,
        result: values.result || null,
        issue: values.issue || null,
        notes: values.notes || null,
        conclusion: values.conclusion || null,
      }
      if (editing) {
        await updateChemicalEvaluation(editing.id, payload)
        message.success('已更新')
      } else {
        await createChemicalEvaluation(payload)
        message.success('已新增')
      }
      setModalOpen(false)
      load(page)
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteChemicalEvaluation(id); message.success('已刪除'); load(page) }
    catch { message.error('刪除失敗') }
  }

  const updatePureRow = (idx: number, field: keyof SubstanceRow, val: string) => {
    setPureRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }
  const updateMixRow = (idx: number, field: keyof SubstanceRow, val: string) => {
    setMixRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const columns: ColumnsType<ChemEval> = [
    { title: 'No', dataIndex: 'no', key: 'no', width: 80, render: v => v ?? '—' },
    { title: '化學品名稱', dataIndex: 'chemicalName', key: 'chemicalName', render: v => v ?? '—' },
    { title: '供應商', dataIndex: 'supplierName', key: 'supplierName', width: 140, render: v => v ?? '—' },
    {
      title: '日期', dataIndex: 'date', key: 'date', width: 110,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    {
      title: '操作', key: 'actions', width: 220,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<AuditOutlined />} onClick={() => { setApprovalRecord(row); setApprovalOpen(true) }}>簽核</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printEvaluation(row)}>列印</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="確定刪除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const subTableHeader = (
    <tr style={{ background: '#162032' }}>
      {['成分/化學名', 'CAS No.', '含量/純度 %'].map(h => (
        <th key={h} style={{ padding: '3px 6px', borderBottom: '1px solid #2d3f55', fontSize: 11, fontWeight: 'normal', color: '#94a3b8', textAlign: 'center' }}>{h}</th>
      ))}
    </tr>
  )

  return (
    <Card
      title={<Space><AuditOutlined />化學品評估表 (CMS01-01-1B)</Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增評估表</Button>}
    >
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: t => `共 ${t} 筆` }}
        size="small"
      />

      <Modal
        open={modalOpen}
        title={editing ? '編輯化學品評估表' : '新增化學品評估表'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
        width={860}
        styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          {/* 基本資訊 */}
          <Divider plain style={{ margin: '0 0 8px', fontSize: 12 }}>基本資訊</Divider>
          <Space wrap size={8} style={{ width: '100%' }}>
            <Form.Item name="no" label="No" style={{ width: 100 }}>
              <Input placeholder="編號" />
            </Form.Item>
            <Form.Item name="date" label="日期">
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="supplierCode" label="供應商代號" style={{ width: 130 }}>
              <Input />
            </Form.Item>
            <Form.Item name="supplierName" label="供應商名稱" style={{ width: 160 }}>
              <Input />
            </Form.Item>
            <Form.Item name="chemicalName" label="化學品名稱" style={{ width: 180 }}>
              <Input />
            </Form.Item>
            <Form.Item name="batchNo" label="批號" style={{ width: 120 }}>
              <Input />
            </Form.Item>
            <Form.Item name="unitPrice" label="單價" style={{ width: 110 }}>
              <Input />
            </Form.Item>
            <Form.Item name="usage" label="用途" style={{ width: 160 }}>
              <Input />
            </Form.Item>
          </Space>

          {/* 相關認證 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>相關認證</Divider>
          <Form.Item name="certifications">
            <Checkbox.Group options={CERT_OPTIONS} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }} />
          </Form.Item>

          {/* 危害辨識 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>危害辨識</Divider>
          <Form.Item name="hazardClassification" label="化學品危害分類">
            <TextArea rows={3} placeholder="請描述危害分類..." />
          </Form.Item>

          {/* 成分辨認 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>成分辨認資料</Divider>
          <Form.Item name="substanceType" label="物質類型">
            <Radio.Group>
              <Radio value="pure">純物質 / Chất tinh khiết</Radio>
              <Radio value="mixture">混合物 / Hỗn hợp</Radio>
            </Radio.Group>
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>純物質 / Chất tinh khiết</div>
              <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>{subTableHeader}</thead>
                  <tbody>
                    {pureRows.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #2d3f55' }}>
                        {(['name', 'casNo', 'percentage'] as const).map(f => (
                          <td key={f} style={{ padding: '2px 4px' }}>
                            <Input size="small" value={r[f]} onChange={e => updatePureRow(i, f, e.target.value)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button size="small" style={{ marginTop: 4 }} onClick={() => setPureRows(p => [...p, { name: '', casNo: '', percentage: '' }])}>+ 新增列</Button>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>混合物 / Hỗn hợp</div>
              <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>{subTableHeader}</thead>
                  <tbody>
                    {mixRows.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #2d3f55' }}>
                        {(['name', 'casNo', 'percentage'] as const).map(f => (
                          <td key={f} style={{ padding: '2px 4px' }}>
                            <Input size="small" value={r[f]} onChange={e => updateMixRow(i, f, e.target.value)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button size="small" style={{ marginTop: 4 }} onClick={() => setMixRows(p => [...p, { name: '', casNo: '', percentage: '' }])}>+ 新增列</Button>
            </div>
          </div>

          {/* 化驗室試驗 */}
          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>化驗室試驗</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>廢水處理</div>
              <Form.Item name="cod" label="COD (mg/L)" style={{ marginBottom: 6 }}><Input size="small" /></Form.Item>
              <Form.Item name="bod" label="BOD (mg/L)" style={{ marginBottom: 6 }}><Input size="small" /></Form.Item>
              <Form.Item name="phWater" label="PH 水" style={{ marginBottom: 0 }}><Input size="small" /></Form.Item>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>進料檢驗</div>
              <Form.Item name="appearance" label="外觀" style={{ marginBottom: 6 }}><Input size="small" /></Form.Item>
              <Form.Item name="solidContent" label="固成分 %" style={{ marginBottom: 6 }}><Input size="small" /></Form.Item>
              <Form.Item name="ph1pct" label="PH (1%)" style={{ marginBottom: 0 }}><Input size="small" /></Form.Item>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>其他</div>
              <Form.Item name="density" label="比重" style={{ marginBottom: 6 }}><Input size="small" /></Form.Item>
              <Form.Item name="sugarDegree" label="醣度" style={{ marginBottom: 6 }}><Input size="small" /></Form.Item>
              <Form.Item name="ionProperty" label="離子性" style={{ marginBottom: 0 }}><Input size="small" /></Form.Item>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <Form.Item name="testRecord" label="試驗紀錄">
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="solidPhoto" label="固化物說明">
              <TextArea rows={3} />
            </Form.Item>
          </div>

          {/* 限用物質 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>限用物質</Divider>
          <Space wrap size={16}>
            <Form.Item name="zdhcMrsl" label="ZDHC MRSL" style={{ marginBottom: 0 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: 100 }} allowClear />
            </Form.Item>
            <Form.Item name="chemAppendix1" label="化學品附錄 1" style={{ marginBottom: 0 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: 100 }} allowClear />
            </Form.Item>
            <Form.Item name="chemAppendix2" label="化學品附錄 2" style={{ marginBottom: 0 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: 100 }} allowClear />
            </Form.Item>
          </Space>

          {/* 結果 */}
          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>結果</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item name="result" label="結果">
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="issue" label="問題點">
              <TextArea rows={3} />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="備註">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="conclusion" label="結論">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 簽核流程 Modal */}
      <Modal
        title={<Space><AuditOutlined />簽核流程 — {approvalRecord?.chemicalName}</Space>}
        open={approvalOpen}
        onCancel={() => setApprovalOpen(false)}
        footer={<Button onClick={() => setApprovalOpen(false)}>關閉</Button>}
        width={600}
        destroyOnHidden
      >
        {approvalRecord && (
          <ApprovalChain formType="ChemicalEvaluation" formId={approvalRecord.id} />
        )}
      </Modal>
    </Card>
  )
}
