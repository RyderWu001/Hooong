import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, DatePicker,
  Popconfirm, message, Divider, Select, Checkbox,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, FileAddOutlined, AuditOutlined,
} from '@ant-design/icons'
import ApprovalChain from '../../components/ApprovalChain'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getChemicalRequests, createChemicalRequest, updateChemicalRequest, deleteChemicalRequest,
} from '../../api/chemicalForms'

const { TextArea } = Input

const YES_NO_OPTIONS = [
  { value: 'YES', label: 'YES' },
  { value: 'NO', label: 'NO' },
  { value: 'N/A', label: 'N/A' },
]

interface IngredientRow { name: string; casNo: string; percentage: string }

interface ChemRequest {
  id: number
  no: string | null
  date: string | null
  chemicalName: string | null
  supplierInfo: string | null
  unitPrice: string | null
  usage: string | null
  expectedQty: string | null
  processInfo: string | null
  isReplacement: boolean
  replacedProduct: string | null
  hasSDS: string | null
  hasTDS: string | null
  hasCOA: string | null
  hasThirdParty: string | null
  zdhcMrsl: string | null
  chemAppendix1: string | null
  chemAppendix2: string | null
  ingredients: IngredientRow[] | null
  supplement: string | null
  techOpinion: string | null
  ehsSDS: boolean
  ehsMRSL: boolean
  supervisorDecision: string | null
  ceoDecision: string | null
  notes: string | null
  createdAt: string
}

const DEFAULT_INGREDIENT_ROWS: IngredientRow[] = Array(5).fill(null).map(() => ({ name: '', casNo: '', percentage: '' }))

function cb(val: string | null | undefined): string {
  return val === 'YES' ? '☑ YES  ☐ NO' : val === 'NO' ? '☐ YES  ☑ NO' : '☐ YES  ☐ NO'
}

