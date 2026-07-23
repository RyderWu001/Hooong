import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, DatePicker,
  Popconfirm, message, Divider, Select, Radio,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getSupplierComplianceAudits, createSupplierComplianceAudit,
  updateSupplierComplianceAudit, deleteSupplierComplianceAudit,
} from '../../api/supplierComplianceAudits'

const { TextArea } = Input

interface AdvancedAuditItem { item: string; score: number }

interface SupplierComplianceAudit {
  id: number
  supplierName: string | null
  supplierType: string | null
  mainProducts: string | null
  auditDate: string | null
  supplierCategory: string | null
  qualificationResult: string | null
  priceResult: string | null
  zdhcGateway: number | null
  chemCheckReport: number | null
  mrslDoc: number | null
  sdsTds: number | null
  envCertification: number | null
  complianceSubtotal: number | null
  advancedAudit: AdvancedAuditItem[] | null
  advancedSubtotal: number | null
  totalScore: number | null
  notes: string | null
  createdAt: string
}

const SCORE_OPTIONS = [
  { value: 0, label: '0 - 不符合 / Không phù hợp' },
  { value: 1, label: '1 - 部分符合 / Phù hợp một phần' },
  { value: 2, label: '2 - 完全符合 / Hoàn toàn phù hợp' },
]

const DEFAULT_ADVANCED_AUDIT = (): AdvancedAuditItem[] => [
  { item: '供應商具有環保目標及行動計畫', score: 0 },
  { item: '有定期進行員工環保教育訓練', score: 0 },
  { item: '廢棄物及廢水管理符合當地法規', score: 0 },
  { item: '有提供完整的化學品安全數據表(SDS)', score: 0 },
  { item: '有配合客戶ZDHC要求提供相關文件', score: 0 },
]

function scoreLabel(v: number | null): string {
  if (v === 0) return '0 (不符合)'
  if (v === 1) return '1 (部分符合)'
  if (v === 2) return '2 (完全符合)'
  return '—'
}

