import { useEffect, useState } from 'react'
import { Table, Button, Input, Space, Card, DatePicker, Select, Form, Row, Col, message } from 'antd'
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

export default function ExperimentListPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [form] = Form.useForm()
  const [data, setData] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 })
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    getFormulas({ status: 'ACTIVE', limit: 200 }).then((r) => setFormulas(r.data.data ?? []))
    getUsers({ limit: 200 }).then((r) => setUsers(r.data.data ?? []))
  }, [])

  const fetchData = async (f: Filters) => {
    setLoading(true)
    try {
      const res = await getExperiments(f)
      setData(res.data.data)
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(filters) }, [filters])

  const handleSearch = (values: {
    code?: string
    formulaId?: number
    experimenterId?: number
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs]
  }) => {
    setFilters({
      code: values.code || undefined,
      formulaId: values.formulaId,
      experimenterId: values.experimenterId,
      dateFrom: values.dateRange?.[0]?.format('YYYY-MM-DD'),
      dateTo: values.dateRange?.[1]?.format('YYYY-MM-DD'),
      page: 1,
      limit: filters.limit,
    })
  }

  const handleReset = () => {
    form.resetFields()
    setFilters({ page: 1, limit: 20 })
  }

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
      <Form form={form} onFinish={handleSearch} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="code" style={{ marginBottom: 0 }}>
              <Input prefix={<SearchOutlined />} placeholder="實驗編號" allowClear />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="formulaId" style={{ marginBottom: 0 }}>
              <Select
                placeholder="配方"
                allowClear
                showSearch
                options={formulaOptions}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="experimenterId" style={{ marginBottom: 0 }}>
              <Select
                placeholder="實驗人員"
                allowClear
                options={staffOptions}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Form.Item name="dateRange" style={{ marginBottom: 0 }}>
              <RangePicker style={{ width: '100%' }} placeholder={['開始日期', '結束日期']} />
            </Form.Item>
          </Col>
        </Row>
        <Row style={{ marginTop: 8 }}>
          <Col>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查詢
              </Button>
              <Button icon={<ClearOutlined />} onClick={handleReset}>
                清除
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

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