function printRequest(row: ChemRequest) {
  const ingrs = row.ingredients ?? DEFAULT_INGREDIENT_ROWS
  const ingrRows = ingrs.map(r => `<tr><td class="left">${r.name}</td><td>${r.casNo}</td><td>${r.percentage}</td></tr>`).join('')

  const COMPLIANCE_ITEMS = [
    { no: '1', label: 'SDS (Safety Data Sheet)', field: row.hasSDS },
    { no: '2', label: 'TDS (Technical Data Sheet)', field: row.hasTDS },
    { no: '3', label: 'COA (Certificate of Analysis)', field: row.hasCOA },
    { no: '4', label: '第三方檢測報告 / Báo cáo kiểm tra bên thứ ba', field: row.hasThirdParty },
    { no: '5', label: 'ZDHC MRSL 符合聲明 / Tuyên bố tuân thủ ZDHC MRSL', field: row.zdhcMrsl },
    { no: '6', label: '化學品附錄 1 / Phụ lục hóa chất 1', field: row.chemAppendix1 },
    { no: '7', label: '化學品附錄 2 / Phụ lục hóa chất 2', field: row.chemAppendix2 },
  ]

  const complianceRows = COMPLIANCE_ITEMS.map(item => `
    <tr>
      <td>${item.no}</td>
      <td class="left">${item.label}</td>
      <td>${cb(item.field)}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>化學品需求申請單 CMS01-01-2B</title>
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
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #000; padding: 3px 5px; text-align: center; }
  th { background: #e8e8e8; font-size: 9.5px; }
  td.left { text-align: left; }
  .info-table td.label { background: #f5f5f5; font-weight: bold; width: 35%; font-size: 9.5px; }
  .info-table td.value { width: 65%; }
  .supplement-box { padding: 4px 8px; min-height: 60px; border-top: 1px solid #000; white-space: pre-wrap; font-size: 10px; }
  .sig-row { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 2px solid #000; }
  .sig-header { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid #000; background: #e8e8e8; }
  .sig-cell { padding: 4px 8px; border-right: 1px solid #000; min-height: 50px; }
  .sig-cell:last-child { border-right: none; }
  .sig-label { font-size: 9.5px; font-weight: bold; text-align: center; padding: 3px; border-bottom: 1px solid #000; }
  .sig-body { min-height: 40px; padding: 4px; }
  .notes-row { border-top: 1px solid #000; padding: 4px 8px; min-height: 30px; }
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
      <h1>PHIẾU YÊU CẦU HÓA CHẤT</h1>
      <h2>化學品需求申請單</h2>
    </div>
    <div class="header-right">
      <div class="field"><strong>No:</strong> ${row.no ?? ''}</div>
      <div class="field"><strong>DATE:</strong> ${row.date ? dayjs(row.date).format('YYYY-MM-DD') : ''}</div>
    </div>
  </div>

  <!-- 化學品基本資訊 -->
  <div class="section">
    <div class="section-title">化學品基本資訊 / THÔNG TIN CƠ BẢN HÓA CHẤT</div>
    <table class="info-table">
      <tr><td class="label">TÊN HÓA CHẤT / 化學品名稱</td><td class="value">${row.chemicalName ?? ''}</td></tr>
      <tr><td class="label">NHÀ CUNG ỨNG / 供應商資訊</td><td class="value">${row.supplierInfo ?? ''}</td></tr>
      <tr><td class="label">GIÁ TIỀN / per kg 單價</td><td class="value">${row.unitPrice ?? ''}</td></tr>
      <tr><td class="label">SỬ DỤNG / 用途</td><td class="value">${row.usage ?? ''}</td></tr>
      <tr><td class="label">SỐ LƯỢNG / 預計用量</td><td class="value">${row.expectedQty ?? ''}</td></tr>
      <tr><td class="label">QUY TRÌNH / 使用製程</td><td class="value">${row.processInfo ?? ''}</td></tr>
      <tr>
        <td class="label">THAY THẾ SẢN PHẨM CŨ / 取代舊產品</td>
        <td class="value">
          ${row.isReplacement ? '☑ YES  ☐ NO' : '☐ YES  ☑ NO'}
          ${row.replacedProduct ? `&nbsp;&nbsp;取代品: ${row.replacedProduct}` : ''}
        </td>
      </tr>
    </table>
  </div>

  <!-- 技術與合規資料 -->
  <div class="section">
    <div class="section-title">技術與合規資料 / TÀI LIỆU KỸ THUẬT VÀ TUÂN THỦ</div>
    <table>
      <thead>
        <tr><th style="width:40px">STT</th><th>項目 / Hạng mục</th><th style="width:140px">狀態 / Trạng thái</th></tr>
      </thead>
      <tbody>${complianceRows}</tbody>
    </table>
  </div>

  <!-- 成份辨識 -->
  <div class="section">
    <div class="section-title">成份辨識資料 / NHẬN DẠNG THÀNH PHẦN</div>
    <table>
      <thead>
        <tr><th>INGREDIENTS NAME / 成份名稱</th><th>CAS NUMBER</th><th>APPROX. PERCENTAGE %</th></tr>
      </thead>
      <tbody>
        ${ingrRows}
        ${Array(Math.max(0, 5 - ingrs.length)).fill(0).map(() => '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>').join('')}
      </tbody>
    </table>
  </div>

  <!-- 補充說明 -->
  <div class="section">
    <div class="section-title">補充說明 / GHI CHÚ BỔ SUNG</div>
    <div class="supplement-box">${row.supplement ?? ''}</div>
  </div>

  <!-- 審核流程 -->
  <div class="section">
    <div class="section-title">審核流程 / QUY TRÌNH PHÊ DUYỆT</div>
    <div class="sig-header">
      <div style="padding:3px 8px;font-weight:bold;font-size:9.5px;border-right:1px solid #000">BỘ PHẬN / 部門</div>
      <div style="padding:3px 8px;font-weight:bold;font-size:9.5px;border-right:1px solid #000">KÝ TÊN / 簽名</div>
      <div style="padding:3px 8px;font-weight:bold;font-size:9.5px">Ý KIẾN / 意見</div>
    </div>
    <div class="sig-row">
      <div class="sig-cell">
        <div class="sig-label">EHS 部門 / Bộ phận EHS</div>
        <div class="sig-body" style="font-size:9.5px">
          ${row.ehsSDS ? '☑' : '☐'} 已審 SDS<br>
          ${row.ehsMRSL ? '☑' : '☐'} 已確認 MRSL
        </div>
      </div>
      <div class="sig-cell">
        <div class="sig-label">技術部門 / Bộ phận kỹ thuật</div>
        <div class="sig-body" style="font-size:9.5px;white-space:pre-wrap">${row.techOpinion ?? ''}</div>
      </div>
      <div class="sig-cell">
        <div class="sig-label">主管 / Trưởng bộ phận</div>
        <div class="sig-body" style="font-size:9.5px;white-space:pre-wrap">${row.supervisorDecision ?? ''}</div>
      </div>
    </div>
    <div class="sig-row" style="border-top:1px solid #000">
      <div class="sig-cell" style="grid-column:1/-1">
        <div class="sig-label">總經理 / Tổng giám đốc</div>
        <div class="sig-body" style="font-size:9.5px;white-space:pre-wrap">${row.ceoDecision ?? ''}</div>
      </div>
    </div>
  </div>

  <!-- 備註 -->
  <div class="notes-row">
    <div style="font-size:9.5px;font-weight:bold;margin-bottom:2px">備註 / Ghi chú:</div>
    <div style="white-space:pre-wrap;font-size:10px">${row.notes ?? ''}</div>
  </div>

  <!-- 頁腳 -->
  <div class="footer">CMS01-01-2B 化學品需求申請單</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function ChemicalRequestPage() {
  const [list, setList] = useState<ChemRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChemRequest | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [ingrRows, setIngrRows] = useState<IngredientRow[]>(DEFAULT_INGREDIENT_ROWS)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [approvalRecord, setApprovalRecord] = useState<ChemRequest | null>(null)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getChemicalRequests({ page: p, limit: 20 })
      setList(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs(), isReplacement: false, ehsSDS: false, ehsMRSL: false })
    setIngrRows(DEFAULT_INGREDIENT_ROWS.map(r => ({ ...r })))
    setModalOpen(true)
  }

  const openEdit = (row: ChemRequest) => {
    setEditing(row)
    form.setFieldsValue({
      no: row.no ?? '',
      date: row.date ? dayjs(row.date) : null,
      chemicalName: row.chemicalName ?? '',
      supplierInfo: row.supplierInfo ?? '',
      unitPrice: row.unitPrice ?? '',
      usage: row.usage ?? '',
      expectedQty: row.expectedQty ?? '',
      processInfo: row.processInfo ?? '',
      isReplacement: row.isReplacement,
      replacedProduct: row.replacedProduct ?? '',
      hasSDS: row.hasSDS ?? undefined,
      hasTDS: row.hasTDS ?? undefined,
      hasCOA: row.hasCOA ?? undefined,
      hasThirdParty: row.hasThirdParty ?? undefined,
      zdhcMrsl: row.zdhcMrsl ?? undefined,
      chemAppendix1: row.chemAppendix1 ?? undefined,
      chemAppendix2: row.chemAppendix2 ?? undefined,
      supplement: row.supplement ?? '',
      techOpinion: row.techOpinion ?? '',
      ehsSDS: row.ehsSDS,
      ehsMRSL: row.ehsMRSL,
      supervisorDecision: row.supervisorDecision ?? '',
      ceoDecision: row.ceoDecision ?? '',
      notes: row.notes ?? '',
    })
    setIngrRows(row.ingredients?.length ? row.ingredients : DEFAULT_INGREDIENT_ROWS.map(r => ({ ...r })))
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        no: values.no || null,
        date: values.date ? values.date.format('YYYY-MM-DD') : null,
        chemicalName: values.chemicalName || null,
        supplierInfo: values.supplierInfo || null,
        unitPrice: values.unitPrice || null,
        usage: values.usage || null,
        expectedQty: values.expectedQty || null,
        processInfo: values.processInfo || null,
        isReplacement: values.isReplacement ?? false,
        replacedProduct: values.replacedProduct || null,
        hasSDS: values.hasSDS || null,
        hasTDS: values.hasTDS || null,
        hasCOA: values.hasCOA || null,
        hasThirdParty: values.hasThirdParty || null,
        zdhcMrsl: values.zdhcMrsl || null,
        chemAppendix1: values.chemAppendix1 || null,
        chemAppendix2: values.chemAppendix2 || null,
        ingredients: ingrRows,
        supplement: values.supplement || null,
        techOpinion: values.techOpinion || null,
        ehsSDS: values.ehsSDS ?? false,
        ehsMRSL: values.ehsMRSL ?? false,
        supervisorDecision: values.supervisorDecision || null,
        ceoDecision: values.ceoDecision || null,
        notes: values.notes || null,
      }
      if (editing) {
        await updateChemicalRequest(editing.id, payload)
        message.success('已更新')
      } else {
        await createChemicalRequest(payload)
        message.success('已新增')
      }
      setModalOpen(false)
      load(page)
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteChemicalRequest(id); message.success('已刪除'); load(page) }
    catch { message.error('刪除失敗') }
  }

  const updateIngrRow = (idx: number, field: keyof IngredientRow, val: string) => {
    setIngrRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const columns: ColumnsType<ChemRequest> = [
    { title: 'No', dataIndex: 'no', key: 'no', width: 80, render: v => v ?? '—' },
    { title: '化學品名稱', dataIndex: 'chemicalName', key: 'chemicalName', render: v => v ?? '—' },
    { title: '供應商', dataIndex: 'supplierInfo', key: 'supplierInfo', width: 160, render: v => v ?? '—' },
    {
      title: '日期', dataIndex: 'date', key: 'date', width: 110,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    {
      title: '操作', key: 'actions', width: 220,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<AuditOutlined />} onClick={() => { setApprovalRecord(row); setApprovalOpen(true) }}>簽核</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printRequest(row)}>列印</Button>
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
      title={<Space><FileAddOutlined />化學品需求申請單 (CMS01-01-2B)</Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增申請單</Button>}
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
        title={editing ? '編輯化學品需求申請單' : '新增化學品需求申請單'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
        width={800}
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
            <Form.Item name="chemicalName" label="化學品名稱" style={{ width: 180 }}>
              <Input />
            </Form.Item>
            <Form.Item name="supplierInfo" label="供應商資訊" style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="unitPrice" label="單價 (per kg)" style={{ width: 130 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space wrap size={8} style={{ width: '100%' }}>
            <Form.Item name="usage" label="用途" style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="expectedQty" label="預計用量" style={{ width: 150 }}>
              <Input />
            </Form.Item>
            <Form.Item name="processInfo" label="使用製程" style={{ width: 200 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space size={16} wrap>
            <Form.Item name="isReplacement" label="取代舊產品" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>是 / YES</Checkbox>
            </Form.Item>
            <Form.Item name="replacedProduct" label="被取代產品" style={{ marginBottom: 0, width: 200 }}>
              <Input placeholder="產品名稱" />
            </Form.Item>
          </Space>

          {/* 技術合規 */}
          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>技術與合規資料</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item name="hasSDS" label="SDS (安全資料表)" style={{ marginBottom: 6 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: '100%' }} allowClear placeholder="請選擇" />
            </Form.Item>
            <Form.Item name="hasTDS" label="TDS (技術資料表)" style={{ marginBottom: 6 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: '100%' }} allowClear placeholder="請選擇" />
            </Form.Item>
            <Form.Item name="hasCOA" label="COA (分析證書)" style={{ marginBottom: 6 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: '100%' }} allowClear placeholder="請選擇" />
            </Form.Item>
            <Form.Item name="hasThirdParty" label="第三方檢測報告" style={{ marginBottom: 6 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: '100%' }} allowClear placeholder="請選擇" />
            </Form.Item>
            <Form.Item name="zdhcMrsl" label="ZDHC MRSL 符合" style={{ marginBottom: 6 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: '100%' }} allowClear placeholder="請選擇" />
            </Form.Item>
            <Form.Item name="chemAppendix1" label="化學品附錄 1" style={{ marginBottom: 6 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: '100%' }} allowClear placeholder="請選擇" />
            </Form.Item>
            <Form.Item name="chemAppendix2" label="化學品附錄 2" style={{ marginBottom: 6 }}>
              <Select options={YES_NO_OPTIONS} style={{ width: '100%' }} allowClear placeholder="請選擇" />
            </Form.Item>
          </div>

          {/* 成份辨識 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>成份辨識資料</Divider>
          <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#162032' }}>
                  {['INGREDIENTS NAME / 成份名稱', 'CAS NUMBER', 'APPROX. PERCENTAGE %'].map(h => (
                    <th key={h} style={{ padding: '4px 6px', borderBottom: '1px solid #2d3f55', textAlign: 'center', fontWeight: 'normal', color: '#94a3b8', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ingrRows.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #2d3f55' }}>
                    {(['name', 'casNo', 'percentage'] as const).map(f => (
                      <td key={f} style={{ padding: '2px 4px' }}>
                        <Input size="small" value={r[f]} onChange={e => updateIngrRow(i, f, e.target.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            size="small"
            style={{ marginBottom: 8 }}
            onClick={() => setIngrRows(p => [...p, { name: '', casNo: '', percentage: '' }])}
          >
            + 新增成份列
          </Button>
          {ingrRows.length > 1 && (
            <Button
              size="small"
              danger
              style={{ marginLeft: 8, marginBottom: 8 }}
              onClick={() => setIngrRows(p => p.slice(0, -1))}
            >
              - 移除最後列
            </Button>
          )}

          {/* 補充說明 */}
          <Form.Item name="supplement" label="補充說明">
            <TextArea rows={3} />
          </Form.Item>

          {/* 審核 */}
          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>審核流程</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>EHS 部門確認</div>
              <Form.Item name="ehsSDS" valuePropName="checked" style={{ marginBottom: 6 }}>
                <Checkbox>已審閱 SDS</Checkbox>
              </Form.Item>
              <Form.Item name="ehsMRSL" valuePropName="checked" style={{ marginBottom: 6 }}>
                <Checkbox>已確認 MRSL 符合性</Checkbox>
              </Form.Item>
            </div>
            <Form.Item name="techOpinion" label="技術部門意見">
              <TextArea rows={3} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item name="supervisorDecision" label="主管決定">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="ceoDecision" label="總經理決定">
              <TextArea rows={2} />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="備註">
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
        width={580}
        destroyOnHidden
      >
        {approvalRecord && (
          <ApprovalChain formType="ChemicalRequest" formId={approvalRecord.id} />
        )}
      </Modal>
    </Card>
  )
}
