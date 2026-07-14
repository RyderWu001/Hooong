import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Table, Tag, Button, Space, Input, Select, Drawer,
  Descriptions, Divider, Image, message, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { SearchOutlined, EyeOutlined } from '@ant-design/icons'
import { getSamplesGlobal, getSampleById } from '../../api/samples'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import type { Sample } from '../../types'

export default function SamplesPage() {
  const navigate = useNavigate()
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [drawerSample, setDrawerSample] = useState<Sample | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  const [filters, setFilters] = useState({
    category: undefined as string | undefined,
    status: undefined as string | undefined,
    clientName: '',
    sampleCode: '',
  })

  const { selectOptions: categoryOptions } = useDropdownOptions('sample_category')
  const { selectOptions: statusOptions } = useDropdownOptions('sample_status')

  const fetchSamples = async (p = 1) => {
    setLoading(true)
    try {
      const res = await getSamplesGlobal({
        page: p,
        limit: 20,
        category: filters.category,
        status: filters.status,
        clientName: filters.clientName || undefined,
        sampleCode: filters.sampleCode || undefined,
      })
      setSamples(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSamples(page) }, [page])

  const handleSearch = () => {
    setPage(1)
    fetchSamples(1)
  }

  const handleReset = () => {
    setFilters({ category: undefined, status: undefined, clientName: '', sampleCode: '' })
    setPage(1)
    fetchSamples(1)
  }

  const openDrawer = async (id: number) => {
    setDrawerLoading(true)
    setDrawerSample(null)
    try {
      const res = await getSampleById(id)
      setDrawerSample(res.data.data)
    } catch {
      message.error('載入失敗')
    } finally {
      setDrawerLoading(false)
    }
  }

  const STATUS_COLOR: Record<string, string> = {
    '送樣中': 'blue',
    '確認中': 'orange',
    '通過': 'green',
    '未通過': 'red',
  }

  const columns: ColumnsType<Sample> = [
    {
      title: '樣品編號',
      dataIndex: 'sampleCode',
      key: 'sampleCode',
      render: (v) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: '客戶',
      dataIndex: 'clientName',
      key: 'clientName',
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
      render: (v) => v ? <Tag color="blue">{v}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '屬性',
      dataIndex: 'attribute',
      key: 'attribute',
      render: (v) => v ? <Tag color="cyan">{v}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (v) => v ? <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '所屬實驗',
      dataIndex: 'experimentCode',
      key: 'experimentCode',
      render: (v, row) => (
        <Button type="link" size="small" onClick={() => navigate(`/experiments/${row.experimentId}`)}>
          {v}
        </Button>
      ),
    },
    {
      title: '日期',
      dataIndex: 'sampleDate',
      key: 'sampleDate',
      render: (v: string) => v?.split('T')[0] ?? '—',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, row) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => openDrawer(row.id)}>查看</Button>
      ),
    },
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="樣品管理">
        {/* 搜尋列 */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="樣品編號"
            value={filters.sampleCode}
            onChange={(e) => setFilters((f) => ({ ...f, sampleCode: e.target.value }))}
            style={{ width: 160 }}
            allowClear
          />
          <Input
            placeholder="客戶名稱"
            value={filters.clientName}
            onChange={(e) => setFilters((f) => ({ ...f, clientName: e.target.value }))}
            style={{ width: 160 }}
            allowClear
          />
          <Select
            placeholder="分類"
            options={categoryOptions}
            value={filters.category}
            onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            allowClear
            style={{ width: 140 }}
          />
          <Select
            placeholder="狀態"
            options={statusOptions}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            allowClear
            style={{ width: 140 }}
          />
          <Button icon={<SearchOutlined />} type="primary" onClick={handleSearch}>搜尋</Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>

        <Table
          columns={columns}
          dataSource={samples}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (p) => setPage(p),
            showTotal: (t) => `共 ${t} 筆`,
          }}
        />
      </Card>

      {/* 樣品詳情 Drawer */}
      <Drawer
        title={`樣品 — ${drawerSample?.sampleCode ?? '載入中…'}`}
        open={!!drawerSample || drawerLoading}
        onClose={() => setDrawerSample(null)}
        width={480}
        loading={drawerLoading}
      >
        {drawerSample && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="樣品編號">{drawerSample.sampleCode}</Descriptions.Item>
              {drawerSample.sampleType && (
                <Descriptions.Item label="建立類別"><Tag color="geekblue">{drawerSample.sampleType}</Tag></Descriptions.Item>
              )}
              <Descriptions.Item label="客戶名稱">{drawerSample.clientName || '—'}</Descriptions.Item>
              <Descriptions.Item label="標籤說明">{drawerSample.label || '—'}</Descriptions.Item>
              <Descriptions.Item label="目標原料項目">{drawerSample.targetItem || '—'}</Descriptions.Item>
              <Descriptions.Item label="收樣日期">{drawerSample.sampleDate?.split('T')[0]}</Descriptions.Item>
              {drawerSample.quantity != null && (
                <Descriptions.Item label="數量">{drawerSample.quantity}</Descriptions.Item>
              )}
              <Descriptions.Item label="樣品分類">
                {drawerSample.category ? <Tag color="blue">{drawerSample.category}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="樣品屬性">
                {drawerSample.attribute ? <Tag color="cyan">{drawerSample.attribute}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="產業別">
                {drawerSample.industry ? <Tag color="purple">{drawerSample.industry}</Tag> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="樣品狀態">
                {drawerSample.status
                  ? <Tag color={STATUS_COLOR[drawerSample.status] ?? 'default'}>{drawerSample.status}</Tag>
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="備註">{drawerSample.notes || '—'}</Descriptions.Item>
            </Descriptions>

            {(drawerSample.retentionDate || drawerSample.retentionPeriod || drawerSample.retentionLocation || drawerSample.storageCondition) && (
              <>
                <Divider>留樣管理</Divider>
                <Descriptions bordered column={1} size="small">
                  {drawerSample.retentionDate && (
                    <Descriptions.Item label="留樣日期">{drawerSample.retentionDate.split('T')[0]}</Descriptions.Item>
                  )}
                  {drawerSample.retentionPeriod != null && (
                    <Descriptions.Item label="留樣期限">{drawerSample.retentionPeriod} 天</Descriptions.Item>
                  )}
                  {drawerSample.retentionLocation && (
                    <Descriptions.Item label="留樣位置">{drawerSample.retentionLocation}</Descriptions.Item>
                  )}
                  {drawerSample.storageCondition && (
                    <Descriptions.Item label="保存條件"><Tag>{drawerSample.storageCondition}</Tag></Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}

            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="所屬實驗">
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() => { setDrawerSample(null); navigate(`/experiments/${drawerSample.experimentId}`) }}
                >
                  {drawerSample.experimentCode}
                </Button>
              </Descriptions.Item>
            </Descriptions>

            {drawerSample.photoUrl && (
              <>
                <Divider>照片</Divider>
                <Image src={drawerSample.photoUrl} width={200} />
              </>
            )}
          </Space>
        )}
      </Drawer>
    </Space>
  )
}
