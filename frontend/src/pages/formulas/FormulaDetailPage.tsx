import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Button, Table, Tabs,
  Space, Timeline, message, Spin, Modal, Form, Input,
  Statistic, Row, Col, Popconfirm, Typography, Alert,
} from 'antd'
import {
  EditOutlined, CopyOutlined, RocketOutlined, RollbackOutlined,
} from '@ant-design/icons'
import { getFormula, getFormulaVersions, copyFormula, promoteFormula, rollbackFormula, submitFormulaForReview, approveFormula, rejectFormula, archiveFormula } from '../../api/formulas'
import type { Formula, FormulaVersion, FormulaStatus, FormulaIngredient } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'

const STATUS_COLOR: Record<FormulaStatus, string> = {
  DRAFT: 'default', REVIEWING: 'gold', PUBLISHED: 'green', ARCHIVED: 'volcano',
  ACTIVE: 'green', INACTIVE: 'orange', DELETED: 'red',
}
const STATUS_LABEL: Record<FormulaStatus, string> = {
  DRAFT: '草稿', REVIEWING: '審核中', PUBLISHED: '已發布', ARCHIVED: '已封存',
  ACTIVE: '啟用', INACTIVE: '停用', DELETED: '已刪除',
}

export default function FormulaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [formula, setFormula] = useState<Formula | null>(null)
  const [versions, setVersions] = useState<FormulaVersion[]>([])
  const [loading, setLoading] = useState(true)

  const [copyOpen, setCopyOpen] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyForm] = Form.useForm()

  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [rollbackTarget, setRollbackTarget] = useState<FormulaVersion | null>(null)
  const [rollbackLoading, setRollbackLoading] = useState(false)
  const [rollbackForm] = Form.useForm()

  const reload = () => {
    setLoading(true)
    Promise.all([
      getFormula(Number(id)),
      getFormulaVersions(Number(id)),
    ]).then(([fRes, vRes]) => {
      setFormula(fRes.data.data)
      setVersions(vRes.data.data ?? [])
    }).catch(() => message.error('載入失敗'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { reload() }, [id])

  const handleCopy = async (values: { newCode: string; newName?: string }) => {
    setCopyLoading(true)
    try {
      const res = await copyFormula(Number(id), values)
      message.success('配方已複製')
      setCopyOpen(false)
      copyForm.resetFields()
      navigate(`/formulas/${res.data.data.id}`)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? '複製失敗'
      message.error(msg)
    } finally {
      setCopyLoading(false)
    }
  }

  const handlePromote = async () => {
    try {
      await promoteFormula(Number(id))
      message.success('已轉為正式產品配方')
      reload()
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? '操作失敗'
      message.error(msg)
    }
  }

  const handleWorkflow = async (action: 'submit' | 'approve' | 'reject' | 'archive') => {
    try {
      const fnMap = { submit: submitFormulaForReview, approve: approveFormula, reject: rejectFormula, archive: archiveFormula }
      await fnMap[action](Number(id))
      const msgMap = { submit: '已提交審核', approve: '已核准發布', reject: '已退回草稿', archive: '已封存' }
      message.success(msgMap[action])
      reload()
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? '操作失敗'
      message.error(msg)
    }
  }

  const handleRollback = async (values: { changeNote?: string }) => {
    if (!rollbackTarget) return
    setRollbackLoading(true)
    try {
      await rollbackFormula(Number(id), {
        version: rollbackTarget.version,
        changeNote: values.changeNote,
      })
      message.success(`已回滾至 v${rollbackTarget.version}`)
      setRollbackOpen(false)
      rollbackForm.resetFields()
      reload()
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? '回滾失敗'
      message.error(msg)
    } finally {
      setRollbackLoading(false)
    }
  }

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />
  if (!formula) return null

  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'

  // 成本計算
  const withPrice = formula.ingredients.filter((i) => i.unitPrice != null)
  const totalCost = withPrice.reduce((sum, i) => sum + i.ratio * (i.unitPrice ?? 0), 0)
  const costCoverage = formula.ingredients.length > 0
    ? Math.round((withPrice.length / formula.ingredients.length) * 100)
    : 0

  const ingredientColumns = [
    { title: '原料名稱', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '比例', dataIndex: 'ratio', key: 'ratio' },
    { title: '單位', dataIndex: 'unit', key: 'unit' },
    {
      title: '單價(元)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (v: number | null) => v != null ? `${v}` : '—',
    },
  ]

  const costColumns = [
    { title: '原料名稱', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '比例', dataIndex: 'ratio', key: 'ratio', render: (v: number, r: FormulaIngredient) => `${v} ${r.unit}` },
    { title: '單價(元)', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number | null) => v != null ? v : '未設定' },
    {
      title: '成本貢獻',
      key: 'cost',
      render: (_: unknown, r: FormulaIngredient) =>
        r.unitPrice != null
          ? <Typography.Text type="success">{(r.ratio * r.unitPrice).toFixed(2)} 元</Typography.Text>
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card
        title={`配方詳情 — ${formula.name}`}
        extra={
          <Space>
            {canEdit && (
              <>
                <Button icon={<CopyOutlined />} onClick={() => setCopyOpen(true)}>複製</Button>
                {formula.formulaType !== '正式產品' && (
                  <Popconfirm
                    title="確定將此配方轉為正式產品？"
                    description="此操作將建立新版本並標記為正式產品類型"
                    onConfirm={handlePromote}
                  >
                    <Button icon={<RocketOutlined />}>轉正式</Button>
                  </Popconfirm>
                )}
                {/* 審核流程按鈕：依目前狀態顯示對應操作 */}
                {['DRAFT', 'ACTIVE', 'PUBLISHED'].includes(formula.status) && (
                  <Popconfirm title="提交此配方進行審核？" onConfirm={() => handleWorkflow('submit')}>
                    <Button>提交審核</Button>
                  </Popconfirm>
                )}
                {formula.status === 'REVIEWING' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                  <>
                    <Popconfirm title="核准並發布此配方？" onConfirm={() => handleWorkflow('approve')}>
                      <Button type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }}>核准發布</Button>
                    </Popconfirm>
                    <Popconfirm title="退回此配方至草稿？" onConfirm={() => handleWorkflow('reject')}>
                      <Button danger>退回</Button>
                    </Popconfirm>
                  </>
                )}
                {['PUBLISHED', 'ACTIVE'].includes(formula.status) && user?.role === 'ADMIN' && (
                  <Popconfirm title="封存此配方？封存後不可再用於新實驗。" onConfirm={() => handleWorkflow('archive')}>
                    <Button>封存</Button>
                  </Popconfirm>
                )}
                <Button icon={<EditOutlined />} type="primary" onClick={() => navigate(`/formulas/${id}/edit`)}>
                  編輯
                </Button>
              </>
            )}
          </Space>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="配方編號">{formula.code}</Descriptions.Item>
          <Descriptions.Item label="版本">v{formula.currentVersion}</Descriptions.Item>
          <Descriptions.Item label="配方類別">{formula.category ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="配方類型">
            {formula.formulaType
              ? <Tag color={formula.formulaType === '正式產品' ? 'green' : 'blue'}>{formula.formulaType}</Tag>
              : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="產品類型">{formula.productType}</Descriptions.Item>
          <Descriptions.Item label="狀態">
            <Tag color={STATUS_COLOR[formula.status]}>{STATUS_LABEL[formula.status]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="說明" span={2}>{formula.description || '—'}</Descriptions.Item>
          <Descriptions.Item label="建立時間">{dayjs(formula.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="最後修改">{dayjs(formula.updatedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs
          items={[
            {
              key: 'ingredients',
              label: '配方成分',
              children: (
                <Table
                  rowKey="ingredientId"
                  dataSource={formula.ingredients}
                  columns={ingredientColumns}
                  pagination={false}
                  size="small"
                />
              ),
            },
            {
              key: 'cost',
              label: '成本分析',
              children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {costCoverage < 100 && (
                    <Alert
                      type="info"
                      message={`${formula.ingredients.length - withPrice.length} 項原料未設定單價，成本計算不完整（已覆蓋 ${costCoverage}%）`}
                      showIcon
                    />
                  )}
                  <Row gutter={24} style={{ marginBottom: 16 }}>
                    <Col>
                      <Statistic title="估算總成本（元/批）" value={totalCost.toFixed(2)} suffix="元" />
                    </Col>
                    <Col>
                      <Statistic title="原料項數" value={formula.ingredients.length} />
                    </Col>
                    <Col>
                      <Statistic title="單價已設定" value={`${withPrice.length}/${formula.ingredients.length}`} />
                    </Col>
                  </Row>
                  <Table
                    rowKey="ingredientId"
                    dataSource={formula.ingredients}
                    columns={costColumns}
                    pagination={false}
                    size="small"
                    summary={() => (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <Typography.Text strong>合計</Typography.Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          <Typography.Text strong type="success">
                            {totalCost.toFixed(2)} 元
                          </Typography.Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  />
                </Space>
              ),
            },
            {
              key: 'versions',
              label: '版本歷史',
              children: (
                <Timeline
                  items={versions.map((v) => ({
                    children: (
                      <Space direction="vertical" size={2}>
                        <Space>
                          <Typography.Text strong>v{v.version}</Typography.Text>
                          <Typography.Text type="secondary">
                            {dayjs(v.createdAt).format('YYYY-MM-DD HH:mm')} · {v.createdBy}
                          </Typography.Text>
                          {canEdit && v.ingredientsSnapshot && v.ingredientsSnapshot.length > 0 && v.version !== formula.currentVersion && (
                            <Button
                              size="small"
                              icon={<RollbackOutlined />}
                              onClick={() => { setRollbackTarget(v); setRollbackOpen(true) }}
                            >
                              回滾
                            </Button>
                          )}
                        </Space>
                        <Typography.Text style={{ color: '#666' }}>{v.changeNote}</Typography.Text>
                        {v.ingredientsSnapshot && v.ingredientsSnapshot.length > 0 && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {v.ingredientsSnapshot.length} 項成分快照
                          </Typography.Text>
                        )}
                      </Space>
                    ),
                  }))}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 複製配方 Modal */}
      <Modal
        open={copyOpen}
        title={<Space><CopyOutlined />複製配方</Space>}
        onCancel={() => { setCopyOpen(false); copyForm.resetFields() }}
        onOk={() => copyForm.submit()}
        confirmLoading={copyLoading}
        destroyOnHidden
      >
        <Form form={copyForm} layout="vertical" onFinish={handleCopy} style={{ marginTop: 8 }}>
          <Form.Item
            name="newCode"
            label="新配方編號"
            rules={[{ required: true, message: '請輸入新配方編號' }]}
          >
            <Input placeholder={`${formula.code}-COPY`} />
          </Form.Item>
          <Form.Item name="newName" label="新配方名稱">
            <Input placeholder={`${formula.name}（複製）`} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 回滾確認 Modal */}
      <Modal
        open={rollbackOpen}
        title={<Space><RollbackOutlined />回滾至 v{rollbackTarget?.version}</Space>}
        onCancel={() => { setRollbackOpen(false); rollbackForm.resetFields() }}
        onOk={() => rollbackForm.submit()}
        confirmLoading={rollbackLoading}
        destroyOnHidden
      >
        <Alert
          type="warning"
          message={`將以 v${rollbackTarget?.version} 的成分快照建立新版本 v${formula.currentVersion + 1}，目前版本 v${formula.currentVersion} 不會被刪除。`}
          style={{ marginBottom: 16 }}
          showIcon
        />
        <Form form={rollbackForm} layout="vertical" onFinish={handleRollback}>
          <Form.Item name="changeNote" label="備註說明">
            <Input.TextArea rows={2} placeholder={`回滾至 v${rollbackTarget?.version}`} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
