import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Button, Space, Form, Input, message, Spin, Avatar,
  Popconfirm, Tag, Modal, InputNumber, Divider, Typography, Select,
  Image, Upload, Tooltip, Collapse, Badge, Drawer, DatePicker, Descriptions, List,
  Checkbox, Table,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  PlusOutlined, DeleteOutlined, EditOutlined, HolderOutlined,
  UploadOutlined, PictureOutlined, DownloadOutlined, FilePdfOutlined,
  FileExcelOutlined, VideoCameraOutlined, StarOutlined, StarFilled,
  DownOutlined, UpOutlined, SaveOutlined, TrophyOutlined, PrinterOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  getExperiment, updateExperiment,
  createGroup, updateGroup, deleteGroup,
  addGroupStep, reorderGroupSteps, deleteGroupStep,
  uploadGroupAttachment, deleteGroupAttachment,
  uploadStepAttachment, deleteStepAttachment,
  getSamples, createSample, updateSample, deleteSample, uploadSamplePhoto,
  getSampleAttachments, uploadSampleAttachment, deleteSampleAttachment,
  setGroupSuccess,
} from '../../api/experiments'
import DropdownSelect from '../../components/DropdownSelect'
import type { Experiment, ExperimentGroup, ExperimentGroupStep, Attachment, Sample, CommissionTestItem } from '../../types'
import { printCommissionForm } from '../../utils/printCommission'
import { useAuthStore } from '../../stores/authStore'
import { downloadBlob } from '../../utils/download'
import dayjs from 'dayjs'
import styles from './ExperimentDetailPage.module.css'

const { Text } = Typography

const TEST_PURPOSES = ['ΔE', 'Water repellence', 'Quick dry', 'Wicking', 'Handle', 'Tear Strength', 'Density', 'PH', 'Appearance', 'Other']

const COMMISSION_TYPE_LABEL: Record<string, string> = {
  K: 'K — R&D 研究開發',
  B: 'B — Comparison 對照測試',
  Q: 'Q — Replace 替代測試',
  O: 'O — Others 其他',
}

const COMMISSION_TYPE_OPTIONS = [
  { value: 'K', label: 'K — R&D 研究開發' },
  { value: 'B', label: 'B — Comparison 對照測試' },
  { value: 'Q', label: 'Q — Replace 替代測試' },
  { value: 'O', label: 'O — Others 其他' },
]

// 試驗組顏色
const GROUP_COLORS = ['blue', 'green', 'orange', 'purple', 'red', 'cyan', 'magenta']
const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const PHOTO_CATS = ['染前', '染後', '客戶樣', '對照樣'] as const
type PhotoCat = typeof PHOTO_CATS[number]

// ── 拖曳步驟 ──────────────────────────────────────────────────────────────────

