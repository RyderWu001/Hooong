import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, DatePicker,
  Popconfirm, message, Typography, Tag, Divider, Checkbox, InputNumber,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, FileTextOutlined, AuditOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getSampleSubmissions, createSampleSubmission, updateSampleSubmission, deleteSampleSubmission,
} from '../../api/sampleSubmissions'
import { getFormSignatures, type FormSignatureRecord } from '../../api/formSignatures'
import ApprovalChain from '../../components/ApprovalChain'

const { Text } = Typography

const PACKAGING_TYPES = ['250g瓶', '500g瓶', '1L瓶', '20kg桶', '30kg桶', '120kg桶']
const SUBMISSION_METHODS = ['自取', '宅配', '快遞', '郵寄']

interface SampleItem { name: string; code: string; qty: string; hasTDS: boolean; hasCOA: boolean; submitDate: string; method: string }
interface PackagingItem { type: string; count: number }
interface FormulaRow { ingredient: string; stock: string; kg: string }
interface FormulaCostTable { formulas: { name: string; rows: FormulaRow[] }[]; quoteEval: { estimatedCost: string; estimatedPrice: string; approvedQuote: string }[] }
interface CustomerFabric { color: string; yarnType: string; material: string; hasReport: boolean }
interface TrackingResult { week1: string; week2: string; week3: string; conclusion: string }
interface OrderInfo { orderTime: string; massProductionModel: string; orderQty: string; formulaNo: string }

interface SampleSubmission {
  id: number
  formNo: string | null
  companyName: string
  factoryLocation: string | null
  contactPerson: string | null
  formDate: string
  sampleTakenDate: string | null
  phone: string | null
  submissionDate: string | null
  submissionMethod: string | null
  sampleItems: SampleItem[] | null
  packaging: PackagingItem[] | null
  formulaCostTable: FormulaCostTable | null
  customerFabric: CustomerFabric | null
  businessRequirements: string | null
  trackingResults: TrackingResult | null
  orderInfo: OrderInfo | null
  createdAt: string
  updatedAt: string
}

const DEFAULT_SAMPLE_ITEMS: SampleItem[] = Array(5).fill(null).map(() => ({
  name: '', code: '', qty: '', hasTDS: false, hasCOA: false, submitDate: '', method: '',
}))

const DEFAULT_FORMULA_TABLE: FormulaCostTable = {
  formulas: [
    { name: '配方一', rows: Array(6).fill(null).map(() => ({ ingredient: '', stock: '', kg: '' })) },
    { name: '配方二', rows: Array(6).fill(null).map(() => ({ ingredient: '', stock: '', kg: '' })) },
    { name: '配方三', rows: Array(6).fill(null).map(() => ({ ingredient: '', stock: '', kg: '' })) },
    { name: '配方四', rows: Array(6).fill(null).map(() => ({ ingredient: '', stock: '', kg: '' })) },
  ],
  quoteEval: Array(4).fill(null).map(() => ({ estimatedCost: '', estimatedPrice: '', approvedQuote: '' })),
}

const DEFAULT_TRACKING: TrackingResult = { week1: '', week2: '', week3: '', conclusion: '' }
const DEFAULT_ORDER: OrderInfo = { orderTime: '', massProductionModel: '', orderQty: '', formulaNo: '' }

