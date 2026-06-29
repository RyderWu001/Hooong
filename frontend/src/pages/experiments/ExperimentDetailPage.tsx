import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tabs, Button, Space, Form, Input, Upload,
  Image, message, Spin, List, Avatar, Popconfirm, Tag, Modal,
  InputNumber, DatePicker, Tooltip, Drawer, Divider, Typography, Select,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  PlusOutlined, DeleteOutlined, FileTextOutlined,
  UploadOutlined, PictureOutlined, EditOutlined, HolderOutlined, DownloadOutlined,
  FilePdfOutlined, FileExcelOutlined, VideoCameraOutlined,
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
  getExperiment, addSteps, deleteStep, reorderSteps, updateExperiment,
  uploadAttachment, deleteAttachment,
  getSamples, getSample, createSample, updateSample, deleteSample, uploadSamplePhoto,
  getSampleAttachments, uploadSampleAttachment, deleteSampleAttachment,
} from '../../api/experiments'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import type { Experiment, ExperimentStep, Attachment, Sample } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import { downloadBlob } from '../../utils/download'
import dayjs from 'dayjs'
import styles from './ExperimentDetailPage.module.css'

const IMAGE_CATEGORIES = ['染色前', '染色中', '染色後', '成品', '對照樣', '其他']

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

  const itemRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (itemRef.current) {
      itemRef.current.style.transform = CSS.Transform.toString(transform) ?? ''
      itemRef.current.style.transition = transition ?? ''
    }
  }, [transform, transition])

  return (
    <div
      ref={(node) => { setNodeRef(node); itemRef.current = node }}
      className={isDragging ? styles.sortableItemDragging : styles.sortableItem}
    >
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
  const [drawerSample, setDrawerSample] = useState<Sample | null>(null)
  const [drawerEditing, setDrawerEditing] = useState(false)
  const [drawerSaving, setDrawerSaving] = useState(false)
  const [drawerForm] = Form.useForm()
  const [sampleAttachments, setSampleAttachments] = useState<Attachment[]>([])
  const [pendingAttachFiles, setPendingAttachFiles] = useState<UploadFile[]>([])
  const [imageCategoryFilter, setImageCategoryFilter] = useState<string | null>(null)
  const [pendingImageCategory, setPendingImageCategory] = useState<string | null>(null)

  const { selectOptions: expCategoryOptions } = useDropdownOptions('experiment_category')
  const { selectOptions: acidMethodOptions } = useDropdownOptions('dyeing_acid_method')
  const { selectOptions: sampleCategoryOptions } = useDropdownOptions('sample_category')
  const { selectOptions: sampleAttributeOptions } = useDropdownOptions('sample_attribute')
  const { selectOptions: sampleIndustryOptions } = useDropdownOptions('sample_industry')
  const { selectOptions: sampleStatusOptions } = useDropdownOptions('sample_status')

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

  // 拖曳結束後重新排序並儲存到資料庫
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = steps.findIndex((s) => s.id === active.id)
    const newIndex = steps.findIndex((s) => s.id === over.id)
    const updated = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, stepOrder: i + 1 }))

    setSteps(updated)
    reorderSteps(expId, updated).catch(() => {
      message.error('排序儲存失敗')
      reload()
    })
  }

  // 開啟編輯實驗資訊 modal
  const openEditModal = () => {
    if (!experiment) return
    editForm.setFieldsValue({
      category: experiment.category,
      temperature: experiment.temperature,
      humidity: experiment.humidity,
      dyeingMethod: experiment.dyeingMethod,
      acidAddingMethod: experiment.acidAddingMethod,
      bathRatio: experiment.bathRatio,
      dyeingTemp: experiment.dyeingTemp,
      dyeingTime: experiment.dyeingTime,
      pH: experiment.pH,
      notes: experiment.notes,
      experimentDate: dayjs(experiment.experimentDate),
    })
    setEditModalOpen(true)
  }

  const handleSaveExperiment = async (values: {
    category?: string
    temperature: number
    humidity: number
    dyeingMethod?: string
    acidAddingMethod?: string
    bathRatio?: string
    dyeingTemp?: number
    dyeingTime?: number
    pH?: number
    notes: string
  }) => {
    setSaving(true)
    try {
      await updateExperiment(expId, {
        category: values.category ?? null,
        temperature: values.temperature,
        humidity: values.humidity,
        dyeingMethod: values.dyeingMethod ?? null,
        acidAddingMethod: values.acidAddingMethod ?? null,
        bathRatio: values.bathRatio ?? null,
        dyeingTemp: values.dyeingTemp ?? null,
        dyeingTime: values.dyeingTime ?? null,
        pH: values.pH ?? null,
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

  const getAttachmentType = (file: File): 'image' | 'video' | 'pdf' | 'excel' => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type === 'application/pdf') return 'pdf'
    return 'excel'
  }

  const handleUploadAttachment = async (file: File) => {
    const type = getAttachmentType(file)
    const category = type === 'image' ? pendingImageCategory : null
    try {
      await uploadAttachment(expId, file, type, category)
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

  const handleDownloadAttachment = async (a: Attachment) => {
    try {
      const res = await fetch(a.fileUrl)
      const blob = await res.blob()
      downloadBlob(blob, a.fileName)
    } catch {
      message.error('下載失敗')
    }
  }

  const handleCreateSample = async (values: {
    sampleCode: string; clientName: string; label: string
    targetItem: string; sampleDate: string; notes: string
    category?: string; attribute?: string; industry?: string; status?: string
  }) => {
    try {
      const res = await createSample(expId, values)
      const newSampleId = res.data.data.id
      let attachFailed = false
      for (const uf of pendingAttachFiles) {
        const file = uf.originFileObj as File
        if (file) {
          try {
            await uploadSampleAttachment(expId, newSampleId, file, getAttachmentType(file))
          } catch {
            attachFailed = true
          }
        }
      }
      setSampleModalOpen(false)
      sampleForm.resetFields()
      setPendingAttachFiles([])
      reload()
      if (attachFailed) {
        message.warning('樣品已新增，但附件上傳失敗（儲存服務尚未設定）')
      } else {
        message.success('樣品已新增')
      }
    } catch {
      message.error('新增失敗')
    }
  }

  const handleSamplePhoto = async (sampleId: number, file: File) => {
    try {
      await uploadSamplePhoto(expId, sampleId, file)
      message.success('照片已上傳')
      reload()
      if (drawerSample?.id === sampleId) {
        const res = await getSample(expId, sampleId)
        setDrawerSample(res.data.data)
      }
    } catch {
      message.error('上傳失敗')
    }
    return false
  }

  const handleDeleteSample = async (sampleId: number) => {
    try {
      await deleteSample(expId, sampleId)
      if (drawerSample?.id === sampleId) setDrawerSample(null)
      reload()
    } catch {
      message.error('刪除失敗')
    }
  }

  const openSampleDrawer = async (sample: Sample) => {
    setDrawerSample(sample)
    setDrawerEditing(false)
    try {
      const res = await getSampleAttachments(expId, sample.id)
      setSampleAttachments(res.data.data ?? [])
    } catch {
      setSampleAttachments([])
    }
  }

  const handleDrawerEdit = () => {
    if (!drawerSample) return
    drawerForm.setFieldsValue({
      clientName: drawerSample.clientName,
      label: drawerSample.label,
      targetItem: drawerSample.targetItem,
      notes: drawerSample.notes,
      category: drawerSample.category,
      attribute: drawerSample.attribute,
      industry: drawerSample.industry,
      status: drawerSample.status,
    })
    setDrawerEditing(true)
  }

  const handleDrawerSave = async (values: {
    clientName: string; label: string; targetItem: string; notes: string
    category?: string; attribute?: string; industry?: string; status?: string
  }) => {
    if (!drawerSample) return
    setDrawerSaving(true)
    try {
      await updateSample(expId, drawerSample.id, values)
      message.success('已更新')
      setDrawerEditing(false)
      const res = await getSample(expId, drawerSample.id)
      setDrawerSample(res.data.data)
      reload()
    } catch {
      message.error('更新失敗')
    } finally {
      setDrawerSaving(false)
    }
  }

  const handleUploadSampleAttachment = async (file: File) => {
    if (!drawerSample) return false
    try {
      await uploadSampleAttachment(expId, drawerSample.id, file, getAttachmentType(file))
      message.success('上傳成功')
      const res = await getSampleAttachments(expId, drawerSample.id)
      setSampleAttachments(res.data.data ?? [])
    } catch {
      message.error('上傳失敗')
    }
    return false
  }

  const handleDeleteSampleAttachment = async (attachmentId: number) => {
    if (!drawerSample) return
    try {
      await deleteSampleAttachment(expId, drawerSample.id, attachmentId)
      const res = await getSampleAttachments(expId, drawerSample.id)
      setSampleAttachments(res.data.data ?? [])
    } catch {
      message.error('刪除失敗')
    }
  }

  const handleDownloadSampleAttachment = async (a: Attachment) => {
    try {
      const res = await fetch(a.fileUrl)
      const blob = await res.blob()
      downloadBlob(blob, a.fileName)
    } catch {
      message.error('下載失敗')
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
          <Descriptions.Item label="實驗分類">
            {experiment.category ? <Tag color="blue">{experiment.category}</Tag> : <Typography.Text type="secondary">—</Typography.Text>}
          </Descriptions.Item>
          <Descriptions.Item label="環境條件">{experiment.temperature} °C / {experiment.humidity} %</Descriptions.Item>
          <Descriptions.Item label="備註" span={2}>{experiment.notes || '—'}</Descriptions.Item>
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
              key: 'dyeing',
              label: '染色條件',
              children: (
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="染色方式">{experiment.dyeingMethod || '—'}</Descriptions.Item>
                  <Descriptions.Item label="加酸方式">{experiment.acidAddingMethod || '—'}</Descriptions.Item>
                  <Descriptions.Item label="浴比">{experiment.bathRatio || '—'}</Descriptions.Item>
                  <Descriptions.Item label="染色溫度">{experiment.dyeingTemp != null ? `${experiment.dyeingTemp} °C` : '—'}</Descriptions.Item>
                  <Descriptions.Item label="染色時間">{experiment.dyeingTime != null ? `${experiment.dyeingTime} 分鐘` : '—'}</Descriptions.Item>
                  <Descriptions.Item label="pH 值">{experiment.pH != null ? experiment.pH : '—'}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'attachments',
              label: '附件',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {experiment.attachments.some((a) => a.fileType === 'image') && (
                    <Space>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>篩選圖片分類：</Typography.Text>
                      <Select
                        allowClear
                        placeholder="全部"
                        style={{ width: 140 }}
                        options={IMAGE_CATEGORIES.map((c) => ({ value: c, label: c }))}
                        value={imageCategoryFilter}
                        onChange={(v) => setImageCategoryFilter(v ?? null)}
                        size="small"
                      />
                    </Space>
                  )}
                  <Image.PreviewGroup>
                    <Space wrap>
                      {experiment.attachments
                        .filter((a) => !imageCategoryFilter || a.fileType !== 'image' || a.imageCategory === imageCategoryFilter)
                        .map((a: Attachment) => (
                        <div key={a.id} className={styles.attachmentWrap}>
                          {a.fileType === 'image' ? (
                            <>
                              <Image src={a.fileUrl} width={120} height={90} className={styles.attachmentImg} />
                              {a.imageCategory && (
                                <Tag color="cyan" style={{ marginTop: 2, fontSize: 11, padding: '0 4px' }}>{a.imageCategory}</Tag>
                              )}
                            </>
                          ) : (
                            <Tooltip title={a.fileName}>
                              <div className={styles.attachmentIconBox}>
                                {a.fileType === 'pdf' && <FilePdfOutlined className={styles.iconPdf} />}
                                {a.fileType === 'excel' && <FileExcelOutlined className={styles.iconExcel} />}
                                {a.fileType === 'video' && <VideoCameraOutlined className={styles.iconVideo} />}
                                {!['pdf', 'excel', 'video'].includes(a.fileType) && <PictureOutlined className={styles.iconFile} />}
                              </div>
                            </Tooltip>
                          )}
                          <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            className={styles.attachmentDownloadBtn}
                            onClick={() => handleDownloadAttachment(a)}
                          />
                          {canEdit && (
                            <Popconfirm title="刪除此附件？" onConfirm={() => handleDeleteAttachment(a.id)}>
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                className={styles.attachmentDeleteBtn}
                              />
                            </Popconfirm>
                          )}
                        </div>
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                  {canEdit && (
                    <Space>
                      <Select
                        allowClear
                        placeholder="圖片分類（選填）"
                        style={{ width: 160 }}
                        options={IMAGE_CATEGORIES.map((c) => ({ value: c, label: c }))}
                        value={pendingImageCategory}
                        onChange={(v) => setPendingImageCategory(v ?? null)}
                        size="small"
                      />
                      <Upload
                        accept="image/*,video/*,.pdf,.xlsx,.xls,.csv"
                        showUploadList={false}
                        beforeUpload={(file) => handleUploadAttachment(file)}
                      >
                        <Button icon={<UploadOutlined />}>上傳附件</Button>
                      </Upload>
                    </Space>
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
                        className={styles.sampleListItem}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('.ant-popconfirm, .ant-btn-dangerous')) return
                          openSampleDrawer(s)
                        }}
                        actions={
                          canEdit
                            ? [
                                <Popconfirm
                                  title="刪除此樣品？"
                                  onConfirm={(e) => { e?.stopPropagation(); handleDeleteSample(s.id) }}
                                >
                                  <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </Popconfirm>,
                              ]
                            : undefined
                        }
                      >
                        <List.Item.Meta
                          avatar={
                            s.photoUrl
                              ? <Image src={s.photoUrl} width={48} height={48} style={{ objectFit: 'cover' }} preview={false} />
                              : <Avatar icon={<FileTextOutlined />} />
                          }
                          title={
                            <Space>
                              {s.sampleCode}
                              <Tag>{s.clientName}</Tag>
                            </Space>
                          }
                          description={`${s.label} | 目標：${s.targetItem} | 日期：${s.sampleDate?.split('T')[0]}`}
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
        width={640}
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveExperiment} style={{ marginTop: 16 }}>
          <Form.Item name="category" label="實驗分類">
            <Select
              options={expCategoryOptions}
              allowClear
              placeholder="選擇實驗分類"
            />
          </Form.Item>
          <Form.Item name="experimentDate" label="實驗日期">
            <DatePicker showTime style={{ width: '100%' }} disabled />
          </Form.Item>
          <Space>
            <Form.Item name="temperature" label="溫度（°C）" rules={[{ required: true }]}>
              <InputNumber step={0.1} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="humidity" label="濕度（%）" rules={[{ required: true }]}>
              <InputNumber step={0.1} min={0} max={100} style={{ width: 150 }} />
            </Form.Item>
          </Space>
          <Divider orientation="left" style={{ fontSize: 13, color: '#888', margin: '8px 0' }}>染色條件</Divider>
          <Space wrap>
            <Form.Item name="dyeingMethod" label="染色方式" style={{ marginBottom: 8 }}>
              <Input placeholder="例：浸染、軋染" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="acidAddingMethod" label="加酸方式" style={{ marginBottom: 8 }}>
              <Select
                options={acidMethodOptions}
                allowClear
                placeholder="選擇"
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item name="bathRatio" label="浴比" style={{ marginBottom: 8 }}>
              <Input placeholder="例：1:10" style={{ width: 130 }} />
            </Form.Item>
          </Space>
          <Space wrap>
            <Form.Item name="dyeingTemp" label="染色溫度（°C）" style={{ marginBottom: 8 }}>
              <InputNumber step={1} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="dyeingTime" label="染色時間（分鐘）" style={{ marginBottom: 8 }}>
              <InputNumber step={1} min={0} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item name="pH" label="pH 值" style={{ marginBottom: 8 }}>
              <InputNumber step={0.1} min={0} max={14} style={{ width: 130 }} />
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
        onCancel={() => { setSampleModalOpen(false); setPendingAttachFiles([]) }}
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
          <Form.Item name="category" label="樣品分類">
            <Select allowClear options={sampleCategoryOptions} placeholder="請選擇" />
          </Form.Item>
          <Form.Item name="attribute" label="樣品屬性">
            <Select allowClear options={sampleAttributeOptions} placeholder="請選擇" />
          </Form.Item>
          <Form.Item name="industry" label="產業別">
            <Select allowClear options={sampleIndustryOptions} placeholder="請選擇" />
          </Form.Item>
          <Form.Item name="status" label="樣品狀態">
            <Select allowClear options={sampleStatusOptions} placeholder="請選擇" />
          </Form.Item>
          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="附件">
            <Upload
              accept="image/*,video/*,.pdf,.xlsx,.xls,.csv"
              multiple
              fileList={pendingAttachFiles}
              beforeUpload={() => false}
              onChange={({ fileList }) => setPendingAttachFiles(fileList)}
            >
              <Button icon={<UploadOutlined />}>選擇附件</Button>
            </Upload>
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">新增</Button>
            <Button onClick={() => { setSampleModalOpen(false); setPendingAttachFiles([]) }}>取消</Button>
          </Space>
        </Form>
      </Modal>

      {/* 樣品詳情 Drawer */}
      <Drawer
        title={`樣品 — ${drawerSample?.sampleCode ?? ''}`}
        open={!!drawerSample}
        onClose={() => { setDrawerSample(null); setDrawerEditing(false) }}
        width={520}
        extra={
          canEdit && !drawerEditing && (
            <Button icon={<EditOutlined />} onClick={handleDrawerEdit}>編輯</Button>
          )
        }
      >
        {drawerSample && (
          <Space direction="vertical" className={styles.drawerBody}>
            {drawerEditing ? (
              <Form form={drawerForm} layout="vertical" onFinish={handleDrawerSave}>
                <Form.Item name="clientName" label="客戶名稱" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="label" label="標籤說明">
                  <Input />
                </Form.Item>
                <Form.Item name="targetItem" label="目標原料項目">
                  <Input />
                </Form.Item>
                <Form.Item name="category" label="樣品分類">
                  <Select allowClear options={sampleCategoryOptions} placeholder="請選擇" />
                </Form.Item>
                <Form.Item name="attribute" label="樣品屬性">
                  <Select allowClear options={sampleAttributeOptions} placeholder="請選擇" />
                </Form.Item>
                <Form.Item name="industry" label="產業別">
                  <Select allowClear options={sampleIndustryOptions} placeholder="請選擇" />
                </Form.Item>
                <Form.Item name="status" label="樣品狀態">
                  <Select allowClear options={sampleStatusOptions} placeholder="請選擇" />
                </Form.Item>
                <Form.Item name="notes" label="備註">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={drawerSaving}>儲存</Button>
                  <Button onClick={() => setDrawerEditing(false)}>取消</Button>
                </Space>
              </Form>
            ) : (
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="樣品編號">{drawerSample.sampleCode}</Descriptions.Item>
                <Descriptions.Item label="客戶名稱">{drawerSample.clientName}</Descriptions.Item>
                <Descriptions.Item label="標籤說明">{drawerSample.label || '—'}</Descriptions.Item>
                <Descriptions.Item label="目標原料項目">{drawerSample.targetItem || '—'}</Descriptions.Item>
                <Descriptions.Item label="日期">{drawerSample.sampleDate?.split('T')[0]}</Descriptions.Item>
                {drawerSample.category && (
                  <Descriptions.Item label="樣品分類"><Tag color="blue">{drawerSample.category}</Tag></Descriptions.Item>
                )}
                {drawerSample.attribute && (
                  <Descriptions.Item label="樣品屬性"><Tag color="cyan">{drawerSample.attribute}</Tag></Descriptions.Item>
                )}
                {drawerSample.industry && (
                  <Descriptions.Item label="產業別"><Tag color="purple">{drawerSample.industry}</Tag></Descriptions.Item>
                )}
                {drawerSample.status && (
                  <Descriptions.Item label="樣品狀態"><Tag color="geekblue">{drawerSample.status}</Tag></Descriptions.Item>
                )}
                <Descriptions.Item label="備註">{drawerSample.notes || '—'}</Descriptions.Item>
              </Descriptions>
            )}

            <Divider>照片</Divider>
            {drawerSample.photoUrl
              ? <Image src={drawerSample.photoUrl} width={200} />
              : <Typography.Text type="secondary">尚無照片</Typography.Text>
            }
            {canEdit && (
              <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => handleSamplePhoto(drawerSample.id, file)}
              >
                <Button icon={<UploadOutlined />}>上傳照片</Button>
              </Upload>
            )}

            <Divider>附件</Divider>
            <Image.PreviewGroup>
              <Space wrap>
                {sampleAttachments.map((a: Attachment) => (
                  <div key={a.id} className={styles.attachmentWrap}>
                    {a.fileType === 'image' ? (
                      <Image src={a.fileUrl} width={120} height={90} className={styles.attachmentImg} />
                    ) : (
                      <Tooltip title={a.fileName}>
                        <div className={styles.attachmentIconBox}>
                          {a.fileType === 'pdf' && <FilePdfOutlined className={styles.iconPdf} />}
                          {a.fileType === 'excel' && <FileExcelOutlined className={styles.iconExcel} />}
                          {a.fileType === 'video' && <VideoCameraOutlined className={styles.iconVideo} />}
                          {!['pdf', 'excel', 'video'].includes(a.fileType) && <PictureOutlined className={styles.iconFile} />}
                        </div>
                      </Tooltip>
                    )}
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      className={styles.attachmentDownloadBtn}
                      onClick={() => handleDownloadSampleAttachment(a)}
                    />
                    {canEdit && (
                      <Popconfirm title="刪除此附件？" onConfirm={() => handleDeleteSampleAttachment(a.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} className={styles.attachmentDeleteBtn} />
                      </Popconfirm>
                    )}
                  </div>
                ))}
              </Space>
            </Image.PreviewGroup>
            {sampleAttachments.length === 0 && <Typography.Text type="secondary">尚無附件</Typography.Text>}
            {canEdit && (
              <Upload
                accept="image/*,video/*,.pdf,.xlsx,.xls,.csv"
                showUploadList={false}
                beforeUpload={(file) => handleUploadSampleAttachment(file)}
              >
                <Button icon={<UploadOutlined />}>上傳附件</Button>
              </Upload>
            )}
          </Space>
        )}
      </Drawer>
    </Space>
  )
}
