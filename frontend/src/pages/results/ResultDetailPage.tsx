import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Card, Form, Input, Select, Button, Space, Tag, Upload,
  Image, Popconfirm, message, Spin, Descriptions, Divider, InputNumber, Row, Col,
  Table, Typography, Checkbox,
} from 'antd'
import { UploadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { getResult, createResult, updateResult, uploadResultAttachment, deleteResultAttachment } from '../../api/results'
import type { ExperimentResult, ResultStatus, Attachment, ScoreItem } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'

const { Text } = Typography

const STATUS_OPTIONS = [
  { value: 'SUCCESS', label: '成功', color: 'green' },
  { value: 'FAILED', label: '失敗', color: 'red' },
  { value: 'OBSERVING', label: '待觀察', color: 'orange' },
  { value: 'NEEDS_ADJUST', label: '需調整', color: 'blue' },
]

const DEFAULT_DIMENSIONS = ['手感', '色澤', '染色牢度', '吸濕', '外觀', '固含量', 'pH', '比重', '黏度', '電導度', 'COD', '機能性']

const ANOMALY_OPTIONS = ['色花', '梯份', '色差', '染料', '染色牢度不合格', '物性不合格', '機能性不合格', '沾汙', '泡沫']

const IMPROVEMENT_ACTIONS = ['延後加酸', '降低升溫速率', '增加助劑量', '調整染料配比', '延長保溫時間', '降低染色溫度']

function calcOkng(confirmed: number | null, standard: number | null): 'OK' | 'NG' | null {
  if (confirmed == null || standard == null) return null
  return confirmed >= standard ? 'OK' : 'NG'
}

// ── 評分表格（檢視用）────────────────────────────────────────────────────────

function ScoreTable({ items }: { items: ScoreItem[] }) {
  const columns = [
    { title: '評估項目', dataIndex: 'dimension', key: 'dimension', width: 120 },
    { title: '量測值', dataIndex: 'actualValue', key: 'actualValue', width: 100,
      render: (v: number | null) => v != null ? v : '—' },
    { title: '確認值', dataIndex: 'confirmedValue', key: 'confirmedValue', width: 100,
      render: (v: number | null) => v != null ? v : '—' },
    { title: '標準值', dataIndex: 'standardValue', key: 'standardValue', width: 100,
      render: (v: number | null) => v != null ? v : '—' },
    {
      title: 'OK/NG',
      key: 'okng',
      width: 80,
      render: (_: unknown, r: ScoreItem) => {
        const result = r.okng ?? calcOkng(r.confirmedValue, r.standardValue)
        if (!result) return '—'
        return <Tag color={result === 'OK' ? 'success' : 'error'}>{result}</Tag>
      },
    },
  ]
  return (
    <Table
      rowKey="dimension"
      dataSource={items}
      columns={columns}
      pagination={false}
      size="small"
      summary={() => {
        const total = items.length
        const okCount = items.filter((i) => (i.okng ?? calcOkng(i.confirmedValue, i.standardValue)) === 'OK').length
        const ngCount = items.filter((i) => (i.okng ?? calcOkng(i.confirmedValue, i.standardValue)) === 'NG').length
        return (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={4}>
              <Text type="secondary">合計 {total} 項</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4}>
              <Space size={4}>
                <Tag color="success">OK {okCount}</Tag>
                {ngCount > 0 && <Tag color="error">NG {ngCount}</Tag>}
              </Space>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )
      }}
    />
  )
}

// ── 評分表格（編輯用）────────────────────────────────────────────────────────

