import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, DatePicker,
  Popconfirm, message, Divider, Checkbox, Row, Col, Select, Tag, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, AuditOutlined, LinkOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import {
  getFormulaChanges, createFormulaChange, updateFormulaChange, deleteFormulaChange,
} from '../../api/formulaChange'
import { getFormulas } from '../../api/formulas'
import { getFormSignatures } from '../../api/formSignatures'
import ApprovalChain from '../../components/ApprovalChain'

const { TextArea } = Input

const TOTAL_SLOTS = 4  // 技術經理 → 管理部 → 總經理 → 董事長

interface SpecRow { item: string; oldSpec: string; newSpec: string; unit: string; remarks: string }

interface FormulaOption { id: number; code: string; name: string }

interface FormulaChange {
  id: number
  no: string | null
  date: string | null
  customerName: string | null
  productName: string | null
  problem: string | null
  oldFormula: string | null
  newFormula: string | null
  productUsage: string | null
  responseContent: string | null
  specChanges: SpecRow[] | null
  notes: string | null
  reportDept: string | null
  reportPerson: string | null
  reportDate: string | null
  reportTime: string | null
  completionProductUsage: boolean
  completionOperation: boolean
  completionTechConsult: boolean
  completionTechService: boolean
  completionOther: boolean
  formulaId: number | null
  createdAt: string
}

const DEFAULT_SPEC_ROWS: SpecRow[] = Array(5).fill(null).map(() => ({
  item: '', oldSpec: '', newSpec: '', unit: '', remarks: '',
}))

