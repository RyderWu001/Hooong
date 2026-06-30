import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Card, Form, Input, Select, Button, Space, Tag, Upload,
  Image, Popconfirm, message, Spin, Descriptions, Divider, InputNumber, Row, Col,
} from 'antd'
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons'
import { getResult, createResult, updateResult, uploadResultAttachment, deleteResultAttachment } from '../../api/results'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import type { ExperimentResult, ResultStatus, Attachment } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'

const STATUS_OPTIONS = [
  { value: 'SUCCESS', label: '成功', color: 'green' },
  { value: 'FAILED', label: '失敗', color: 'red' },
  { value: 'OBSERVING', label: '待觀察', color: 'orange' },
  { value: 'NEEDS_ADJUST', label: '需調整', color: 'blue' },
]

const SCORE_OPTIONS = Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))

const SCORE_DIMS = [
  { name: 'handFeelScore', label: '手感' },
  { name: 'colorShadeScore', label: '色光' },
  { name: 'fastnessScore', label: '牢度' },
  { name: 'moistureScore', label: '吸濕' },
] as const

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const expId = Number(id)
  const [result, setResult] = useState<ExperimentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const { selectOptions: abnormalReasonOptions } = useDropdownOptions('result_abnormal_reason')
  const { selectOptions: improvementActionOptions } = useDropdownOptions('result_improvement')
  const { selectOptions: clientFeedbackResultOptions } = useDropdownOptions('result_client_feedback')

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
              <Descriptions.Item label="總評分">
                {result.score != null ? (
                  <Tag color={result.score >= 80 ? 'green' : result.score >= 60 ? 'orange' : 'red'}>
                    {result.score} 分
                  </Tag>
                ) : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="手感">{result.handFeelScore != null ? `${result.handFeelScore} 分` : '—'}</Descriptions.Item>
              <Descriptions.Item label="色光">{result.colorShadeScore != null ? `${result.colorShadeScore} 分` : '—'}</Descriptions.Item>
              <Descriptions.Item label="牢度">{result.fastnessScore != null ? `${result.fastnessScore} 分` : '—'}</Descriptions.Item>
              <Descriptions.Item label="吸濕">{result.moistureScore != null ? `${result.moistureScore} 分` : '—'}</Descriptions.Item>
              <Descriptions.Item label="其他評分項目">{result.otherScoreName || '—'}</Descriptions.Item>
              <Descriptions.Item label="其他分數">{result.otherScore != null ? `${result.otherScore} 分` : '—'}</Descriptions.Item>
              <Descriptions.Item label="記錄時間" span={2}>
                {dayjs(result.updatedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="結果說明" span={2}>{result.description || '—'}</Descriptions.Item>
              <Descriptions.Item label="實驗心得" span={2}>{result.reflection || '—'}</Descriptions.Item>
              <Descriptions.Item label="問題紀錄" span={2}>{result.issueRecord || '—'}</Descriptions.Item>
              <Descriptions.Item label="異常原因">
                {result.abnormalReason ? <Tag color="red">{result.abnormalReason}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="客戶回饋結果">
                {result.clientFeedbackResult
                  ? <Tag color={result.clientFeedbackResult === '通過' ? 'green' : 'red'}>{result.clientFeedbackResult}</Tag>
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="改善建議" span={2}>{result.improvement || '—'}</Descriptions.Item>
              <Descriptions.Item label="改善措施建議" span={2}>
                {result.improvementAction ? <Tag color="blue">{result.improvementAction}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="客戶回饋備註" span={2}>{result.clientFeedback || '—'}</Descriptions.Item>
              <Descriptions.Item label="備註" span={2}>{result.notes || '—'}</Descriptions.Item>
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
            <Form.Item name="score" label="總評分（0–100）">
              <InputNumber min={0} max={100} style={{ width: 160 }} placeholder="例：85" />
            </Form.Item>
            <Divider orientation="left" orientationMargin={0}>細項評分（1–10）</Divider>
            <Row gutter={16}>
              {SCORE_DIMS.map((dim) => (
                <Col span={6} key={dim.name}>
                  <Form.Item name={dim.name} label={dim.label}>
                    <Select allowClear options={SCORE_OPTIONS} placeholder="請選擇" />
                  </Form.Item>
                </Col>
              ))}
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="otherScoreName" label="其他評分項目">
                  <Input placeholder="例：柔軟度" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="otherScore" label="其他分數">
                  <Select allowClear options={SCORE_OPTIONS} placeholder="請選擇" />
                </Form.Item>
              </Col>
            </Row>
            <Divider />
            <Form.Item name="description" label="結果說明">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="reflection" label="實驗心得">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item name="issueRecord" label="問題紀錄">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="abnormalReason" label="異常原因">
              <Select allowClear options={abnormalReasonOptions} placeholder="請選擇異常原因" />
            </Form.Item>
            <Form.Item name="improvement" label="改善建議">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="improvementAction" label="改善措施建議">
              <Select allowClear options={improvementActionOptions} placeholder="請選擇改善措施" />
            </Form.Item>
            <Form.Item name="clientFeedback" label="客戶回饋備註">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="clientFeedbackResult" label="客戶回饋結果">
              <Select allowClear options={clientFeedbackResultOptions} placeholder="請選擇" />
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