function ScoreEditor({
  value,
  onChange,
}: {
  value: ScoreItem[]
  onChange: (items: ScoreItem[]) => void
}) {
  const update = (idx: number, field: keyof ScoreItem, val: number | string | null) => {
    const next = value.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      if (field === 'confirmedValue' || field === 'standardValue') {
        updated.okng = calcOkng(
          field === 'confirmedValue' ? (val as number | null) : item.confirmedValue,
          field === 'standardValue' ? (val as number | null) : item.standardValue,
        )
      }
      return updated
    })
    onChange(next)
  }

  const addRow = () => {
    onChange([...value, { dimension: '', actualValue: null, confirmedValue: null, standardValue: null, okng: null }])
  }

  const removeRow = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {value.map((item, idx) => (
        <Card key={idx} size="small" style={{ background: '#fafafa' }}>
          <Row gutter={8} align="middle">
            <Col flex="120px">
              <Input
                size="small"
                placeholder="評估項目"
                value={item.dimension}
                onChange={(e) => update(idx, 'dimension', e.target.value)}
              />
            </Col>
            <Col flex="90px">
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                placeholder="量測值"
                value={item.actualValue}
                onChange={(v) => update(idx, 'actualValue', v)}
              />
            </Col>
            <Col flex="90px">
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                placeholder="確認值"
                value={item.confirmedValue}
                onChange={(v) => update(idx, 'confirmedValue', v)}
              />
            </Col>
            <Col flex="90px">
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                placeholder="標準值"
                value={item.standardValue}
                onChange={(v) => update(idx, 'standardValue', v)}
              />
            </Col>
            <Col flex="60px">
              {(() => {
                const result = item.okng ?? calcOkng(item.confirmedValue, item.standardValue)
                return result ? <Tag color={result === 'OK' ? 'success' : 'error'}>{result}</Tag> : <Text type="secondary">—</Text>
              })()}
            </Col>
            <Col flex="32px">
              <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={() => removeRow(idx)} />
            </Col>
          </Row>
        </Card>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={addRow} type="dashed" style={{ width: '100%' }}>
        新增評估項目
      </Button>
    </Space>
  )
}

// ── 主頁面 ────────────────────────────────────────────────────────────────────

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const expId = Number(id)
  const [result, setResult] = useState<ExperimentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scoreItems, setScoreItems] = useState<ScoreItem[]>([])
  const [form] = Form.useForm()


  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'

  const reload = async () => {
    try {
      const res = await getResult(expId)
      const data = res.data.data
      setResult(data)
      form.setFieldsValue(data)
      setScoreItems(data.scoreItems ?? DEFAULT_DIMENSIONS.map((d) => ({
        dimension: d, actualValue: null, confirmedValue: null, standardValue: null, okng: null,
      })))
    } catch {
      setResult(null)
      setEditing(true)
      setScoreItems(DEFAULT_DIMENSIONS.map((d) => ({
        dimension: d, actualValue: null, confirmedValue: null, standardValue: null, okng: null,
      })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [id])

  const handleSave = async (values: Partial<ExperimentResult>) => {
    setSaving(true)
    try {
      const payload = { ...values, scoreItems }
      if (result) {
        await updateResult(expId, payload)
        message.success('已更新')
      } else {
        await createResult(expId, payload as Parameters<typeof createResult>[1])
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

  const statusColor = (s: ResultStatus) => STATUS_OPTIONS.find((o) => o.value === s)?.color ?? 'default'
  const statusLabel = (s: ResultStatus) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s

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
              <Descriptions.Item label="記錄時間" span={2}>
                {dayjs(result.updatedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="結果說明" span={2}>{result.description || '—'}</Descriptions.Item>
              <Descriptions.Item label="實驗心得" span={2}>{result.reflection || '—'}</Descriptions.Item>
              <Descriptions.Item label="問題紀錄" span={2}>{result.issueRecord || '—'}</Descriptions.Item>
              <Descriptions.Item label="異常類型" span={2}>
                {(result.anomalyTypes && result.anomalyTypes.length > 0)
                  ? <Space wrap>{result.anomalyTypes.map((t: string) => <Tag key={t} color="red">{t}</Tag>)}</Space>
                  : result.abnormalReason ? <Tag color="red">{result.abnormalReason}</Tag> : '—'}
              </Descriptions.Item>
              {result.anomalyNote && (
                <Descriptions.Item label="異常補充說明" span={2}>{result.anomalyNote}</Descriptions.Item>
              )}
              <Descriptions.Item label="客戶回饋結果">
                {result.clientFeedbackResult
                  ? <Tag color={result.clientFeedbackResult === '通過' ? 'green' : 'red'}>{result.clientFeedbackResult}</Tag>
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="改善建議">{result.improvement || '—'}</Descriptions.Item>
              <Descriptions.Item label="改善措施建議" span={2}>
                {result.improvementAction ? <Tag color="blue">{result.improvementAction}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="客戶回饋備註" span={2}>{result.clientFeedback || '—'}</Descriptions.Item>
              <Descriptions.Item label="備註" span={2}>{result.notes || '—'}</Descriptions.Item>
            </Descriptions>

            {result.scoreItems && result.scoreItems.length > 0 && (
              <>
                <Divider titlePlacement="left">評估項目 OK/NG 判定</Divider>
                <ScoreTable items={result.scoreItems} />
              </>
            )}

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
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="status" label="結果狀態" rules={[{ required: true }]}>
                  <Select options={STATUS_OPTIONS} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="score" label="總評分（0–100）">
                  <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="例：85" />
                </Form.Item>
              </Col>
            </Row>

            <Divider titlePlacement="left" orientationMargin={0}>評估項目 OK/NG 判定表</Divider>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                確認值 ≥ 標準值 → OK，否則 → NG（自動判定）
              </Text>
            </div>
            <Row gutter={8} style={{ marginBottom: 4 }}>
              <Col flex="120px"><Text type="secondary" style={{ fontSize: 12 }}>評估項目</Text></Col>
              <Col flex="90px"><Text type="secondary" style={{ fontSize: 12 }}>量測值</Text></Col>
              <Col flex="90px"><Text type="secondary" style={{ fontSize: 12 }}>確認值</Text></Col>
              <Col flex="90px"><Text type="secondary" style={{ fontSize: 12 }}>標準值</Text></Col>
              <Col flex="60px"><Text type="secondary" style={{ fontSize: 12 }}>判定</Text></Col>
            </Row>
            <ScoreEditor value={scoreItems} onChange={setScoreItems} />

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
            <Form.Item name="anomalyTypes" label="異常加入（可複選）">
              <Checkbox.Group style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                {ANOMALY_OPTIONS.map((o) => (
                  <Checkbox key={o} value={o} style={{ margin: 0 }}>{o}</Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
            <Form.Item name="anomalyNote" label="異常補充說明">
              <Input.TextArea rows={2} placeholder="補充說明異常原因…" />
            </Form.Item>
            <Form.Item name="improvement" label="改善建議">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="improvementAction" label="改善措施建議">
              <Select
                allowClear
                placeholder="請選擇改善措施"
                options={IMPROVEMENT_ACTIONS.map((a) => ({ value: a, label: a }))}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="clientFeedback" label="客戶回饋備註">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Form.Item name="clientFeedbackResult" label="客戶回饋結果">
              <Select allowClear placeholder="請選擇" options={[
                { value: '通過', label: '通過' },
                { value: '不通過', label: '不通過' },
              ]} style={{ width: '100%' }} />
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
