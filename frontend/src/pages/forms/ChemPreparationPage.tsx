import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, DatePicker,
  Popconfirm, message, Divider, Select,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, ExperimentOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getChemPreparations, createChemPreparation, updateChemPreparation, deleteChemPreparation } from '../../api/chemPreparations'

const { TextArea } = Input

interface MaterialEntry { col: number; name: string; ratio: string; lot: string }

interface ChemPreparation {
  id: number
  prepDate: string
  weekday: string | null
  chemName: string | null
  formulaRef: string | null
  materials: MaterialEntry[] | null
  purpose: string | null
  prepRecord: string | null
  notes: string | null
  createdAt: string
}

const WEEKDAY_OPTIONS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'].map(d => ({ value: d, label: d }))

const DEFAULT_MATERIALS = (): MaterialEntry[] =>
  Array.from({ length: 9 }, (_, i) => ({ col: Math.floor(i / 3) + 1, name: '', ratio: '', lot: '' }))

function printChemPreparation(row: ChemPreparation) {
  const mats = Array.isArray(row.materials) && row.materials.length ? row.materials : DEFAULT_MATERIALS()
  const col1 = mats.filter(m => m.col === 1)
  const col2 = mats.filter(m => m.col === 2)
  const col3 = mats.filter(m => m.col === 3)
  const maxLen = Math.max(col1.length, col2.length, col3.length)

  const matRows = Array.from({ length: maxLen }, (_, i) => {
    const m1 = col1[i] ?? { name: '', ratio: '', lot: '' }
    const m2 = col2[i] ?? { name: '', ratio: '', lot: '' }
    const m3 = col3[i] ?? { name: '', ratio: '', lot: '' }
    return `<tr>
      <td class="left">${m1.name}</td><td>${m1.ratio}</td><td>${m1.lot}</td>
      <td style="border-left:2px solid #000" class="left">${m2.name}</td><td>${m2.ratio}</td><td>${m2.lot}</td>
      <td style="border-left:2px solid #000" class="left">${m3.name}</td><td>${m3.ratio}</td><td>${m3.lot}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>化驗室藥劑泡製紀錄 CMS03-07-6A</title>
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
  .info-row { display: flex; border-bottom: 1px solid #000; }
  .info-cell { flex: 1; padding: 4px 8px; border-right: 1px solid #000; font-size: 10px; }
  .info-cell:last-child { border-right: none; }
  .info-label { color: #555; font-size: 9px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { border: 1px solid #000; padding: 2px 4px; text-align: center; }
  th { background: #e8e8e8; }
  td.left { text-align: left; }
  .section-row { border-top: 1px solid #000; }
  .section-label { background: #e8e8e8; padding: 2px 6px; font-weight: bold; font-size: 10px; border-bottom: 1px solid #000; }
  .section-content { padding: 4px 8px; min-height: 50px; white-space: pre-wrap; font-size: 10px; }
  .sig-row { display: grid; grid-template-columns: 1fr 1fr; border-top: 2px solid #000; }
  .sig-cell { padding: 4px 8px; border-right: 1px solid #000; min-height: 50px; text-align: center; }
  .sig-cell:last-child { border-right: none; }
  .sig-label { font-size: 9.5px; font-weight: bold; margin-bottom: 4px; }
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
      <h1>NHẬT KÝ PHA CHẾ HÓA CHẤT PHÒNG THÍ NGHIỆM</h1>
      <h2>化驗室藥劑泡製紀錄</h2>
    </div>
    <div class="header-right">
      <div class="field"><strong>表單編號:</strong> CMS03-07-6A</div>
    </div>
  </div>

  <div class="info-row">
    <div class="info-cell"><div class="info-label">年月日 / NĂM THÁNG NGÀY</div>${row.prepDate ? dayjs(row.prepDate).format('YYYY-MM-DD') : ''}</div>
    <div class="info-cell"><div class="info-label">星期 / THỨ</div>${row.weekday ?? ''}</div>
    <div class="info-cell"><div class="info-label">藥劑名稱 / TÊN HÓA CHẤT</div>${row.chemName ?? ''}</div>
    <div class="info-cell"><div class="info-label">配方 / CÔNG THỨC</div>${row.formulaRef ?? ''}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th colspan="3">欄位 1</th>
        <th colspan="3" style="border-left:2px solid #000">欄位 2</th>
        <th colspan="3" style="border-left:2px solid #000">欄位 3</th>
      </tr>
      <tr>
        <th>原料名</th><th>%</th><th>Lot</th>
        <th style="border-left:2px solid #000">原料名</th><th>%</th><th>Lot</th>
        <th style="border-left:2px solid #000">原料名</th><th>%</th><th>Lot</th>
      </tr>
    </thead>
    <tbody>${matRows}</tbody>
  </table>

  <div class="section-row">
    <div class="section-label">一、目的 / MỤC ĐÍCH</div>
    <div class="section-content">${row.purpose ?? ''}</div>
  </div>
  <div class="section-row">
    <div class="section-label">二、泡製紀錄 / NỘI DUNG PHA CHẾ</div>
    <div class="section-content">${row.prepRecord ?? ''}</div>
  </div>
  <div class="section-row">
    <div class="section-label">三、備註 / GHI CHÚ</div>
    <div class="section-content">${row.notes ?? ''}</div>
  </div>

  <div class="sig-row">
    <div class="sig-cell"><div class="sig-label">主管 / QUẢN LÝ</div></div>
    <div class="sig-cell"><div class="sig-label">化驗員 / NHÂN VIÊN THÍ NGHIỆM</div></div>
  </div>

  <div class="footer">(附件12) CMS03-07-6A 化驗室藥劑泡製紀錄</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function ChemPreparationPage() {
  const [list, setList] = useState<ChemPreparation[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ChemPreparation | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [materials, setMaterials] = useState<MaterialEntry[]>(DEFAULT_MATERIALS())

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getChemPreparations({ page: p, limit: 20 })
      setList(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ prepDate: dayjs() })
    setMaterials(DEFAULT_MATERIALS())
    setModalOpen(true)
  }

  const openEdit = (row: ChemPreparation) => {
    setEditing(row)
    form.setFieldsValue({
      prepDate: row.prepDate ? dayjs(row.prepDate) : null,
      weekday: row.weekday ?? undefined,
      chemName: row.chemName ?? '',
      formulaRef: row.formulaRef ?? '',
      purpose: row.purpose ?? '',
      prepRecord: row.prepRecord ?? '',
      notes: row.notes ?? '',
    })
    setMaterials(Array.isArray(row.materials) && row.materials.length ? row.materials : DEFAULT_MATERIALS())
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        prepDate: values.prepDate ? values.prepDate.format('YYYY-MM-DD') : null,
        weekday: values.weekday || null,
        chemName: values.chemName || null,
        formulaRef: values.formulaRef || null,
        materials,
        purpose: values.purpose || null,
        prepRecord: values.prepRecord || null,
        notes: values.notes || null,
      }
      if (editing) {
        await updateChemPreparation(editing.id, payload); message.success('已更新')
      } else {
        await createChemPreparation(payload); message.success('已新增')
      }
      setModalOpen(false); load(page)
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteChemPreparation(id); message.success('已刪除'); load(page) }
    catch { message.error('刪除失敗') }
  }

  const updateMat = (idx: number, field: keyof MaterialEntry, val: string | number) => {
    setMaterials(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m))
  }

  const colMats = (col: number) => materials.map((m, i) => ({ m, i })).filter(({ m }) => m.col === col)

  const columns: ColumnsType<ChemPreparation> = [
    {
      title: '泡製日期', dataIndex: 'prepDate', key: 'prepDate', width: 120,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    { title: '星期', dataIndex: 'weekday', key: 'weekday', width: 80, render: v => v ?? '—' },
    { title: '藥劑名稱', dataIndex: 'chemName', key: 'chemName', render: v => v ?? '—' },
    { title: '配方', dataIndex: 'formulaRef', key: 'formulaRef', width: 130, render: v => v ?? '—' },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printChemPreparation(row)}>列印</Button>
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
      title={<Space><ExperimentOutlined />化驗室藥劑泡製紀錄 (CMS03-07-6A)</Space>}
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
        title={editing ? '編輯化驗室藥劑泡製紀錄' : '新增化驗室藥劑泡製紀錄'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
        width={900}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Space wrap size={8}>
            <Form.Item name="prepDate" label="年月日 / NĂM THÁNG NGÀY" rules={[{ required: true, message: '請選擇日期' }]}>
              <DatePicker format="YYYY-MM-DD" />
            </Form.Item>
            <Form.Item name="weekday" label="星期 / THỨ" style={{ width: 120 }}>
              <Select options={WEEKDAY_OPTIONS} allowClear />
            </Form.Item>
            <Form.Item name="chemName" label="藥劑名稱 / TÊN HÓA CHẤT" style={{ width: 200 }}>
              <Input />
            </Form.Item>
            <Form.Item name="formulaRef" label="配方 / CÔNG THỨC" style={{ width: 160 }}>
              <Input />
            </Form.Item>
          </Space>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>原料表格（3欄並排）/ BẢNG NGUYÊN LIỆU</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[1, 2, 3].map(col => (
              <div key={col}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, fontWeight: 'bold' }}>欄 {col}</div>
                <div style={{ border: '1px solid #2d3f55', borderRadius: 4, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: '#162032' }}>
                        {['原料名', '%', 'Lot'].map(h => (
                          <th key={h} style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {colMats(col).map(({ m, i }) => (
                        <tr key={i}>
                          <td style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                            <Input size="small" value={m.name} onChange={e => updateMat(i, 'name', e.target.value)} />
                          </td>
                          <td style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                            <Input size="small" value={m.ratio} onChange={e => updateMat(i, 'ratio', e.target.value)} />
                          </td>
                          <td style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                            <Input size="small" value={m.lot} onChange={e => updateMat(i, 'lot', e.target.value)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  size="small"
                  style={{ marginTop: 4 }}
                  onClick={() => setMaterials(prev => [...prev, { col, name: '', ratio: '', lot: '' }])}
                >+ 新增列</Button>
              </div>
            ))}
          </div>

          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>泡製紀錄區</Divider>
          <Form.Item name="purpose" label="一、目的 / MỤC ĐÍCH">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="prepRecord" label="二、泡製紀錄 / NỘI DUNG PHA CHẾ">
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="notes" label="三、備註 / GHI CHÚ">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
