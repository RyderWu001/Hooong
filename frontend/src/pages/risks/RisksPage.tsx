import { useEffect, useState, useCallback } from 'react'
import {
  Card, Tabs, Table, Button, Modal, Form, Input,
  Space, Popconfirm, message, Select, DatePicker, Tag, Row, Col, Statistic, Descriptions, Alert, Typography,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  WarningOutlined, FileProtectOutlined, AlertOutlined, BarChartOutlined, LinkOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getFormulaRisks, createFormulaRisk, updateFormulaRisk, deleteFormulaRisk,
  getIngredientRisks, createIngredientRisk, updateIngredientRisk, deleteIngredientRisk,
  getAbnormalEvents, createAbnormalEvent, updateAbnormalEvent, deleteAbnormalEvent,
  getRiskReport,
} from '../../api/risks'
import { getFormulas, getIngredients, getFormulaIngredients } from '../../api/formulas'
import type { FormulaRisk, IngredientRisk, AbnormalEvent, RiskLevel, AbnormalEventStatus, Formula, Ingredient, FormulaIngredient } from '../../types'
import { useAuthStore } from '../../stores/authStore'

const { Text } = Typography

type RiskReport = {
  formulaRiskDist: Record<RiskLevel, number>
  ingRiskDist: Record<RiskLevel, number>
  eventTotal: number; eventOpen: number; eventInvestigating: number
  eventResolved: number; eventClosed: number
  recentEvents: AbnormalEvent[]
}

const RISK_COLOR: Record<RiskLevel, string> = { LOW: 'green', MEDIUM: 'orange', HIGH: 'red', CRITICAL: 'purple' }
const RISK_LABEL: Record<RiskLevel, string> = { LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '嚴重' }
const EVENT_STATUS_COLOR: Record<AbnormalEventStatus, string> = { OPEN: 'red', INVESTIGATING: 'orange', RESOLVED: 'green', CLOSED: 'default' }
const EVENT_STATUS_LABEL: Record<AbnormalEventStatus, string> = { OPEN: '待處理', INVESTIGATING: '調查中', RESOLVED: '已解決', CLOSED: '已關閉' }

const RISK_OPTIONS = Object.entries(RISK_LABEL).map(([v, l]) => ({ value: v, label: l }))

const FORMULA_RISK_TYPES = ['配方穩定性', '成分相容性', '製程風險', '品質偏差', '溫度敏感', 'pH值異常', '交叉污染', '其他']
const INGREDIENT_RISK_TYPES = ['化學危害', '生物危害', '物理危害', '供應中斷', '儲存條件不符', '過期失效', '純度不足', '其他']

function riskTypeOptions(types: string[]) {
  return types.map((t) => ({ value: t, label: t }))
}

// ─── Tab 1：配方風險評估 ──────────────────────────────────────────────────────

function FormulaRiskTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const [data, setData] = useState<FormulaRisk[]>([])
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(false)
  const [filterLevel, setFilterLevel] = useState<RiskLevel | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FormulaRisk | null>(null)
  const [formulaIngredients, setFormulaIngredients] = useState<FormulaIngredient[]>([])
  const [form] = Form.useForm()
  const watchedFormulaId = Form.useWatch('formulaId', form)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, fRes] = await Promise.all([getFormulaRisks({ riskLevel: filterLevel }), getFormulas()])
      setData(rRes.data.data); setFormulas(fRes.data.data)
    } finally { setLoading(false) }
  }, [filterLevel])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!watchedFormulaId) { setFormulaIngredients([]); return }
    getFormulaIngredients(watchedFormulaId).then((res) => setFormulaIngredients(res.data.data ?? [])).catch(() => setFormulaIngredients([]))
  }, [watchedFormulaId])

  const openAdd = () => { setEditing(null); form.resetFields(); setFormulaIngredients([]); setModalOpen(true) }
  const openEdit = (row: FormulaRisk) => {
    setEditing(row)
    form.setFieldsValue({ ...row, nextReviewAt: dayjs(row.nextReviewAt) })
    setModalOpen(true)
  }

  const watchRiskType = Form.useWatch('riskType', form)

  const handleSave = async (values: { formulaId: number; riskLevel: RiskLevel; riskType: string; riskTypeCustom?: string; description: string; mitigation: string; nextReviewAt: dayjs.Dayjs }) => {
    const finalRiskType = values.riskType === '其他' ? (values.riskTypeCustom ?? '').trim() : values.riskType
    if (!finalRiskType) { message.warning('請填寫風險類型'); return }
    try {
      const { riskTypeCustom: _, ...rest } = values
      const payload = { ...rest, riskType: finalRiskType, nextReviewAt: values.nextReviewAt.toISOString() }
      if (editing) { await updateFormulaRisk(editing.id, payload); message.success('已更新') }
      else { await createFormulaRisk(payload); message.success('已新增') }
      setModalOpen(false); load()
    } catch { message.error('儲存失敗') }
  }

  const columns: ColumnsType<FormulaRisk> = [
    { title: '配方編號', dataIndex: 'formulaCode', key: 'formulaCode', width: 120 },
    { title: '配方名稱', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '風險等級', dataIndex: 'riskLevel', key: 'riskLevel', width: 90,
      render: (v: RiskLevel) => <Tag color={RISK_COLOR[v]}>{RISK_LABEL[v]}</Tag> },
    { title: '風險類型', dataIndex: 'riskType', key: 'riskType', width: 120 },
    { title: '風險描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '評估人員', dataIndex: 'assessedBy', key: 'assessedBy', width: 100 },
    { title: '下次審查', dataIndex: 'nextReviewAt', key: 'nextReviewAt', width: 110,
      render: (v) => dayjs(v).format('YYYY-MM-DD') },
    ...(canEdit ? [{
      title: '操作', key: 'action', width: 120,
      render: (_: unknown, row: FormulaRisk) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>編輯</Button>
          <Popconfirm title="確定刪除？" onConfirm={async () => { await deleteFormulaRisk(row.id); message.success('已刪除'); load() }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <>
      <Alert
        type="info" showIcon
        style={{ marginBottom: 16, borderLeft: '4px solid #1677ff' }}
        message={<><LinkOutlined style={{ marginRight: 6 }} /><Text strong>配方風險評估</Text> — 針對配方整體的穩定性、製程與成分相容性進行風險評估，評估結果可與「原物料風險評估」相互對照。</>}
      />
      <Space style={{ marginBottom: 16 }}>
        {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增風險評估</Button>}
        <Select allowClear placeholder="篩選風險等級" style={{ width: 150 }} options={RISK_OPTIONS}
          onChange={(v) => setFilterLevel(v as RiskLevel)} />
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      <Modal open={modalOpen} title={editing ? '編輯配方風險' : '新增配方風險評估'} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} destroyOnClose width={560}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {!editing && (
            <>
              <Form.Item name="formulaId" label="配方" rules={[{ required: true }]}>
                <Select options={formulas.map((f) => ({ value: f.id, label: `${f.code} ${f.name}` }))} showSearch
                  filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
                  placeholder="請選擇要評估的配方" />
              </Form.Item>
              {formulaIngredients.length > 0 && (
                <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f0f5ff', borderRadius: 6, border: '1px solid #adc6ff' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <LinkOutlined style={{ marginRight: 4 }} />此配方包含原物料：
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {formulaIngredients.map((fi) => (
                      <Tag key={fi.ingredientId} color="blue" style={{ marginBottom: 4 }}>
                        {fi.ingredientName} {fi.ratio} {fi.unit}
                      </Tag>
                    ))}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>建議同步確認上述原物料是否已完成風險評估。</Text>
                </div>
              )}
            </>
          )}
          <Form.Item name="riskLevel" label="風險等級" rules={[{ required: true }]}><Select options={RISK_OPTIONS} placeholder="請選擇風險等級" /></Form.Item>
          <Form.Item name="riskType" label="風險類型" rules={[{ required: true, message: '請選擇風險類型' }]}>
            <Select options={riskTypeOptions(FORMULA_RISK_TYPES)} placeholder="請選擇風險類型" />
          </Form.Item>
          {watchRiskType === '其他' && (
            <Form.Item name="riskTypeCustom" label="請說明風險類型" rules={[{ required: true, message: '請填寫自訂風險類型' }]}>
              <Input placeholder="請輸入自訂風險類型" autoFocus />
            </Form.Item>
          )}
          <Form.Item name="description" label="風險描述" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="說明此配方的風險情境與潛在危害" /></Form.Item>
          <Form.Item name="mitigation" label="緩解措施" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="說明降低或消除此風險的具體措施" /></Form.Item>
          <Form.Item name="nextReviewAt" label="下次審查日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ─── Tab 2：原物料風險評估 ──────────────────────────────────────────────────────

function IngredientRiskTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const [data, setData] = useState<IngredientRisk[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(false)
  const [filterLevel, setFilterLevel] = useState<RiskLevel | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<IngredientRisk | null>(null)
  const [detail, setDetail] = useState<IngredientRisk | null>(null)
  const [relatedFormulas, setRelatedFormulas] = useState<Formula[]>([])
  const [form] = Form.useForm()
  const watchedIngredientId = Form.useWatch('ingredientId', form)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, iRes, fRes] = await Promise.all([
        getIngredientRisks({ riskLevel: filterLevel }),
        getIngredients({ limit: 200 }),
        getFormulas(),
      ])
      setData(rRes.data.data); setIngredients(iRes.data.data); setFormulas(fRes.data.data)
    } finally { setLoading(false) }
  }, [filterLevel])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!watchedIngredientId || formulas.length === 0) { setRelatedFormulas([]); return }
    Promise.all(formulas.map((f) =>
      getFormulaIngredients(f.id).then((res) => {
        const ings: FormulaIngredient[] = res.data.data ?? []
        return ings.some((fi) => fi.ingredientId === watchedIngredientId) ? f : null
      })
    )).then((results) => setRelatedFormulas(results.filter(Boolean) as Formula[]))
      .catch(() => setRelatedFormulas([]))
  }, [watchedIngredientId, formulas])

  const watchIngRiskType = Form.useWatch('riskType', form)

  const openAdd = () => { setEditing(null); form.resetFields(); setRelatedFormulas([]); setModalOpen(true) }
  const openEdit = (row: IngredientRisk) => { setEditing(row); form.setFieldsValue(row); setModalOpen(true) }

  const handleSave = async (values: Omit<IngredientRisk, 'id' | 'ingredientName' | 'assessedBy' | 'assessedAt'> & { riskTypeCustom?: string }) => {
    const finalRiskType = values.riskType === '其他' ? (values.riskTypeCustom ?? '').trim() : values.riskType
    if (!finalRiskType) { message.warning('請填寫風險類型'); return }
    const { riskTypeCustom: _, ...rest } = values
    const payload = { ...rest, riskType: finalRiskType }
    try {
      if (editing) { await updateIngredientRisk(editing.id, payload); message.success('已更新') }
      else { await createIngredientRisk(payload as Parameters<typeof createIngredientRisk>[0]); message.success('已新增') }
      setModalOpen(false); load()
    } catch { message.error('儲存失敗') }
  }

  const columns: ColumnsType<IngredientRisk> = [
    { title: '原物料名稱', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '風險等級', dataIndex: 'riskLevel', key: 'riskLevel', width: 90,
      render: (v: RiskLevel) => <Tag color={RISK_COLOR[v]}>{RISK_LABEL[v]}</Tag> },
    { title: '風險類型', dataIndex: 'riskType', key: 'riskType', width: 120 },
    { title: '危害說明', dataIndex: 'hazardDescription', key: 'hazardDescription', ellipsis: true },
    { title: '評估人員', dataIndex: 'assessedBy', key: 'assessedBy', width: 100 },
    { title: '操作', key: 'action', width: 140,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => setDetail(row)}>詳情</Button>
          {canEdit && <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>編輯</Button>}
          {canEdit && (
            <Popconfirm title="確定刪除？" onConfirm={async () => { await deleteIngredientRisk(row.id); message.success('已刪除'); load() }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ) },
  ]

  return (
    <>
      <Alert
        type="warning" showIcon
        style={{ marginBottom: 16, borderLeft: '4px solid #fa8c16' }}
        message={<><LinkOutlined style={{ marginRight: 6 }} /><Text strong>原物料風險評估</Text> — 針對原物料本身的化學、生物、物理危害進行評估，評估結果可與「配方風險評估」相互對照，確認原物料風險是否影響配方安全。</>}
      />
      <Space style={{ marginBottom: 16 }}>
        {canEdit && <Button type="primary" onClick={openAdd} icon={<PlusOutlined />}>新增風險評估</Button>}
        <Select allowClear placeholder="篩選風險等級" style={{ width: 150 }} options={RISK_OPTIONS}
          onChange={(v) => setFilterLevel(v as RiskLevel)} />
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />

      <Modal open={modalOpen} title={editing ? '編輯原物料風險' : '新增原物料風險評估'} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} destroyOnClose width={560}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {!editing && (
            <>
              <Form.Item name="ingredientId" label="原物料" rules={[{ required: true }]}>
                <Select options={ingredients.map((i) => ({ value: i.id, label: `${i.name}（${i.unit}）` }))} showSearch
                  filterOption={(inp, o) => (o?.label ?? '').toLowerCase().includes(inp.toLowerCase())}
                  placeholder="請選擇要評估的原物料" />
              </Form.Item>
              {relatedFormulas.length > 0 && (
                <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <LinkOutlined style={{ marginRight: 4 }} />此原物料被以下配方使用：
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {relatedFormulas.map((f) => (
                      <Tag key={f.id} color="orange" style={{ marginBottom: 4 }}>
                        {f.code} {f.name}
                      </Tag>
                    ))}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>建議同步確認上述配方是否已完成風險評估。</Text>
                </div>
              )}
            </>
          )}
          <Form.Item name="riskLevel" label="風險等級" rules={[{ required: true }]}><Select options={RISK_OPTIONS} placeholder="請選擇風險等級" /></Form.Item>
          <Form.Item name="riskType" label="風險類型" rules={[{ required: true, message: '請選擇風險類型' }]}>
            <Select options={riskTypeOptions(INGREDIENT_RISK_TYPES)} placeholder="請選擇風險類型" />
          </Form.Item>
          {watchIngRiskType === '其他' && (
            <Form.Item name="riskTypeCustom" label="請說明風險類型" rules={[{ required: true, message: '請填寫自訂風險類型' }]}>
              <Input placeholder="請輸入自訂風險類型" autoFocus />
            </Form.Item>
          )}
          <Form.Item name="hazardDescription" label="危害說明" rules={[{ required: true }]}><Input.TextArea rows={2} placeholder="說明此原物料可能造成的危害" /></Form.Item>
          <Form.Item name="safeHandling" label="安全操作" rules={[{ required: true }]}><Input.TextArea rows={2} placeholder="操作此原物料時應注意的安全事項" /></Form.Item>
          <Form.Item name="storageRequirements" label="儲存要求" rules={[{ required: true }]}><Input.TextArea rows={2} placeholder="溫度、溼度、避光等儲存條件" /></Form.Item>
        </Form>
      </Modal>

      <Modal open={!!detail} title="原物料風險詳情" onCancel={() => setDetail(null)} footer={null}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="原物料">{detail.ingredientName}</Descriptions.Item>
            <Descriptions.Item label="風險等級"><Tag color={RISK_COLOR[detail.riskLevel]}>{RISK_LABEL[detail.riskLevel]}</Tag></Descriptions.Item>
            <Descriptions.Item label="風險類型">{detail.riskType}</Descriptions.Item>
            <Descriptions.Item label="危害說明">{detail.hazardDescription}</Descriptions.Item>
            <Descriptions.Item label="安全操作">{detail.safeHandling}</Descriptions.Item>
            <Descriptions.Item label="儲存要求">{detail.storageRequirements}</Descriptions.Item>
            <Descriptions.Item label="評估人員">{detail.assessedBy}</Descriptions.Item>
            <Descriptions.Item label="評估日期">{dayjs(detail.assessedAt).format('YYYY-MM-DD')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  )
}

