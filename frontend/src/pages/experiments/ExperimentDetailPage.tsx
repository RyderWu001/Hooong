import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tabs, Button, Space, Form, Input, Upload,
  Image, message, Spin, List, Avatar, Popconfirm, Tag, Modal,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, FileTextOutlined,
  UploadOutlined, PictureOutlined,
} from '@ant-design/icons'
import {
  getExperiment, addSteps, updateStep, deleteStep,
  uploadAttachment, deleteAttachment,
  getSamples, createSample, deleteSample, uploadSamplePhoto,
} from '../../api/experiments'
import type { Experiment, ExperimentStep, Attachment, Sample } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'

export default function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [experiment, setExperiment] = useState<Experiment | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [stepForm] = Form.useForm()
  const [sampleModalOpen, setSampleModalOpen] = useState(false)
  const [sampleForm] = Form.useForm()

  const expId = Number(id)
  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'

  const reload = async () => {
    try {
      const [eRes, sRes] = await Promise.all([getExperiment(expId), getSamples(expId)])
      setExperiment(eRes.data.data)
      setSamples(sRes.data.data ?? [])
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [id])

  const handleAddStep = async (values: { description: string }) => {
    const nextOrder = (experiment?.steps.length ?? 0) + 1
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
      <Card
        title={`實驗 — ${experiment.code}`}
        extra={
          canEdit && (
            <Button type="primary" onClick={() => navigate(`/experiments/${id}/result`)}>
              {experiment ? '查看 / 建立結果' : '建立結果'}
            </Button>
          )
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

      <Card>
        <Tabs
          items={[
            {
              key: 'steps',
              label: '實驗步驟',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <List
                    dataSource={experiment.steps}
                    renderItem={(step: ExperimentStep) => (
                      <List.Item
                        actions={
                          canEdit
                            ? [
                                <Popconfirm
                                  title="刪除此步驟？"
                                  onConfirm={() => handleDeleteStep(step.id)}
                                >
                                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                                </Popconfirm>,
                              ]
                            : undefined
                        }
                      >
                        <List.Item.Meta
                          avatar={<Avatar size="small">{step.stepOrder}</Avatar>}
                          description={step.description}
                        />
                      </List.Item>
                    )}
                  />
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

      <Modal
        title="新增樣品"
        open={sampleModalOpen}
        onCancel={() => setSampleModalOpen(false)}
        footer={null}
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
