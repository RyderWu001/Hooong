import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, DatePicker,
  Popconfirm, message, Divider, Checkbox, Select, InputNumber,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, ToolOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getProductReworks, createProductRework, updateProductRework, deleteProductRework } from '../../api/productReworks'

const { TextArea } = Input

interface MaterialDetail {
  no: number
  name: string
  batchNo: string
  barrelNo: string
  originalRatio: string
  adjustQty: string
  totalQty: string
}

interface QcResult {
  item: string
  itemVn: string
  standard: string
  reworkSpec: string
  result: string
}

interface ProductRework {
  id: number
  productModel: string | null
  productName: string | null
  originalDate: string | null
  originalLot: string | null
  newLot: string | null
  tank: string | null
  originalQty: number | null
  reworkQty: number | null
  reworkReasons: string[] | null
  abnormalDesc: string | null
  materialDetails: MaterialDetail[] | null
  reworkMethod: string | null
  qcResults: QcResult[] | null
  finalJudgment: string | null
  notes: string | null
  createdAt: string
}

const REWORK_REASON_OPTIONS = [
  '原料異常 / NL BT', '外觀異常 / NGOẠI QUAN BT', '固成分不足 / HLCR KHÔNG ĐẠT',
  '生產操作異常 / SX BT', '客戶退貨/客訴 / KH TRẢ/KHIẾU NẠI', '配方誤差 / SAI CT', '其他 / Khác',
]

const DEFAULT_MATERIAL_DETAILS = (): MaterialDetail[] =>
  Array.from({ length: 6 }, (_, i) => ({ no: i + 1, name: '', batchNo: '', barrelNo: '', originalRatio: '', adjustQty: '', totalQty: '' }))

const DEFAULT_QC_RESULTS = (): QcResult[] => [
  { item: '外觀', itemVn: 'NGOẠI QUAN', standard: '', reworkSpec: '', result: '' },
  { item: 'pH1%aq', itemVn: 'pH', standard: '', reworkSpec: '', result: '' },
  { item: '固成份', itemVn: 'CHẤT RẮN', standard: '', reworkSpec: '', result: '' },
  { item: '糖度值', itemVn: 'ĐỘ Brix', standard: '', reworkSpec: '', result: '' },
  { item: '比重', itemVn: 'TỶ TRỌNG', standard: '', reworkSpec: '', result: '' },
]