function printFormulaChange(row: FormulaChange, formulaName?: string) {
  const specs = (row.specChanges && row.specChanges.length > 0) ? row.specChanges : DEFAULT_SPEC_ROWS
  const specRows = specs.map(s => `
    <tr>
      <td>${s.item ?? ''}</td>
      <td>${s.oldSpec ?? ''}</td>
      <td>${s.newSpec ?? ''}</td>
      <td>${s.unit ?? ''}</td>
      <td>${s.remarks ?? ''}</td>
    </tr>`).join('')

  const ck = (v: boolean) => v ? '☑' : '☐'

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>配方變更核准申請書 CMS03-07-3A</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft JhengHei','Times New Roman',Arial,sans-serif; font-size: 11px; color: #000; padding: 10mm; }
  .outer { border: 2px solid #000; }
  .header { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
  .header-logo { width: 150px; min-width: 150px; border-right: 1px solid #000; padding: 6px 10px; display: flex; flex-direction: column; justify-content: center; }
  .logo-brand { font-size: 20px; font-weight: 900; letter-spacing: 1px; }
  .logo-sub { font-size: 9px; color: #333; margin-top: 2px; }
  .header-title { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; padding: 8px; }
  .header-title h1 { font-size: 13px; font-weight: 900; }
  .header-title h2 { font-size: 12px; font-weight: bold; margin-top: 3px; }
  .header-right { width: 160px; min-width: 160px; border-left: 1px solid #000; padding: 6px 10px; display: flex; flex-direction: column; justify-content: center; gap: 4px; font-size: 10px; }
  .field-row { border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 3px; }
  .section { border-top: 1px solid #000; }
  .section-title { background: #e8e8e8; padding: 3px 8px; font-weight: bold; font-size: 11px; border-bottom: 1px solid #000; }
  .two-col { display: flex; border-bottom: 1px solid #000; }
  .col-half { flex: 1; padding: 5px 8px; border-right: 1px solid #000; }
  .col-half:last-child { border-right: none; }
  .col-label { font-size: 9.5px; color: #555; margin-bottom: 2px; }
  .col-value { font-size: 11px; min-height: 16px; white-space: pre-wrap; }
  .text-block { border-bottom: 1px solid #000; }
  .text-block .inner { padding: 5px 8px; min-height: 50px; white-space: pre-wrap; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: center; }
  th { background: #e8e8e8; font-size: 10px; }
  .completion-row { border-top: 1px solid #000; padding: 6px 8px; }
  .completion-label { font-size: 10px; font-weight: bold; margin-bottom: 4px; }
  .completion-items { display: flex; gap: 20px; flex-wrap: wrap; font-size: 10.5px; }
  .report-row { display: flex; border-top: 1px solid #000; }
  .report-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #000; }
  .report-cell:last-child { border-right: none; }
  .sig-row { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 2px solid #000; }
  .sig-cell { padding: 6px 8px; border-right: 1px solid #000; min-height: 55px; text-align: center; }
  .sig-cell:last-child { border-right: none; }
  .sig-label { font-size: 10px; font-weight: bold; margin-bottom: 4px; }
  .footer { text-align: center; font-size: 9px; color: #555; padding: 3px; border-top: 1px solid #ccc; }
  @media print { @page { margin: 8mm; size: A4 portrait; } }
</style>
</head>
<body>
<div class="outer">
  <div class="header">
    <div class="header-logo">
      <div class="logo-brand">RICH<sup>®</sup></div>
      <div class="logo-sub">旺隆責任有限公司</div>
    </div>
    <div class="header-title">
      <h1>ĐƠN XIN PHÊ DUYỆT THAY ĐỔI CÔNG THỨC</h1>
      <h2>配方變更核准申請書</h2>
    </div>
    <div class="header-right">
      <div class="field-row"><strong>No:</strong> ${row.no ?? ''}</div>
      <div class="field-row"><strong>DATE / 日期:</strong> ${row.date ? dayjs(row.date).format('YYYY-MM-DD') : ''}</div>
      <div><strong>Form No:</strong> CMS03-07-3A</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">申請資訊 / THÔNG TIN ĐƠN</div>
    <div class="two-col">
      <div class="col-half">
        <div class="col-label">客戶名稱 / TÊN KHÁCH HÀNG</div>
        <div class="col-value">${row.customerName ?? ''}</div>
      </div>
      <div class="col-half">
        <div class="col-label">產品名稱 / TÊN SẢN PHẨM${formulaName ? ` (關聯配方: ${formulaName})` : ''}</div>
        <div class="col-value">${row.productName ?? ''}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">問題描述 / MÔ TẢ VẤN ĐỀ</div>
    <div class="text-block"><div class="inner">${row.problem ?? ''}</div></div>
  </div>

  <div class="section">
    <div class="section-title">配方變更內容 / NỘI DUNG THAY ĐỔI CÔNG THỨC</div>
    <div class="two-col">
      <div class="col-half">
        <div class="col-label">原配方 / CÔNG THỨC CŨ</div>
        <div class="col-value" style="min-height:60px">${row.oldFormula ?? ''}</div>
      </div>
      <div class="col-half">
        <div class="col-label">新配方 / CÔNG THỨC MỚI</div>
        <div class="col-value" style="min-height:60px">${row.newFormula ?? ''}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">適用產品用途 / MỤC ĐÍCH SỬ DỤNG SẢN PHẨM</div>
    <div class="text-block"><div class="inner">${row.productUsage ?? ''}</div></div>
  </div>

  <div class="section">
    <div class="section-title">化驗室回覆內容 / NỘI DUNG PHẢN HỒI PHÒNG THÍ NGHIỆM</div>
    <div class="text-block"><div class="inner">${row.responseContent ?? ''}</div></div>
  </div>

  <div class="section">
    <div class="section-title">規格變更對照表 / BẢNG ĐỐI CHIẾU THAY ĐỔI QUY CÁCH</div>
    <div style="padding:6px 8px 8px; border-bottom:1px solid #000;">
      <table>
        <thead>
          <tr>
            <th>檢測項目 / Hạng mục kiểm tra</th>
            <th>原規格 / Quy cách cũ</th>
            <th>新規格 / Quy cách mới</th>
            <th>單位 / Đơn vị</th>
            <th>備註 / Ghi chú</th>
          </tr>
        </thead>
        <tbody>${specRows}</tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-title">備註 / GHI CHÚ</div>
    <div class="text-block"><div class="inner" style="min-height:36px">${row.notes ?? ''}</div></div>
  </div>

  <div class="section">
    <div class="completion-row">
      <div class="completion-label">完成確認項目 / HẠNG MỤC XÁC NHẬN HOÀN THÀNH:</div>
      <div class="completion-items">
        <span>${ck(row.completionProductUsage)} 產品用途確認</span>
        <span>${ck(row.completionOperation)} 操作方式確認</span>
        <span>${ck(row.completionTechConsult)} 技術諮詢</span>
        <span>${ck(row.completionTechService)} 技術服務</span>
        <span>${ck(row.completionOther)} 其他</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="report-row">
      <div class="report-cell">
        <div class="col-label">申報部門</div>
        <div class="col-value">${row.reportDept ?? ''}</div>
      </div>
      <div class="report-cell">
        <div class="col-label">申報人</div>
        <div class="col-value">${row.reportPerson ?? ''}</div>
      </div>
      <div class="report-cell">
        <div class="col-label">申報日期</div>
        <div class="col-value">${row.reportDate ? dayjs(row.reportDate).format('YYYY-MM-DD') : ''}</div>
      </div>
      <div class="report-cell">
        <div class="col-label">申報時間</div>
        <div class="col-value">${row.reportTime ?? ''}</div>
      </div>
    </div>
  </div>

  <div class="sig-row">
    <div class="sig-cell"><div class="sig-label">技術經理 / Quản lý kỹ thuật</div></div>
    <div class="sig-cell"><div class="sig-label">管理部 / Phòng quản lý</div></div>
    <div class="sig-cell"><div class="sig-label">總經理 / Tổng giám đốc</div></div>
    <div class="sig-cell"><div class="sig-label">董事長 / Chủ tịch</div></div>
  </div>

  <div class="footer">CMS03-07-3A｜泓利廣實驗室系統</div>
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

export default function FormulaChangePage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<FormulaChange[]>([])
  const [sigCountMap, setSigCountMap] = useState<Record<number, number>>({})
  const [formulaOptions, setFormulaOptions] = useState<FormulaOption[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FormulaChange | null>(null)
  const [sigTarget, setSigTarget] = useState<FormulaChange | null>(null)
  const [specRows, setSpecRows] = useState<SpecRow[]>(DEFAULT_SPEC_ROWS)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getFormulaChanges()
      const list: FormulaChange[] = res.data.data ?? []
      setRecords(list)
      // load sig counts for all records
      const counts: Record<number, number> = {}
      await Promise.all(list.map(async r => {
        try {
          const sigs = await getFormSignatures('FormulaChange', r.id)
          counts[r.id] = (sigs ?? []).length
        } catch { counts[r.id] = 0 }
      }))
      setSigCountMap(counts)
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getFormulas({ limit: 200 }).then(res => {
      const list = res.data.data ?? []
      setFormulaOptions(list.map((f: any) => ({ id: f.id, code: f.code, name: f.name })))
    }).catch(() => {})
  }, [])

  function openCreate() {
    setEditing(null)
    setSpecRows(DEFAULT_SPEC_ROWS)
    form.resetFields()
    setModalOpen(true)
  }

  function openEdit(row: FormulaChange) {
    setEditing(row)
    setSpecRows(row.specChanges && row.specChanges.length > 0 ? row.specChanges : DEFAULT_SPEC_ROWS)
    form.setFieldsValue({
      ...row,
      date: row.date ? dayjs(row.date) : null,
      reportDate: row.reportDate ? dayjs(row.reportDate) : null,
    })
    setModalOpen(true)
  }

  async function handleOk() {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        date: values.date ? values.date.toISOString() : null,
        reportDate: values.reportDate ? values.reportDate.toISOString() : null,
        specChanges: specRows,
      }
      if (editing) {
        await updateFormulaChange(editing.id, payload)
        message.success('已更新')
      } else {
        await createFormulaChange(payload)
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
    try {
      await deleteFormulaChange(id)
      message.success('已刪除')
      load()
    } catch {
      message.error('刪除失敗')
    }
  }

  function updateSpecRow(idx: number, field: keyof SpecRow, val: string) {
    setSpecRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: val }
      return next
    })
  }

  function getFormulaName(id: number | null) {
    if (!id) return undefined
    const f = formulaOptions.find(o => o.id === id)
    return f ? `${f.code} ${f.name}` : undefined
  }

  const columns: ColumnsType<FormulaChange> = [
    { title: '申請單號', dataIndex: 'no', key: 'no', width: 130, render: v => v ?? '-' },
    { title: '日期', dataIndex: 'date', key: 'date', width: 110, render: v => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
    { title: '客戶名稱', dataIndex: 'customerName', key: 'customerName', width: 130, render: v => v ?? '-' },
    { title: '產品名稱', dataIndex: 'productName', key: 'productName', render: v => v ?? '-' },
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
      title: '操作', key: 'action', width: 220, fixed: 'right',
      render: (_, row) => {
        const count = sigCountMap[row.id] ?? 0
        const approved = count >= TOTAL_SLOTS
        return (
          <Space size="small" wrap>
            <Button size="small" icon={<PrinterOutlined />} onClick={() => printFormulaChange(row, getFormulaName(row.formulaId))}>列印</Button>
            <Button size="small" icon={<AuditOutlined />} onClick={() => setSigTarget(row)}>簽核</Button>
            {approved && row.formulaId && (
              <Tooltip title="核准完成，前往修改配方">
                <Button
                  size="small"
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={() => navigate(`/formulas/${row.formulaId}/edit`)}
                >
                  修改配方
                </Button>
              </Tooltip>
            )}
            {approved && !row.formulaId && (
              <Tooltip title="請先在編輯中關聯配方">
                <Button size="small" type="primary" disabled icon={<LinkOutlined />}>修改配方</Button>
              </Tooltip>
            )}
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>編輯</Button>
            <Popconfirm title="確定刪除？" onConfirm={() => handleDelete(row.id)}>
              <Button size="small" danger icon={<DeleteOutlined />}>刪除</Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <Card
      title="配方變更核准申請書 (CMS03-07-3A)"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增申請</Button>}
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={records}
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{ pageSize: 20 }}
      />

      {/* 建立/編輯 Modal */}
      <Modal
        title={editing ? '編輯配方變更申請' : '新增配方變更申請'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        width={820}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="申請單號" name="no">
                <Input placeholder="CMS03-07-3A-XXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="日期" name="date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="客戶名稱" name="customerName">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="產品名稱" name="productName">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="關聯配方（核准後可直接前往修改）"
            name="formulaId"
            help="選擇此申請書對應的系統配方，核准後將顯示「修改配方」按鈕"
          >
            <Select
              showSearch
              allowClear
              placeholder="搜尋配方代號或名稱..."
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={formulaOptions.map(f => ({
                value: f.id,
                label: `${f.code} - ${f.name}`,
              }))}
            />
          </Form.Item>

          <Form.Item label="問題描述" name="problem">
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="原配方" name="oldFormula">
                <TextArea rows={4} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="新配方" name="newFormula">
                <TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="適用產品用途" name="productUsage">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item label="化驗室回覆內容" name="responseContent">
            <TextArea rows={3} />
          </Form.Item>

          <Divider>規格變更對照表</Divider>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['檢測項目', '原規格', '新規格', '單位', '備註'].map(h => (
                    <th key={h} style={{ border: '1px solid #d9d9d9', padding: '4px 6px', background: '#162032' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {specRows.map((r, i) => (
                  <tr key={i}>
                    {(['item', 'oldSpec', 'newSpec', 'unit', 'remarks'] as (keyof SpecRow)[]).map(f => (
                      <td key={f} style={{ border: '1px solid #d9d9d9', padding: 2 }}>
                        <Input
                          size="small"
                          value={r[f]}
                          onChange={e => updateSpecRow(i, f, e.target.value)}
                          style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Form.Item label="備註" name="notes" style={{ marginTop: 16 }}>
            <TextArea rows={2} />
          </Form.Item>

          <Divider>完成確認項目</Divider>
          <Row gutter={8}>
            <Col><Form.Item name="completionProductUsage" valuePropName="checked"><Checkbox>產品用途確認</Checkbox></Form.Item></Col>
            <Col><Form.Item name="completionOperation" valuePropName="checked"><Checkbox>操作方式確認</Checkbox></Form.Item></Col>
            <Col><Form.Item name="completionTechConsult" valuePropName="checked"><Checkbox>技術諮詢</Checkbox></Form.Item></Col>
            <Col><Form.Item name="completionTechService" valuePropName="checked"><Checkbox>技術服務</Checkbox></Form.Item></Col>
            <Col><Form.Item name="completionOther" valuePropName="checked"><Checkbox>其他</Checkbox></Form.Item></Col>
          </Row>

          <Divider>申報資訊</Divider>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="申報部門" name="reportDept">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="申報人" name="reportPerson">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="申報日期" name="reportDate">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="申報時間" name="reportTime">
                <Input placeholder="例: 14:30" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 簽核 Modal */}
      <Modal
        title={`簽核 - 配方變更申請 #${sigTarget?.id ?? ''}${sigTarget?.no ? ` (${sigTarget.no})` : ''}`}
        open={!!sigTarget}
        onCancel={() => { setSigTarget(null); load() }}
        footer={null}
        width={700}
      >
        {sigTarget && (
          <ApprovalChain
            formType="FormulaChange"
            formId={sigTarget.id}
            onUpdate={load}
          />
        )}
      </Modal>
    </Card>
  )
}