function SortableStep({
  step, canEdit, onDelete, onLocalChange, onUploadFile, onDeleteAttach,
}: {
  step: ExperimentGroupStep
  canEdit: boolean
  onDelete: (id: number) => void
  onLocalChange: (id: number, changes: Partial<ExperimentGroupStep>) => void
  onUploadFile: (stepId: number, file: File) => void
  onDeleteAttach: (stepId: number, attId: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id })
  const itemRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (itemRef.current) {
      itemRef.current.style.transform = CSS.Transform.toString(transform) ?? ''
      itemRef.current.style.transition = transition ?? ''
    }
  }, [transform, transition])

  const attachCount = step.attachments?.length ?? 0

  return (
    <div ref={(n) => { setNodeRef(n); itemRef.current = n }}
      className={isDragging ? styles.sortableItemDragging : styles.stepItem}>

      {/* ── 步驟標頭 ── */}
      <div className={step.isHighlight ? styles.stepHeaderHL : styles.stepHeader}>
        {canEdit && (
          <span {...attributes} {...listeners} className={`${styles.dragHandle} ${styles.dragHandleStep}`}>
            <HolderOutlined />
          </span>
        )}
        <Avatar
          size="small"
          style={{ flexShrink: 0, background: step.isHighlight ? '#fa8c16' : undefined }}
        >
          {step.stepOrder}
        </Avatar>
        <Text className={step.isHighlight ? styles.stepDescHL : styles.stepDesc}>
          {step.description || '（未填說明）'}
        </Text>
        {step.notes && (
          <Tooltip title={`備註：${step.notes}`} placement="top">
            <span className={styles.notesIndicator}>📝</span>
          </Tooltip>
        )}
        {attachCount > 0 && (
          <Badge count={attachCount} size="small" color="geekblue" style={{ flexShrink: 0 }} />
        )}
        {canEdit && (
          <Tooltip title={step.isHighlight ? '取消重點' : '標記重點步驟'}>
            <Button
              type="text" size="small" style={{ flexShrink: 0 }}
              icon={step.isHighlight
                ? <StarFilled className={styles.starHL} />
                : <StarOutlined />}
              onClick={() => onLocalChange(step.id, { isHighlight: !step.isHighlight })}
            />
          </Tooltip>
        )}
        <Button
          type="text" size="small" style={{ flexShrink: 0 }}
          icon={expanded ? <UpOutlined /> : <DownOutlined />}
          onClick={() => setExpanded((v) => !v)}
        />
        {canEdit && (
          <Popconfirm title="刪除此步驟？" onConfirm={() => onDelete(step.id)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} style={{ flexShrink: 0 }} />
          </Popconfirm>
        )}
      </div>

      {/* ── 展開內容 ── */}
      {expanded && (
        <div className={styles.stepBody}>
          <Form layout="vertical" size="small">
            <Form.Item label="步驟說明" style={{ marginBottom: 8 }}>
              <Input.TextArea
                value={step.description}
                onChange={(e) => onLocalChange(step.id, { description: e.target.value })}
                autoSize={{ minRows: 2, maxRows: 6 }}
                placeholder="操作步驟詳情…"
                disabled={!canEdit}
              />
            </Form.Item>
            <Form.Item
              label={
                <Space size={4}>
                  <span>備註</span>
                  <Text type="secondary" style={{ fontSize: 11 }}>（觀察記錄、注意事項）</Text>
                </Space>
              }
              style={{ marginBottom: 8 }}
            >
              <Input.TextArea
                value={step.notes}
                onChange={(e) => onLocalChange(step.id, { notes: e.target.value })}
                autoSize={{ minRows: 2, maxRows: 6 }}
                placeholder="補充說明、異常記錄、觀察要點…"
                disabled={!canEdit}
              />
            </Form.Item>
            <Form.Item label="附件" style={{ marginBottom: 4 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={6}>
                {canEdit && (
                  <Upload
                    beforeUpload={(file) => { onUploadFile(step.id, file); return false }}
                    showUploadList={false}
                    multiple
                  >
                    <Button size="small" icon={<UploadOutlined />}>上傳附件</Button>
                  </Upload>
                )}
                {attachCount > 0 && (
                  <Image.PreviewGroup>
                    <Space wrap size={6}>
                      {step.attachments.map((a) => (
                        <div key={a.id} className={styles.attachmentWrap}>
                          {a.fileType === 'image' ? (
                            <Image src={a.fileUrl} width={80} height={60} className={styles.attachmentImg} />
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
                            size="small" icon={<DownloadOutlined />}
                            className={styles.attachmentDownloadBtn}
                            onClick={async () => { const r = await fetch(a.fileUrl); downloadBlob(await r.blob(), a.fileName) }}
                          />
                          {canEdit && (
                            <Popconfirm title="刪除此附件？" onConfirm={() => onDeleteAttach(step.id, a.id)}>
                              <Button size="small" danger icon={<DeleteOutlined />} className={styles.attachmentDeleteBtn} />
                            </Popconfirm>
                          )}
                        </div>
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                )}
                {attachCount === 0 && !canEdit && (
                  <Text type="secondary" style={{ fontSize: 11 }}>尚無附件</Text>
                )}
              </Space>
            </Form.Item>
          </Form>
        </div>
      )}
    </div>
  )
}

// ── 試驗組照片欄位 ────────────────────────────────────────────────────────────

function GroupPhotoSlot({
  category, attachment, canEdit, onUpload, onDelete,
}: {
  category: PhotoCat
  attachment: Attachment | undefined
  canEdit: boolean
  onUpload: (file: File, cat: PhotoCat) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className={styles.photoSlot}>
      <Text type="secondary" className={styles.photoLabel}>{category}</Text>
      {attachment ? (
        <div className={styles.photoRelativeWrap}>
          <Image src={attachment.fileUrl} width={80} height={60}
            className={styles.photoImg} />
          {canEdit && (
            <Popconfirm title="刪除此照片？" onConfirm={() => onDelete(attachment.id)}>
              <Button size="small" danger type="text" icon={<DeleteOutlined />}
                className={styles.photoDeleteBtn} />
            </Popconfirm>
          )}
        </div>
      ) : (
        canEdit ? (
          <Upload showUploadList={false} accept="image/*"
            beforeUpload={(f) => { onUpload(f, category); return false }}>
            <div className={styles.photoUploadBox}>
              <Space direction="vertical" size={2}>
                <UploadOutlined />
                <span>上傳</span>
              </Space>
            </div>
          </Upload>
        ) : (
          <div className={styles.photoEmptyBox}>無</div>
        )
      )}
    </div>
  )
}

// ── 單一試驗組卡片 ────────────────────────────────────────────────────────────

function GroupCard({
  group, groupIdx, experimentId, canEdit, onUpdated,
}: {
  group: ExperimentGroup
  groupIdx: number
  experimentId: number
  canEdit: boolean
  onUpdated: () => void
}) {
  const [localSteps, setLocalSteps] = useState<ExperimentGroupStep[]>(group.steps ?? [])
  const [isDirty, setIsDirty] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [stepForm] = Form.useForm()
  const [editOpen, setEditOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [successLoading, setSuccessLoading] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor))
  const color = GROUP_COLORS[groupIdx % GROUP_COLORS.length]
  const letter = GROUP_LETTERS[groupIdx % GROUP_LETTERS.length]

  const photoMap: Partial<Record<PhotoCat, Attachment>> = {}
  for (const a of group.attachments ?? []) {
    const cat = a.imageCategory as PhotoCat
    if (PHOTO_CATS.includes(cat) && !photoMap[cat]) photoMap[cat] = a
  }

  // 同步 group.steps 到 local（新增/刪除後觸發）
  useEffect(() => {
    setLocalSteps(group.steps ?? [])
    setIsDirty(false)
  }, [group.steps])

  const handleStepLocalChange = (stepId: number, changes: Partial<ExperimentGroupStep>) => {
    setLocalSteps((prev) => prev.map((s) => s.id === stepId ? { ...s, ...changes } : s))
    setIsDirty(true)
  }

  const handleSaveSteps = async () => {
    setSaveLoading(true)
    try {
      await reorderGroupSteps(experimentId, group.id,
        localSteps.map((s, i) => ({
          id: s.id,
          stepOrder: i + 1,
          description: s.description,
          notes: s.notes,
          isHighlight: s.isHighlight,
        }))
      )
      setIsDirty(false)
      message.success('步驟已儲存')
    } catch { message.error('儲存失敗') }
    finally { setSaveLoading(false) }
  }

  const handleAddStep = async (values: { description: string }) => {
    try {
      await addGroupStep(experimentId, group.id, { description: values.description })
      stepForm.resetFields()
      onUpdated()
    } catch { message.error('新增失敗') }
  }

  const handleDeleteStep = async (stepId: number) => {
    try {
      await deleteGroupStep(experimentId, group.id, stepId)
      onUpdated()
    } catch { message.error('刪除失敗') }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = localSteps.findIndex((s) => s.id === active.id)
    const newIdx = localSteps.findIndex((s) => s.id === over.id)
    const updated = arrayMove(localSteps, oldIdx, newIdx).map((s, i) => ({ ...s, stepOrder: i + 1 }))
    setLocalSteps(updated)
    setIsDirty(true)
  }

  const detectFileType = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
    if (ext === 'pdf') return 'pdf'
    if (['xls', 'xlsx'].includes(ext)) return 'excel'
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'video'
    return 'image'
  }

  const handleUploadStepFile = async (stepId: number, file: File) => {
    try {
      await uploadStepAttachment(experimentId, group.id, stepId, file, detectFileType(file))
      onUpdated()
    } catch { message.error('上傳失敗') }
  }

  const handleDeleteStepAttach = async (stepId: number, attId: number) => {
    try {
      await deleteStepAttachment(experimentId, group.id, stepId, attId)
      onUpdated()
    } catch { message.error('刪除失敗') }
  }

  const handleUploadPhoto = async (file: File, cat: PhotoCat) => {
    try {
      await uploadGroupAttachment(experimentId, group.id, file, 'image', cat)
      message.success(`${cat} 照片已上傳`)
      onUpdated()
    } catch { message.error('上傳失敗') }
  }

  const handleDeletePhoto = async (id: number) => {
    try {
      await deleteGroupAttachment(experimentId, group.id, id)
      onUpdated()
    } catch { message.error('刪除失敗') }
  }

  const openEdit = () => {
    editForm.setFieldsValue({
      name: group.name,
      experimentType: group.experimentType,
      bathRatio: group.bathRatio, startPH: group.startPH, endPH: group.endPH,
      acidMethod: group.acidMethod, tempRate: group.tempRate, holdTime: group.holdTime,
      burningCondition: group.burningCondition, washCondition: group.washCondition,
      dyeAuxiliaries: group.dyeAuxiliaries ?? [],
      leveler: group.leveler, fixer: group.fixer,
      calciumChloride: group.calciumChloride, colorFixative: group.colorFixative,
      dyeCombination: group.dyeCombination, dyeAmount: group.dyeAmount,
      fixingTemp: group.fixingTemp, fixingAuxAmount: group.fixingAuxAmount,
      fiberSpec: group.fiberSpec, widthShrinkage: group.widthShrinkage,
      shrinkTime: group.shrinkTime, fixingAuxiliaries: group.fixingAuxiliaries ?? [],
      notes: group.notes,
    })
    setEditOpen(true)
  }

  const handleSaveEdit = async (values: any) => {
    try {
      await updateGroup(experimentId, group.id, values)
      setEditOpen(false)
      onUpdated()
    } catch { message.error('儲存失敗') }
  }

  const handleDeleteGroup = async () => {
    try {
      await deleteGroup(experimentId, group.id)
      onUpdated()
    } catch { message.error('刪除失敗') }
  }

  const handleToggleSuccess = async () => {
    setSuccessLoading(true)
    try {
      await setGroupSuccess(experimentId, group.id, !group.isSuccess)
      onUpdated()
    } catch { message.error('操作失敗') }
    finally { setSuccessLoading(false) }
  }

  const isFixing = group.experimentType === '定型機'
  const condRows = isFixing ? [
    { label: '實驗類型', value: group.experimentType },
    { label: '加工溫度/時間', value: group.fixingTemp },
    { label: '助劑用量', value: group.fixingAuxAmount },
    { label: '纖維規格', value: group.fiberSpec },
    { label: '門幅縮率', value: group.widthShrinkage },
    { label: '縮水時間', value: group.shrinkTime },
    { label: '定型助劑', value: (group.fixingAuxiliaries ?? []).join('、') || null },
  ].filter((r) => r.value != null && r.value !== '') : [
    { label: '實驗類型', value: group.experimentType },
    { label: '浴比', value: group.bathRatio },
    { label: '起染pH', value: group.startPH != null ? group.startPH : null },
    { label: '終染pH', value: group.endPH != null ? group.endPH : null },
    { label: '加酸方式', value: group.acidMethod },
    { label: '升溫速率', value: group.tempRate },
    { label: '保溫時間', value: group.holdTime != null ? `${group.holdTime} 分鐘` : null },
    { label: '燒毛/退漿條件', value: group.burningCondition },
    { label: '水洗條件', value: group.washCondition },
    { label: '染色助劑', value: (group.dyeAuxiliaries ?? []).join('、') || null },
    { label: '均染劑', value: group.leveler },
    { label: '修補劑', value: group.fixer },
    { label: '氯化鈣', value: group.calciumChloride },
    { label: '固色劑', value: group.colorFixative },
    { label: '染料組合', value: group.dyeCombination },
    { label: '添加量', value: group.dyeAmount },
  ].filter((r) => r.value != null && r.value !== '')

  return (
    <Card
      size="small"
      style={{
        minWidth: 340, flex: '0 0 340px',
        borderTop: group.isSuccess ? '3px solid #52c41a' : `3px solid var(--ant-color-${color})`,
      }}
      title={
        <Space>
          <Tag color={color} style={{ fontWeight: 700, fontSize: 13 }}>{letter}</Tag>
          <Text strong style={{ fontSize: 13 }}>{group.name}</Text>
          {group.isSuccess && <Tag color="success" icon={<TrophyOutlined />}>成功組</Tag>}
        </Space>
      }
      extra={
        <Space size={4}>
          <Tooltip title={group.isSuccess ? '取消成功標示' : '標示為成功組'}>
            <Button
              size="small"
              loading={successLoading}
              icon={<TrophyOutlined />}
              onClick={handleToggleSuccess}
              style={group.isSuccess ? { color: '#faad14', borderColor: '#faad14' } : {}}
            />
          </Tooltip>
          {canEdit && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={openEdit} />
              <Popconfirm title="確定刪除此試驗組？" onConfirm={handleDeleteGroup}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      }
    >
      {/* 條件摘要 */}
      {condRows.length > 0 && (
        <Collapse ghost size="small" defaultActiveKey={['cond']} style={{ marginBottom: 8 }}>
          <Collapse.Panel key="cond" header={<Text type="secondary" style={{ fontSize: 12 }}>試驗條件</Text>}>
            <div className={styles.condGrid}>
              {condRows.map((r) => (
                <div key={r.label}>
                  <Text type="secondary" style={{ fontSize: 11 }}>{r.label}：</Text>
                  <Text style={{ fontSize: 12 }}>{String(r.value)}</Text>
                </div>
              ))}
            </div>
            {group.notes && (
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                備註：{group.notes}
              </Text>
            )}
          </Collapse.Panel>
        </Collapse>
      )}

      {/* 操作步驟 */}
      <Divider titlePlacement="left" plain style={{ fontSize: 12, margin: '4px 0 4px', color: '#888' }}>
        <Space size={6}>
          操作步驟
          <Badge count={localSteps.length} color="blue" size="small" />
          {isDirty && <Tag color="orange" style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>未儲存</Tag>}
        </Space>
      </Divider>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localSteps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {localSteps.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12, display: 'block', padding: '4px 0' }}>尚無步驟</Text>
          )}
          {localSteps.map((step) => (
            <SortableStep
              key={step.id}
              step={step}
              canEdit={canEdit}
              onDelete={handleDeleteStep}
              onLocalChange={handleStepLocalChange}
              onUploadFile={handleUploadStepFile}
              onDeleteAttach={handleDeleteStepAttach}
            />
          ))}
        </SortableContext>
      </DndContext>
      {canEdit && (
        <Space direction="vertical" style={{ width: '100%', marginTop: 6 }} size={4}>
          <Form form={stepForm} layout="inline" onFinish={handleAddStep}>
            <Form.Item name="description" rules={[{ required: true }]} style={{ flex: 1, margin: 0 }}>
              <Input size="small" placeholder="新增步驟描述…" />
            </Form.Item>
            <Form.Item style={{ margin: '0 0 0 4px' }}>
              <Button size="small" type="primary" htmlType="submit" icon={<PlusOutlined />} />
            </Form.Item>
          </Form>
          {isDirty && (
            <div className={styles.unsavedBar}>
              <Text style={{ fontSize: 11 }}>有未儲存的步驟變更</Text>
              <Button
                size="small" type="primary"
                icon={<SaveOutlined />}
                loading={saveLoading}
                onClick={handleSaveSteps}
                style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
              >
                儲存步驟
              </Button>
            </div>
          )}
        </Space>
      )}

      {/* 照片 */}
      <Divider titlePlacement="left" plain style={{ fontSize: 12, margin: '8px 0 4px', color: '#888' }}>照片</Divider>
      <Image.PreviewGroup>
        <Space wrap size={8}>
          {PHOTO_CATS.map((cat) => (
            <GroupPhotoSlot
              key={cat} category={cat}
              attachment={photoMap[cat]}
              canEdit={canEdit}
              onUpload={handleUploadPhoto}
              onDelete={handleDeletePhoto}
            />
          ))}
        </Space>
      </Image.PreviewGroup>

      {/* 編輯 Modal */}
      <Modal
        title={`編輯試驗組：${group.name}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        destroyOnHidden
        width={680}
      >
        <Form form={editForm} layout="vertical" onFinish={handleSaveEdit} style={{ marginTop: 8 }}>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="name" label="試驗組名稱" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Input placeholder="A組、B組、對照組…" />
            </Form.Item>
            <Form.Item name="experimentType" label="實驗項目" style={{ flex: 1 }}>
              <Select allowClear placeholder="選擇類型" options={[
                { value: '染色機', label: '染色/染色製程（染色機）' },
                { value: '定型機-物性', label: '物性改良（定型機）' },
                { value: '定型機-機能', label: '機能性加工（定型機）' },
              ]} />
            </Form.Item>
          </Space>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.experimentType !== cur.experimentType}>
            {({ getFieldValue }) => {
              const expType: string = getFieldValue('experimentType') ?? ''
              const isFixingType = expType.startsWith('定型機')
              return isFixingType ? (
                <>
                  <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>定型加工條件</Divider>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="fixingTemp" label="加工溫度/時間" style={{ flex: 1 }}>
                      <Input placeholder="180°C × 30s" />
                    </Form.Item>
                    <Form.Item name="fixingAuxAmount" label="助劑用量" style={{ flex: 1 }}>
                      <Input placeholder="30g/L" />
                    </Form.Item>
                  </Space>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="fiberSpec" label="纖維規格" style={{ flex: 1 }}>
                      <Input placeholder="100% Polyester" />
                    </Form.Item>
                    <Form.Item name="widthShrinkage" label="門幅縮率" style={{ flex: 1 }}>
                      <Input placeholder="5%" />
                    </Form.Item>
                    <Form.Item name="shrinkTime" label="縮水時間" style={{ flex: 1 }}>
                      <Input placeholder="30 min" />
                    </Form.Item>
                  </Space>
                  <Form.Item name="fixingAuxiliaries" label="定型加工助劑（可複選）">
                    <Checkbox.Group style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                      {['吸濕快乾劑','接水劑','消毛劑','燙煙裂劑','摩擦電劑','撥滑紙劑','摩擦紙劑','摩起毛起絨劑',
                        '摩軟劑','增硬劑','增彈劑','增重劑','漿色劑','起毛油劑','摩紫外線劑','黏劑',
                        '摩耐防蛀劑','高溫難燃防止劑','溶液加工劑','負面離子加工劑','防毛劑',
                        '預縮外線加工劑','皮革漆沙劑','皮革磷裂劑'].map((a) => (
                        <Checkbox key={a} value={a} style={{ margin: 0, fontSize: 12 }}>{a}</Checkbox>
                      ))}
                    </Checkbox.Group>
                  </Form.Item>
                </>
              ) : (
                <>
                  <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>染色條件</Divider>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="bathRatio" label="浴比" style={{ flex: 1 }}>
                      <Input placeholder="1:10" />
                    </Form.Item>
                    <Form.Item name="startPH" label="起染 pH" style={{ flex: 1 }}>
                      <InputNumber style={{ width: '100%' }} step={0.1} min={0} max={14} />
                    </Form.Item>
                    <Form.Item name="endPH" label="終染 pH" style={{ flex: 1 }}>
                      <InputNumber style={{ width: '100%' }} step={0.1} min={0} max={14} />
                    </Form.Item>
                  </Space>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="acidMethod" label="加酸方式" style={{ flex: 1 }}>
                      <DropdownSelect categoryKey="dyeing_acid_method" allowClear placeholder="選擇或新增" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="tempRate" label="升溫速率" style={{ flex: 1 }}>
                      <Input placeholder="1°C/min" />
                    </Form.Item>
                    <Form.Item name="holdTime" label="保溫時間（分）" style={{ flex: 1 }}>
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Space>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="burningCondition" label="燒毛/退漿/燒定漿條件" style={{ flex: 1 }}>
                      <Input placeholder="燒毛條件…" />
                    </Form.Item>
                    <Form.Item name="washCondition" label="水洗條件" style={{ flex: 1 }}>
                      <Input placeholder="水洗溫度/次數…" />
                    </Form.Item>
                  </Space>
                  <Form.Item name="dyeAuxiliaries" label="染色助劑（可複選）">
                    <Checkbox.Group style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                      {['勻染劑','遮蔽劑','破壞洗劑','修復劑','氯化鈣','退色劑','熟洗劑','浴中柔軟劑'].map((a) => (
                        <Checkbox key={a} value={a} style={{ margin: 0, fontSize: 12 }}>{a}</Checkbox>
                      ))}
                    </Checkbox.Group>
                  </Form.Item>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="leveler" label="均染劑（用量）" style={{ flex: 1 }}>
                      <Input placeholder="品名 + 用量%" />
                    </Form.Item>
                    <Form.Item name="fixer" label="修補劑（用量）" style={{ flex: 1 }}>
                      <Input placeholder="品名 + 用量%" />
                    </Form.Item>
                  </Space>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="calciumChloride" label="氯化鈣（用量）" style={{ flex: 1 }}>
                      <Input placeholder="用量%" />
                    </Form.Item>
                    <Form.Item name="colorFixative" label="固色劑（用量）" style={{ flex: 1 }}>
                      <Input placeholder="品名 + 用量%" />
                    </Form.Item>
                  </Space>
                  <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>染料條件</Divider>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="dyeCombination" label="染料組合" style={{ flex: 2 }}>
                      <Input placeholder="酸性紅 R-380 + …" />
                    </Form.Item>
                    <Form.Item name="dyeAmount" label="添加量" style={{ flex: 1 }}>
                      <Input placeholder="4% + 2%" />
                    </Form.Item>
                  </Space>
                </>
              )
            }}
          </Form.Item>

          <Form.Item name="notes" label="備註">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

// ── 樣品 Tab ─────────────────────────────────────────────────────────────────

function SamplesTab({
  experimentId, groups, samples, canEdit, onUpdated,
}: {
  experimentId: number; groups: ExperimentGroup[]; samples: Sample[]
  canEdit: boolean; onUpdated: () => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [sampleForm] = Form.useForm()
  const [drawerSample, setDrawerSample] = useState<Sample | null>(null)
  const [drawerEditing, setDrawerEditing] = useState(false)
  const [drawerForm] = Form.useForm()
  const [sampleAttachments, setSampleAttachments] = useState<Attachment[]>([])
  const [pendingFiles, setPendingFiles] = useState<UploadFile[]>([])
  const groupOptions = groups.map((g, i) => ({
    value: g.id,
    label: `${GROUP_LETTERS[i % GROUP_LETTERS.length]}組 — ${g.name}`,
  }))

  const handleCreate = async (values: any) => {
    try {
      const res = await createSample(experimentId, {
        ...values,
        sampleDate: values.sampleDate || dayjs().format('YYYY-MM-DD'),
        groupId: values.groupId ?? null,
      })
      const newId = res.data.data.id
      for (const uf of pendingFiles) {
        if (uf.originFileObj) {
          await uploadSampleAttachment(experimentId, newId, uf.originFileObj as File, 'image').catch(() => {})
        }
      }
      setModalOpen(false)
      sampleForm.resetFields()
      setPendingFiles([])
      onUpdated()
      message.success('樣品已新增')
    } catch { message.error('新增失敗') }
  }

  const openDrawer = async (s: Sample) => {
    setDrawerSample(s)
    setDrawerEditing(false)
    const res = await getSampleAttachments(experimentId, s.id).catch(() => ({ data: { data: [] } }))
    setSampleAttachments(res.data.data ?? [])
  }

  const handleDrawerSave = async (values: any) => {
    if (!drawerSample) return
    try {
      await updateSample(experimentId, drawerSample.id, values)
      setDrawerEditing(false)
      const res = await getSampleAttachments(experimentId, drawerSample.id).catch(() => ({ data: { data: [] } }))
      setSampleAttachments(res.data.data ?? [])
      onUpdated()
      message.success('已更新')
    } catch { message.error('更新失敗') }
  }

  const handleDeleteSample = async (id: number) => {
    try {
      await deleteSample(experimentId, id)
      if (drawerSample?.id === id) setDrawerSample(null)
      onUpdated()
      message.success('已刪除')
    } catch { message.error('刪除失敗') }
  }

  const handlePhoto = async (file: File) => {
    if (!drawerSample) return false
    try {
      await uploadSamplePhoto(experimentId, drawerSample.id, file)
      onUpdated()
      message.success('照片已上傳')
    } catch { message.error('上傳失敗') }
    return false
  }

  const handleDeleteAttach = async (id: number) => {
    if (!drawerSample) return
    await deleteSampleAttachment(experimentId, drawerSample.id, id).catch(() => {})
    const res = await getSampleAttachments(experimentId, drawerSample.id).catch(() => ({ data: { data: [] } }))
    setSampleAttachments(res.data.data ?? [])
  }

  const getGroupName = (s: Sample) => {
    if (!s.groupId) return null
    const idx = groups.findIndex((g) => g.id === s.groupId)
    if (idx < 0) return null
    return `${GROUP_LETTERS[idx % GROUP_LETTERS.length]}組`
  }

  return (
    <>
      {canEdit && (
        <Button icon={<PlusOutlined />} type="primary" size="small" style={{ marginBottom: 8 }}
          onClick={() => setModalOpen(true)}>
          新增樣品
        </Button>
      )}
      <List
        dataSource={samples}
        locale={{ emptyText: '尚無樣品' }}
        renderItem={(s) => (
          <List.Item
            className={styles.sampleListItem}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('.ant-popconfirm, .ant-btn-dangerous')) return
              openDrawer(s)
            }}
            actions={canEdit ? [
              <Popconfirm title="刪除此樣品？"
                onConfirm={(e) => { e?.stopPropagation(); handleDeleteSample(s.id) }}>
                <Button size="small" danger icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()} />
              </Popconfirm>,
            ] : undefined}
          >
            <List.Item.Meta
              title={
                <Space>
                  {s.sampleCode}
                  <Tag>{s.clientName || '—'}</Tag>
                  {getGroupName(s) && <Tag color="blue">{getGroupName(s)}</Tag>}
                </Space>
              }
              description={`${s.label || '—'} | 目標：${s.targetItem || '—'} | 日期：${s.sampleDate?.split('T')[0]}`}
            />
          </List.Item>
        )}
      />

      <Modal title="新增樣品" open={modalOpen}
        onCancel={() => { setModalOpen(false); setPendingFiles([]) }}
        onOk={() => sampleForm.submit()} destroyOnHidden width={560}>
        <Form form={sampleForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 8 }}>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="sampleCode" label="樣品編號" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="SMP-001" />
            </Form.Item>
            <Form.Item name="sampleType" label="建立類別" style={{ flex: 1 }}>
              <Select allowClear placeholder="選擇類別" options={[
                '依來樣品','客戶來樣品','實驗樣品','留存樣','對照樣品','生產剩餘樣','客戶樣布',
              ].map((v) => ({ value: v, label: v }))} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="clientName" label="客戶名稱" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="quantity" label="數量" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Space>
          <Form.Item name="groupId" label="歸屬試驗組">
            <Select allowClear placeholder="選擇試驗組" options={groupOptions} />
          </Form.Item>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="label" label="標籤說明" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="targetItem" label="目標項目" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="sampleDate" label="收樣日期" style={{ flex: 1 }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="category" label="樣品分類" style={{ flex: 1 }}>
              <DropdownSelect categoryKey="sample_category" allowClear placeholder="選擇或新增" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="狀態" style={{ flex: 1 }}>
              <DropdownSelect categoryKey="sample_status" allowClear placeholder="選擇或新增" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>留樣管理（選填）</Divider>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="retentionDate" label="留樣日期" style={{ flex: 1 }}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="retentionPeriod" label="留樣期限（天）" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="retentionLocation" label="留樣位置" style={{ flex: 1 }}>
              <Input placeholder="暫放A架 / 收於B格" />
            </Form.Item>
            <Form.Item name="storageCondition" label="保存條件" style={{ flex: 1 }}>
              <Select allowClear placeholder="選擇" options={['常溫','冷藏','避光'].map((v) => ({ value: v, label: v }))} />
            </Form.Item>
          </Space>
          <Form.Item name="notes" label="備註"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item label="附件">
            <Upload multiple fileList={pendingFiles} beforeUpload={() => false}
              onChange={({ fileList }) => setPendingFiles(fileList)}>
              <Button icon={<UploadOutlined />} size="small">選擇附件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title={`樣品 — ${drawerSample?.sampleCode}`} open={!!drawerSample}
        onClose={() => { setDrawerSample(null); setDrawerEditing(false) }}
        width={480}
        extra={canEdit && !drawerEditing && (
          <Button size="small" icon={<EditOutlined />}
            onClick={() => {
              if (drawerSample) {
                drawerForm.setFieldsValue({
                  ...drawerSample,
                  retentionDate: drawerSample.retentionDate?.split('T')[0] ?? '',
                })
                setDrawerEditing(true)
              }
            }}>
            編輯
          </Button>
        )}
      >
        {drawerSample && (
          <Space direction="vertical" className={styles.drawerBody}>
            {drawerEditing ? (
              <Form form={drawerForm} layout="vertical" onFinish={handleDrawerSave}>
                <Space style={{ width: '100%' }} size={8}>
                  <Form.Item name="sampleType" label="建立類別" style={{ flex: 1 }}>
                    <Select allowClear placeholder="選擇類別" options={[
                      '依來樣品','客戶來樣品','實驗樣品','留存樣','對照樣品','生產剩餘樣','客戶樣布',
                    ].map((v) => ({ value: v, label: v }))} />
                  </Form.Item>
                  <Form.Item name="quantity" label="數量" style={{ flex: 1 }}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Space>
                <Form.Item name="clientName" label="客戶名稱"><Input /></Form.Item>
                <Form.Item name="label" label="標籤說明"><Input /></Form.Item>
                <Form.Item name="targetItem" label="目標項目"><Input /></Form.Item>
                <Form.Item name="category" label="樣品分類">
                  <DropdownSelect categoryKey="sample_category" allowClear placeholder="選擇或新增" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="status" label="狀態">
                  <DropdownSelect categoryKey="sample_status" allowClear placeholder="選擇或新增" style={{ width: '100%' }} />
                </Form.Item>
                <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>留樣管理</Divider>
                <Space style={{ width: '100%' }} size={8}>
                  <Form.Item name="retentionDate" label="留樣日期" style={{ flex: 1 }}>
                    <Input type="date" />
                  </Form.Item>
                  <Form.Item name="retentionPeriod" label="留樣期限（天）" style={{ flex: 1 }}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Space>
                <Space style={{ width: '100%' }} size={8}>
                  <Form.Item name="retentionLocation" label="留樣位置" style={{ flex: 1 }}>
                    <Input placeholder="暫放A架" />
                  </Form.Item>
                  <Form.Item name="storageCondition" label="保存條件" style={{ flex: 1 }}>
                    <Select allowClear placeholder="選擇" options={['常溫','冷藏','避光'].map((v) => ({ value: v, label: v }))} />
                  </Form.Item>
                </Space>
                <Form.Item name="notes" label="備註"><Input.TextArea rows={2} /></Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">儲存</Button>
                  <Button onClick={() => setDrawerEditing(false)}>取消</Button>
                </Space>
              </Form>
            ) : (
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="樣品編號">{drawerSample.sampleCode}</Descriptions.Item>
                {drawerSample.sampleType && <Descriptions.Item label="建立類別"><Tag color="geekblue">{drawerSample.sampleType}</Tag></Descriptions.Item>}
                <Descriptions.Item label="客戶名稱">{drawerSample.clientName || '—'}</Descriptions.Item>
                <Descriptions.Item label="標籤說明">{drawerSample.label || '—'}</Descriptions.Item>
                <Descriptions.Item label="目標項目">{drawerSample.targetItem || '—'}</Descriptions.Item>
                <Descriptions.Item label="日期">{drawerSample.sampleDate?.split('T')[0]}</Descriptions.Item>
                {drawerSample.quantity != null && <Descriptions.Item label="數量">{drawerSample.quantity}</Descriptions.Item>}
                {drawerSample.category && <Descriptions.Item label="分類"><Tag>{drawerSample.category}</Tag></Descriptions.Item>}
                {drawerSample.status && <Descriptions.Item label="狀態"><Tag color="blue">{drawerSample.status}</Tag></Descriptions.Item>}
                {drawerSample.retentionDate && <Descriptions.Item label="留樣日期">{drawerSample.retentionDate.split('T')[0]}</Descriptions.Item>}
                {drawerSample.retentionPeriod != null && <Descriptions.Item label="留樣期限">{drawerSample.retentionPeriod} 天</Descriptions.Item>}
                {drawerSample.retentionLocation && <Descriptions.Item label="留樣位置">{drawerSample.retentionLocation}</Descriptions.Item>}
                {drawerSample.storageCondition && <Descriptions.Item label="保存條件"><Tag>{drawerSample.storageCondition}</Tag></Descriptions.Item>}
                <Descriptions.Item label="備註">{drawerSample.notes || '—'}</Descriptions.Item>
              </Descriptions>
            )}
            <Divider>照片</Divider>
            {drawerSample.photoUrl
              ? <Image src={drawerSample.photoUrl} width={200} />
              : <Text type="secondary">尚無照片</Text>}
            {canEdit && (
              <Upload accept="image/*" showUploadList={false}
                beforeUpload={(f) => handlePhoto(f)}>
                <Button size="small" icon={<UploadOutlined />}>上傳照片</Button>
              </Upload>
            )}
            <Divider>附件</Divider>
            <Image.PreviewGroup>
              <Space wrap>
                {sampleAttachments.map((a) => (
                  <div key={a.id} className={styles.attachmentWrap}>
                    {a.fileType === 'image' ? (
                      <Image src={a.fileUrl} width={100} height={75} className={styles.attachmentImg} />
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
                    <Button size="small" icon={<DownloadOutlined />} className={styles.attachmentDownloadBtn}
                      onClick={async () => { const r = await fetch(a.fileUrl); downloadBlob(await r.blob(), a.fileName) }} />
                    {canEdit && (
                      <Popconfirm title="刪除此附件？" onConfirm={() => handleDeleteAttach(a.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} className={styles.attachmentDeleteBtn} />
                      </Popconfirm>
                    )}
                  </div>
                ))}
              </Space>
            </Image.PreviewGroup>
          </Space>
        )}
      </Drawer>
    </>
  )
}

// ── 主頁面 ────────────────────────────────────────────────────────────────────

export default function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [addGroupOpen, setAddGroupOpen] = useState(false)
  const [addGroupForm] = Form.useForm()
  const [editExpOpen, setEditExpOpen] = useState(false)
  const [editExpForm] = Form.useForm()

  const expId = Number(id)
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'

  const reload = async () => {
    setLoadError(null)
    try {
      const [eRes, sRes] = await Promise.all([getExperiment(expId), getSamples(expId)])
      const expData = eRes.data.data as Experiment
      if (!expData) throw new Error('No experiment data returned')
      setExperiment(expData)
      setSamples(sRes.data.data ?? [])
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? err?.message ?? '載入失敗'
      setLoadError(msg)
      console.error('[ExperimentDetailPage] reload error:', err)
    }
    finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [id])

  const handleAddGroup = async (values: any) => {
    try {
      await createGroup(expId, values)
      setAddGroupOpen(false)
      addGroupForm.resetFields()
      reload()
      message.success('試驗組已新增')
    } catch { message.error('新增失敗') }
  }

  const [editTestItems, setEditTestItems] = useState<CommissionTestItem[]>([])

  // ── 委託單自動帶入 ───────────────────────────────────────────────────────────
  const [autoPopulateOpen, setAutoPopulateOpen] = useState(false)
  const [pendingGroups, setPendingGroups] = useState<CommissionTestItem[]>([])
  const [pendingFabricCode, setPendingFabricCode] = useState<string | null>(null)
  const [pendingClientInfo, setPendingClientInfo] = useState<{ clientCompany: string; clientContact: string; expDate: string } | null>(null)
  const [groupsChecked, setGroupsChecked] = useState<boolean[]>([])
  const [sampleChecked, setSampleChecked] = useState(true)
  const [autoPopulating, setAutoPopulating] = useState(false)

  const handleConfirmAutoPopulate = async () => {
    setAutoPopulating(true)
    try {
      const groupsToCreate = pendingGroups.filter((_, i) => groupsChecked[i])
      if (groupsToCreate.length > 0) {
        const baseOrder = (experiment?.groups.length ?? 0) + 1
        await Promise.all(groupsToCreate.map((item, idx) =>
          createGroup(expId, {
            name: item.chemicalName,
            groupOrder: baseOrder + idx,
            notes: [item.lotNo ? `Lot No: ${item.lotNo}` : '', item.description].filter(Boolean).join('\n'),
          })
        ))
        message.success(`已建立 ${groupsToCreate.length} 個試驗組`)
      }
      if (sampleChecked && pendingFabricCode) {
        await createSample(expId, {
          sampleCode: pendingFabricCode,
          clientName: pendingClientInfo?.clientCompany ?? '',
          label: pendingClientInfo?.clientContact ?? '',
          sampleDate: pendingClientInfo?.expDate ?? new Date().toISOString(),
          targetItem: '',
          sampleType: '客戶來樣品',
          status: '確認中',
        })
        message.success(`已建立樣品：${pendingFabricCode}`)
      }
      setAutoPopulateOpen(false)
      reload()
    } catch { message.error('自動建立失敗，請手動新增') }
    finally { setAutoPopulating(false) }
  }

  const openEditExp = () => {
    if (!experiment) return
    const cn = (experiment.commissionNotes as any) ?? {}
    editExpForm.setFieldsValue({
      category: experiment.category,
      temperature: experiment.temperature,
      humidity: experiment.humidity,
      notes: experiment.notes,
      experimentDate: dayjs(experiment.experimentDate),
      clientCompany: experiment.clientCompany,
      fabricCode: experiment.fabricCode,
      clientContact: experiment.clientContact,
      commissionType: experiment.commissionType,
      expectedDate: experiment.expectedDate ? dayjs(experiment.expectedDate) : null,
      actualDate: experiment.actualDate ? dayjs(experiment.actualDate) : null,
      commissionNotes_waiting: !!cn.waitingForProcessing,
      commissionNotes_report: !!cn.report,
      commissionNotes_cost: cn.cost ?? null,
      conclusionBefore: experiment.conclusionBefore,
      conclusionAfter: experiment.conclusionAfter,
    })
    setEditTestItems((experiment.testItems as CommissionTestItem[]) ?? [])
    setEditExpOpen(true)
  }

  const handleSaveExp = async (values: any) => {
    try {
      await updateExperiment(expId, {
        category: values.category,
        temperature: values.temperature,
        humidity: values.humidity,
        notes: values.notes,
        experimentDate: values.experimentDate?.toISOString(),
        clientCompany: values.clientCompany ?? null,
        fabricCode: values.fabricCode ?? null,
        clientContact: values.clientContact ?? null,
        commissionType: values.commissionType ?? null,
        expectedDate: values.expectedDate ? values.expectedDate.toISOString() : null,
        actualDate: values.actualDate ? values.actualDate.toISOString() : null,
        testItems: editTestItems,
        commissionNotes: {
          waitingForProcessing: !!values.commissionNotes_waiting,
          report: !!values.commissionNotes_report,
          cost: values.commissionNotes_cost ?? null,
        },
        conclusionBefore: values.conclusionBefore ?? null,
        conclusionAfter: values.conclusionAfter ?? null,
      })
      setEditExpOpen(false)

      // ── 自動帶入偵測 ──────────────────────────────────────────────────────────
      const existingGroupNames = new Set((experiment?.groups ?? []).map(g => g.name))
      const newGroups = editTestItems.filter(i => i.chemicalName && !existingGroupNames.has(i.chemicalName))
      const existingSampleCodes = new Set(samples.map(s => s.sampleCode))
      const fabricCode = values.fabricCode as string | undefined
      const sampleNeeded = !!fabricCode && !existingSampleCodes.has(fabricCode)

      if (newGroups.length > 0 || sampleNeeded) {
        setPendingGroups(newGroups)
        setPendingFabricCode(sampleNeeded ? (fabricCode ?? null) : null)
        setPendingClientInfo({
          clientCompany: values.clientCompany ?? '',
          clientContact: values.clientContact ?? '',
          expDate: values.experimentDate
            ? values.experimentDate.toISOString()
            : experiment?.experimentDate ?? new Date().toISOString(),
        })
        setGroupsChecked(newGroups.map(() => true))
        setSampleChecked(sampleNeeded)
        setAutoPopulateOpen(true)
      } else {
        reload()
      }
    } catch { message.error('更新失敗') }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />
  if (loadError || !experiment) return (
    <Card>
      <Space direction="vertical" align="center" style={{ width: '100%', padding: '40px 0' }}>
        <Text type="danger">{loadError ?? '找不到此實驗'}</Text>
        <Space>
          <Button onClick={() => { setLoading(true); reload() }}>重新載入</Button>
          <Button onClick={() => navigate('/experiments')}>返回列表</Button>
        </Space>
      </Space>
    </Card>
  )

  const groups = experiment.groups ?? []

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* 實驗資訊卡 */}
      <Card
        title={<Space>
          <Text strong>{experiment.code}</Text>
          {experiment.category && <Tag color="blue">{experiment.category}</Tag>}
        </Space>}
        extra={
          <Space>
            {canEdit && <Button size="small" icon={<EditOutlined />} onClick={openEditExp}>編輯資訊</Button>}
            <Button size="small" type="primary"
              onClick={() => navigate(`/experiments/${id}/result`)}>
              查看 / 建立結果
            </Button>
          </Space>
        }
      >
        <Space split={<Divider type="vertical" />} wrap>
          <Text><Text type="secondary">配方：</Text>{experiment.formulaName}</Text>
          <Text><Text type="secondary">實驗人員：</Text>{experiment.experimenterName}</Text>
          <Text><Text type="secondary">日期：</Text>{dayjs(experiment.experimentDate).format('YYYY-MM-DD')}</Text>
          <Text><Text type="secondary">環境：</Text>{experiment.temperature}°C / {experiment.humidity}%</Text>
          {(() => {
            const sg = experiment.groups.find((g) => g.isSuccess)
            return sg ? (
              <Space size={4}>
                <TrophyOutlined style={{ color: '#faad14' }} />
                <Text type="secondary">成功組：</Text>
                <Tag color="success">{sg.name}</Tag>
              </Space>
            ) : null
          })()}
        </Space>
        {experiment.notes && (
          <div className={styles.expNotes}>{experiment.notes}</div>
        )}
      </Card>

      {/* ── 委託單資訊卡 ── */}
      <Card
        title={<Space><FileTextOutlined /><Text strong>委託單資訊</Text></Space>}
        extra={
          <Space>
            {canEdit && <Button size="small" icon={<EditOutlined />} onClick={openEditExp}>編輯</Button>}
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => printCommissionForm(experiment)}
            >
              列印委託單
            </Button>
          </Space>
        }
      >
        {experiment.clientCompany || experiment.fabricCode || experiment.clientContact || experiment.commissionType ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={3}>
              <Descriptions.Item label="客戶公司名稱" span={1}>{experiment.clientCompany || '—'}</Descriptions.Item>
              <Descriptions.Item label="客戶聯絡人" span={1}>{experiment.clientContact || '—'}</Descriptions.Item>
              <Descriptions.Item label="布料代碼" span={1}>{experiment.fabricCode || '—'}</Descriptions.Item>
              <Descriptions.Item label="類型" span={1}>
                {experiment.commissionType
                  ? <Tag color="blue">{COMMISSION_TYPE_LABEL[experiment.commissionType] ?? experiment.commissionType}</Tag>
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="預計完成日" span={1}>
                {experiment.expectedDate ? dayjs(experiment.expectedDate).format('YYYY-MM-DD') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="實際完成日" span={1}>
                {experiment.actualDate ? dayjs(experiment.actualDate).format('YYYY-MM-DD') : '—'}
              </Descriptions.Item>
            </Descriptions>

            {experiment.testItems && experiment.testItems.length > 0 && (
              <>
                <Divider titlePlacement="left" style={{ margin: '8px 0' }}>測試項目</Divider>
                <Table
                  rowKey={(_, idx) => String(idx)}
                  dataSource={experiment.testItems}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: '化學品名稱', dataIndex: 'chemicalName', key: 'chemicalName', width: 130 },
                    { title: 'Lot No', dataIndex: 'lotNo', key: 'lotNo', width: 110 },
                    {
                      title: '測試目的',
                      dataIndex: 'testPurposes',
                      key: 'testPurposes',
                      render: (ps: string[]) => (
                        <Space wrap size={4}>
                          {(ps ?? []).map((p) => <Tag key={p} style={{ margin: 0 }}>{p}</Tag>)}
                        </Space>
                      ),
                    },
                    { title: '說明', dataIndex: 'description', key: 'description', width: 150 },
                    { title: '結果', dataIndex: 'result', key: 'result', width: 150 },
                  ]}
                />
              </>
            )}

            {experiment.commissionNotes && (
              <>
                <Divider titlePlacement="left" style={{ margin: '8px 0' }}>備註</Divider>
                <Space>
                  {(experiment.commissionNotes as any).waitingForProcessing && <Tag>待加工</Tag>}
                  {(experiment.commissionNotes as any).report && <Tag>報告</Tag>}
                  {(experiment.commissionNotes as any).cost != null && (experiment.commissionNotes as any).cost > 0 &&
                    <Tag>成本：{(experiment.commissionNotes as any).cost} VND</Tag>}
                </Space>
              </>
            )}

            {(experiment.conclusionBefore || experiment.conclusionAfter) && (
              <>
                <Divider titlePlacement="left" style={{ margin: '8px 0' }}>結論</Divider>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="Before" span={1}>{experiment.conclusionBefore || '—'}</Descriptions.Item>
                  <Descriptions.Item label="After" span={1}>{experiment.conclusionAfter || '—'}</Descriptions.Item>
                </Descriptions>
              </>
            )}
          </Space>
        ) : (
          <Text type="secondary">尚無委託資訊，點擊「編輯」填寫委託單欄位</Text>
        )}
      </Card>

      {/* 試驗組並排區 */}
      <Card
        title={<Space>
          <Text strong>試驗組</Text>
          <Badge count={groups.length} color="blue" />
        </Space>}
        extra={canEdit && (
          <Button type="primary" icon={<PlusOutlined />} size="small"
            onClick={() => {
              addGroupForm.setFieldsValue({
                name: `${GROUP_LETTERS[groups.length % GROUP_LETTERS.length]}組`,
              })
              setAddGroupOpen(true)
            }}>
            新增試驗組
          </Button>
        )}
      >
        {groups.length === 0 ? (
          <div className={styles.groupsEmpty}>
            尚無試驗組，點擊「新增試驗組」開始建立
          </div>
        ) : (
          <div className={styles.groupsRow}>
            {groups.map((g, i) => (
              <GroupCard
                key={g.id}
                group={g}
                groupIdx={i}
                experimentId={expId}
                canEdit={canEdit}
                onUpdated={reload}
              />
            ))}
          </div>
        )}
      </Card>

      {/* 樣品管理 */}
      <Card title={<Space><Text strong>樣品管理</Text><Badge count={samples.length} color="blue" /></Space>}>
        <SamplesTab
          experimentId={expId}
          groups={groups}
          samples={samples}
          canEdit={canEdit}
          onUpdated={reload}
        />
      </Card>

      {/* 新增試驗組 Modal */}
      <Modal title="新增試驗組" open={addGroupOpen}
        onCancel={() => setAddGroupOpen(false)}
        onOk={() => addGroupForm.submit()} destroyOnHidden width={680}>
        <Form form={addGroupForm} layout="vertical" onFinish={handleAddGroup} style={{ marginTop: 8 }}>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="name" label="試驗組名稱" rules={[{ required: true }]} style={{ flex: 2 }}>
              <Input placeholder="A組、對照組、高溫組…" />
            </Form.Item>
            <Form.Item name="experimentType" label="實驗項目" style={{ flex: 1 }}>
              <Select allowClear placeholder="選擇類型" options={[
                { value: '染色機', label: '染色/染色製程（染色機）' },
                { value: '定型機-物性', label: '物性改良（定型機）' },
                { value: '定型機-機能', label: '機能性加工（定型機）' },
              ]} />
            </Form.Item>
          </Space>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.experimentType !== cur.experimentType}>
            {({ getFieldValue }) => {
              const expType: string = getFieldValue('experimentType') ?? ''
              const isFixingType = expType.startsWith('定型機')
              return isFixingType ? (
                <>
                  <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888' }}>定型加工條件（選填）</Divider>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="fixingTemp" label="加工溫度/時間" style={{ flex: 1 }}>
                      <Input placeholder="180°C × 30s" />
                    </Form.Item>
                    <Form.Item name="fixingAuxAmount" label="助劑用量" style={{ flex: 1 }}>
                      <Input placeholder="30g/L" />
                    </Form.Item>
                  </Space>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="fiberSpec" label="纖維規格" style={{ flex: 1 }}>
                      <Input placeholder="100% Polyester" />
                    </Form.Item>
                    <Form.Item name="widthShrinkage" label="門幅縮率" style={{ flex: 1 }}>
                      <Input placeholder="5%" />
                    </Form.Item>
                    <Form.Item name="shrinkTime" label="縮水時間" style={{ flex: 1 }}>
                      <Input placeholder="30 min" />
                    </Form.Item>
                  </Space>
                  <Form.Item name="fixingAuxiliaries" label="定型加工助劑（可複選）">
                    <Checkbox.Group style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                      {['吸濕快乾劑','接水劑','消毛劑','燙煙裂劑','摩擦電劑','撥滑紙劑','摩擦紙劑','摩起毛起絨劑',
                        '摩軟劑','增硬劑','增彈劑','增重劑','漿色劑','起毛油劑','摩紫外線劑','黏劑',
                        '摩耐防蛀劑','高溫難燃防止劑','溶液加工劑','負面離子加工劑','防毛劑',
                        '預縮外線加工劑','皮革漆沙劑','皮革磷裂劑'].map((a) => (
                        <Checkbox key={a} value={a} style={{ margin: 0, fontSize: 12 }}>{a}</Checkbox>
                      ))}
                    </Checkbox.Group>
                  </Form.Item>
                </>
              ) : (
                <>
                  <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888' }}>染色條件（選填）</Divider>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="bathRatio" label="浴比" style={{ flex: 1 }}>
                      <Input placeholder="1:10" />
                    </Form.Item>
                    <Form.Item name="startPH" label="起染 pH" style={{ flex: 1 }}>
                      <InputNumber style={{ width: '100%' }} step={0.1} min={0} max={14} />
                    </Form.Item>
                    <Form.Item name="endPH" label="終染 pH" style={{ flex: 1 }}>
                      <InputNumber style={{ width: '100%' }} step={0.1} min={0} max={14} />
                    </Form.Item>
                  </Space>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="acidMethod" label="加酸方式" style={{ flex: 1 }}>
                      <DropdownSelect categoryKey="dyeing_acid_method" allowClear placeholder="選擇或新增" style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="tempRate" label="升溫速率" style={{ flex: 1 }}>
                      <Input placeholder="1.5°C/min" />
                    </Form.Item>
                    <Form.Item name="holdTime" label="保溫時間（分）" style={{ flex: 1 }}>
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                  </Space>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="burningCondition" label="燒毛/退漿條件" style={{ flex: 1 }}>
                      <Input placeholder="燒毛條件…" />
                    </Form.Item>
                    <Form.Item name="washCondition" label="水洗條件" style={{ flex: 1 }}>
                      <Input placeholder="溫度/次數…" />
                    </Form.Item>
                  </Space>
                  <Form.Item name="dyeAuxiliaries" label="染色助劑（可複選）">
                    <Checkbox.Group style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                      {['勻染劑','遮蔽劑','破壞洗劑','修復劑','氯化鈣','退色劑','熟洗劑','浴中柔軟劑'].map((a) => (
                        <Checkbox key={a} value={a} style={{ margin: 0, fontSize: 12 }}>{a}</Checkbox>
                      ))}
                    </Checkbox.Group>
                  </Form.Item>
                  <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888' }}>助劑用量（選填）</Divider>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="leveler" label="均染劑（用量）" style={{ flex: 1 }}>
                      <Input placeholder="品名 + 用量%" />
                    </Form.Item>
                    <Form.Item name="fixer" label="修補劑（用量）" style={{ flex: 1 }}>
                      <Input placeholder="品名 + 用量%" />
                    </Form.Item>
                  </Space>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="calciumChloride" label="氯化鈣（用量）" style={{ flex: 1 }}>
                      <Input placeholder="用量%" />
                    </Form.Item>
                    <Form.Item name="colorFixative" label="固色劑（用量）" style={{ flex: 1 }}>
                      <Input placeholder="品名 + 用量%" />
                    </Form.Item>
                  </Space>
                  <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888' }}>染料條件（選填）</Divider>
                  <Space style={{ width: '100%' }} size={8}>
                    <Form.Item name="dyeCombination" label="染料組合" style={{ flex: 2 }}>
                      <Input placeholder="酸性紅 R-380 + 酸性藍 B-150" />
                    </Form.Item>
                    <Form.Item name="dyeAmount" label="添加量" style={{ flex: 1 }}>
                      <Input placeholder="4% + 2%" />
                    </Form.Item>
                  </Space>
                </>
              )
            }}
          </Form.Item>

          <Form.Item name="notes" label="備註"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* 編輯實驗資訊 Modal */}
      <Modal title="編輯實驗資訊 / 委託單" open={editExpOpen}
        onCancel={() => setEditExpOpen(false)}
        footer={null} destroyOnHidden width={760}>
        <Form form={editExpForm} layout="vertical" onFinish={handleSaveExp} style={{ marginTop: 12 }}>

          <Divider titlePlacement="left" plain style={{ fontSize: 12 }}>基本資訊</Divider>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="category" label="實驗分類" style={{ flex: 1 }}>
              <DropdownSelect categoryKey="experiment_category" allowClear placeholder="選擇或新增分類" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="experimentDate" label="實驗日期" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="temperature" label="溫度（°C）" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber step={0.1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="humidity" label="濕度（%）" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber step={0.1} min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="notes" label="備註"><Input.TextArea rows={2} /></Form.Item>

          <Divider titlePlacement="left" plain style={{ fontSize: 12 }}>委託單資訊</Divider>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="clientCompany" label="客戶公司名稱" style={{ flex: 1 }}>
              <Input placeholder="Tên Cty Khách Hàng" />
            </Form.Item>
            <Form.Item name="clientContact" label="客戶聯絡人" style={{ flex: 1 }}>
              <Input placeholder="Người Liên lạc" />
            </Form.Item>
            <Form.Item name="fabricCode" label="布料代碼" style={{ flex: 1 }}>
              <Input placeholder="Mã số vải" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="commissionType" label="類型" style={{ flex: 1 }}>
              <Select options={COMMISSION_TYPE_OPTIONS} allowClear placeholder="選擇類型" />
            </Form.Item>
            <Form.Item name="expectedDate" label="預計完成日" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="actualDate" label="實際完成日" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          {/* 測試項目 */}
          <Form.Item label="測試項目">
            <Table
              rowKey={(_, idx) => String(idx)}
              dataSource={editTestItems}
              pagination={false}
              size="small"
              scroll={{ x: 560 }}
              columns={[
                {
                  title: '化學品名稱', key: 'chemicalName', width: 120,
                  render: (_: unknown, _r: CommissionTestItem, idx: number) => (
                    <Input size="small" value={editTestItems[idx]?.chemicalName}
                      onChange={(e) => setEditTestItems((prev) => prev.map((it, i) => i === idx ? { ...it, chemicalName: e.target.value } : it))}
                      placeholder="化學品名稱" />
                  ),
                },
                {
                  title: 'Lot No', key: 'lotNo', width: 100,
                  render: (_: unknown, _r: CommissionTestItem, idx: number) => (
                    <Input size="small" value={editTestItems[idx]?.lotNo}
                      onChange={(e) => setEditTestItems((prev) => prev.map((it, i) => i === idx ? { ...it, lotNo: e.target.value } : it))}
                      placeholder="批號" />
                  ),
                },
                {
                  title: '測試目的', key: 'testPurposes',
                  render: (_: unknown, _r: CommissionTestItem, idx: number) => (
                    <Checkbox.Group
                      value={editTestItems[idx]?.testPurposes ?? []}
                      onChange={(vals) => setEditTestItems((prev) => prev.map((it, i) => i === idx ? { ...it, testPurposes: vals as string[] } : it))}
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 6px' }}
                    >
                      {TEST_PURPOSES.map((p) => (
                        <Checkbox key={p} value={p} style={{ margin: 0, fontSize: 11 }}>{p}</Checkbox>
                      ))}
                    </Checkbox.Group>
                  ),
                },
                {
                  title: '說明', key: 'description', width: 110,
                  render: (_: unknown, _r: CommissionTestItem, idx: number) => (
                    <Input.TextArea size="small" rows={2} value={editTestItems[idx]?.description}
                      onChange={(e) => setEditTestItems((prev) => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))}
                      placeholder="說明" />
                  ),
                },
                {
                  title: '結果', key: 'result', width: 110,
                  render: (_: unknown, _r: CommissionTestItem, idx: number) => (
                    <Input.TextArea size="small" rows={2} value={editTestItems[idx]?.result}
                      onChange={(e) => setEditTestItems((prev) => prev.map((it, i) => i === idx ? { ...it, result: e.target.value } : it))}
                      placeholder="結果" />
                  ),
                },
                {
                  title: '', key: 'del', width: 32,
                  render: (_: unknown, _r: CommissionTestItem, idx: number) => (
                    <Button size="small" type="text" danger icon={<DeleteOutlined />}
                      onClick={() => setEditTestItems((prev) => prev.filter((_, i) => i !== idx))} />
                  ),
                },
              ]}
            />
            <Button size="small" icon={<PlusOutlined />} type="dashed" block style={{ marginTop: 6 }}
              onClick={() => setEditTestItems((prev) => [...prev, { chemicalName: '', lotNo: '', testPurposes: [], description: '', result: '' }])}>
              新增化學品行
            </Button>
          </Form.Item>

          {/* 備註 */}
          <Space align="center" style={{ marginBottom: 12 }}>
            <Form.Item name="commissionNotes_waiting" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>待加工</Checkbox>
            </Form.Item>
            <Form.Item name="commissionNotes_report" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>報告</Checkbox>
            </Form.Item>
            <Form.Item name="commissionNotes_cost" label="成本 (VND)" style={{ marginBottom: 0 }}>
              <InputNumber min={0} placeholder="0" style={{ width: 120 }} />
            </Form.Item>
          </Space>

          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="conclusionBefore" label="結論 Before" style={{ flex: 1 }}>
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="conclusionAfter" label="結論 After" style={{ flex: 1 }}>
              <Input.TextArea rows={3} />
            </Form.Item>
          </Space>

          <Space>
            <Button type="primary" htmlType="submit">儲存</Button>
            <Button onClick={() => setEditExpOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>

      {/* ── 委託單自動帶入確認 Modal ── */}
      <Modal
        title="委託單已儲存 — 自動帶入確認"
        open={autoPopulateOpen}
        onOk={handleConfirmAutoPopulate}
        onCancel={() => { setAutoPopulateOpen(false); reload() }}
        okText="確認建立"
        cancelText="跳過，不自動建立"
        confirmLoading={autoPopulating}
        width={520}
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size={4}>
          <Text type="secondary">偵測到委託單中有以下資料尚未建立，勾選後點「確認建立」即可自動帶入：</Text>

          {pendingGroups.length > 0 && (
            <>
              <Divider plain style={{ margin: '8px 0 4px', fontSize: 12 }}>
                試驗組（{pendingGroups.length} 筆）— 來自委託單測試項目
              </Divider>
              <Space direction="vertical" size={4} style={{ paddingLeft: 8 }}>
                {pendingGroups.map((item, idx) => (
                  <Checkbox
                    key={idx}
                    checked={groupsChecked[idx] ?? true}
                    onChange={e => setGroupsChecked(prev => prev.map((v, i) => i === idx ? e.target.checked : v))}
                  >
                    <Space size={6}>
                      <Text strong>{item.chemicalName}</Text>
                      {item.lotNo && <Text type="secondary" style={{ fontSize: 11 }}>Lot: {item.lotNo}</Text>}
                      {item.testPurposes?.length > 0 && (
                        <Tag color="blue" style={{ fontSize: 10 }}>{item.testPurposes.join('、')}</Tag>
                      )}
                    </Space>
                  </Checkbox>
                ))}
              </Space>
            </>
          )}

          {pendingFabricCode && (
            <>
              <Divider plain style={{ margin: '8px 0 4px', fontSize: 12 }}>
                樣品（1 筆）— 來自布料代碼
              </Divider>
              <Space direction="vertical" size={2} style={{ paddingLeft: 8 }}>
                <Checkbox
                  checked={sampleChecked}
                  onChange={e => setSampleChecked(e.target.checked)}
                >
                  <Space size={6}>
                    <Text>樣品編號：</Text><Text strong>{pendingFabricCode}</Text>
                    {pendingClientInfo?.clientCompany && (
                      <Text type="secondary" style={{ fontSize: 11 }}>{pendingClientInfo.clientCompany}</Text>
                    )}
                  </Space>
                </Checkbox>
                {sampleChecked && (
                  <Text type="secondary" style={{ fontSize: 11, paddingLeft: 24 }}>
                    → 樣品狀態：確認中，類型：客戶來樣品
                  </Text>
                )}
              </Space>
            </>
          )}
        </Space>
      </Modal>
    </Space>
  )
}
