import { useCallback, useEffect, useState } from 'react'
import {
  Card, Col, Row, List, Button, Tag, Space, Modal, Form, Input,
  Popconfirm, message, Typography, Switch, Badge, Empty, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  HolderOutlined, EyeOutlined, EyeInvisibleOutlined,
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

const { Text, Title } = Typography

// ── 可拖曳選項列 ─────────────────────────────────────────────

function SortableOptionRow({
  option, onEdit, onDelete, onToggle,
}: {
  option: DropdownOption
  onEdit: (o: DropdownOption) => void
  onDelete: (id: number) => void
  onToggle: (o: DropdownOption) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: option.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? '#f0f5ff' : undefined,
        borderRadius: 6,
      }}
    >
      <List.Item
        style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0' }}
        actions={[
          <Tooltip title="編輯">
            <Button
              size="small" type="text" icon={<EditOutlined />}
              onClick={() => onEdit(option)}
            />
          </Tooltip>,
          <Tooltip title={option.isActive ? '停用' : '啟用'}>
            <Button
              size="small" type="text"
              icon={option.isActive ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => onToggle(option)}
            />
          </Tooltip>,
          <Popconfirm title="確定刪除此選項？" onConfirm={() => onDelete(option.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>,
        ]}
      >
        <Space>
          <span
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab', color: '#bbb', fontSize: 16, lineHeight: 1 }}
          >
            <HolderOutlined />
          </span>
          <Tag color={option.isActive ? 'blue' : 'default'}>
            {option.label}
          </Tag>
          {!option.isActive && (
            <Text type="secondary" style={{ fontSize: 12 }}>已停用</Text>
          )}
        </Space>
      </List.Item>
    </div>
  )
}

// ── 單一類別卡片 ─────────────────────────────────────────────

function CategoryCard({
  category, onRefresh,
}: {
  category: DropdownCategory
  onRefresh: () => void
}) {
  const [options, setOptions] = useState<DropdownOption[]>(
    [...category.options].sort((a, b) => a.sortOrder - b.sortOrder)
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DropdownOption | null>(null)
  const [form] = Form.useForm()
  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    setOptions([...category.options].sort((a, b) => a.sortOrder - b.sortOrder))
  }, [category.options])

  const openAdd = () => { setEditTarget(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (o: DropdownOption) => {
    setEditTarget(o)
    form.setFieldsValue({ label: o.label, value: o.value })
    setModalOpen(true)
  }

  const handleSave = async (values: { label: string; value: string }) => {
    try {
      if (editTarget) {
        await updateDropdownOption(editTarget.id, values)
        message.success('已更新')
      } else {
        await createDropdownOption(category.key, values)
        message.success('已新增')
      }
      clearDropdownCache(category.key)
      setModalOpen(false)
      onRefresh()
    } catch {
      message.error('儲存失敗')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteDropdownOption(id)
      message.success('已刪除')
      clearDropdownCache(category.key)
      onRefresh()
    } catch {
      message.error('刪除失敗')
    }
  }

  const handleToggle = async (o: DropdownOption) => {
    try {
      await updateDropdownOption(o.id, { isActive: !o.isActive })
      clearDropdownCache(category.key)
      onRefresh()
    } catch {
      message.error('操作失敗')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = options.findIndex((o) => o.id === active.id)
    const newIndex = options.findIndex((o) => o.id === over.id)
    const reordered = arrayMove(options, oldIndex, newIndex).map((o, i) => ({
      ...o, sortOrder: i,
    }))
    setOptions(reordered)
    try {
      await reorderDropdownOptions(
        category.key,
        reordered.map((o) => ({ id: o.id, sortOrder: o.sortOrder }))
      )
      clearDropdownCache(category.key)
    } catch {
      message.error('排序儲存失敗')
      onRefresh()
    }
  }

  const activeCount = options.filter((o) => o.isActive).length

  return (
    <>
      <Card
        size="small"
        title={
          <Space>
            <Text strong>{category.label}</Text>
            <Badge count={activeCount} color="blue" showZero />
          </Space>
        }
        extra={
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            新增
          </Button>
        }
        styles={{ body: { padding: '4px 8px', minHeight: 60 } }}
      >
        {options.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚無選項" style={{ margin: '8px 0' }} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
              <List
                dataSource={options}
                renderItem={(o) => (
                  <SortableOptionRow
                    key={o.id}
                    option={o}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                  />
                )}
              />
            </SortableContext>
          </DndContext>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editTarget ? '編輯選項' : `新增選項 — ${category.label}`}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 8 }}>
          <Form.Item
            name="label"
            label="顯示名稱"
            rules={[{ required: true, message: '請輸入顯示名稱' }]}
          >
            <Input placeholder="例：主原料" />
          </Form.Item>
          <Form.Item
            name="value"
            label="儲存值"
            rules={[{ required: true, message: '請輸入儲存值' }]}
            tooltip="通常與顯示名稱相同，若無特殊需求可直接複製顯示名稱"
          >
            <Input placeholder="例：主原料" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ── 主頁面 ────────────────────────────────────────────────────

export default function DropdownManagePage() {
  const [categories, setCategories] = useState<DropdownCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

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

  const filtered = categories.filter(
    (c) => c.label.includes(search) || c.key.includes(search)
  )

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>下拉選項管理</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            管理系統內所有下拉式選項，變更後即時生效
          </Text>
        </Space>
      }
      loading={loading}
      extra={
        <Input.Search
          placeholder="搜尋類別名稱"
          allowClear
          style={{ width: 200 }}
          onSearch={setSearch}
          onChange={(e) => !e.target.value && setSearch('')}
        />
      }
    >
      <Row gutter={[16, 16]}>
        {filtered.map((cat) => (
          <Col key={cat.key} xs={24} sm={12} lg={8} xl={6}>
            <CategoryCard category={cat} onRefresh={load} />
          </Col>
        ))}
      </Row>
    </Card>
  )
}
