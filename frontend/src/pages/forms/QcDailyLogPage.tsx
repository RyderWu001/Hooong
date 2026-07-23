import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, DatePicker,
  Popconfirm, message, Divider, Input,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, CalendarOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getQcDailyLogs, createQcDailyLog, updateQcDailyLog, deleteQcDailyLog } from '../../api/qcDailyLogs'

const { TextArea } = Input

interface Section1Row { no: number; productionDate: string; chemCode: string; lot: string; ph: string; brix: string; solidContent: string; result: string }
interface Section3Row { no: number; productionDate: string; chemCode: string; lot: string; quantity: string; result: string; notes: string }

interface QcDailyLog {
  id: number
  logDate: string
  section1: Section1Row[] | null
  section2: Section1Row[] | null
  section3: Section3Row[] | null
  section4: string | null
  createdAt: string
}

const DEFAULT_S1_ROWS = (): Section1Row[] =>
  Array.from({ length: 10 }, (_, i) => ({ no: i + 1, productionDate: '', chemCode: '', lot: '', ph: '', brix: '', solidContent: '', result: '' }))

const DEFAULT_S3_ROWS = (): Section3Row[] =>
  Array.from({ length: 10 }, (_, i) => ({ no: i + 1, productionDate: '', chemCode: '', lot: '', quantity: '', result: '', notes: '' }))