// ─── Tab 3：異常事件管理 ──────────────────────────────────────────────────────

function AbnormalEventTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const [data, setData] = useState<AbnormalEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<{ status?: AbnormalEventStatus; severity?: RiskLevel; eventType?: string; page: number; limit: number }>({ page: 1, limit: 20 })
  const [addOpen, setAddOpen] = useState(false)
  const [resolveTarget, setResolveTarget] = useState<AbnormalEvent | null>(null)
  const [detail, setDetail] = useState<AbnormalEvent | null>(null)
  const [addForm] = Form.useForm()
  const [resolveForm] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAbnormalEvents(filters)
      setData(res.data.data); setTotal(res.data.pagination?.total ?? res.data.data.length)
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { load() }, [load])

  const handleAdd = async (values: { title: string; description: string; eventType: string; severity: RiskLevel; occurredAt: dayjs.Dayjs }) => {
    try {
      await createAbnormalEvent({ ...values, occurredAt: values.occurredAt.toISOString() })
      message.success('事件已記錄'); setAddOpen(false); load()
    } catch { message.error('新增失敗') }
  }

  const handleResolve = async (values: { status: AbnormalEventStatus; resolution?: string }) => {
    if (!resolveTarget) return
    try {
      await updateAbnormalEvent(resolveTarget.id, values)
      message.success('狀態已更新'); setResolveTarget(null); load()
    } catch { message.error('更新失敗') }
  }

  const columns: ColumnsType<AbnormalEvent> = [
    { title: '事件編號', dataIndex: 'eventCode', key: 'eventCode', width: 130 },
    { title: '標題', dataIndex: 'title', key: 'title' },
    { title: '事件類型', dataIndex: 'eventType', key: 'eventType', width: 100 },
    { title: '嚴重程度', dataIndex: 'severity', key: 'severity', width: 90,
      render: (v: RiskLevel) => <Tag color={RISK_COLOR[v]}>{RISK_LABEL[v]}</Tag> },
    { title: '狀態', dataIndex: 'status', key: 'status', width: 90,
      render: (v: AbnormalEventStatus) => <Tag color={EVENT_STATUS_COLOR[v]}>{EVENT_STATUS_LABEL[v]}</Tag> },
    { title: '發生時間', dataIndex: 'occurredAt', key: 'occurredAt', width: 110,
      render: (v) => dayjs(v).format('YYYY-MM-DD') },
    { title: '回報人', dataIndex: 'reportedBy', key: 'reportedBy', width: 90 },
    { title: '操作', key: 'action', width: 130,
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => setDetail(row)}>詳情</Button>
          {canEdit && row.status !== 'CLOSED' && (
            <Button size="small" type="primary" ghost
              onClick={() => { setResolveTarget(row); resolveForm.setFieldsValue({ status: row.status }) }}>
              更新
            </Button>
          )}
          {canEdit && (
            <Popconfirm title="確定刪除？" onConfirm={async () => { await deleteAbnormalEvent(row.id); message.success('已刪除'); load() }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ) },
  ]

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => { addForm.resetFields(); setAddOpen(true) }}>記錄異常事件</Button>}
        <Select allowClear placeholder="狀態" style={{ width: 120 }}
          options={Object.entries(EVENT_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))}
          onChange={(v) => setFilters((f) => ({ ...f, status: v as AbnormalEventStatus | undefined, page: 1 }))} />
        <Select allowClear placeholder="嚴重程度" style={{ width: 120 }} options={RISK_OPTIONS}
          onChange={(v) => setFilters((f) => ({ ...f, severity: v as RiskLevel | undefined, page: 1 }))} />
        <Input placeholder="事件類型" allowClear style={{ width: 130 }}
          onChange={(e) => setFilters((f) => ({ ...f, eventType: e.target.value || undefined, page: 1 }))} />
      </Space>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data}
        pagination={{ current: filters.page, pageSize: filters.limit, total, onChange: (p, l) => setFilters((f) => ({ ...f, page: p, limit: l })) }} />

      <Modal open={addOpen} title="記錄異常事件" onCancel={() => setAddOpen(false)} onOk={() => addForm.submit()} destroyOnClose>
        <Form form={addForm} layout="vertical" onFinish={handleAdd} initialValues={{ occurredAt: dayjs() }}>
          <Form.Item name="title" label="事件標題" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="eventType" label="事件類型" rules={[{ required: true }]}>
            <Select options={[{ value: '原物料品質' }, { value: '實驗異常' }, { value: '庫存異常' }, { value: '設備故障' }, { value: '其他' }].map((o) => ({ value: o.value, label: o.value }))} />
          </Form.Item>
          <Form.Item name="severity" label="嚴重程度" rules={[{ required: true }]}><Select options={RISK_OPTIONS} /></Form.Item>
          <Form.Item name="occurredAt" label="發生時間" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="事件描述" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={!!resolveTarget} title="更新事件狀態" onCancel={() => setResolveTarget(null)} onOk={() => resolveForm.submit()} destroyOnClose>
        <Form form={resolveForm} layout="vertical" onFinish={handleResolve}>
          <Form.Item name="status" label="狀態" rules={[{ required: true }]}>
            <Select options={Object.entries(EVENT_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))} />
          </Form.Item>
          <Form.Item name="resolution" label="處理說明"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal open={!!detail} title="異常事件詳情" onCancel={() => setDetail(null)} footer={null} width={600}>
        {detail && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="事件編號" span={2}>{detail.eventCode}</Descriptions.Item>
            <Descriptions.Item label="標題" span={2}>{detail.title}</Descriptions.Item>
            <Descriptions.Item label="事件類型">{detail.eventType}</Descriptions.Item>
            <Descriptions.Item label="嚴重程度"><Tag color={RISK_COLOR[detail.severity]}>{RISK_LABEL[detail.severity]}</Tag></Descriptions.Item>
            <Descriptions.Item label="狀態"><Tag color={EVENT_STATUS_COLOR[detail.status]}>{EVENT_STATUS_LABEL[detail.status]}</Tag></Descriptions.Item>
            <Descriptions.Item label="發生時間">{dayjs(detail.occurredAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="回報人" span={2}>{detail.reportedBy}</Descriptions.Item>
            <Descriptions.Item label="關聯配方" span={2}>{detail.relatedFormulaName ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="關聯原物料" span={2}>{detail.relatedIngredientName ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="事件描述" span={2}>{detail.description}</Descriptions.Item>
            {detail.resolution && <Descriptions.Item label="處理說明" span={2}>{detail.resolution}</Descriptions.Item>}
            {detail.resolvedAt && <Descriptions.Item label="解決時間" span={2}>{dayjs(detail.resolvedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </>
  )
}

// ─── Tab 4：風險報表分析 ──────────────────────────────────────────────────────

function RiskReportTab() {
  const [report, setReport] = useState<RiskReport | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await getRiskReport(); setReport(res.data.data) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (!report) return null

  const highRiskItems = [
    ...Object.entries(report.formulaRiskDist).filter(([k]) => k === 'HIGH' || k === 'CRITICAL').reduce((a, [, v]) => a + (v as number), 0) > 0
      ? [{ type: '配方高風險', count: (report.formulaRiskDist.HIGH ?? 0) + (report.formulaRiskDist.CRITICAL ?? 0) }]
      : [],
    ...Object.entries(report.ingRiskDist).filter(([k]) => k === 'HIGH' || k === 'CRITICAL').reduce((a, [, v]) => a + (v as number), 0) > 0
      ? [{ type: '原物料高風險', count: (report.ingRiskDist.HIGH ?? 0) + (report.ingRiskDist.CRITICAL ?? 0) }]
      : [],
    ...(report.eventOpen > 0 ? [{ type: '待處理異常事件', count: report.eventOpen }] : []),
  ]

  return (
    <div style={{ maxWidth: 900 }}>
      {highRiskItems.length > 0 && (
        <Alert type="warning" showIcon icon={<WarningOutlined />} style={{ marginBottom: 24 }}
          message={`注意：${highRiskItems.map((i) => `${i.type} ${i.count} 項`).join('、')}，請儘速處理`} />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="異常事件總數" value={report.eventTotal} /></Card></Col>
        <Col span={6}><Card><Statistic title="待處理" value={report.eventOpen} valueStyle={{ color: report.eventOpen > 0 ? '#cf1322' : undefined }} /></Card></Col>
        <Col span={6}><Card><Statistic title="調查中" value={report.eventInvestigating} valueStyle={{ color: report.eventInvestigating > 0 ? '#d46b08' : undefined }} /></Card></Col>
        <Col span={6}><Card><Statistic title="已解決" value={report.eventResolved} valueStyle={{ color: '#3f8600' }} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="配方風險分布" size="small" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {(Object.entries(RISK_LABEL) as [RiskLevel, string][]).map(([level, label]) => (
                <Space key={level}>
                  <Tag color={RISK_COLOR[level]} style={{ width: 60, textAlign: 'center' }}>{label}</Tag>
                  <span>{report.formulaRiskDist[level] ?? 0} 項</span>
                </Space>
              ))}
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="原物料風險分布" size="small" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {(Object.entries(RISK_LABEL) as [RiskLevel, string][]).map(([level, label]) => (
                <Space key={level}>
                  <Tag color={RISK_COLOR[level]} style={{ width: 60, textAlign: 'center' }}>{label}</Tag>
                  <span>{report.ingRiskDist[level] ?? 0} 項</span>
                </Space>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card title="最近異常事件" size="small" loading={loading}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={report.recentEvents}
          columns={[
            { title: '事件編號', dataIndex: 'eventCode', key: 'eventCode', width: 130 },
            { title: '標題', dataIndex: 'title', key: 'title' },
            { title: '嚴重程度', dataIndex: 'severity', key: 'severity', width: 90,
              render: (v: RiskLevel) => <Tag color={RISK_COLOR[v]}>{RISK_LABEL[v]}</Tag> },
            { title: '狀態', dataIndex: 'status', key: 'status', width: 90,
              render: (v: AbnormalEventStatus) => <Tag color={EVENT_STATUS_COLOR[v]}>{EVENT_STATUS_LABEL[v]}</Tag> },
            { title: '發生時間', dataIndex: 'occurredAt', key: 'occurredAt', width: 110,
              render: (v) => dayjs(v).format('YYYY-MM-DD') },
          ]}
        />
      </Card>
    </div>
  )
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────

export default function RisksPage() {
  return (
    <Card title="風險管理">
      <Tabs items={[
        { key: '1', label: '配方風險評估', icon: <FileProtectOutlined />, children: <FormulaRiskTab /> },
        { key: '2', label: '原物料風險評估', icon: <WarningOutlined />, children: <IngredientRiskTab /> },
        { key: '3', label: '異常事件管理', icon: <AlertOutlined />, children: <AbnormalEventTab /> },
        { key: '4', label: '風險報表分析', icon: <BarChartOutlined />, children: <RiskReportTab /> },
      ]} />
    </Card>
  )
}
