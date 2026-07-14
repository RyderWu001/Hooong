import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, DatePicker, Input,
  Popconfirm, message, Typography, Tag, Divider,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, FileTextOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getLabDailyLogs, createLabDailyLog, updateLabDailyLog, deleteLabDailyLog,
} from '../../api/labDailyLogs'

const { Text } = Typography

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

interface TestEntry { target: string; result: string }

interface LabDailyLog {
  id: number
  logDate: string
  weekday: string | null
  testEntries: TestEntry[] | null
  procedureRecords: string | null
  createdAt: string
  updatedAt: string
}

function printLog(log: LabDailyLog, sigSupervisor: string | null, sigLabTech: string | null) {
  const entries = log.testEntries ?? []
  const rows = [...entries, ...Array(Math.max(0, 8 - entries.length)).fill({ target: '', result: '' })]
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>化驗室每日工作日誌</title>
<style>
  body { font-family: 'Microsoft JhengHei', sans-serif; font-size: 12px; margin: 20px; color: #000; }
  h2 { text-align: center; font-size: 16px; margin-bottom: 4px; }
  .form-no { text-align: right; font-size: 11px; margin-bottom: 8px; }
  .header-row { display: flex; gap: 20px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #000; padding: 4px 6px; }
  th { background: #f0f0f0; text-align: center; }
  .sig-row { display: flex; gap: 40px; margin-top: 24px; }
  .sig-box { flex: 1; border: 1px solid #000; min-height: 60px; padding: 4px; text-align: center; }
  .sig-label { font-size: 11px; margin-bottom: 4px; }
  .procedure-area { border: 1px solid #000; min-height: 120px; padding: 8px; white-space: pre-wrap; }
  @media print { @page { margin: 15mm; } }
</style>
</head>
<body>
<div class="form-no">CMS01-03-3B</div>
<h2>化驗室每日工作日誌</h2>
<div class="header-row">
  <span>日期：${dayjs(log.logDate).format('YYYY 年 MM 月 DD 日')}</span>
  <span>星期${log.weekday ?? WEEKDAYS[dayjs(log.logDate).day()]}</span>
</div>
<table>
  <thead>
    <tr><th style="width:50%">化驗標的</th><th>化驗結果</th></tr>
  </thead>
  <tbody>
    ${rows.map(r => `<tr><td style="height:24px">${r.target ?? ''}</td><td>${r.result ?? ''}</td></tr>`).join('')}
  </tbody>
</table>
<div style="margin-bottom:6px"><strong>化驗室檢測程序記錄：</strong></div>
<div class="procedure-area">${(log.procedureRecords ?? '').replace(/\n/g, '<br>')}</div>
<div class="sig-row">
  <div class="sig-box">
    <div class="sig-label">主管</div>
    ${sigSupervisor ? `<img src="${sigSupervisor}" style="max-height:50px;max-width:100px">` : ''}
  </div>
  <div class="sig-box">
    <div class="sig-label">化驗員</div>
    ${sigLabTech ? `<img src="${sigLabTech}" style="max-height:50px;max-width:100px">` : ''}
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function LabDailyLogPage() {
  const [logs, setLogs] = useState<LabDailyLog[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LabDailyLog | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [entries, setEntries] = useState<TestEntry[]>([{ target: '', result: '' }])
  // signature images stored in browser only
  const [sigSupervisor, setSigSupervisor] = useState<string | null>(null)
  const [sigLabTech, setSigLabTech] = useState<string | null>(null)
  const [printTarget, setPrintTarget] = useState<LabDailyLog | null>(null)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getLabDailyLogs({ page: p, limit: 30 })
      setLogs(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ logDate: dayjs(), weekday: WEEKDAYS[dayjs().day()] })
    setEntries([{ target: '', result: '' }])
    setSigSupervisor(null)
    setSigLabTech(null)
    setModalOpen(true)
  }

  const openEdit = (row: LabDailyLog) => {
    setEditing(row)
    form.setFieldsValue({
      logDate: dayjs(row.logDate),
      weekday: row.weekday ?? WEEKDAYS[dayjs(row.logDate).day()],
      procedureRecords: row.procedureRecords ?? '',
    })
    setEntries(row.testEntries?.length ? row.testEntries : [{ target: '', result: '' }])
    setSigSupervisor(null)
    setSigLabTech(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        logDate: values.logDate.format('YYYY-MM-DD'),
        weekday: values.weekday,
        testEntries: entries.filter(e => e.target || e.result),
        procedureRecords: values.procedureRecords ?? null,
      }
      if (editing) {
        await updateLabDailyLog(editing.id, payload)
        message.success('已更新')
      } else {
        await createLabDailyLog(payload)
        message.success('已新增')
      }
      setModalOpen(false)
      load(page)
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteLabDailyLog(id); message.success('已刪除'); load(page) }
    catch { message.error('刪除失敗') }
  }

  const handleSigUpload = (field: 'supervisor' | 'labtech', file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (field === 'supervisor') setSigSupervisor(e.target?.result as string)
      else setSigLabTech(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const columns: ColumnsType<LabDailyLog> = [
    {
      title: '日期', dataIndex: 'logDate', key: 'logDate', width: 120,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '星期', dataIndex: 'weekday', key: 'weekday', width: 70,
      render: (v, row) => <Tag>{v ?? WEEKDAYS[dayjs(row.logDate).day()]}</Tag>,
    },
    {
      title: '化驗項目數', key: 'count', width: 100,
      render: (_, row) => `${row.testEntries?.length ?? 0} 項`,
    },
    {
      title: '建立時間', dataIndex: 'createdAt', key: 'createdAt', width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作', key: 'actions', width: 180,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />}
            onClick={() => { setPrintTarget(row); printLog(row, sigSupervisor, sigLabTech) }}>列印</Button>
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
      title={<Space><FileTextOutlined />化驗室每日工作日誌 (CMS01-03-3B)</Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增日誌</Button>}
    >
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={logs}
        pagination={{ current: page, pageSize: 30, total, onChange: setPage, showTotal: t => `共 ${t} 筆` }}
        size="small"
      />

      <Modal
        open={modalOpen}
        title={editing ? '編輯每日工作日誌' : '新增每日工作日誌'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
        width={700}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Space size={12} style={{ width: '100%' }}>
            <Form.Item name="logDate" label="日期" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker
                style={{ width: '100%' }}
                onChange={(d) => d && form.setFieldValue('weekday', WEEKDAYS[d.day()])}
              />
            </Form.Item>
            <Form.Item name="weekday" label="星期" style={{ width: 100 }}>
              <Input addonBefore="星期" />
            </Form.Item>
          </Space>

          <Divider plain style={{ margin: '4px 0 12px', fontSize: 12, color: '#888' }}>化驗記錄</Divider>
          <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#162032', padding: '6px 8px' }}>
              <Text strong style={{ fontSize: 12 }}>化驗標的</Text>
              <Text strong style={{ fontSize: 12 }}>化驗結果</Text>
            </div>
            {entries.map((entry, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 4, padding: '4px 8px', borderTop: '1px solid #2d3f55' }}>
                <Input
                  size="small"
                  value={entry.target}
                  placeholder="化驗標的"
                  onChange={e => setEntries(prev => prev.map((r, i) => i === idx ? { ...r, target: e.target.value } : r))}
                />
                <Input
                  size="small"
                  value={entry.result}
                  placeholder="化驗結果"
                  onChange={e => setEntries(prev => prev.map((r, i) => i === idx ? { ...r, result: e.target.value } : r))}
                />
                <Button
                  size="small"
                  danger
                  type="text"
                  onClick={() => setEntries(prev => prev.filter((_, i) => i !== idx))}
                  disabled={entries.length === 1}
                >✕</Button>
              </div>
            ))}
            <div style={{ padding: '6px 8px', borderTop: '1px solid #2d3f55' }}>
              <Button size="small" icon={<PlusOutlined />} onClick={() => setEntries(prev => [...prev, { target: '', result: '' }])}>
                新增列
              </Button>
            </div>
          </div>

          <Form.Item name="procedureRecords" label="化驗室檢測程序記錄">
            <Input.TextArea rows={4} placeholder="請填寫檢測程序記錄..." />
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 12px', fontSize: 12, color: '#888' }}>簽名（上傳後僅存於本次瀏覽器）</Divider>
          <Space size={24}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>主管簽名</Text>
              {sigSupervisor && <img src={sigSupervisor} alt="主管" style={{ height: 48, border: '1px solid #2d3f55', borderRadius: 4, display: 'block', marginBottom: 4 }} />}
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleSigUpload('supervisor', e.target.files[0])} style={{ fontSize: 12 }} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>化驗員簽名</Text>
              {sigLabTech && <img src={sigLabTech} alt="化驗員" style={{ height: 48, border: '1px solid #2d3f55', borderRadius: 4, display: 'block', marginBottom: 4 }} />}
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleSigUpload('labtech', e.target.files[0])} style={{ fontSize: 12 }} />
            </div>
          </Space>
        </Form>
      </Modal>
    </Card>
  )
}
