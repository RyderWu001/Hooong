import { useCallback, useEffect, useState } from 'react'
import {
  Card, Col, Row, Button, Tag, Space, Modal, Form, Input,
  Popconfirm, message, Typography, Empty, Tooltip, Tabs, Spin,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  HolderOutlined, EyeOutlined, EyeInvisibleOutlined,
  SaveOutlined, UndoOutlined,
} from '@ant-design/icons'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getAllDropdowns, createDropdownOption, updateDropdownOption,
  deleteDropdownOption, reorderDropdownOptions,
} from '../../api/dropdowns'
import type { DropdownCategory, DropdownOption } from '../../api/dropdowns'
import { clearDropdownCache } from '../../hooks/useDropdownOptions'
import styles from './DropdownManagePage.module.css'

const { Text, Title } = Typography

// ── 分類分組設定 ─────────────────────────────────────────────────────────────

const CATEGORY_GROUPS = [
  {
    tab: '配方管理',
    keys: ['formula_category', 'formula_type', 'formula_freeze_status'],
  },
  {
    tab: '原料管理',
    keys: ['ingredient_category', 'ingredient_industry', 'ingredient_status', 'ingredient_package', 'ingredient_unit', 'storage_condition', 'batch_status'],
  },
  {
    tab: '實驗管理',
    keys: ['experiment_category', 'dyeing_acid_method'],
  },
  {
    tab: '實驗結果',
    keys: ['result_status', 'result_abnormal_reason', 'result_improvement', 'result_client_feedback', 'abnormal_event_type'],
  },
  {
    tab: '樣品管理',
    keys: ['sample_category', 'sample_attribute', 'sample_industry', 'sample_status'],
  },
]

// ── 本地選項型別 ─────────────────────────────────────────────────────────────

interface LocalOption {
  id: number | null   // null = 尚未儲存的新選項
  label: string
  value: string
  isActive: boolean
}

// ── 可拖曳選項列 ─────────────────────────────────────────────────────────────

function SortableOptionRow({
  option, onEdit, onDelete, onToggle,
}: {
  option: LocalOption & { _key: string }
  onEdit: (o: LocalOption) => void
  onDelete: (o: LocalOption) => void
  onToggle: (o: LocalOption) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: option._key })

  const dndStyle = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition: transition ?? undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      className={`${styles.optionRow} ${isDragging ? styles.optionRowDragging : ''}`}
    >
      <span {...attributes} {...listeners} className={styles.dragHandle}>
        <HolderOutlined />
      </span>
      <Tag
        color={option.isActive ? 'blue' : 'default'}
        className={styles.optionTag}
      >
        {option.label}
        {option.id === null && (
          <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>新</Text>
        )}
      </Tag>
      {!option.isActive && (
        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>已停用</Text>
      )}
      <Space size={2} style={{ flexShrink: 0 }}>
        <Tooltip title="編輯">
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEdit(option)} />
        </Tooltip>
        <Tooltip title={option.isActive ? '停用' : '啟用'}>
          <Button
            size="small" type="text"
            icon={option.isActive ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={() => onToggle(option)}
          />
        </Tooltip>
        <Popconfirm title="確定移除此選項？" onConfirm={() => onDelete(option)}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    </div>
  )
}

// ── 單一類別卡片（本地狀態 + 統一儲存）───────────────────────────────────────