function printAudit(row: SupplierComplianceAudit) {
  const adv = row.advancedAudit ?? DEFAULT_ADVANCED_AUDIT()
  const advRows = adv.map(a => `<tr><td class="left">${a.item}</td><td>${scoreLabel(a.score)}</td></tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>化學品供應商評鑑資料表 CMS01-05-2A</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft JhengHei','Noto Sans TC',Arial,sans-serif; font-size: 10px; color: #000; padding: 8mm; }
  .outer { border: 2px solid #000; }
  .header { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
  .header-logo { width: 140px; border-right: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; }
  .logo-brand { font-size: 16px; font-weight: 900; }
  .logo-sub { font-size: 9px; color: #333; margin-top: 2px; }
  .header-title { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; padding: 6px; }
  .header-title h1 { font-size: 11px; font-weight: 900; }
  .header-title h2 { font-size: 10px; font-weight: bold; margin-top: 2px; }
  .header-right { width: 160px; border-left: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .field { font-size: 9.5px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid #000; }
  .info-cell { padding: 3px 6px; border-right: 1px solid #000; font-size: 9px; }
  .info-cell:nth-child(3n) { border-right: none; }
  .info-label { color: #555; font-size: 8.5px; }
  .section-title { background: #e8e8e8; padding: 2px 6px; font-weight: bold; font-size: 10px; border-bottom: 1px solid #000; border-top: 1px solid #000; }
  .check-row { padding: 3px 8px; border-bottom: 1px solid #000; font-size: 9.5px; display: flex; gap: 16px; }
  .check-label { font-weight: bold; min-width: 100px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  th, td { border: 1px solid #000; padding: 2px 5px; text-align: center; }
  th { background: #e8e8e8; }
  td.left { text-align: left; }
  .total-row { border-top: 2px solid #000; padding: 4px 8px; font-size: 11px; font-weight: bold; }
  .free-text { padding: 4px 8px; min-height: 40px; white-space: pre-wrap; font-size: 10px; border-top: 1px solid #000; }
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
      <h1>THÔNG TIN CƠ BẢN NHÀ CUNG CẤP / 供應商評鑑資料表</h1>
      <h2>化學品供應商評鑑資料表 (內部稽核)</h2>
    </div>
    <div class="header-right">
      <div class="field"><strong>表單編號:</strong> CMS01-05-2A</div>
      <div class="field"><strong>稽核日期:</strong> ${row.auditDate ? dayjs(row.auditDate).format('YYYY-MM-DD') : ''}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-cell"><div class="info-label">LOẠI HÌNH / 供應商類型</div>${row.supplierType ?? ''}</div>
    <div class="info-cell"><div class="info-label">TÊN CÔNG TY / 公司名稱</div>${row.supplierName ?? ''}</div>
    <div class="info-cell"><div class="info-label">NHÓM SẢN PHẨM / 主要產品分類</div>${row.mainProducts ?? ''}</div>
  </div>

  <div class="section-title">資格評估 / ĐÁNH GIÁ ĐIỀU KIỆN</div>
  <div class="check-row">
    <span class="check-label">供應商類別:</span>
    ${row.supplierCategory === 'old' ? '☑' : '☐'} 舊供應商&nbsp;&nbsp;
    ${row.supplierCategory === 'new' ? '☑' : '☐'} 新供應商
  </div>
  <div class="check-row">
    <span class="check-label">資格評估結果:</span>
    ${row.qualificationResult === 'pass' ? '☑' : '☐'} 合格 / Đạt&nbsp;&nbsp;
    ${row.qualificationResult === 'fail' ? '☑' : '☐'} 不合格 / Không đạt
  </div>
  <div class="check-row">
    <span class="check-label">價格評估結果:</span>
    ${row.priceResult === 'pass' ? '☑' : '☐'} 合格 / Đạt&nbsp;&nbsp;
    ${row.priceResult === 'fail' ? '☑' : '☐'} 不合格 / Không đạt
  </div>

  <div class="section-title">MRSL ZDHC 合規評分表 / BẢNG ĐIỂM TUÂN THỦ MRSL ZDHC（小計 /10分）</div>
  <table>
    <thead>
      <tr><th>評估項目</th><th>評分（0/1/2）</th></tr>
    </thead>
    <tbody>
      <tr><td class="left">1. ZDHC Gateway 註冊（已註冊並維持更新）</td><td>${scoreLabel(row.zdhcGateway)}</td></tr>
      <tr><td class="left">2. ChemCheck 報告（定期提供並有效）</td><td>${scoreLabel(row.chemCheckReport)}</td></tr>
      <tr><td class="left">3. MRSL 合規聲明文件 DoC（文件完整並簽章）</td><td>${scoreLabel(row.mrslDoc)}</td></tr>
      <tr><td class="left">4. SDS/TDS（最新版本，符合GHS）</td><td>${scoreLabel(row.sdsTds)}</td></tr>
      <tr><td class="left">5. 環保認證 ISO/OEKO/ZDHC Level（具官方或第三方證書）</td><td>${scoreLabel(row.envCertification)}</td></tr>
      <tr style="font-weight:bold"><td class="left">小計 / TỔNG PHỤ</td><td>${row.complianceSubtotal ?? 0} / 10</td></tr>
    </tbody>
  </table>

  <div class="section-title">進階合規與教育訓練 / TUÂN THỦ NÂNG CAO（小計 /10分）</div>
  <table>
    <thead><tr><th>評估項目</th><th>評分（0/1/2）</th></tr></thead>
    <tbody>
      ${advRows}
      <tr style="font-weight:bold"><td class="left">小計 / TỔNG PHỤ</td><td>${row.advancedSubtotal ?? 0} / 10</td></tr>
    </tbody>
  </table>

  <div class="total-row">總分 / TỔNG ĐIỂM: ${row.totalScore ?? 0} / 20</div>

  <div class="free-text">
    <strong>備註 / GHI CHÚ:</strong><br>${row.notes ?? ''}
  </div>

  <div class="footer">(附件15) CMS01-05-2A 化學品供應商評鑑資料表（內部稽核）</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function SupplierComplianceAuditPage() {
  const [list, setList] = useState<SupplierComplianceAudit[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierComplianceAudit | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [advancedAudit, setAdvancedAudit] = useState<AdvancedAuditItem[]>(DEFAULT_ADVANCED_AUDIT())

  const calcSubtotals = useCallback(() => {
    const values = form.getFieldsValue()
    const compliance = [values.zdhcGateway, values.chemCheckReport, values.mrslDoc, values.sdsTds, values.envCertification]
      .reduce((acc, v) => acc + (v ?? 0), 0)
    const advanced = advancedAudit.reduce((acc, a) => acc + (a.score ?? 0), 0)
    form.setFieldsValue({ complianceSubtotal: compliance, advancedSubtotal: advanced, totalScore: compliance + advanced })
  }, [form, advancedAudit])

  useEffect(() => { calcSubtotals() }, [advancedAudit, calcSubtotals])

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getSupplierComplianceAudits({ page: p, limit: 20 })
      setList(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ auditDate: dayjs() })
    setAdvancedAudit(DEFAULT_ADVANCED_AUDIT())
    setModalOpen(true)
  }

  const openEdit = (row: SupplierComplianceAudit) => {
    setEditing(row)
    form.setFieldsValue({
      supplierName: row.supplierName ?? '',
      supplierType: row.supplierType ?? '',
      mainProducts: row.mainProducts ?? '',
      auditDate: row.auditDate ? dayjs(row.auditDate) : null,
      supplierCategory: row.supplierCategory ?? undefined,
      qualificationResult: row.qualificationResult ?? undefined,
      priceResult: row.priceResult ?? undefined,
      zdhcGateway: row.zdhcGateway ?? 0,
      chemCheckReport: row.chemCheckReport ?? 0,
      mrslDoc: row.mrslDoc ?? 0,
      sdsTds: row.sdsTds ?? 0,
      envCertification: row.envCertification ?? 0,
      complianceSubtotal: row.complianceSubtotal ?? 0,
      advancedSubtotal: row.advancedSubtotal ?? 0,
      totalScore: row.totalScore ?? 0,
      notes: row.notes ?? '',
    })
    setAdvancedAudit(row.advancedAudit?.length ? row.advancedAudit : DEFAULT_ADVANCED_AUDIT())
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const compliance = [values.zdhcGateway, values.chemCheckReport, values.mrslDoc, values.sdsTds, values.envCertification]
        .reduce((acc: number, v: number) => acc + (v ?? 0), 0)
      const advanced = advancedAudit.reduce((acc, a) => acc + (a.score ?? 0), 0)
      const payload = {
        supplierName: values.supplierName || null,
        supplierType: values.supplierType || null,
        mainProducts: values.mainProducts || null,
        auditDate: values.auditDate ? values.auditDate.format('YYYY-MM-DD') : null,
        supplierCategory: values.supplierCategory || null,
        qualificationResult: values.qualificationResult || null,
        priceResult: values.priceResult || null,
        zdhcGateway: values.zdhcGateway ?? null,
        chemCheckReport: values.chemCheckReport ?? null,
        mrslDoc: values.mrslDoc ?? null,
        sdsTds: values.sdsTds ?? null,
        envCertification: values.envCertification ?? null,
        complianceSubtotal: compliance,
        advancedAudit,
        advancedSubtotal: advanced,
        totalScore: compliance + advanced,
        notes: values.notes || null,
      }
      if (editing) {
        await updateSupplierComplianceAudit(editing.id, payload); message.success('已更新')
      } else {
        await createSupplierComplianceAudit(payload); message.success('已新增')
      }
      setModalOpen(false); load(page)
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteSupplierComplianceAudit(id); message.success('已刪除'); load(page) }
    catch { message.error('刪除失敗') }
  }

  const columns: ColumnsType<SupplierComplianceAudit> = [
    {
      title: '稽核日期', dataIndex: 'auditDate', key: 'auditDate', width: 120,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    { title: '供應商名稱', dataIndex: 'supplierName', key: 'supplierName', render: v => v ?? '—' },
    { title: '供應商類型', dataIndex: 'supplierType', key: 'supplierType', width: 120, render: v => v ?? '—' },
    {
      title: '總分', dataIndex: 'totalScore', key: 'totalScore', width: 80,
      render: v => v != null ? `${v} / 20` : '—',
    },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printAudit(row)}>列印</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="確定刪除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const ZDHC_ITEMS = [
    { name: 'zdhcGateway', label: '1. ZDHC Gateway 註冊（已註冊並維持更新）' },
    { name: 'chemCheckReport', label: '2. ChemCheck 報告（定期提供並有效）' },
    { name: 'mrslDoc', label: '3. MRSL 合規聲明文件 DoC（文件完整並簽章）' },
    { name: 'sdsTds', label: '4. SDS/TDS（最新版本，符合GHS）' },
    { name: 'envCertification', label: '5. 環保認證 ISO/OEKO/ZDHC Level（具官方或第三方證書）' },
  ]

  return (
    <Card
      title={<Space><SafetyCertificateOutlined />化學品供應商評鑑資料表 (CMS01-05-2A)</Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增評鑑</Button>}
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
        title={editing ? '編輯化學品供應商評鑑資料表' : '新增化學品供應商評鑑資料表'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
        width={860}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Divider plain style={{ margin: '0 0 8px', fontSize: 12 }}>供應商基本資料</Divider>
          <Space wrap size={8}>
            <Form.Item name="supplierName" label="TÊN CÔNG TY / 公司名稱" style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="supplierType" label="LOẠI HÌNH / 供應商類型" style={{ width: 160 }}>
              <Input />
            </Form.Item>
            <Form.Item name="mainProducts" label="NHÓM SẢN PHẨM / 主要產品分類" style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="auditDate" label="稽核日期">
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>
          </Space>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>資格評估 / ĐÁNH GIÁ ĐIỀU KIỆN</Divider>
          <Space wrap size={24}>
            <Form.Item name="supplierCategory" label="供應商類別">
              <Radio.Group>
                <Radio value="old">舊供應商</Radio>
                <Radio value="new">新供應商</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="qualificationResult" label="資格評估結果">
              <Radio.Group>
                <Radio value="pass">合格 / Đạt</Radio>
                <Radio value="fail">不合格 / Không đạt</Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="priceResult" label="價格評估結果">
              <Radio.Group>
                <Radio value="pass">合格 / Đạt</Radio>
                <Radio value="fail">不合格 / Không đạt</Radio>
              </Radio.Group>
            </Form.Item>
          </Space>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>MRSL ZDHC 合規評分表（滿分10分）</Divider>
          {ZDHC_ITEMS.map(item => (
            <Form.Item key={item.name} name={item.name} label={item.label} style={{ marginBottom: 8 }}>
              <Select options={SCORE_OPTIONS} style={{ width: 260 }} onChange={calcSubtotals} />
            </Form.Item>
          ))}
          <Form.Item name="complianceSubtotal" label="MRSL ZDHC 小計">
            <Input readOnly style={{ width: 100 }} suffix="/ 10" />
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>進階合規與教育訓練（滿分10分）</Divider>
          {advancedAudit.map((a, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{a.item}</span>
              <Select
                value={a.score}
                options={SCORE_OPTIONS}
                style={{ width: 260 }}
                onChange={v => {
                  setAdvancedAudit(prev => prev.map((x, i) => i === idx ? { ...x, score: v } : x))
                }}
              />
            </div>
          ))}
          <Form.Item name="advancedSubtotal" label="進階合規小計">
            <Input readOnly style={{ width: 100 }} suffix="/ 10" />
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>總分 / TỔNG ĐIỂM</Divider>
          <Form.Item name="totalScore" label="總分">
            <Input readOnly style={{ width: 120, fontWeight: 'bold' }} suffix="/ 20" />
          </Form.Item>

          <Form.Item name="notes" label="備註 / GHI CHÚ">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
