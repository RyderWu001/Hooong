import { useEffect, useState, useRef } from 'react'
import { Table, Button, Input, Select, Card, Tag, DatePicker, Row, Col, message } from 'antd'
import { SearchOutlined, ClearOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getResults } from '../../api/results'
import { getUsers } from '../../api/auth'
import type { ExperimentResult, ResultStatus, User } from '../../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const STATUS_COLOR: Record<ResultStatus, string> = {
  SUCCESS: 'green', FAILED: 'red', OBSERVING: 'orange', NEEDS_ADJUST: 'blue',
}
const STATUS_LABEL: Record<ResultStatus, string> = {
  SUCCESS: '成功', FAILED: '失敗', OBSERVING: '待觀察', NEEDS_ADJUST: '需調整',
}

interface Filters {
  experimentCode?: string
  formulaName?: string
  experimenterId?: number
  status?: ResultStatus
  dateFrom?: string
  dateTo?: string
  page: number
  limit: number
}

const INIT_FILTERS: Filters = { page: 1, limit: 20 }

export default function ResultListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<ExperimentResult[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<Filters>(INIT_FILTERS)
  const [users, setUsers] = useState<User[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getUsers({ limit: 200 }).then((r) => setUsers(r.data.data ?? []))
  }, [])

  useEffect(() => {
    setLoading(true)
    getResults(filters)
      .then((res) => {
        setData(res.data.data)
        setTotal(res.data.pagination?.total ?? 0)
      })
      .catch(() => message.error('載入失敗'))
      .finally(() => setLoading(false))
  }, [filters])

  const setDebounced = (field: 'experimentCode' | 'formulaName', val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, [field]: val || undefined, page: 1 }))
    }, 300)
  }

  const staffOptions = users
    .filter((u) => u.role === 'LAB_STAFF' || u.role === 'ADMIN')
    .map((u) => ({ value: u.id, label: u.username }))

  const columns = [
    {
      title: '實驗編號',
      dataIndex: 'experimentCode',
      key: 'experimentCode',
    },
    {
      title: '配方名稱',
      dataIndex: 'formulaName',
      key: 'formulaName',
    },
    {
      title: '實驗人員',
      dataIndex: 'experimenterName',
      key: 'experimenterName',
    },
    {
      title: '結果狀態',
      dataIndex: 'status',
      key: 'status',
      render: (s: ResultStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: '結果說明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
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
    <Card title="實驗結果查詢">
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={5}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="實驗編號"
            allowClear
            onChange={(e) => setDebounced('experimentCode', e.target.value)}
          />
        </Col>
        <Col xs={24} sm={12} md={5}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="配方名稱"
            allowClear
            onChange={(e) => setDebounced('formulaName', e.target.value)}
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="實驗人員"
            allowClear
            options={staffOptions}
            onChange={(val) => setFilters((f) => ({ ...f, experimenterId: val, page: 1 }))}
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="結果狀態"
            allowClear
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={(val) => setFilters((f) => ({ ...f, status: val, page: 1 }))}
          />
        </Col>
        <Col xs={24} sm={12} md={5}>
          <RangePicker
            style={{ width: '100%' }}
            placeholder={['建立開始', '建立結束']}
            onChange={(dates) =>
              setFilters((f) => ({
                ...f,
                dateFrom: dates?.[0]?.format('YYYY-MM-DD') ?? undefined,
                dateTo: dates?.[1]?.format('YYYY-MM-DD') ?? undefined,
                page: 1,
              }))
            }
          />
        </Col>
        <Col>
          <Button
            icon={<ClearOutlined />}
            onClick={() => setFilters(INIT_FILTERS)}
          >
            清除篩選
          </Button>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        onRow={(record) => ({
          onClick: () => navigate(`/experiments/${record.experimentId}/result`),
          style: { cursor: 'pointer' },
        })}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total,
          showTotal: (t) => `共 ${t} 筆`,
          onChange: (page, limit) => setFilters((f) => ({ ...f, page, limit })),
        }}
      />
    </Card>
  )
}
