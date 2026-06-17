import { useEffect, useState } from 'react'
import { Table, Button, Select, Space, Card, Tag, DatePicker, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getResults } from '../../api/results'
import type { ExperimentResult, ResultStatus } from '../../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const STATUS_COLOR: Record<ResultStatus, string> = {
  SUCCESS: 'green', FAILED: 'red', OBSERVING: 'orange', NEEDS_ADJUST: 'blue',
}
const STATUS_LABEL: Record<ResultStatus, string> = {
  SUCCESS: '成功', FAILED: '失敗', OBSERVING: '待觀察', NEEDS_ADJUST: '需調整',
}

export default function ResultListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<ExperimentResult[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<{
    status?: ResultStatus
    dateFrom?: string
    dateTo?: string
    page: number
    limit: number
  }>({ page: 1, limit: 20 })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getResults(filters)
      setData(res.data.data)
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filters])

  const columns = [
    { title: '實驗編號', dataIndex: 'experimentCode', key: 'experimentCode' },
    {
      title: '結果狀態',
      dataIndex: 'status',
      key: 'status',
      render: (s: ResultStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    { title: '結果說明', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '建立時間',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: ExperimentResult) => (
        <Button size="small" onClick={() => navigate(`/experiments/${record.experimentId}/result`)}>
          查看
        </Button>
      ),
    },
  ]

  return (
    <Card title="實驗結果">
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="結果狀態"
          allowClear
          style={{ width: 140 }}
          onChange={(val) => setFilters((f) => ({ ...f, status: val, page: 1 }))}
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
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