function CategoryCard({
  category, onRefresh,
}: {
  category: DropdownCategory
  onRefresh: () => void
}) {
  const toLocal = (opts: DropdownOption[]): LocalOption[] =>
    [...opts].sort((a, b) => a.sortOrder - b.sortOrder)
      .map(o => ({ id: o.id, label: o.label, value: o.value, isActive: o.isActive }))

  const [localOpts, setLocalOpts] = useState<LocalOption[]>(() => toLocal(category.options))
  const [deletedIds, setDeletedIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LocalOption | null>(null)
  const [form] = Form.useForm()
  const sensors = useSensors(useSensor(PointerSensor))

  // 同步父層資料（儲存後 refresh 觸發）
  useEffect(() => {
    setLocalOpts(toLocal(category.options))
    setDeletedIds([])
  }, [category.options])

  const original = toLocal(category.options)
  const isDirty = JSON.stringify(localOpts) !== JSON.stringify(original) || deletedIds.length > 0

  // 含排序用的 key（用於 dnd-kit）
  const optsWithKey = localOpts.map((o, i) => ({
    ...o,
    _key: o.id !== null ? `real-${o.id}` : `new-${i}`,
  }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = optsWithKey.findIndex(o => o._key === active.id)
    const newIdx = optsWithKey.findIndex(o => o._key === over.id)
    setLocalOpts(prev => arrayMove(prev, oldIdx, newIdx))
  }

  const openAdd = () => {
    setEditTarget(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (o: LocalOption) => {
    setEditTarget(o)
    form.setFieldsValue({ label: o.label, value: o.value })
    setModalOpen(true)
  }

  const handleModalSubmit = (values: { label: string; value: string }) => {
    if (editTarget) {
      setLocalOpts(prev => prev.map(o =>
        o === editTarget ? { ...o, label: values.label, value: values.value } : o
      ))
    } else {
      setLocalOpts(prev => [...prev, { id: null, label: values.label, value: values.value, isActive: true }])
    }
    setModalOpen(false)
  }

  const handleToggle = (o: LocalOption) => {
    setLocalOpts(prev => prev.map(p => p === o ? { ...p, isActive: !p.isActive } : p))
  }

  const handleDelete = (o: LocalOption) => {
    if (o.id !== null) setDeletedIds(prev => [...prev, o.id!])
    setLocalOpts(prev => prev.filter(p => p !== o))
  }

  const handleReset = () => {
    setLocalOpts(toLocal(category.options))
    setDeletedIds([])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. 刪除
      for (const id of deletedIds) {
        await deleteDropdownOption(id)
      }

      // 2. 新增，回傳新 ID
      const createdMap = new Map<number, number>()  // index → new id
      const newEntries = localOpts.map((o, i) => ({ o, i })).filter(({ o }) => o.id === null)
      for (const { o, i } of newEntries) {
        const res = await createDropdownOption(category.key, { label: o.label, value: o.value })
        createdMap.set(i, res.data.data.id)
      }

      // 3. 更新已修改的既有選項
      const origMap = new Map(category.options.map(o => [o.id, o]))
      const existingChanged = localOpts.filter((o) => {
        if (o.id === null) return false
        const orig = origMap.get(o.id)
        if (!orig) return false
        return orig.label !== o.label || orig.value !== o.value || orig.isActive !== o.isActive
      })
      for (const o of existingChanged) {
        await updateDropdownOption(o.id!, { label: o.label, value: o.value, isActive: o.isActive })
      }

      // 4. 重排（僅既有選項，新選項靠後）
      const existingInOrder = localOpts
        .filter(o => o.id !== null)
        .map((o, idx) => ({ id: o.id!, sortOrder: idx }))
      if (existingInOrder.length > 0) {
        await reorderDropdownOptions(category.key, existingInOrder)
      }

      clearDropdownCache(category.key)
      message.success(`${category.label} 已儲存`)
      onRefresh()
    } catch {
      message.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const activeCount = localOpts.filter(o => o.isActive).length

  return (
    <>
      <Card
        size="small"
        title={
          <Space>
            <Text strong style={{ fontSize: 13 }}>{category.label}</Text>
            <Tag color="blue" style={{ fontSize: 11 }}>{activeCount}</Tag>
          </Space>
        }
        extra={
          <Button size="small" icon={<PlusOutlined />} onClick={openAdd}>
            新增
          </Button>
        }
        styles={{ body: { padding: '4px 8px', minHeight: 60 } }}
      >
        {localOpts.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚無選項" style={{ margin: '8px 0' }} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={optsWithKey.map(o => o._key)} strategy={verticalListSortingStrategy}>
              {optsWithKey.map(o => (
                <SortableOptionRow
                  key={o._key}
                  option={o}
                  onEdit={() => openEdit(o)}
                  onDelete={() => handleDelete(o)}
                  onToggle={() => handleToggle(o)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {isDirty && (
          <div className={styles.unsavedBar}>
            <Button size="small" icon={<UndoOutlined />} onClick={handleReset}>取消</Button>
            <Button
              size="small" type="primary" icon={<SaveOutlined />}
              loading={saving} onClick={handleSave}
            >
              儲存
            </Button>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editTarget ? '編輯選項' : `新增選項 — ${category.label}`}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleModalSubmit} style={{ marginTop: 8 }}>
          <Form.Item name="label" label="顯示名稱" rules={[{ required: true }]}>
            <Input placeholder="例：主原料" onChange={(e) => {
              if (!editTarget) form.setFieldValue('value', e.target.value)
            }} />
          </Form.Item>
          <Form.Item
            name="value"
            label="儲存值"
            rules={[{ required: true }]}
            tooltip="通常與顯示名稱相同"
          >
            <Input placeholder="例：主原料" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── 主頁面 ────────────────────────────────────────────────────────────────────

export default function DropdownManagePage() {
  const [categories, setCategories] = useState<DropdownCategory[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAllDropdowns()
      setCategories(res.data.data ?? [])
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const catMap = new Map(categories.map(c => [c.key, c]))

  const tabItems = CATEGORY_GROUPS.map(group => ({
    key: group.tab,
    label: group.tab,
    children: (
      <Row gutter={[16, 16]}>
        {group.keys
          .map(key => catMap.get(key))
          .filter(Boolean)
          .map(cat => (
            <Col key={cat!.key} xs={24} sm={12} xl={8}>
              <CategoryCard category={cat!} onRefresh={load} />
            </Col>
          ))}
      </Row>
    ),
  }))

  // 未歸類的 category（防止遺漏）
  const groupedKeys = new Set(CATEGORY_GROUPS.flatMap(g => g.keys))
  const ungrouped = categories.filter(c => !groupedKeys.has(c.key))
  if (ungrouped.length > 0) {
    tabItems.push({
      key: '其他',
      label: '其他',
      children: (
        <Row gutter={[16, 16]}>
          {ungrouped.map(cat => (
            <Col key={cat.key} xs={24} sm={12} xl={8}>
              <CategoryCard category={cat} onRefresh={load} />
            </Col>
          ))}
        </Row>
      ),
    })
  }

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>下拉選項管理</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>調整完成後按各類別的「儲存」按鈕生效</Text>
        </Space>
      }
    >
      {loading ? (
        <Spin style={{ display: 'block', margin: '60px auto' }} />
      ) : (
        <Tabs items={tabItems} />
      )}
    </Card>
  )
}
