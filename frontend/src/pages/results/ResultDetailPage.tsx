import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Card, Form, Input, Select, Button, Space, Tag, Upload,
  Image, Popconfirm, message, Spin, Descriptions, Divider,
} from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { getResult, createResult, updateResult, uploadResultAttachment, deleteResultAttachment } from '../../api/results'
import type { ExperimentResult, ResultStatus, Attachment } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'

const STATUS_OPTIONS = [
  { value: 'SUCCESS', label: '成功', color: 'green' },
  { value: 'FAILED', label: '失敗', color: 'red' },
  { value: 'OBSERVING', label: '待觀察', color: 'orange' },
  { value: 'NEEDS_ADJUST', label: '需調整', color: 'blue' },
]

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const expId = Number(id)
  const [result, setResult] = useState<ExperimentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'

  const reload = async () => {
    try {
      const res = await getResult(expId)
      setResult(res.data.data)
      form.setFieldsValue(res.data.data)
    } catch {
      setResult(null)
      setEditing(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [id])

  const handleSave = async (values: Partial<ExperimentResult>) => {
    setSaving(true)
    try {
      if (result) {
        await updateResult(expId, values)
        message.success('已更新')
      } else {
        await createResult(expId, values as Parameters<typeof createResult>[1])
        message.success('已建立')
      }
      setEditing(false)
      reload()
    } catch {
      message.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (file: File) => {
    const type = file.type.startsWith('video') ? 'video' : 'image'
    try {
      await uploadResultAttachment(expId, file, type)
      message.success('上傳成功')
      reload()
    } catch {
      message.error('上傳失敗')
    }
    return false
  }

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteResultAttachment(expId, attachmentId)
      reload()
    } catch {
      message.error('刪除失敗')
    }
  }

  const statusColor = (s: ResultStatus) =>
    STATUS_OPTIONS.find((o) => o.value === s)?.color ?? 'default'

  const statusLabel = (s: ResultStatus) =>
    STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card
        title="實驗結果"
        extra={
          canEdit && !editing && (
            <Button type="primary" onClick={() => setEditing(true)}>編輯</Button>
          )
        }
      >
        {!editing && result ? (
          <>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="結果狀態">
                <Tag color={statusColor(result.status)}>{statusLabel(result.status)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="記錄時間">
                {dayjs(result.updatedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="結果說明" span={2}>{result.description}</Descriptions.Item>
              <Descriptions.Item label="實驗心得" span={2}>{result.reflection}</Descriptions.Item>
              <Descriptions.Item label="問題紀錄" span={2}>{result.issueRecord}</Descriptions.Item>
              <Descriptions.Item label="改善建議" span={2}>{result.improvement}</Descriptions.Item>
              <Descriptions.Item label="客戶回饋" span={2}>{result.clientFeedback}</Descriptions.Item>
              <Descriptions.Item label="備註" span={2}>{result.notes}</Descriptions.Item>
            </Descriptions>

            <Divider>附件</Divider>
            <Space wrap>
              {result.attachments.map((a: Attachment) => (
                <div key={a.id} style={{ position: 'relative' }}>
                  {a.fileType === 'image' ? (
                    <Image src={a.fileUrl} width={120} height={90} style={{ objectFit: 'cover' }} />
                  ) : (
                    <Card size="small" style={{ width: 120 }}>{a.fileName}</Card>
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
              {canEdit && (
                <Upload accept="image/*,video/*" showUploadList={false} beforeUpload={handleUpload}>
                  <Button icon={<UploadOutlined />}>上傳附件</Button>
                </Upload>
              )}
            </Space>
          </>
        ) : canEdit ? (
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item name="status" label="結果狀態" rules={[{ required: true }]}>
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
            <Form.Item name="description" label="結果說明">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="reflection" label="實驗心得">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="issueRecord" label="問題紀錄">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="improvement" label="改善建議">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="clientFeedback" label="客戶回饋">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="notes" label="備註">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>
                {result ? '儲存變更' : '建立結果'}
              </Button>
              {result && <Button onClick={() => setEditing(false)}>取消</Button>}
            </Space>
          </Form>
        ) : (
          <p>尚未建立實驗結果</p>
        )}
      </Card>
    </Space>
  )
}
