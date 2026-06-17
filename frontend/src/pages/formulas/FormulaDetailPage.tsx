import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Tag, Button, Table, Tabs,
  Space, Timeline, message, Spin,
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { getFormula, getFormulaVersions } from '../../api/formulas'
import type { Formula, FormulaVersion, FormulaStatus } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'

const STATUS_COLOR: Record<FormulaStatus, string> = {
  ACTIVE: 'green', INACTIVE: 'orange', DELETED: 'red',
}
const STATUS_LABEL: Record<FormulaStatus, string> = {
  ACTIVE: '啟用', INACTIVE: '停用', DELETED: '已刪除',
}

export default function FormulaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [formula, setFormula] = useState<Formula | null>(null)
  const [versions, setVersions] = useState<FormulaVersion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getFormula(Number(id)),
      getFormulaVersions(Number(id)),
    ]).then(([fRes, vRes]) => {
      setFormula(fRes.data.data)
      setVersions(vRes.data.data ?? [])
    }).catch(() => message.error('載入失敗'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />
  if (!formula) return null

  const ingredientColumns = [
    { title: '原料名稱', dataIndex: 'ingredientName', key: 'ingredientName' },
    { title: '比例', dataIndex: 'ratio', key: 'ratio' },
    { title: '單位', dataIndex: 'unit', key: 'unit' },
  ]

  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card
        title={`配方詳情 — ${formula.name}`}
        extra={
          canEdit && (
            <Button icon={<EditOutlined />} type="primary" onClick={() => navigate(`/formulas/${id}/edit`)}>
              編輯
            </Button>
          )
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="配方編號">{formula.code}</Descriptions.Item>
          <Descriptions.Item label="版本">v{formula.currentVersion}</Descriptions.Item>
          <Descriptions.Item label="產品類型">{formula.productType}</Descriptions.Item>
          <Descriptions.Item label="狀態">
            <Tag color={STATUS_COLOR[formula.status]}>{STATUS_LABEL[formula.status]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="說明" span={2}>{formula.description}</Descriptions.Item>
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
              key: 'versions',
              label: '版本歷史',
              children: (
                <Timeline
                  items={versions.map((v) => ({
                    children: (
                      <div>
                        <strong>v{v.version}</strong>
                        {' — '}
                        {dayjs(v.createdAt).format('YYYY-MM-DD')}
                        {' · '}
                        {v.createdBy}
                        <br />
                        <span style={{ color: '#666' }}>{v.changeNote}</span>
                      </div>
                    ),
                  }))}
                />
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}