function printSubmission(sub: SampleSubmission, chainSigs: FormSignatureRecord[] = []) {
  const items = sub.sampleItems ?? DEFAULT_SAMPLE_ITEMS
  const pkgs = sub.packaging ?? []
  const fabrics = sub.customerFabric ?? { color: '', yarnType: '', material: '', hasReport: false }
  const tracking = sub.trackingResults ?? DEFAULT_TRACKING
  const order = sub.orderInfo ?? DEFAULT_ORDER
  const fc = sub.formulaCostTable ?? DEFAULT_FORMULA_TABLE

  const sigNames = ['總經理', '財務部', '行管部', '廠務部', '化驗室', '核准', '承辦人']
  const sigBoxes = sigNames.map(n => {
    const s = chainSigs.find(c => c.slotName === n)
    return `<div class="sig-box">
      <div class="sig-label">${n}</div>
      ${s?.signatureImg ? `<img src="${s.signatureImg}" style="max-height:36px;max-width:100%;display:block;margin:2px auto">` : ''}
      ${s?.signedByName ? `<div style="font-size:9px;color:#555">${s.signedByName}</div>` : ''}
      ${s?.signedAt ? `<div style="font-size:8px;color:#777">${dayjs(s.signedAt).format('MM-DD HH:mm')}</div>` : ''}
    </div>`
  }).join('')

  const formulaHeader = fc.formulas.map(f => `<th colspan="2">${f.name}</th>`).join('') + '<th>預估成本</th><th>預估售價</th><th>核准報價</th>'
  const formulaRows = Array(6).fill(null).map((_, ri) =>
    `<tr>
      ${fc.formulas.map(f => `<td>${f.rows[ri]?.ingredient ?? ''}</td><td>${f.rows[ri]?.kg ?? ''}</td>`).join('')}
      <td>${fc.quoteEval[0]?.estimatedCost ?? ''}</td>
      <td>${fc.quoteEval[0]?.estimatedPrice ?? ''}</td>
      <td>${fc.quoteEval[0]?.approvedQuote ?? ''}</td>
    </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>送樣連絡單</title>
<style>
  body { font-family: 'Microsoft JhengHei', sans-serif; font-size: 11px; margin: 15px; color: #000; }
  h2 { text-align: center; font-size: 15px; margin: 0 0 6px; }
  .form-no { text-align: right; font-size: 10px; }
  .header-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 8px; }
  .field { border-bottom: 1px solid #999; padding: 2px 0; }
  .field-label { font-size: 10px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th, td { border: 1px solid #000; padding: 3px 5px; text-align: center; font-size: 10px; }
  th { background: #f0f0f0; }
  td.left { text-align: left; }
  .section-title { font-weight: bold; margin: 8px 0 4px; font-size: 12px; border-bottom: 1px solid #333; }
  .sig-row { display: flex; gap: 6px; margin-top: 16px; }
  .sig-box { flex: 1; border: 1px solid #000; min-height: 50px; padding: 3px; text-align: center; }
  .sig-label { font-size: 10px; border-bottom: 1px solid #ccc; margin-bottom: 2px; }
  .pkg-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-bottom: 8px; }
  .pkg-item { border: 1px solid #999; padding: 3px; text-align: center; font-size: 10px; }
  @media print { @page { margin: 10mm; size: A4 portrait; } }
</style>
</head>
<body>
<div class="form-no">CMS03-03-1B No. ${sub.formNo ?? ''}</div>
<h2>送樣連絡單</h2>
<div class="header-grid">
  <div class="field"><div class="field-label">公司名稱</div>${sub.companyName}</div>
  <div class="field"><div class="field-label">廠區位置</div>${sub.factoryLocation ?? ''}</div>
  <div class="field"><div class="field-label">聯絡人</div>${sub.contactPerson ?? ''}</div>
  <div class="field"><div class="field-label">填單日期</div>${sub.formDate ? dayjs(sub.formDate).format('YYYY-MM-DD') : ''}</div>
  <div class="field"><div class="field-label">取樣日期</div>${sub.sampleTakenDate ? dayjs(sub.sampleTakenDate).format('YYYY-MM-DD') : ''}</div>
  <div class="field"><div class="field-label">公司電話</div>${sub.phone ?? ''}</div>
</div>

<div class="section-title">送樣品資訊</div>
<table>
  <thead>
    <tr><th>STT</th><th>送樣品名</th><th>品號/型號</th><th>數量%</th><th>TDS</th><th>COA</th><th>送樣日期</th><th>送樣方式</th></tr>
  </thead>
  <tbody>
    ${items.map((it, i) => `<tr>
      <td>${i + 1}</td>
      <td class="left">${it.name}</td>
      <td class="left">${it.code}</td>
      <td>${it.qty}</td>
      <td>${it.hasTDS ? '✓' : ''}</td>
      <td>${it.hasCOA ? '✓' : ''}</td>
      <td>${it.submitDate}</td>
      <td>${it.method}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="section-title">包裝規格</div>
<div class="pkg-grid">
  ${PACKAGING_TYPES.map(t => { const p = pkgs.find(pk => pk.type === t); return `<div class="pkg-item">${t}<br>${p?.count ? p.count + ' 個' : '—'}</div>` }).join('')}
</div>

<div class="section-title">配方成本計算</div>
<table>
  <thead>
    <tr><th rowspan="2">STT</th>${formulaHeader}</tr>
    <tr>${fc.formulas.map(() => '<th>庫取</th><th>kg</th>').join('')}<th colspan="3"></th></tr>
  </thead>
  <tbody>${formulaRows}</tbody>
</table>

<div class="section-title">客供樣布</div>
<table>
  <thead><tr><th>顏色</th><th>紗/布樣</th><th>材質</th><th>有無提供布樣報告</th></tr></thead>
  <tbody><tr>
    <td>${fabrics.color}</td><td>${fabrics.yarnType}</td><td>${fabrics.material}</td>
    <td>${fabrics.hasReport ? '有提供' : '無提供'}</td>
  </tr></tbody>
</table>

<div class="section-title">業務需求說明</div>
<div style="border:1px solid #000;min-height:40px;padding:4px;margin-bottom:8px;white-space:pre-wrap">${sub.businessRequirements ?? ''}</div>

<div class="section-title">追蹤結果</div>
<table>
  <thead><tr><th>一週情形</th><th>二週情形</th><th>三週情形</th><th>結論</th></tr></thead>
  <tbody><tr>
    <td class="left">${tracking.week1}</td>
    <td class="left">${tracking.week2}</td>
    <td class="left">${tracking.week3}</td>
    <td class="left">${tracking.conclusion}</td>
  </tr></tbody>
</table>

<div class="section-title">訂貨資訊</div>
<div class="header-grid">
  <div class="field"><div class="field-label">訂貨時間</div>${order.orderTime}</div>
  <div class="field"><div class="field-label">量產型號</div>${order.massProductionModel}</div>
  <div class="field"><div class="field-label">訂貨數量</div>${order.orderQty}</div>
  <div class="field"><div class="field-label">配方編號</div>${order.formulaNo}</div>
</div>

<div class="sig-row">${sigBoxes}</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function SampleSubmissionPage() {
  const [list, setList] = useState<SampleSubmission[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SampleSubmission | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [sampleItems, setSampleItems] = useState<SampleItem[]>(DEFAULT_SAMPLE_ITEMS)
  const [packaging, setPackaging] = useState<PackagingItem[]>([])
  const [formulaCostTable, setFormulaCostTable] = useState<FormulaCostTable>(DEFAULT_FORMULA_TABLE)
  const [customerFabric, setCustomerFabric] = useState<CustomerFabric>({ color: '', yarnType: '', material: '', hasReport: false })
  const [trackingResults, setTrackingResults] = useState<TrackingResult>(DEFAULT_TRACKING)
  const [orderInfo, setOrderInfo] = useState<OrderInfo>(DEFAULT_ORDER)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [approvalRecord, setApprovalRecord] = useState<SampleSubmission | null>(null)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getSampleSubmissions({ page: p, limit: 20 })
      setList(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ formDate: dayjs() })
    setSampleItems(DEFAULT_SAMPLE_ITEMS)
    setPackaging([])
    setFormulaCostTable(DEFAULT_FORMULA_TABLE)
    setCustomerFabric({ color: '', yarnType: '', material: '', hasReport: false })
    setTrackingResults(DEFAULT_TRACKING)
    setOrderInfo(DEFAULT_ORDER)
    setModalOpen(true)
  }

  const openEdit = (row: SampleSubmission) => {
    setEditing(row)
    form.setFieldsValue({
      formNo: row.formNo ?? '',
      companyName: row.companyName,
      factoryLocation: row.factoryLocation ?? '',
      contactPerson: row.contactPerson ?? '',
      formDate: dayjs(row.formDate),
      sampleTakenDate: row.sampleTakenDate ? dayjs(row.sampleTakenDate) : null,
      phone: row.phone ?? '',
      submissionDate: row.submissionDate ? dayjs(row.submissionDate) : null,
      submissionMethod: row.submissionMethod ?? '',
      businessRequirements: row.businessRequirements ?? '',
    })
    setSampleItems(row.sampleItems?.length ? row.sampleItems : DEFAULT_SAMPLE_ITEMS)
    setPackaging(row.packaging ?? [])
    setFormulaCostTable(row.formulaCostTable ?? DEFAULT_FORMULA_TABLE)
    setCustomerFabric(row.customerFabric ?? { color: '', yarnType: '', material: '', hasReport: false })
    setTrackingResults(row.trackingResults ?? DEFAULT_TRACKING)
    setOrderInfo(row.orderInfo ?? DEFAULT_ORDER)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        formNo: values.formNo || null,
        companyName: values.companyName,
        factoryLocation: values.factoryLocation || null,
        contactPerson: values.contactPerson || null,
        formDate: values.formDate.format('YYYY-MM-DD'),
        sampleTakenDate: values.sampleTakenDate?.format('YYYY-MM-DD') ?? null,
        phone: values.phone || null,
        submissionDate: values.submissionDate?.format('YYYY-MM-DD') ?? null,
        submissionMethod: values.submissionMethod || null,
        sampleItems: sampleItems.filter(i => i.name || i.code),
        packaging,
        formulaCostTable,
        customerFabric,
        businessRequirements: values.businessRequirements || null,
        trackingResults,
        orderInfo,
      }
      if (editing) { await updateSampleSubmission(editing.id, payload); message.success('已更新') }
      else { await createSampleSubmission(payload); message.success('已新增') }
      setModalOpen(false)
      load(page)
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteSampleSubmission(id); message.success('已刪除'); load(page) }
    catch { message.error('刪除失敗') }
  }

  const updatePkgCount = (type: string, count: number) => {
    setPackaging(prev => {
      const existing = prev.find(p => p.type === type)
      if (existing) return prev.map(p => p.type === type ? { ...p, count } : p)
      return [...prev, { type, count }]
    })
  }

  const handlePrintWithSigs = async (row: SampleSubmission) => {
    const chainSigs = await getFormSignatures('SampleSubmission', row.id).catch(() => [])
    printSubmission(row, chainSigs)
  }

  const columns: ColumnsType<SampleSubmission> = [
    { title: '表單號', dataIndex: 'formNo', key: 'formNo', width: 100, render: v => v ?? '—' },
    { title: '公司名稱', dataIndex: 'companyName', key: 'companyName' },
    { title: '聯絡人', dataIndex: 'contactPerson', key: 'contactPerson', width: 100, render: v => v ?? '—' },
    {
      title: '填單日期', dataIndex: 'formDate', key: 'formDate', width: 110,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '品項數', key: 'itemCount', width: 80,
      render: (_, row) => `${row.sampleItems?.filter(i => i.name).length ?? 0} 項`,
    },
    {
      title: '操作', key: 'actions', width: 220,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<AuditOutlined />} onClick={() => { setApprovalRecord(row); setApprovalOpen(true) }}>簽核</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrintWithSigs(row)}>列印</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="確定刪除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title={<Space><FileTextOutlined />送樣連絡單 (CMS03-03-1B)</Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增送樣單</Button>}
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
        title={editing ? '編輯送樣連絡單' : '新增送樣連絡單'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
        width={900}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          {/* 基本資訊 */}
          <Divider plain style={{ margin: '0 0 8px', fontSize: 12 }}>基本資訊</Divider>
          <Space wrap size={8} style={{ width: '100%' }}>
            <Form.Item name="formNo" label="表單號" style={{ width: 120 }}>
              <Input placeholder="No." />
            </Form.Item>
            <Form.Item name="companyName" label="公司名稱" rules={[{ required: true }]} style={{ width: 180 }}>
              <Input />
            </Form.Item>
            <Form.Item name="factoryLocation" label="廠區位置" style={{ width: 150 }}>
              <Input />
            </Form.Item>
            <Form.Item name="contactPerson" label="聯絡人" style={{ width: 120 }}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="公司電話" style={{ width: 150 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space wrap size={8}>
            <Form.Item name="formDate" label="填單日期" rules={[{ required: true }]}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="sampleTakenDate" label="取樣日期">
              <DatePicker />
            </Form.Item>
            <Form.Item name="submissionDate" label="送樣日期">
              <DatePicker />
            </Form.Item>
            <Form.Item name="submissionMethod" label="送樣方式" style={{ width: 120 }}>
              <Input placeholder={SUBMISSION_METHODS.join('/')} />
            </Form.Item>
          </Space>

          {/* 送樣品項目 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>送樣品項目（最多5項）</Divider>
          <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'auto', marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#162032' }}>
                  {['STT', '送樣品名', '品號/型號', '數量%', 'TDS', 'COA', '送樣日期', '送樣方式'].map(h => (
                    <th key={h} style={{ padding: '4px 6px', borderBottom: '1px solid #2d3f55', textAlign: 'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleItems.map((item, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #2d3f55' }}>
                    <td style={{ padding: '3px 6px', textAlign: 'center', color: '#94a3b8' }}>{idx + 1}</td>
                    {(['name', 'code', 'qty'] as const).map(f => (
                      <td key={f} style={{ padding: '2px 4px' }}>
                        <Input size="small" value={item[f]} onChange={e => setSampleItems(prev => prev.map((r, i) => i === idx ? { ...r, [f]: e.target.value } : r))} />
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', padding: '2px' }}>
                      <Checkbox checked={item.hasTDS} onChange={e => setSampleItems(prev => prev.map((r, i) => i === idx ? { ...r, hasTDS: e.target.checked } : r))} />
                    </td>
                    <td style={{ textAlign: 'center', padding: '2px' }}>
                      <Checkbox checked={item.hasCOA} onChange={e => setSampleItems(prev => prev.map((r, i) => i === idx ? { ...r, hasCOA: e.target.checked } : r))} />
                    </td>
                    <td style={{ padding: '2px 4px' }}>
                      <Input size="small" value={item.submitDate} onChange={e => setSampleItems(prev => prev.map((r, i) => i === idx ? { ...r, submitDate: e.target.value } : r))} />
                    </td>
                    <td style={{ padding: '2px 4px' }}>
                      <Input size="small" value={item.method} onChange={e => setSampleItems(prev => prev.map((r, i) => i === idx ? { ...r, method: e.target.value } : r))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 包裝規格 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>包裝規格</Divider>
          <Space wrap size={16} style={{ marginBottom: 12 }}>
            {PACKAGING_TYPES.map(t => {
              const p = packaging.find(pk => pk.type === t)
              return (
                <Space key={t} size={4}>
                  <Text style={{ fontSize: 12 }}>{t}</Text>
                  <InputNumber size="small" min={0} value={p?.count ?? 0} onChange={v => updatePkgCount(t, v ?? 0)} style={{ width: 60 }} addonAfter="個" />
                </Space>
              )
            })}
          </Space>

          {/* 配方成本計算 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>配方成本計算</Divider>
          <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'auto', marginBottom: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#162032' }}>
                  <th style={{ padding: '4px', borderBottom: '1px solid #2d3f55', width: 30 }}>STT</th>
                  {formulaCostTable.formulas.map(f => (
                    <th key={f.name} colSpan={2} style={{ padding: '4px', borderBottom: '1px solid #2d3f55', borderLeft: '1px solid #2d3f55' }}>{f.name}</th>
                  ))}
                  <th style={{ padding: '4px', borderBottom: '1px solid #2d3f55', borderLeft: '1px solid #2d3f55' }}>預估成本</th>
                  <th style={{ padding: '4px', borderBottom: '1px solid #2d3f55', borderLeft: '1px solid #2d3f55' }}>預估售價</th>
                  <th style={{ padding: '4px', borderBottom: '1px solid #2d3f55', borderLeft: '1px solid #2d3f55' }}>核准報價</th>
                </tr>
                <tr style={{ background: '#0f1f33' }}>
                  <th style={{ padding: '3px', borderBottom: '1px solid #2d3f55' }}></th>
                  {formulaCostTable.formulas.map(f => (
                    <>
                      <th key={`${f.name}-stock`} style={{ padding: '3px', borderBottom: '1px solid #2d3f55', borderLeft: '1px solid #2d3f55', fontSize: 10 }}>庫取</th>
                      <th key={`${f.name}-kg`} style={{ padding: '3px', borderBottom: '1px solid #2d3f55', borderLeft: '1px solid #2d3f55', fontSize: 10 }}>kg</th>
                    </>
                  ))}
                  <th colSpan={3} style={{ borderLeft: '1px solid #2d3f55', borderBottom: '1px solid #2d3f55' }}></th>
                </tr>
              </thead>
              <tbody>
                {Array(6).fill(null).map((_, ri) => (
                  <tr key={ri} style={{ borderTop: '1px solid #2d3f55' }}>
                    <td style={{ textAlign: 'center', padding: '2px', color: '#94a3b8', fontSize: 11 }}>{ri + 1}</td>
                    {formulaCostTable.formulas.map((f, fi) => (
                      <>
                        <td key={`${fi}-stock`} style={{ padding: '2px', borderLeft: '1px solid #2d3f55' }}>
                          <Input size="small" value={f.rows[ri].stock}
                            onChange={e => setFormulaCostTable(prev => ({ ...prev, formulas: prev.formulas.map((ff, ffi) => ffi === fi ? { ...ff, rows: ff.rows.map((r, rri) => rri === ri ? { ...r, stock: e.target.value } : r) } : ff) }))}
                          />
                        </td>
                        <td key={`${fi}-kg`} style={{ padding: '2px', borderLeft: '1px solid #2d3f55' }}>
                          <Input size="small" value={f.rows[ri].kg}
                            onChange={e => setFormulaCostTable(prev => ({ ...prev, formulas: prev.formulas.map((ff, ffi) => ffi === fi ? { ...ff, rows: ff.rows.map((r, rri) => rri === ri ? { ...r, kg: e.target.value } : r) } : ff) }))}
                          />
                        </td>
                      </>
                    ))}
                    {ri === 0 ? (
                      <>
                        <td rowSpan={6} style={{ padding: '2px', borderLeft: '1px solid #2d3f55', verticalAlign: 'top' }}>
                          {formulaCostTable.quoteEval.map((q, qi) => (
                            <div key={qi} style={{ marginBottom: 4 }}>
                              <Input size="small" placeholder={`配方${qi + 1}`} value={q.estimatedCost}
                                onChange={e => setFormulaCostTable(prev => ({ ...prev, quoteEval: prev.quoteEval.map((qq, qqi) => qqi === qi ? { ...qq, estimatedCost: e.target.value } : qq) }))}
                              />
                            </div>
                          ))}
                        </td>
                        <td rowSpan={6} style={{ padding: '2px', borderLeft: '1px solid #2d3f55', verticalAlign: 'top' }}>
                          {formulaCostTable.quoteEval.map((q, qi) => (
                            <div key={qi} style={{ marginBottom: 4 }}>
                              <Input size="small" placeholder={`配方${qi + 1}`} value={q.estimatedPrice}
                                onChange={e => setFormulaCostTable(prev => ({ ...prev, quoteEval: prev.quoteEval.map((qq, qqi) => qqi === qi ? { ...qq, estimatedPrice: e.target.value } : qq) }))}
                              />
                            </div>
                          ))}
                        </td>
                        <td rowSpan={6} style={{ padding: '2px', borderLeft: '1px solid #2d3f55', verticalAlign: 'top' }}>
                          {formulaCostTable.quoteEval.map((q, qi) => (
                            <div key={qi} style={{ marginBottom: 4 }}>
                              <Input size="small" placeholder={`配方${qi + 1}`} value={q.approvedQuote}
                                onChange={e => setFormulaCostTable(prev => ({ ...prev, quoteEval: prev.quoteEval.map((qq, qqi) => qqi === qi ? { ...qq, approvedQuote: e.target.value } : qq) }))}
                              />
                            </div>
                          ))}
                        </td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 客供樣布 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>客供樣布</Divider>
          <Space size={12} style={{ marginBottom: 12 }} wrap>
            {(['color', 'yarnType', 'material'] as const).map(f => (
              <Form.Item key={f} label={{ color: '顏色', yarnType: '紗/布樣', material: '材質' }[f]} style={{ marginBottom: 0 }}>
                <Input size="small" value={customerFabric[f]} onChange={e => setCustomerFabric(prev => ({ ...prev, [f]: e.target.value }))} style={{ width: 140 }} />
              </Form.Item>
            ))}
            <Form.Item label="布樣報告" style={{ marginBottom: 0 }}>
              <Checkbox checked={customerFabric.hasReport} onChange={e => setCustomerFabric(prev => ({ ...prev, hasReport: e.target.checked }))}>有提供</Checkbox>
            </Form.Item>
          </Space>

          {/* 業務需求說明 */}
          <Form.Item name="businessRequirements" label="業務需求說明">
            <Input.TextArea rows={3} />
          </Form.Item>

          {/* 追蹤結果 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>追蹤結果</Divider>
          <Space wrap size={8} style={{ marginBottom: 12 }}>
            {([['week1', '一週情形'], ['week2', '二週情形'], ['week3', '三週情形'], ['conclusion', '結論']] as const).map(([f, label]) => (
              <Form.Item key={f} label={label} style={{ marginBottom: 0 }}>
                <Input.TextArea rows={2} value={trackingResults[f]} onChange={e => setTrackingResults(prev => ({ ...prev, [f]: e.target.value }))} style={{ width: 180 }} />
              </Form.Item>
            ))}
          </Space>

          {/* 訂貨資訊 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>訂貨資訊</Divider>
          <Space wrap size={8} style={{ marginBottom: 12 }}>
            {([['orderTime', '訂貨時間'], ['massProductionModel', '量產型號'], ['orderQty', '訂貨數量'], ['formulaNo', '配方編號']] as const).map(([f, label]) => (
              <Form.Item key={f} label={label} style={{ marginBottom: 0 }}>
                <Input size="small" value={orderInfo[f]} onChange={e => setOrderInfo(prev => ({ ...prev, [f]: e.target.value }))} style={{ width: 150 }} />
              </Form.Item>
            ))}
          </Space>

        </Form>
      </Modal>

      {/* 簽核流程 Modal */}
      <Modal
        title={<Space><AuditOutlined />簽核流程 — {approvalRecord?.companyName}</Space>}
        open={approvalOpen}
        onCancel={() => setApprovalOpen(false)}
        footer={<Button onClick={() => setApprovalOpen(false)}>關閉</Button>}
        width={820}
        destroyOnHidden
      >
        {approvalRecord && (
          <ApprovalChain
            formType="SampleSubmission"
            formId={approvalRecord.id}
          />
        )}
      </Modal>
    </Card>
  )
}