function printProductRework(row: ProductRework) {
  const reasons = Array.isArray(row.reworkReasons) ? row.reworkReasons : []
  const matDetails = Array.isArray(row.materialDetails) && row.materialDetails.length ? row.materialDetails : DEFAULT_MATERIAL_DETAILS()
  const qcResults = Array.isArray(row.qcResults) && row.qcResults.length ? row.qcResults : DEFAULT_QC_RESULTS()

  const reasonChecks = REWORK_REASON_OPTIONS.map(o =>
    `${reasons.includes(o) ? '☑' : '☐'} ${o}`
  ).join('&nbsp;&nbsp;')

  const matRows = matDetails.map(m => `
    <tr>
      <td>${m.no}</td>
      <td class="left">${m.name}</td>
      <td>${m.batchNo}</td>
      <td>${m.barrelNo}</td>
      <td>${m.originalRatio}</td>
      <td>${m.adjustQty}</td>
      <td>${m.totalQty}</td>
    </tr>`).join('')

  const qcRows = qcResults.map(q => `
    <tr>
      <td>${q.item}<br><small>${q.itemVn}</small></td>
      <td>${q.standard}</td>
      <td>${q.reworkSpec}</td>
      <td>${q.result === 'OK' ? '☑ OK  ☐ NG' : q.result === 'NG' ? '☐ OK  ☑ NG' : '☐ OK  ☐ NG'}</td>
      <td></td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>產品重修配置紀錄表 CMS03-07-7A</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft JhengHei','Noto Sans TC',Arial,sans-serif; font-size: 9.5px; color: #000; padding: 8mm; }
  .outer { border: 2px solid #000; }
  .header { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
  .header-logo { width: 140px; border-right: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; }
  .logo-brand { font-size: 16px; font-weight: 900; }
  .logo-sub { font-size: 9px; color: #333; margin-top: 2px; }
  .header-title { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; padding: 6px; }
  .header-title h1 { font-size: 10px; font-weight: 900; }
  .header-title h2 { font-size: 9.5px; font-weight: bold; margin-top: 2px; }
  .header-right { width: 160px; border-left: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .field { font-size: 9px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid #000; }
  .info-cell { padding: 3px 6px; border-right: 1px solid #000; font-size: 9px; }
  .info-cell:nth-child(4n) { border-right: none; }
  .info-label { color: #555; font-size: 8.5px; }
  .section-title { background: #e8e8e8; padding: 2px 6px; font-weight: bold; font-size: 9.5px; border-bottom: 1px solid #000; border-top: 1px solid #000; }
  .check-row { padding: 4px 8px; border-bottom: 1px solid #000; font-size: 9px; }
  .free-text { padding: 4px 8px; min-height: 40px; white-space: pre-wrap; font-size: 9.5px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th, td { border: 1px solid #000; padding: 2px 4px; text-align: center; }
  th { background: #e8e8e8; }
  td.left { text-align: left; }
  .sig-row { display: grid; grid-template-columns: repeat(6, 1fr); border-top: 2px solid #000; }
  .sig-cell { padding: 4px 6px; border-right: 1px solid #000; min-height: 50px; text-align: center; }
  .sig-cell:last-child { border-right: none; }
  .sig-label { font-size: 8.5px; font-weight: bold; margin-bottom: 4px; }
  .footer { text-align: center; font-size: 8px; padding: 3px; border-top: 1px solid #ccc; }
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
      <h1>BẢNG THEO DÕI TÁI PHA CHẾ / ĐIỀU CHỈNH CÔNG THỨC SẢN PHẨM</h1>
      <h2>產品重修配置紀錄表</h2>
    </div>
    <div class="header-right">
      <div class="field"><strong>表單編號:</strong> CMS03-07-7A</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-cell"><div class="info-label">MODEL SP / 產品型號</div>${row.productModel ?? ''}</div>
    <div class="info-cell"><div class="info-label">TÊN SẢN PHẨM / 產品名稱</div>${row.productName ?? ''}</div>
    <div class="info-cell"><div class="info-label">NGÀY SX GỐC / 原生產日期</div>${row.originalDate ? dayjs(row.originalDate).format('YYYY-MM-DD') : ''}</div>
    <div class="info-cell"><div class="info-label">SỐ LÔ BAN ĐẦU / 原批號</div>${row.originalLot ?? ''}</div>
    <div class="info-cell"><div class="info-label">LÔ MỚI / 重修後新批號</div>${row.newLot ?? ''}</div>
    <div class="info-cell"><div class="info-label">BỒN SX / 生產缸</div>${row.tank ?? ''}</div>
    <div class="info-cell"><div class="info-label">QTY LÔ GỐC / 原批數量(kg)</div>${row.originalQty ?? ''}</div>
    <div class="info-cell"><div class="info-label">QTY TÁI GC / 重修數量(kg)</div>${row.reworkQty ?? ''}</div>
  </div>

  <div class="section-title">重修原因 / NGUYÊN NHÂN TÁI GC</div>
  <div class="check-row">${reasonChecks}</div>
  <div class="free-text" style="border-bottom:1px solid #000">
    <strong>異常說明 / MÔ TẢ BẤT THƯỜNG:</strong><br>${row.abnormalDesc ?? ''}
  </div>

  <div class="section-title">重修配置明細 / CHI TIẾT TÁI GC</div>
  <table>
    <thead>
      <tr>
        <th>序號</th><th>原料名稱</th><th>原料批號</th><th>原料桶號</th>
        <th>原配方比例</th><th>本次調整量(kg)</th><th>調整後總量(kg)</th>
      </tr>
    </thead>
    <tbody>${matRows}</tbody>
  </table>

  <div class="free-text" style="border-top:1px solid #000;border-bottom:1px solid #000">
    <strong>重修作法說明 / PHƯƠNG PHÁP TÁI GC:</strong><br>${row.reworkMethod ?? ''}
  </div>

  <div class="section-title">規格變更說明 / THAY ĐỔI THÔNG SỐ</div>
  <table>
    <thead>
      <tr><th>規格項目</th><th>標準規格</th><th>重修後規格</th><th>是否合格</th><th>重修成品照片</th></tr>
    </thead>
    <tbody>${qcRows}</tbody>
  </table>

  <div class="free-text" style="border-top:1px solid #000;border-bottom:1px solid #000">
    <strong>備註 / GHI CHÚ:</strong><br>${row.notes ?? ''}
  </div>

  <div class="free-text" style="border-bottom:1px solid #000">
    <strong>最終判定 / KẾT QUẢ CUỐI:</strong>&nbsp;${row.finalJudgment ?? ''}
  </div>

  <div class="sig-row">
    <div class="sig-cell"><div class="sig-label">總經理<br>TỔNG GIÁM ĐỐC</div></div>
    <div class="sig-cell"><div class="sig-label">主管核准<br>DUYỆT QL</div></div>
    <div class="sig-cell"><div class="sig-label">技術經理<br>QL KT</div></div>
    <div class="sig-cell"><div class="sig-label">QC</div></div>
    <div class="sig-cell"><div class="sig-label">生管</div></div>
    <div class="sig-cell"><div class="sig-label">廠務部<br>BP SẢN XUẤT</div></div>
  </div>

  <div class="footer">(附件13) CMS03-07-7A 產品重修配置紀錄表</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function ProductReworkPage() {
  const [list, setList] = useState<ProductRework[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductRework | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [matDetails, setMatDetails] = useState<MaterialDetail[]>(DEFAULT_MATERIAL_DETAILS())
  const [qcResults, setQcResults] = useState<QcResult[]>(DEFAULT_QC_RESULTS())

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getProductReworks({ page: p, limit: 20 })
      setList(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    setMatDetails(DEFAULT_MATERIAL_DETAILS())
    setQcResults(DEFAULT_QC_RESULTS())
    setModalOpen(true)
  }

  const openEdit = (row: ProductRework) => {
    setEditing(row)
    form.setFieldsValue({
      productModel: row.productModel ?? '',
      productName: row.productName ?? '',
      originalDate: row.originalDate ? dayjs(row.originalDate) : null,
      originalLot: row.originalLot ?? '',
      newLot: row.newLot ?? '',
      tank: row.tank ?? '',
      originalQty: row.originalQty ?? null,
      reworkQty: row.reworkQty ?? null,
      reworkReasons: Array.isArray(row.reworkReasons) ? row.reworkReasons : [],
      abnormalDesc: row.abnormalDesc ?? '',
      reworkMethod: row.reworkMethod ?? '',
      finalJudgment: row.finalJudgment ?? undefined,
      notes: row.notes ?? '',
    })
    setMatDetails(Array.isArray(row.materialDetails) && row.materialDetails.length ? row.materialDetails : DEFAULT_MATERIAL_DETAILS())
    setQcResults(Array.isArray(row.qcResults) && row.qcResults.length ? row.qcResults : DEFAULT_QC_RESULTS())
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        productModel: values.productModel || null,
        productName: values.productName || null,
        originalDate: values.originalDate ? values.originalDate.format('YYYY-MM-DD') : null,
        originalLot: values.originalLot || null,
        newLot: values.newLot || null,
        tank: values.tank || null,
        originalQty: values.originalQty ?? null,
        reworkQty: values.reworkQty ?? null,
        reworkReasons: values.reworkReasons ?? [],
        abnormalDesc: values.abnormalDesc || null,
        materialDetails: matDetails,
        reworkMethod: values.reworkMethod || null,
        qcResults,
        finalJudgment: values.finalJudgment || null,
        notes: values.notes || null,
      }
      if (editing) {
        await updateProductRework(editing.id, payload); message.success('已更新')
      } else {
        await createProductRework(payload); message.success('已新增')
      }
      setModalOpen(false); load(page)
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteProductRework(id); message.success('已刪除'); load(page) }
    catch { message.error('刪除失敗') }
  }

  const updateMatDetail = (idx: number, field: keyof MaterialDetail, val: string) => {
    setMatDetails(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m))
  }

  const updateQcResult = (idx: number, field: keyof QcResult, val: string) => {
    setQcResults(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const columns: ColumnsType<ProductRework> = [
    { title: '產品型號', dataIndex: 'productModel', key: 'productModel', render: v => v ?? '—' },
    { title: '產品名稱', dataIndex: 'productName', key: 'productName', render: v => v ?? '—' },
    { title: '原批號', dataIndex: 'originalLot', key: 'originalLot', width: 120, render: v => v ?? '—' },
    { title: '重修批號', dataIndex: 'newLot', key: 'newLot', width: 120, render: v => v ?? '—' },
    {
      title: '最終判定', dataIndex: 'finalJudgment', key: 'finalJudgment', width: 130,
      render: v => v ?? '—',
    },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printProductRework(row)}>列印</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="確定刪除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const matFields: (keyof MaterialDetail)[] = ['name', 'batchNo', 'barrelNo', 'originalRatio', 'adjustQty', 'totalQty']
  const matHeaders = ['原料名稱', '原料批號', '原料桶號', '原配方比例', '本次調整量(kg)', '調整後總量(kg)']

  return (
    <Card
      title={<Space><ToolOutlined />產品重修配置紀錄表 (CMS03-07-7A)</Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增紀錄</Button>}
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
        title={editing ? '編輯產品重修配置紀錄表' : '新增產品重修配置紀錄表'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
        width={960}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Divider plain style={{ margin: '0 0 8px', fontSize: 12 }}>基本資訊</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <Form.Item name="productModel" label="MODEL SP / 產品型號"><Input /></Form.Item>
            <Form.Item name="productName" label="TÊN SẢN PHẨM / 產品名稱"><Input /></Form.Item>
            <Form.Item name="originalDate" label="NGÀY SX GỐC / 原生產日期"><DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="originalLot" label="SỐ LÔ BAN ĐẦU / 原批號"><Input /></Form.Item>
            <Form.Item name="newLot" label="LÔ MỚI / 重修後新批號"><Input /></Form.Item>
            <Form.Item name="tank" label="BỒN SX / 生產缸"><Input /></Form.Item>
            <Form.Item name="originalQty" label="QTY LÔ GỐC / 原批數量(kg)"><InputNumber style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="reworkQty" label="QTY TÁI GC / 實際重修數量(kg)"><InputNumber style={{ width: '100%' }} /></Form.Item>
          </div>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>重修原因 / NGUYÊN NHÂN TÁI GC</Divider>
          <Form.Item name="reworkReasons">
            <Checkbox.Group options={REWORK_REASON_OPTIONS} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }} />
          </Form.Item>
          <Form.Item name="abnormalDesc" label="異常說明 / MÔ TẢ BẤT THƯỜNG">
            <TextArea rows={3} />
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>重修配置明細 / CHI TIẾT TÁI GC</Divider>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#162032' }}>
                  <th style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal', width: 30 }}>序號</th>
                  {matHeaders.map(h => (
                    <th key={h} style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matDetails.map((m, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', border: '1px solid #2d3f55', color: '#94a3b8' }}>{m.no}</td>
                    {matFields.map(f => (
                      <td key={f} style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                        <Input size="small" value={m[f] as string} onChange={e => updateMatDetail(idx, f, e.target.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Form.Item name="reworkMethod" label="重修作法說明 / PHƯƠNG PHÁP TÁI GC" style={{ marginTop: 12 }}>
            <TextArea rows={3} />
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>規格變更說明 / THAY ĐỔI THÔNG SỐ</Divider>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#162032' }}>
                  {['規格項目', '標準規格', '重修後規格', '是否合格 OK/NG'].map(h => (
                    <th key={h} style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qcResults.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '2px 6px', border: '1px solid #2d3f55', whiteSpace: 'nowrap' }}>
                      {r.item}<br /><span style={{ color: '#64748b', fontSize: 10 }}>{r.itemVn}</span>
                    </td>
                    <td style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                      <Input size="small" value={r.standard} onChange={e => updateQcResult(idx, 'standard', e.target.value)} />
                    </td>
                    <td style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                      <Input size="small" value={r.reworkSpec} onChange={e => updateQcResult(idx, 'reworkSpec', e.target.value)} />
                    </td>
                    <td style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={r.result || undefined}
                        onChange={v => updateQcResult(idx, 'result', v)}
                        options={[{ value: 'OK', label: 'OK' }, { value: 'NG', label: 'NG' }]}
                        allowClear
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>最終判定與備註</Divider>
          <Form.Item name="finalJudgment" label="最終判定 / KẾT QUẢ CUỐI">
            <Select
              options={[
                { value: '合格→可入庫/出貨', label: '合格 → 可入庫/出貨' },
                { value: '降等使用', label: '降等使用 / Hạ cấp sử dụng' },
                { value: '報廢', label: '報廢 / Phế liệu' },
                { value: '需再次重修', label: '需再次重修 / Cần tái GC lần nữa' },
              ]}
              allowClear
            />
          </Form.Item>
          <Form.Item name="notes" label="備註 / GHI CHÚ"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
