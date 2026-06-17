import { useEffect, useState, useCallback } from 'react'
import {
  Card, Tabs, Table, Button, Modal, Form, Input, InputNumber,
  Space, Popconfirm, message, Select, DatePicker, Tag, Alert, Typography,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  WarningOutlined, AuditOutlined, InboxOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  getIngredients, createIngredient, updateIngredient, deleteIngredient,
} from '../../api/formulas'
import {
  getInventory, createInventory, updateInventory, deleteInventory,
  adjustStock, getTransactions, getTraceability,
} from '../../api/materials'
import type {
  Ingredient, MaterialInventory, MaterialTransaction,
  MaterialTraceability, TransactionType,
} from '../../types'
import { useAuthStore } from '../../stores/authStore'

const { Text } = Typography

// ─── Tab 1：原料資料維護 ───────────────────────────────────────────────────────

function IngredientTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const [data, setData] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getIngredients({ limit: 200 })
      setData(res.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (row: Ingredient) => { setEditing(row); form.setFieldsValue(row); setModalOpen(true) }

  const handleSave = async (values: { name: string; unit: string; description: string }) => {
    try {
      if (editing) {
        await updateIngredient(editing.id, values)
        message.success('已更新')
      } else {
        await createIngredient(values)
        message.success('已新增')
      }
      setModalOpen(false)
      load()
    } catch {
      message.error('儲存失敗')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteIngredient(id)
      message.success('已刪除')
      load()
    } catch {
      message.error('刪除失敗')
    }
  }

  const columns: ColumnsType<Ingredient> = [
    { title: '編號', dataIndex: 'id', key: 'id', width: 70 },
    { title: '名稱', dataIndex: 'name', key: 'name' },
    { title: '單位', dataIndex: 'unit', key: 'unit', width: 100 },
    { title: '說明', dataIndex: 'description', key: 'description' },
    ...(canEdit ? [{
      title: '操作', key: 'action', width: 140,
      render: (_: unknown, row: Ingredient) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>編輯</Button>
          <Popconfirm title="確定刪除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  return (
    <>
      {canEdit && (
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={openAdd}>
          新增原料
        </Button>
      )}
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
      <Modal
        open={modalOpen}
        title={editing ? '編輯原料' : '新增原料'}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="名稱" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="單位" rules={[{ required: true }]}>
            <Input placeholder="mL、g、kg…" />
          </Form.Item>
          <Form.Item name="description" label="說明">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ─── Tab 2：庫存管理 ──────────────────────────────────────────────────────────

function InventoryTab() {
  const { user } = useAuthStore()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const [data, setData] = useState<MaterialInventory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MaterialInventory | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<MaterialInventory | null>(null)
  const [addForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [adjustForm] = Form.useForm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [invRes, ingRes] = await Promise.all([getInventory(), getIngredients({ limit: 200 })])
      setData(invRes.data.data)
      setIngredients(ingRes.data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async (values: {
    ingredientId: number; currentStock: number; safetyStock: number
    supplier: string; expiryDate?: dayjs.Dayjs
  }) => {
    try {
      await createInventory({ ...values, expiryDate: values.expiryDate?.format('YYYY-MM-DD') })
      message.success('已新增庫存紀錄')
      setAddOpen(false)
      load()
    } catch { message.error('新增失敗') }
  }

  const handleEdit = async (values: { safetyStock: number; supplier: string; expiryDate?: dayjs.Dayjs }) => {
    if (!editTarget) return
    try {
      await updateInventory(editTarget.id, { ...values, expiryDate: values.expiryDate?.format('YYYY-MM-DD') })
      message.success('已更新')
      setEditTarget(null)
      load()
    } catch { message.error('更新失敗') }
  }

  const handleAdjust = async (values: { transactionType: TransactionType; quantity: number; note: string }) => {
    if (!adjustTarget) return
    try {
      await adjustStock(adjustTarget.id, values)
      message.success('庫存已調整')
      setAdjustTarget(null)
      load()
    } catch { message.error('調整失敗') }
  }

  const openEdit = (row: MaterialInventory) => {
    setEditTarget(row)
    editForm.setFieldsValue({ ...row, expiryDate: row.expiryDate ? dayjs(row.expiryDate) : undefined })
  }

  const columns: ColumnsType<MaterialInventory> = [
    { title: '原料名稱', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '單位', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: '當前庫存', dataIndex: 'currentStock', key: 'currentStock', width: 110,
      render: (v: number, row) => (
        <Text type={v < row.safetyStock ? 'danger' : undefined} strong={v < row.safetyStock}>
          {v}
        </Text>
      ),
    },
    { title: '安全庫存', dataIndex: 'safetyStock', key: 'safetyStock', width: 110 },
    { title: '供應商', dataIndex: 'supplier', key: 'supplier' },
    {
      title: '到期日', dataIndex: 'expiryDate', key: 'expiryDate', width: 110,
      render: (v?: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    {
      title: '最後更新', dataIndex: 'lastUpdated', key: 'lastUpdated', width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    ...(canEdit ? [{
      title: '操作', key: 'action', width: 160,
      render: (_: unknown, row: MaterialInventory) => (
        <Space>
          <Button size="small" icon={<InboxOutlined />} onClick={() => setAdjustTarget(row)}>調整</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>編輯</Button>
          <Popconfirm title="確定刪除？" onConfirm={async () => {
            await deleteInventory(row.id); message.success('已刪除'); load()
          }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    }] : []),
  ]

  const usedIngredientIds = data.map((d) => d.ingredientId)
  const availableIngredients = ingredients.filter((i) => !usedIngredientIds.includes(i.id))

  return (
    <>
      {canEdit && (
        <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }} onClick={() => { addForm.resetFields(); setAddOpen(true) }}>
          新增庫存紀錄
        </Button>
      )}
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />

      {/* 新增庫存 Modal */}
      <Modal open={addOpen} title="新增庫存紀錄" onCancel={() => setAddOpen(false)} onOk={() => addForm.submit()} destroyOnClose>
        <Form form={addForm} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="ingredientId" label="原料" rules={[{ required: true }]}>
            <Select options={availableIngredients.map((i) => ({ value: i.id, label: `${i.name}（${i.unit}）` }))} placeholder="選擇原料" />
          </Form.Item>
          <Form.Item name="currentStock" label="初始庫存" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="safetyStock" label="安全庫存" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="supplier" label="供應商" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="expiryDate" label="到期日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 編輯 Modal */}
      <Modal open={!!editTarget} title="編輯庫存設定" onCancel={() => setEditTarget(null)} onOk={() => editForm.submit()} destroyOnClose>
        <Form form={editForm} layout="vertical" onFinish={handleEdit}>
          <Form.Item name="safetyStock" label="安全庫存" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="supplier" label="供應商" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="expiryDate" label="到期日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 調整庫存 Modal */}
      <Modal open={!!adjustTarget} title={`調整庫存：${adjustTarget?.ingredientName}`} onCancel={() => setAdjustTarget(null)} onOk={() => adjustForm.submit()} destroyOnClose>
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjust} initialValues={{ transactionType: 'IN' }}>
          <Form.Item name="transactionType" label="類型" rules={[{ required: true }]}>
            <Select options={[
              { value: 'IN', label: '入庫' },
              { value: 'OUT', label: '出庫' },
              { value: 'ADJUST', label: '盤點調整（直接設定庫存量）' },
            ]} />
          </Form.Item>
          <Form.Item name="quantity" label="數量" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} addonAfter={adjustTarget?.unit} />
          </Form.Item>
          <Form.Item name="note" label="備註" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ─── Tab 3：安全庫存警示 ──────────────────────────────────────────────────────

function SafetyStockTab() {
  const [data, setData] = useState<MaterialInventory[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getInventory()
      setData(res.data.data.filter((i: MaterialInventory) => i.currentStock < i.safetyStock))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const columns: ColumnsType<MaterialInventory> = [
    {
      title: '狀態', key: 'status', width: 100,
      render: () => <Tag color="red" icon={<WarningOutlined />}>庫存不足</Tag>,
    },
    { title: '原料名稱', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '當前庫存', dataIndex: 'currentStock', key: 'currentStock', width: 110,
      render: (v: number) => <Text type="danger" strong>{v}</Text> },
    { title: '安全庫存', dataIndex: 'safetyStock', key: 'safetyStock', width: 110 },
    { title: '單位', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: '供應商', dataIndex: 'supplier', key: 'supplier' },
    { title: '到期日', dataIndex: 'expiryDate', key: 'expiryDate', width: 110,
      render: (v?: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—' },
    { title: '缺口', key: 'gap', width: 100,
      render: (_: unknown, row) => <Text type="danger">-{row.safetyStock - row.currentStock} {row.unit}</Text> },
  ]

  return (
    <>
      {data.length > 0
        ? <Alert type="warning" showIcon icon={<WarningOutlined />} style={{ marginBottom: 16 }}
            message={`共 ${data.length} 項原料庫存低於安全庫存，請儘快補貨`} />
        : <Alert type="success" showIcon style={{ marginBottom: 16 }} message="所有原料庫存皆在安全水位以上" />
      }
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />
    </>
  )
}

// ─── Tab 4：原料追溯 ──────────────────────────────────────────────────────────

function TraceabilityTab() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [result, setResult] = useState<MaterialTraceability | null>(null)
  const [txData, setTxData] = useState<MaterialTransaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getIngredients({ limit: 200 }).then((res) => setIngredients(res.data.data))
  }, [])

  const handleSelect = async (id: number) => {
    setLoading(true)
    try {
      const [traceRes, txRes] = await Promise.all([
        getTraceability(id),
        getTransactions({ ingredientId: id }),
      ])
      setResult(traceRes.data.data)
      setTxData(txRes.data.data)
    } finally {
      setLoading(false)
    }
  }

  const formulaColumns: ColumnsType<MaterialTraceability['usedInFormulas'][number]> = [
    { title: '配方編號', dataIndex: 'formulaCode', key: 'formulaCode' },
    { title: '配方名稱', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '用量比例', key: 'ratio', render: (_, r) => `${r.ratio} ${r.unit}` },
  ]

  const experimentColumns: ColumnsType<MaterialTraceability['usedInExperiments'][number]> = [
    { title: '實驗編號', dataIndex: 'experimentCode', key: 'experimentCode' },
    { title: '使用配方', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '實驗日期', dataIndex: 'experimentDate', key: 'experimentDate',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
  ]

  const txTypeLabel: Record<string, { label: string; color: string }> = {
    IN: { label: '入庫', color: 'green' },
    OUT: { label: '出庫', color: 'red' },
    ADJUST: { label: '盤點', color: 'blue' },
  }

  const txColumns: ColumnsType<MaterialTransaction> = [
    { title: '時間', dataIndex: 'createdAt', key: 'createdAt', width: 170,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '類型', dataIndex: 'transactionType', key: 'transactionType', width: 80,
      render: (v: string) => <Tag color={txTypeLabel[v]?.color}>{txTypeLabel[v]?.label}</Tag> },
    { title: '數量', key: 'quantity', width: 100,
      render: (_, r) => `${r.quantity} ${r.unit}` },
    { title: '關聯實驗', dataIndex: 'relatedExperimentCode', key: 'relatedExperimentCode',
      render: (v?: string) => v ?? '—' },
    { title: '操作人員', dataIndex: 'operator', key: 'operator', width: 110 },
    { title: '備註', dataIndex: 'note', key: 'note' },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Text>選擇原料：</Text>
        <Select
          style={{ width: 240 }}
          placeholder="請選擇要追溯的原料"
          options={ingredients.map((i) => ({ value: i.id, label: `${i.name}（${i.unit}）` }))}
          onChange={handleSelect}
          showSearch
          filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
        />
      </Space>

      {result && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card size="small" title={`使用此原料的配方（共 ${result.usedInFormulas.length} 筆）`} loading={loading}>
            <Table rowKey="formulaId" columns={formulaColumns} dataSource={result.usedInFormulas} pagination={false} size="small" />
          </Card>
          <Card size="small" title={`使用此原料的實驗（共 ${result.usedInExperiments.length} 筆）`} loading={loading}>
            <Table rowKey="experimentId" columns={experimentColumns} dataSource={result.usedInExperiments} pagination={false} size="small" />
          </Card>
          <Card size="small" title={`進出庫紀錄（共 ${txData.length} 筆）`} loading={loading}>
            <Table rowKey="id" columns={txColumns} dataSource={txData} pagination={false} size="small" />
          </Card>
        </Space>
      )}
    </>
  )
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  return (
    <Card title="原物料管理">
      <Tabs
        items={[
          { key: '1', label: '原料資料維護', icon: <EditOutlined />, children: <IngredientTab /> },
          { key: '2', label: '庫存管理', icon: <InboxOutlined />, children: <InventoryTab /> },
          { key: '3', label: '安全庫存警示', icon: <WarningOutlined />, children: <SafetyStockTab /> },
          { key: '4', label: '原料追溯', icon: <AuditOutlined />, children: <TraceabilityTab /> },
        ]}
      />
    </Card>
  )
}