function printQcDailyLog(row: QcDailyLog) {
  const s1 = row.section1 ?? DEFAULT_S1_ROWS()
  const s2 = row.section2 ?? DEFAULT_S1_ROWS()
  const s3 = row.section3 ?? DEFAULT_S3_ROWS()

  const s1Rows = s1.map(r => `<tr><td>${r.no}</td><td>${r.productionDate}</td><td>${r.chemCode}</td><td>${r.lot}</td><td>${r.ph}</td><td>${r.brix}</td><td>${r.solidContent}</td><td>${r.result}</td></tr>`).join('')
  const s2Rows = s2.map(r => `<tr><td>${r.no}</td><td>${r.productionDate}</td><td>${r.chemCode}</td><td>${r.lot}</td><td>${r.ph}</td><td>${r.brix}</td><td>${r.solidContent}</td><td>${r.result}</td></tr>`).join('')
  const s3Rows = s3.map(r => `<tr><td>${r.no}</td><td>${r.productionDate}</td><td>${r.chemCode}</td><td>${r.lot}</td><td>${r.quantity}</td><td>${r.result}</td><td>${r.notes}</td></tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>化驗室QC每日工作日誌 CMS01-03-6B</title>
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
  .header-right .field { font-size: 10px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .section-title { background: #e8e8e8; padding: 3px 6px; font-weight: bold; font-size: 10px; border-bottom: 1px solid #000; border-top: 1px solid #000; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  th, td { border: 1px solid #000; padding: 2px 4px; text-align: center; }
  th { background: #e8e8e8; }
  .free-text { padding: 4px 8px; min-height: 50px; border-top: 1px solid #000; white-space: pre-wrap; font-size: 10px; }
  .free-text-label { font-weight: bold; font-size: 9.5px; margin-bottom: 2px; }
  .sig-row { display: grid; grid-template-columns: 1fr 1fr; border-top: 2px solid #000; }
  .sig-cell { padding: 4px 8px; border-right: 1px solid #000; min-height: 50px; text-align: center; }
  .sig-cell:last-child { border-right: none; }
  .sig-label { font-size: 9.5px; font-weight: bold; margin-bottom: 4px; }
  .footer { text-align: center; font-size: 9px; color: #555; padding: 3px; border-top: 1px solid #ccc; }
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
      <h1>NHẬT KÝ CÔNG VIỆC HẰNG NGÀY - PHÒNG THÍ NGHIỆM QC</h1>
      <h2>化驗室QC每日工作日誌</h2>
    </div>
    <div class="header-right">
      <div class="field"><strong>表單編號:</strong> CMS01-03-6B</div>
      <div class="field"><strong>NGÀY / 日期:</strong> ${row.logDate ? dayjs(row.logDate).format('YYYY-MM-DD') : ''}</div>
    </div>
  </div>

  <div class="section-title">1.1 藥劑基本檢測 / KIỂM TRA CƠ BẢN HÓA CHẤT</div>
  <table>
    <thead>
      <tr>
        <th>序號<br>STT</th>
        <th>NSX生產日<br>NGÀY SX</th>
        <th>MÃ HC藥品<br>藥品編號</th>
        <th>Lot</th>
        <th>PH</th>
        <th>Brix%</th>
        <th>Solid Content%</th>
        <th>檢驗結果<br>KẾT QUẢ</th>
      </tr>
    </thead>
    <tbody>${s1Rows}</tbody>
  </table>

  <div class="section-title">1.2 原料基本檢測 / KIỂM TRA CƠ BẢN NGUYÊN LIỆU</div>
  <table>
    <thead>
      <tr>
        <th>序號<br>STT</th>
        <th>NSX生產日<br>NGÀY SX</th>
        <th>MÃ HC藥品<br>藥品編號</th>
        <th>Lot</th>
        <th>PH</th>
        <th>Brix%</th>
        <th>Solid Content%</th>
        <th>檢驗結果<br>KẾT QUẢ</th>
      </tr>
    </thead>
    <tbody>${s2Rows}</tbody>
  </table>

  <div class="section-title">2. 成品出貨檢查 / KIỂM TRA XUẤT HÀNG THÀNH PHẨM</div>
  <table>
    <thead>
      <tr>
        <th>序號<br>STT</th>
        <th>NSX生產日<br>NGÀY SX</th>
        <th>MÃ HC藥品<br>藥品編號</th>
        <th>Lot</th>
        <th>數量<br>Số lượng</th>
        <th>檢驗結果<br>KẾT QUẢ</th>
        <th>備註<br>GHI CHÚ</th>
      </tr>
    </thead>
    <tbody>${s3Rows}</tbody>
  </table>

  <div class="free-text">
    <div class="free-text-label">3. 藥劑原料試驗 / THÍ NGHIỆM NGUYÊN LIỆU HÓA CHẤT:</div>
    ${row.section4 ?? ''}
  </div>

  <div class="sig-row">
    <div class="sig-cell"><div class="sig-label">主管 / QUẢN LÝ</div></div>
    <div class="sig-cell"><div class="sig-label">化驗員 / QC NHÂN VIÊN</div></div>
  </div>

  <div class="footer">(附件10) CMS01-03-6B 化驗室QC每日工作日誌</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

function Section1Table({ rows, onChange }: { rows: Section1Row[]; onChange: (rows: Section1Row[]) => void }) {
  const updateRow = (idx: number, field: keyof Section1Row, val: string) => {
    onChange(rows.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }
  const fields: (keyof Section1Row)[] = ['productionDate', 'chemCode', 'lot', 'ph', 'brix', 'solidContent', 'result']
  const headers = ['NSX生產日', 'MÃ HC', 'Lot', 'PH', 'Brix%', 'Solid%', '結果']
  return (
    <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#162032' }}>
            <th style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal', width: 30 }}>序號</th>
            {headers.map(h => (
              <th key={h} style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid #2d3f55' }}>
              <td style={{ textAlign: 'center', padding: '2px 4px', border: '1px solid #2d3f55', color: '#94a3b8' }}>{r.no}</td>
              {fields.map(f => (
                <td key={f} style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                  <Input size="small" value={r[f] as string} onChange={e => updateRow(i, f, e.target.value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section3Table({ rows, onChange }: { rows: Section3Row[]; onChange: (rows: Section3Row[]) => void }) {
  const updateRow = (idx: number, field: keyof Section3Row, val: string) => {
    onChange(rows.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }
  const fields: (keyof Section3Row)[] = ['productionDate', 'chemCode', 'lot', 'quantity', 'result', 'notes']
  const headers = ['NSX生產日', 'MÃ HC', 'Lot', '數量', '結果', '備註']
  return (
    <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#162032' }}>
            <th style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal', width: 30 }}>序號</th>
            {headers.map(h => (
              <th key={h} style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid #2d3f55' }}>
              <td style={{ textAlign: 'center', padding: '2px 4px', border: '1px solid #2d3f55', color: '#94a3b8' }}>{r.no}</td>
              {fields.map(f => (
                <td key={f} style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                  <Input size="small" value={r[f] as string} onChange={e => updateRow(i, f, e.target.value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function QcDailyLogPage() {
  const [list, setList] = useState<QcDailyLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<QcDailyLog | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [s1Rows, setS1Rows] = useState<Section1Row[]>(DEFAULT_S1_ROWS())
  const [s2Rows, setS2Rows] = useState<Section1Row[]>(DEFAULT_S1_ROWS())
  const [s3Rows, setS3Rows] = useState<Section3Row[]>(DEFAULT_S3_ROWS())

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getQcDailyLogs({ page: p, limit: 20 })
      setList(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ logDate: dayjs() })
    setS1Rows(DEFAULT_S1_ROWS())
    setS2Rows(DEFAULT_S1_ROWS())
    setS3Rows(DEFAULT_S3_ROWS())
    setModalOpen(true)
  }

  const openEdit = (row: QcDailyLog) => {
    setEditing(row)
    form.setFieldsValue({
      logDate: row.logDate ? dayjs(row.logDate) : null,
      section4: row.section4 ?? '',
    })
    setS1Rows(row.section1?.length ? row.section1 : DEFAULT_S1_ROWS())
    setS2Rows(row.section2?.length ? row.section2 : DEFAULT_S1_ROWS())
    setS3Rows(row.section3?.length ? row.section3 : DEFAULT_S3_ROWS())
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        logDate: values.logDate ? values.logDate.format('YYYY-MM-DD') : null,
        section1: s1Rows,
        section2: s2Rows,
        section3: s3Rows,
        section4: values.section4 || null,
      }
      if (editing) {
        await updateQcDailyLog(editing.id, payload); message.success('已更新')
      } else {
        await createQcDailyLog(payload); message.success('已新增')
      }
      setModalOpen(false); load(page)
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteQcDailyLog(id); message.success('已刪除'); load(page) }
    catch { message.error('刪除失敗') }
  }

  const columns: ColumnsType<QcDailyLog> = [
    {
      title: '日期 / NGÀY', dataIndex: 'logDate', key: 'logDate', width: 130,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    {
      title: '建立時間', dataIndex: 'createdAt', key: 'createdAt', width: 160,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—',
    },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printQcDailyLog(row)}>列印</Button>
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
      title={<Space><CalendarOutlined />化驗室QC每日工作日誌 (CMS01-03-6B)</Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增日誌</Button>}
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
        title={editing ? '編輯QC每日工作日誌' : '新增QC每日工作日誌'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
        width={980}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="logDate" label="日期 / NGÀY" rules={[{ required: true, message: '請選擇日期' }]}>
            <DatePicker format="YYYY-MM-DD" />
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>1.1 藥劑基本檢測 / KIỂM TRA CƠ BẢN HÓA CHẤT</Divider>
          <Section1Table rows={s1Rows} onChange={setS1Rows} />

          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>1.2 原料基本檢測 / KIỂM TRA CƠ BẢN NGUYÊN LIỆU</Divider>
          <Section1Table rows={s2Rows} onChange={setS2Rows} />

          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>2. 成品出貨檢查 / KIỂM TRA XUẤT HÀNG THÀNH PHẨM</Divider>
          <Section3Table rows={s3Rows} onChange={setS3Rows} />

          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>3. 藥劑原料試驗 / THÍ NGHIỆM NGUYÊN LIỆU</Divider>
          <Form.Item name="section4">
            <TextArea rows={4} placeholder="藥劑原料試驗紀錄..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
