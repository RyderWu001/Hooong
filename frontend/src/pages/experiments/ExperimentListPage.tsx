import { useEffect, useState, useRef } from 'react'
import { Table, Button, Input, Space, Card, DatePicker, Select, Row, Col, message } from 'antd'
import { PlusOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getExperiments } from '../../api/experiments'
import { getFormulas } from '../../api/formulas'
import { getUsers } from '../../api/auth'
import type { Experiment, Formula, User } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface Filters {
  code?: string
  formulaId?: number
  experimenterId?: number
  dateFrom?: string
  dateTo?: string
  page: number
  limit: number
}

const INIT_FILTERS: Filters = { page: 1, limit: 20 }

export default function ExperimentListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [data, setData] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<Filters>(INIT_FILTERS)
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [users, setUsers] = useState<User[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getFormulas({ status: 'ACTIVE', limit: 200 }).then((r) => setFormulas(r.data.data ?? []))
    getUsers({ limit: 200 }).then((r) => setUsers(r.data.data ?? []))
  }, [])

  useEffect(() => {
    setLoading(true)
    getExperiments(filters)
      .then((res) => {
        setData(res.data.data)
        setTotal(res.data.pagination?.total ?? 0)
      })
      .catch(() => message.error('載入失敗'))
      .finally(() => setLoading(false))
  }, [filters])

  // 文字輸入防抖 300ms
  const setCode = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, code: val || undefined, page: 1 }))
    }, 300)
  }

  const setFormulaId = (val: number | undefined) =>
    setFilters((f) => ({ ...f, formulaId: val, page: 1 }))

  const setExperimenterId = (val: number | undefined) =>
    setFilters((f) => ({ ...f, experimenterId: val, page: 1 }))

  const setDateRange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) =>
    setFilters((f) => ({
      ...f,
      dateFrom: dates?.[0]?.format('YYYY-MM-DD') ?? undefined,
      dateTo: dates?.[1]?.format('YYYY-MM-DD') ?? undefined,
      page: 1,
    }))

  const handleReset = () => setFilters(INIT_FILTERS)

  const canCreate = user?.role === 'ADMIN' || user?.role === 'LAB_STAFF'

  const formulaOptions = formulas.map((f) => ({ value: f.id, label: `${f.code} — ${f.name}` }))
  const staffOptions = users
    .filter((u) => u.role === 'LAB_STAFF' || u.role === 'ADMIN')
    .map((u) => ({ value: u.id, label: u.username }))

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
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="實驗編號"
            allowClear
            onChange={(e) => setCode(e.target.value)}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            style={{ width: '100%' }}
            placeholder="配方"
            allowClear
            showSearch
            options={formulaOptions}
            onChange={setFormulaId}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            style={{ width: '100%' }}
            placeholder="實驗人員"
            allowClear
            options={staffOptions}
            onChange={setExperimenterId}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <RangePicker
            style={{ width: '100%' }}
            placeholder={['開始日期', '結束日期']}
            onChange={setDateRange}
          />
        </Col>
        <Col>
          <Space>
            <Button icon={<ClearOutlined />} onClick={handleReset}>清除篩選</Button>
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
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
