import { useEffect, useState, useCallback } from 'react'
import {
  Card, Tabs, Table, Button, Modal, Form, Input, InputNumber,
  Space, Popconfirm, message, Select, DatePicker, Tag, Descriptions,
  Drawer, Checkbox, Divider,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined, ShoppingCartOutlined, PrinterOutlined, FileTextOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getEvaluations, createEvaluation,
  getPurchases, createPurchase, updatePurchase,
} from '../../api/suppliers'
import { getIngredients } from '../../api/formulas'
import type { Supplier, SupplierEvaluation, PurchaseRecord, EvaluationLevel, Ingredient, PurchaseStatus } from '../../types'
import { useAuthStore } from '../../stores/authStore'

const LEVEL_COLOR: Record<EvaluationLevel, string> = { A: 'green', B: 'blue', C: 'orange', D: 'red' }
const PURCHASE_STATUS_COLOR = { PENDING: 'orange', DELIVERED: 'green', CANCELLED: 'red' }
const PURCHASE_STATUS_LABEL = { PENDING: '待交貨', DELIVERED: '已到貨', CANCELLED: '已取消' }

// ─── 附件14: 印表函數 ─────────────────────────────────────────────────────────

function printSupplierDetail(row: Supplier) {
  const types = (row as any).supplierTypes ?? []
  const certs = (row as any).certifications ?? []
  const products = (row as any).tradingProducts ?? []
  const compliance = (row as any).complianceDocs ?? {}

  const SUPPLIER_TYPE_OPTIONS = ['原料供應商', '代理商', '貿易商', '製造商', '其他']
  const CERT_OPTIONS = ['ISO 9001', 'ISO 14001', 'OEKO-TEX', 'ZDHC MRSL', 'REACH', 'Bluesign', 'GHS']
  const COMPLIANCE_ITEMS = [
    { key: 'sds', label: 'SDS 安全數據表' },
    { key: 'tds', label: 'TDS 技術數據表' },
    { key: 'coa', label: 'COA 品質證書' },
    { key: 'mrsl', label: 'MRSL 合規聲明' },
    { key: 'zdhc', label: 'ZDHC Gateway 登錄' },
  ]

  const productRows = products.map((p: string) => `<tr><td>${p}</td></tr>`).join('')
  const complianceRows = COMPLIANCE_ITEMS.map(c => `<tr><td>${c.label}</td><td>${compliance[c.key] === 'yes' ? '☑ 有' : compliance[c.key] === 'no' ? '☐ 無' : '☐ 未知'}</td></tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>化學品供應商資料表 CMS01-05-1A</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft JhengHei','Noto Sans TC',Arial,sans-serif; font-size: 10px; color: #000; padding: 8mm; }
  .outer { border: 2px solid #000; }
  .header { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
  .header-logo { width: 140px; border-right: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; }
  .logo-brand { font-size: 16px; font-weight: 900; }
  .logo-sub { font-size: 9px; color: #333; margin-top: 2px; }
  .header-title { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; padding: 6px; }
  .header-title h1 { font-size: 12px; font-weight: 900; }
  .header-title h2 { font-size: 10px; font-weight: bold; margin-top: 2px; }
  .header-right { width: 160px; border-left: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .field { font-size: 9.5px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .section-title { background: #e8e8e8; padding: 2px 6px; font-weight: bold; font-size: 10px; border-bottom: 1px solid #000; border-top: 1px solid #000; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid #000; }
  .info-cell { padding: 3px 6px; border-right: 1px solid #000; font-size: 9.5px; }
  .info-cell:nth-child(3n) { border-right: none; }
  .info-label { color: #555; font-size: 8.5px; margin-bottom: 1px; }
  .check-grid { padding: 4px 8px; border-bottom: 1px solid #000; display: flex; flex-wrap: wrap; gap: 8px; font-size: 9.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  th, td { border: 1px solid #000; padding: 2px 5px; }
  th { background: #e8e8e8; }
  .footer { text-align: center; font-size: 9px; padding: 3px; border-top: 1px solid #ccc; }
  @media print { @page { margin: 6mm; size: A4 portrait; } }
</style>
</head>
<body>
<div class="outer">
  <div class="header">
    <div class="header-logo">
      <div class="logo-brand">RICH<sup>®</sup></div>
      <div class="logo-sub">CÔNG TY TNHH WANG LONG</div>
      <div class="logo-sub">旺隆責任有限公司</div>
    </div>
    <div class="header-title">
      <h1>THÔNG TIN NHÀ CUNG CẤP HÓA CHẤT</h1>
      <h2>化學品供應商資料表（客戶）</h2>
    </div>
    <div class="header-right">
      <div class="field"><strong>表單編號:</strong> CMS01-05-1A</div>
      <div class="field"><strong>供應商編號:</strong> ${row.code}</div>
    </div>
  </div>

  <div class="section-title">供應商基本資料 / THÔNG TIN CƠ BẢN</div>
  <div class="info-grid">
    <div class="info-cell"><div class="info-label">供應商名稱 / TÊN NCC</div>${row.name}</div>
    <div class="info-cell"><div class="info-label">聯絡人 / NGƯỜI LIÊN HỆ</div>${row.contactPerson}</div>
    <div class="info-cell"><div class="info-label">電話 / ĐIỆN THOẠI</div>${row.phone}</div>
    <div class="info-cell"><div class="info-label">Email</div>${row.email}</div>
    <div class="info-cell"><div class="info-label">地址 / ĐỊA CHỈ</div>${row.address}</div>
    <div class="info-cell"><div class="info-label">廠址 / NHÀ MÁY</div>${(row as any).factoryAddress ?? ''}</div>
    <div class="info-cell"><div class="info-label">成立日期 / NGÀY THÀNH LẬP</div>${(row as any).establishedDate ?? ''}</div>
    <div class="info-cell"><div class="info-label">負責人 / GIÁM ĐỐC</div>${(row as any).director ?? ''}</div>
    <div class="info-cell"><div class="info-label">統一編號 / MÃ SỐ THUẾ</div>${(row as any).taxNo ?? ''}</div>
    <div class="info-cell"><div class="info-label">網站 / WEBSITE</div>${(row as any).website ?? ''}</div>
    <div class="info-cell"><div class="info-label">傳真 / FAX</div>${(row as any).fax ?? ''}</div>
    <div class="info-cell"><div class="info-label">會計Email</div>${(row as any).accountingEmail ?? ''}</div>
    <div class="info-cell"><div class="info-label">商業登記 / ĐĂNG KÝ KINH DOANH</div>${(row as any).hasBizLicense ? '☑ 有 / Có' : '☐ 無 / Không'}</div>
  </div>

  <div class="section-title">供應商類型 / LOẠI HÌNH NCC</div>
  <div class="check-grid">
    ${SUPPLIER_TYPE_OPTIONS.map(t => `<span>${types.includes(t) ? '☑' : '☐'} ${t}</span>`).join('')}
  </div>

  <div class="section-title">已取得認證 / CHỨNG NHẬN ĐÃ ĐẠT ĐƯỢC</div>
  <div class="check-grid">
    ${CERT_OPTIONS.map(c => `<span>${certs.includes(c) ? '☑' : '☐'} ${c}</span>`).join('')}
  </div>

  <div class="section-title">化學品合規文件 / TÀI LIỆU TUÂN THỦ HÓA CHẤT</div>
  <table>
    <thead><tr><th>文件名稱 / TÀI LIỆU</th><th>狀態 / TÌNH TRẠNG</th></tr></thead>
    <tbody>${complianceRows}</tbody>
  </table>

  <div class="section-title">交易產品清單 / DANH SÁCH SẢN PHẨM GIAO DỊCH</div>
  <table>
    <thead><tr><th>產品名稱 / TÊN SẢN PHẨM</th></tr></thead>
    <tbody>${productRows || '<tr><td>—</td></tr>'}</tbody>
  </table>

  <div class="footer">(附件14) CMS01-05-1A 化學品供應商資料表（客戶）</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

// ─── Tab 1：供應商資料維護 ────────────────────────────────────────────────────

const SUPPLIER_TYPE_OPTIONS = ['原料供應商', '代理商', '貿易商', '製造商', '其他']
const CERT_OPTIONS_14 = ['ISO 9001', 'ISO 14001', 'OEKO-TEX', 'ZDHC MRSL', 'REACH', 'Bluesign', 'GHS']
const COMPLIANCE_ITEMS = [
  { key: 'sds', label: 'SDS 安全數據表' },
  { key: 'tds', label: 'TDS 技術數據表' },
  { key: 'coa', label: 'COA 品質證書' },
  { key: 'mrsl', label: 'MRSL 合規聲明' },
  { key: 'zdhc', label: 'ZDHC Gateway 登錄' },
]

function SupplierTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN'
  const [data, setData] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form] = Form.useForm()
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null)
  const [detailForm] = Form.useForm()
  const [tradingProducts, setTradingProducts] = useState<string[]>([])
  const [complianceDocs, setComplianceDocs] = useState<Record<string, string>>({})
  const [savingDetail, setSavingDetail] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await getSuppliers({ limit: 100 }); setData(res.data.data) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (row: Supplier) => { setEditing(row); form.setFieldsValue(row); setModalOpen(true) }

  const openDetail = (row: Supplier) => {
    setDetailSupplier(row)
    const r = row as any
    detailForm.setFieldsValue({
      supplierTypes: r.supplierTypes ?? [],
      factoryAddress: r.factoryAddress ?? '',
      establishedDate: r.establishedDate ?? '',
      hasBizLicense: r.hasBizLicense ?? false,
      taxNo: r.taxNo ?? '',
      website: r.website ?? '',
      director: r.director ?? '',
      fax: r.fax ?? '',
      accountingEmail: r.accountingEmail ?? '',
      certifications: r.certifications ?? [],
    })
    setTradingProducts(r.tradingProducts ?? [])
    setComplianceDocs(r.complianceDocs ?? {})
    setDetailOpen(true)
  }

  const handleSaveDetail = async () => {
    const values = await detailForm.validateFields()
    setSavingDetail(true)
    try {
      await updateSupplier(detailSupplier!.id, {
        ...values,
        tradingProducts,
        complianceDocs,
      } as any)
      message.success('詳細資料已儲存')
      setDetailOpen(false)
      load()
    } catch { message.error('儲存失敗') }
    finally { setSavingDetail(false) }
  }

  const handleSave = async (values: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editing) { await updateSupplier(editing.id, values); message.success('已更新') }
      else { await createSupplier(values as Parameters<typeof createSupplier>[0]); message.success('已新增') }
      setModalOpen(false); load()
    } catch { message.error('儲存失敗') }
  }

  const columns: ColumnsType<Supplier> = [
    { title: '編號', dataIndex: 'code', key: 'code', width: 110 },
    { title: '供應商名稱', dataIndex: 'name', key: 'name' },
    { title: '聯絡人', dataIndex: 'contactPerson', key: 'contactPerson', width: 100 },
    { title: '電話', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: '供應品項', dataIndex: 'supplyItems', key: 'supplyItems' },
    { title: '狀態', dataIndex: 'status', key: 'status', width: 80,
      render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v === 'ACTIVE' ? '啟用' : '停用'}</Tag> },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: unknown, row: Supplier) => (
        <Space>
          <Button size="small" icon={<FileTextOutlined />} onClick={() => openDetail(row)}>詳細資料</Button>
          {canEdit && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>編輯</Button>
              <Popconfirm title="確定刪除？" onConfirm={async () => { await deleteSupplier(row.id); message.success('已刪除'); load() }}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      {canEdit && <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openAdd}>新增供應商</Button>}
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      <Modal open={modalOpen} title={editing ? '編輯供應商' : '新增供應商'} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {!editing && <Form.Item name="code" label="供應商編號" rules={[{ required: true }]}><Input placeholder="SUP-001" /></Form.Item>}
          <Form.Item name="name" label="供應商名稱" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="contactPerson" label="聯絡人" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone" label="電話"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="address" label="地址"><Input /></Form.Item>
          <Form.Item name="supplyItems" label="供應品項" rules={[{ required: true }]}><Input placeholder="乙醇, 氫氧化鈉" /></Form.Item>
          {editing && (
            <Form.Item name="status" label="狀態">
              <Select options={[{ value: 'ACTIVE', label: '啟用' }, { value: 'INACTIVE', label: '停用' }]} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 附件14: CMS01-05-1A 化學品供應商詳細資料 Drawer */}
      <Drawer
        title={
          <Space>
            <FileTextOutlined />
            化學品供應商資料表 (CMS01-05-1A) — {detailSupplier?.name}
            {detailSupplier && (
              <Button size="small" icon={<PrinterOutlined />} onClick={() => printSupplierDetail(detailSupplier)}>列印</Button>
            )}
          </Space>
        }
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={760}
        extra={
          <Button type="primary" loading={savingDetail} onClick={handleSaveDetail}>儲存</Button>
        }
      >
        <Form form={detailForm} layout="vertical">
          <Divider plain style={{ margin: '0 0 8px', fontSize: 12 }}>供應商類型 / LOẠI HÌNH NCC</Divider>
          <Form.Item name="supplierTypes">
            <Checkbox.Group options={SUPPLIER_TYPE_OPTIONS} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }} />
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>詳細基本資料</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item name="factoryAddress" label="廠址 / ĐỊA CHỈ NHÀ MÁY"><Input /></Form.Item>
            <Form.Item name="establishedDate" label="成立日期 / NGÀY THÀNH LẬP"><Input placeholder="e.g. 2010-01-01" /></Form.Item>
            <Form.Item name="director" label="負責人 / GIÁM ĐỐC"><Input /></Form.Item>
            <Form.Item name="taxNo" label="統一編號 / MÃ SỐ THUẾ"><Input /></Form.Item>
            <Form.Item name="website" label="網站 / WEBSITE"><Input /></Form.Item>
            <Form.Item name="fax" label="傳真 / FAX"><Input /></Form.Item>
            <Form.Item name="accountingEmail" label="會計Email"><Input /></Form.Item>
            <Form.Item name="hasBizLicense" label="商業登記 / ĐĂNG KÝ KINH DOANH" valuePropName="checked">
              <Checkbox>已取得 / Đã đăng ký</Checkbox>
            </Form.Item>
          </div>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>已取得認證 / CHỨNG NHẬN</Divider>
          <Form.Item name="certifications">
            <Checkbox.Group options={CERT_OPTIONS_14} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }} />
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>化學品合規文件 / TÀI LIỆU TUÂN THỦ</Divider>
          {COMPLIANCE_ITEMS.map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ flex: 1 }}>{item.label}</span>
              <Select
                value={complianceDocs[item.key] ?? ''}
                onChange={v => setComplianceDocs(prev => ({ ...prev, [item.key]: v }))}
                options={[
                  { value: '', label: '未知' },
                  { value: 'yes', label: '有 / Có' },
                  { value: 'no', label: '無 / Không' },
                ]}
                style={{ width: 130 }}
              />
            </div>
          ))}

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>交易產品清單 / DANH SÁCH SẢN PHẨM</Divider>
          {tradingProducts.map((p, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <Input
                value={p}
                onChange={e => setTradingProducts(prev => prev.map((x, i) => i === idx ? e.target.value : x))}
                placeholder={`產品 ${idx + 1}`}
              />
              <Button
                size="small"
                danger
                onClick={() => setTradingProducts(prev => prev.filter((_, i) => i !== idx))}
              >刪除</Button>
            </div>
          ))}
          <Button
            size="small"
            onClick={() => setTradingProducts(prev => [...prev, ''])}
            style={{ marginTop: 4 }}
          >+ 新增產品</Button>
        </Form>
      </Drawer>
    </>
  )
}

// ─── Tab 2：供應商評鑑 ────────────────────────────────────────────────────────

function EvaluationTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [data, setData] = useState<SupplierEvaluation[]>([])
  const [loading, setLoading] = useState(false)
  const [filterSupplierId, setFilterSupplierId] = useState<number | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<SupplierEvaluation | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [evRes, supRes] = await Promise.all([getEvaluations({ supplierId: filterSupplierId }), getSuppliers({ limit: 100 })])
      setData(evRes.data.data); setSuppliers(supRes.data.data)
    } finally { setLoading(false) }
  }, [filterSupplierId])

  useEffect(() => { load() }, [load])

  const handleSave = async (values: { supplierId: number; evaluationDate: dayjs.Dayjs; qualityScore: number; deliveryScore: number; priceScore: number; serviceScore: number; notes: string }) => {
    try {
      await createEvaluation({ ...values, evaluationDate: values.evaluationDate.format('YYYY-MM-DD') })
      message.success('評鑑已新增'); setModalOpen(false); load()
    } catch { message.error('新增失敗') }
  }

  const columns: ColumnsType<SupplierEvaluation> = [
    { title: '評鑑日期', dataIndex: 'evaluationDate', key: 'evaluationDate', width: 110 },
    { title: '供應商', dataIndex: 'supplierName', key: 'supplierName' },
    { title: '品質', dataIndex: 'qualityScore', key: 'qualityScore', width: 70, render: (v) => `${v}分` },
    { title: '交期', dataIndex: 'deliveryScore', key: 'deliveryScore', width: 70, render: (v) => `${v}分` },
    { title: '價格', dataIndex: 'priceScore', key: 'priceScore', width: 70, render: (v) => `${v}分` },
    { title: '服務', dataIndex: 'serviceScore', key: 'serviceScore', width: 70, render: (v) => `${v}分` },
    { title: '綜合分數', dataIndex: 'totalScore', key: 'totalScore', width: 90, render: (v) => `${v}分` },
    { title: '等級', dataIndex: 'level', key: 'level', width: 70, render: (v: EvaluationLevel) => <Tag color={LEVEL_COLOR[v]}>{v}</Tag> },
    { title: '評鑑人', dataIndex: 'evaluator', key: 'evaluator', width: 90 },
    { title: '操作', key: 'action', width: 70,
      render: (_, row) => <Button size="small" onClick={() => setDetail(row)}>詳情</Button> },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true) }}>新增評鑑</Button>}
        <Select allowClear placeholder="篩選供應商" style={{ width: 200 }}
          options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(v) => setFilterSupplierId(v)} />
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />

      <Modal open={modalOpen} title="新增供應商評鑑" onCancel={() => setModalOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ evaluationDate: dayjs() }}>
          <Form.Item name="supplierId" label="供應商" rules={[{ required: true }]}>
            <Select options={suppliers.filter((s) => s.status === 'ACTIVE').map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="evaluationDate" label="評鑑日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {(['qualityScore', 'deliveryScore', 'priceScore', 'serviceScore'] as const).map((field) => {
            const labels = { qualityScore: '品質分數', deliveryScore: '交期分數', priceScore: '價格分數', serviceScore: '服務分數' }
            return (
              <Form.Item key={field} name={field} label={labels[field]} rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="分" />
              </Form.Item>
            )
          })}
          <Form.Item name="notes" label="備註"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={!!detail} title="評鑑詳情" onCancel={() => setDetail(null)} footer={null}>
        {detail && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="供應商">{detail.supplierName}</Descriptions.Item>
            <Descriptions.Item label="評鑑日期">{detail.evaluationDate}</Descriptions.Item>
            <Descriptions.Item label="品質分數">{detail.qualityScore}</Descriptions.Item>
            <Descriptions.Item label="交期分數">{detail.deliveryScore}</Descriptions.Item>
            <Descriptions.Item label="價格分數">{detail.priceScore}</Descriptions.Item>
            <Descriptions.Item label="服務分數">{detail.serviceScore}</Descriptions.Item>
            <Descriptions.Item label="綜合分數"><strong>{detail.totalScore}</strong></Descriptions.Item>
            <Descriptions.Item label="等級"><Tag color={LEVEL_COLOR[detail.level]}>{detail.level}</Tag></Descriptions.Item>
            <Descriptions.Item label="評鑑人" span={2}>{detail.evaluator}</Descriptions.Item>
            <Descriptions.Item label="備註" span={2}>{detail.notes || '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  )
}

// ─── Tab 3：採購紀錄查詢 ──────────────────────────────────────────────────────

function PurchaseTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const [data, setData] = useState<PurchaseRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [filters, setFilters] = useState<{ supplierId?: number; status?: PurchaseStatus; ingredientName?: string; dateFrom?: string; dateTo?: string; page: number; limit: number }>({ page: 1, limit: 20 })
  const [addOpen, setAddOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<PurchaseRecord | null>(null)
  const [addForm] = Form.useForm()
  const [statusForm] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, sRes, iRes] = await Promise.all([getPurchases(filters), getSuppliers({ limit: 100 }), getIngredients({ limit: 200 })])
      setData(pRes.data.data); setTotal(pRes.data.pagination?.total ?? pRes.data.data.length)
      setSuppliers(sRes.data.data); setIngredients(iRes.data.data)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  const handleAdd = async (values: { supplierId: number; ingredientId: number; quantity: number; unitPrice: number; purchaseDate: dayjs.Dayjs; notes: string }) => {
    try {
      await createPurchase({ ...values, purchaseDate: values.purchaseDate.format('YYYY-MM-DD') })
      message.success('採購單已建立'); setAddOpen(false); load()
    } catch { message.error('建立失敗') }
  }

  const handleStatusUpdate = async (values: { status: PurchaseStatus; deliveryDate?: dayjs.Dayjs; notes?: string }) => {
    if (!statusTarget) return
    try {
      await updatePurchase(statusTarget.id, { ...values, deliveryDate: values.deliveryDate?.format('YYYY-MM-DD') })
      message.success('狀態已更新'); setStatusTarget(null); load()
    } catch { message.error('更新失敗') }
  }

  const columns: ColumnsType<PurchaseRecord> = [
    { title: '採購日期', dataIndex: 'purchaseDate', key: 'purchaseDate', width: 110 },
    { title: '供應商', dataIndex: 'supplierName', key: 'supplierName' },
    { title: '原料', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '數量', key: 'qty', width: 100, render: (_, r) => `${r.quantity} ${r.unit}` },
    { title: '單價', dataIndex: 'unitPrice', key: 'unitPrice', width: 80, render: (v) => `$${v}` },
    { title: '總金額', dataIndex: 'totalAmount', key: 'totalAmount', width: 90, render: (v) => `$${v}` },
    { title: '到貨日', dataIndex: 'deliveryDate', key: 'deliveryDate', width: 110, render: (v) => v ?? '—' },
    { title: '狀態', dataIndex: 'status', key: 'status', width: 90,
      render: (v) => <Tag color={PURCHASE_STATUS_COLOR[v as keyof typeof PURCHASE_STATUS_COLOR]}>{PURCHASE_STATUS_LABEL[v as keyof typeof PURCHASE_STATUS_LABEL]}</Tag> },
    ...(canEdit ? [{
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, row: PurchaseRecord) => (
        <Button size="small" disabled={row.status !== 'PENDING'}
          onClick={() => { setStatusTarget(row); statusForm.setFieldsValue({ status: row.status }) }}>
          更新狀態
        </Button>
      ),
    }] : []),
  ]

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => { addForm.resetFields(); setAddOpen(true) }}>新增採購單</Button>}
        <Select allowClear placeholder="供應商" style={{ width: 180 }}
          options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          onChange={(v) => setFilters((f) => ({ ...f, supplierId: v, page: 1 }))} />
        <Select allowClear placeholder="狀態" style={{ width: 120 }}
          options={[{ value: 'PENDING', label: '待交貨' }, { value: 'DELIVERED', label: '已到貨' }, { value: 'CANCELLED', label: '已取消' }]}
          onChange={(v) => setFilters((f) => ({ ...f, status: v as PurchaseStatus | undefined, page: 1 }))} />
        <Input placeholder="原料名稱" allowClear style={{ width: 140 }}
          onChange={(e) => setFilters((f) => ({ ...f, ingredientName: e.target.value || undefined, page: 1 }))} />
        <DatePicker placeholder="起始日" onChange={(d) => setFilters((f) => ({ ...f, dateFrom: d?.format('YYYY-MM-DD'), page: 1 }))} />
        <DatePicker placeholder="結束日" onChange={(d) => setFilters((f) => ({ ...f, dateTo: d?.format('YYYY-MM-DD'), page: 1 }))} />
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data}
        pagination={{ current: filters.page, pageSize: filters.limit, total, onChange: (p, l) => setFilters((f) => ({ ...f, page: p, limit: l })) }} />

      <Modal open={addOpen} title="新增採購單" onCancel={() => setAddOpen(false)} onOk={() => addForm.submit()} destroyOnClose>
        <Form form={addForm} layout="vertical" onFinish={handleAdd} initialValues={{ purchaseDate: dayjs() }}>
          <Form.Item name="supplierId" label="供應商" rules={[{ required: true }]}>
            <Select options={suppliers.filter((s) => s.status === 'ACTIVE').map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="ingredientId" label="原料" rules={[{ required: true }]}>
            <Select options={ingredients.map((i) => ({ value: i.id, label: `${i.name}（${i.unit}）` }))} />
          </Form.Item>
          <Form.Item name="quantity" label="數量" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="unitPrice" label="單價 ($)" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="purchaseDate" label="採購日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="備註"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={!!statusTarget} title="更新採購狀態" onCancel={() => setStatusTarget(null)} onOk={() => statusForm.submit()} destroyOnClose>
        <Form form={statusForm} layout="vertical" onFinish={handleStatusUpdate}>
          <Form.Item name="status" label="狀態" rules={[{ required: true }]}>
            <Select options={[{ value: 'DELIVERED', label: '已到貨' }, { value: 'CANCELLED', label: '已取消' }]} />
          </Form.Item>
          <Form.Item name="deliveryDate" label="實際到貨日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="備註"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  return (
    <Card title="供應商管理">
      <Tabs items={[
        { key: '1', label: '供應商資料維護', icon: <EditOutlined />, children: <SupplierTab /> },
        { key: '2', label: '供應商評鑑', icon: <StarOutlined />, children: <EvaluationTab /> },
        { key: '3', label: '採購紀錄查詢', icon: <ShoppingCartOutlined />, children: <PurchaseTab /> },
      ]} />
    </Card>
  )
}
