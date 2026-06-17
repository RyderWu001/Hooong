import { useEffect, useState } from 'react'
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message, Card } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getFormulas, deleteFormula } from '../../api/formulas'
import type { Formula, FormulaStatus } from '../../types'
import { useAuthStore } from '../../stores/authStore'

const STATUS_COLOR: Record<FormulaStatus, string> = {
  ACTIVE: 'green',
  INACTIVE: 'orange',
  DELETED: 'red',
}

const STATUS_LABEL: Record<FormulaStatus, string> = {
  ACTIVE: '啟用',
  INACTIVE: '停用',
  DELETED: '已刪除',
}

export default function FormulaListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [data, setData] = useState<Formula[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<{
    name?: string
    productType?: string
    status?: FormulaStatus
    page: number
    limit: number
  }>({ page: 1, limit: 20 })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getFormulas(filters)
      setData(res.data.data)
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filters])

  const handleDelete = async (id: number) => {
    try {
      await deleteFormula(id)
      message.success('已停用')
      fetchData()
    } catch {
      message.error('操作失敗')
    }
  }

  const canEdit = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'
  const canDelete = user?.role === 'ADMIN'

  const columns = [
    { title: '配方編號', dataIndex: 'code', key: 'code' },
    { title: '配方名稱', dataIndex: 'name', key: 'name' },
    { title: '產品類型', dataIndex: 'productType', key: 'productType' },
    { title: '版本', dataIndex: 'currentVersion', key: 'currentVersion', width: 80 },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (s: FormulaStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Formula) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/formulas/${record.id}`)}>查看</Button>
          {canEdit && (
            <Button size="small" type="primary" onClick={() => navigate(`/formulas/${record.id}/edit`)}>編輯</Button>
          )}
          {canDelete && record.status !== 'DELETED' && (
            <Popconfirm title="確定停用此配方？" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger>停用</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="配方管理"
      extra={
        canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/formulas/new')}>
            新增配方
          </Button>
        )
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="配方名稱"
          prefix={<SearchOutlined />}
          allowClear
          onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value, page: 1 }))}
        />
        <Input
          placeholder="產品類型"
          allowClear
          onChange={(e) => setFilters((f) => ({ ...f, productType: e.target.value, page: 1 }))}
        />
        <Select
          placeholder="狀態"
          allowClear
          style={{ width: 120 }}
          onChange={(val) => setFilters((f) => ({ ...f, status: val, page: 1 }))}
          options={[
            { value: 'ACTIVE', label: '啟用' },
            { value: 'INACTIVE', label: '停用' },
            { value: 'DELETED', label: '已刪除' },
          ]}
        />
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total,
          onChange: (page, limit) => setFilters((f) => ({ ...f, page, limit })),
        }}
      />
    </Card>
  )
}
