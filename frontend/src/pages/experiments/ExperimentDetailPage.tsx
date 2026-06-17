import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tabs, Button, Space, Form, Input, Upload,
  Image, message, Spin, List, Avatar, Popconfirm, Tag, Modal,
  InputNumber, DatePicker,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, FileTextOutlined,
  UploadOutlined, PictureOutlined, EditOutlined, HolderOutlined,
} from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getExperiment, addSteps, deleteStep, updateExperiment,
  uploadAttachment, deleteAttachment,
  getSamples, createSample, deleteSample, uploadSamplePhoto,
} from '../../api/experiments'
import type { Experiment, ExperimentStep, Attachment, Sample } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'
import styles from './ExperimentDetailPage.module.css'

// 單一可拖曳步驟列
function SortableStep({
  step,
  canEdit,
  onDelete,
}: {
  step: ExperimentStep
  canEdit: boolean
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? '#f0f5ff' : 'transparent',
    borderRadius: 6,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <List.Item
        actions={
          canEdit
            ? [
                <Popconfirm title="刪除此步驟？" onConfirm={() => onDelete(step.id)}>
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>,
              ]
            : undefined
        }
      >
        <List.Item.Meta
          avatar={
            <Space>
              {canEdit && (
                <span
                  {...attributes}
                  {...listeners}
                  className={styles.dragHandle}
                >
                  <HolderOutlined />
                </span>
              )}
              <Avatar size="small">{step.stepOrder}</Avatar>
            </Space>
          }
          description={step.description}
        />
      </List.Item>
    </div>
  )
}

