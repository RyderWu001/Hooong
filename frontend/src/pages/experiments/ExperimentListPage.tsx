import { useEffect, useState } from 'react'
import { Table, Button, Input, Space, Card, DatePicker, message } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getExperiments } from '../../api/experiments'
import type { Experiment } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

export default function ExperimentListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [data, setData] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<{
    dateFrom?: string
    dateTo?: string
    page: number
    limit: number
  }>({ page: 1, limit: 20 })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getExperiments(filters)
      setData(res.data.data)
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filters])

  const canCreate = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'

  const columns = [
    { title: '實驗編號', dataIndex: 'code', key: 'code' },
    { title: '配方', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '實驗人員', dataIndex: 'experimenterName', key: 'experimenterName' },
    {
      title: '實驗日期',
      dataIndex: 'experimentDate',
      key: 'experimentDate',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '溫度',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (v: number) => `${v} °C`,
    },
    {
      title: '濕度',
      dataIndex: 'humidity',
      key: 'humidity',
      render: (v: number) => `${v} %`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Experiment) => (
        <Button size="small" onClick={() => navigate(`/experiments/${record.id}`)}>查看</Button>
      ),
    },
  ]

  return (
    <Card
      title="實驗管理"
      extra={
        canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/experiments/new')}>
            建立實驗
          </Button>
        )
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜尋實驗編號"
          prefix={<SearchOutlined />}
          allowClear
        />
        <RangePicker
          onChange={(dates) => {
            setFilters((f) => ({
              ...f,
              dateFrom: dates?.[0]?.format('YYYY-MM-DD'),
              dateTo: dates?.[1]?.format('YYYY-MM-DD'),
              page: 1,
            }))
          }}
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