export default function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [steps, setSteps] = useState<ExperimentStep[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [stepForm] = Form.useForm()
  const [sampleModalOpen, setSampleModalOpen] = useState(false)
  const [sampleForm] = Form.useForm()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const expId = Number(id)
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'

  const sensors = useSensors(useSensor(PointerSensor))

  const reload = async () => {
    try {
      const [eRes, sRes] = await Promise.all([getExperiment(expId), getSamples(expId)])
      const exp = eRes.data.data as Experiment
      setExperiment(exp)
      setSteps(exp.steps ?? [])
      setSamples(sRes.data.data ?? [])
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [id])

  // 拖曳結束後重新排序
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setSteps((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id)
      const newIndex = prev.findIndex((s) => s.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      return reordered.map((s, i) => ({ ...s, stepOrder: i + 1 }))
    })
  }

  // 開啟編輯實驗資訊 modal
  const openEditModal = () => {
    if (!experiment) return
    editForm.setFieldsValue({
      temperature: experiment.temperature,
      humidity: experiment.humidity,
      notes: experiment.notes,
      experimentDate: dayjs(experiment.experimentDate),
    })
    setEditModalOpen(true)
  }

  const handleSaveExperiment = async (values: {
    temperature: number
    humidity: number
    notes: string
    experimentDate: dayjs.Dayjs
  }) => {
    setSaving(true)
    try {
      await updateExperiment(expId, {
        temperature: values.temperature,
        humidity: values.humidity,
        notes: values.notes,
      })
      message.success('已更新')
      setEditModalOpen(false)
      reload()
    } catch {
      message.error('更新失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleAddStep = async (values: { description: string }) => {
    const nextOrder = steps.length + 1
    try {
      await addSteps(expId, [{ stepOrder: nextOrder, description: values.description }])
      stepForm.resetFields()
      reload()
    } catch {
      message.error('新增失敗')
    }
  }

  const handleDeleteStep = async (stepId: number) => {
    try {
      await deleteStep(expId, stepId)
      reload()
    } catch {
      message.error('刪除失敗')
    }
  }

  const handleUploadAttachment = async (file: File) => {
    const type = file.type.startsWith('video') ? 'video' : 'image'
    try {
      await uploadAttachment(expId, file, type)
      message.success('上傳成功')
      reload()
    } catch {
      message.error('上傳失敗')
    }
    return false
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteAttachment(expId, attachmentId)
      reload()
    } catch {
      message.error('刪除失敗')
    }
  }

  const handleCreateSample = async (values: {
    sampleCode: string; clientName: string; label: string
    targetItem: string; sampleDate: string; notes: string
  }) => {
    try {
      await createSample(expId, values)
      message.success('樣品已新增')
      setSampleModalOpen(false)
      sampleForm.resetFields()
      reload()
    } catch {
      message.error('新增失敗')
    }
  }

  const handleSamplePhoto = async (sampleId: number, file: File) => {
    try {
      await uploadSamplePhoto(expId, sampleId, file)
      message.success('照片已上傳')
      reload()
    } catch {
      message.error('上傳失敗')
    }
    return false
  }

  const handleDeleteSample = async (sampleId: number) => {
    try {
      await deleteSample(expId, sampleId)
      reload()
    } catch {
      message.error('刪除失敗')
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />
  if (!experiment) return null

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* 實驗資訊卡 */}
      <Card
        title={`實驗 — ${experiment.code}`}
        extra={
          <Space>
            {canEdit && (
              <Button icon={<EditOutlined />} onClick={openEditModal}>編輯資訊</Button>
            )}
            {canEdit && (
              <Button type="primary" onClick={() => navigate(`/experiments/${id}/result`)}>
                查看 / 建立結果
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="實驗編號">{experiment.code}</Descriptions.Item>
          <Descriptions.Item label="配方">{experiment.formulaName}</Descriptions.Item>
          <Descriptions.Item label="實驗人員">{experiment.experimenterName}</Descriptions.Item>
          <Descriptions.Item label="實驗日期">{dayjs(experiment.experimentDate).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="溫度">{experiment.temperature} °C</Descriptions.Item>
          <Descriptions.Item label="濕度">{experiment.humidity} %</Descriptions.Item>
          <Descriptions.Item label="備註" span={2}>{experiment.notes}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs
          items={[
            {
              key: 'steps',
              label: '實驗步驟',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {canEdit && steps.length > 0 && (
                    <div className={styles.stepHint}>
                      拖曳左側 <HolderOutlined /> 可調整步驟順序
                    </div>
                  )}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={steps.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <List
                        dataSource={steps}
                        renderItem={(step) => (
                          <SortableStep
                            key={step.id}
                            step={step}
                            canEdit={canEdit}
                            onDelete={handleDeleteStep}
                          />
                        )}
                      />
                    </SortableContext>
                  </DndContext>

                  {canEdit && (
                    <Form form={stepForm} layout="inline" onFinish={handleAddStep}>
                      <Form.Item name="description" rules={[{ required: true }]} style={{ flex: 1 }}>
                        <Input placeholder="新增步驟說明" />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>新增</Button>
                      </Form.Item>
                    </Form>
                  )}
                </Space>
              ),
            },
            {
              key: 'attachments',
              label: '附件',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Image.PreviewGroup>
                    <Space wrap>
                      {experiment.attachments.map((a: Attachment) => (
                        <div key={a.id} style={{ position: 'relative' }}>
                          {a.fileType === 'image' ? (
                            <Image src={a.fileUrl} width={120} height={90} style={{ objectFit: 'cover' }} />
                          ) : (
                            <Card size="small" style={{ width: 120 }}>
                              <PictureOutlined /> {a.fileName}
                            </Card>
                          )}
                          {canEdit && (
                            <Popconfirm title="刪除此附件？" onConfirm={() => handleDeleteAttachment(a.id)}>
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                style={{ position: 'absolute', top: 4, right: 4 }}
                              />
                            </Popconfirm>
                          )}
                        </div>
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                  {canEdit && (
                    <Upload
                      accept="image/*,video/*"
                      showUploadList={false}
                      beforeUpload={(file) => handleUploadAttachment(file)}
                    >
                      <Button icon={<UploadOutlined />}>上傳圖片 / 影片</Button>
                    </Upload>
                  )}
                </Space>
              ),
            },
            {
              key: 'samples',
              label: '樣品管理',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {canEdit && (
                    <Button icon={<PlusOutlined />} onClick={() => setSampleModalOpen(true)}>
                      新增樣品
                    </Button>
                  )}
                  <List
                    dataSource={samples}
                    renderItem={(s: Sample) => (
                      <List.Item
                        actions={
                          canEdit
                            ? [
                                <Upload
                                  accept="image/*"
                                  showUploadList={false}
                                  beforeUpload={(file) => handleSamplePhoto(s.id, file)}
                                >
                                  <Button size="small" icon={<UploadOutlined />}>照片</Button>
                                </Upload>,
                                <Popconfirm title="刪除此樣品？" onConfirm={() => handleDeleteSample(s.id)}>
                                  <Button size="small" danger icon={<DeleteOutlined />} />
                                </Popconfirm>,
                              ]
                            : undefined
                        }
                      >
                        <List.Item.Meta
                          avatar={
                            s.photoUrl
                              ? <Image src={s.photoUrl} width={48} height={48} style={{ objectFit: 'cover' }} />
                              : <Avatar icon={<FileTextOutlined />} />
                          }
                          title={
                            <Space>
                              {s.sampleCode}
                              <Tag>{s.clientName}</Tag>
                            </Space>
                          }
                          description={`${s.label} | 目標：${s.targetItem} | 日期：${s.sampleDate}`}
                        />
                      </List.Item>
                    )}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* 編輯實驗資訊 Modal */}
      <Modal
        title="編輯實驗資訊"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveExperiment} style={{ marginTop: 16 }}>
          <Form.Item name="experimentDate" label="實驗日期">
            <DatePicker showTime style={{ width: '100%' }} disabled />
          </Form.Item>
          <Space>
            <Form.Item name="temperature" label="溫度（°C）" rules={[{ required: true }]}>
              <InputNumber step={0.1} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="humidity" label="濕度（%）" rules={[{ required: true }]}>
              <InputNumber step={0.1} min={0} max={100} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>儲存</Button>
            <Button onClick={() => setEditModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>

      {/* 新增樣品 Modal */}
      <Modal
        title="新增樣品"
        open={sampleModalOpen}
        onCancel={() => setSampleModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={sampleForm} layout="vertical" onFinish={handleCreateSample}>
          <Form.Item name="sampleCode" label="樣品編號" rules={[{ required: true }]}>
            <Input placeholder="SMP-001" />
          </Form.Item>
          <Form.Item name="clientName" label="客戶名稱" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="label" label="標籤說明">
            <Input />
          </Form.Item>
          <Form.Item name="targetItem" label="目標原料項目">
            <Input />
          </Form.Item>
          <Form.Item name="sampleDate" label="日期" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">新增</Button>
            <Button onClick={() => setSampleModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </Space>
  )
}
