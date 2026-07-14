import { useEffect, useState } from 'react'
import { Table, Button, Input, Select, Space, Tag, Popconfirm, message, Card, Modal, Radio, Divider, Typography, Descriptions } from 'antd'
import { PlusOutlined, SearchOutlined, BarChartOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getFormulas, deleteFormula } from '../../api/formulas'
import { getFormulaUsageReport } from '../../api/reports'
import type { Formula, FormulaStatus, FormulaUsageReport } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import { exportToExcel } from '../../utils/exportExcel'
import { exportToPdf } from '../../utils/exportPdf'
import dayjs from 'dayjs'

const { Text } = Typography

const STATUS_COLOR: Record<FormulaStatus, string> = {
  DRAFT: 'default',
  REVIEWING: 'gold',
  PUBLISHED: 'green',
  ARCHIVED: 'volcano',
  ACTIVE: 'green',
  INACTIVE: 'orange',
  DELETED: 'red',
}

const STATUS_LABEL: Record<FormulaStatus, string> = {
  DRAFT: '草稿',
  REVIEWING: '審核中',
  PUBLISHED: '已發布',
  ARCHIVED: '已封存',
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
    category?: string
    formulaType?: string
    status?: FormulaStatus
    page: number
    limit: number
  }>({ page: 1, limit: 20 })

  const { selectOptions: categoryOptions } = useDropdownOptions('formula_category')
  const { selectOptions: typeOptions } = useDropdownOptions('formula_type')

  const [reportOpen, setReportOpen] = useState(false)
  const [reportType, setReportType] = useState<'list' | 'usage'>('list')
  const [reportLoading, setReportLoading] = useState(false)

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    setReportLoading(true)
    try {
      const fname = `配方報表_${dayjs().format('YYYYMMDD_HHmm')}`

      if (reportType === 'list') {
        const res = await getFormulas({ ...filters, page: 1, limit: 9999 })
        const allFormulas = (res.data.data ?? []) as Formula[]
        const headers = ['配方編號', '配方名稱', '產品類型', '類別', '類型', '狀態', '版本', '建立日期']
        const rows = allFormulas.map((f) => [
          f.code, f.name, f.productType, f.category ?? '', f.formulaType ?? '',
          STATUS_LABEL[f.status], f.currentVersion,
          dayjs(f.createdAt).format('YYYY-MM-DD'),
        ])
        if (format === 'excel') {
          exportToExcel([{ name: '配方清單', headers, rows }], `${fname}.xlsx`)
        } else {
          exportToPdf([{ title: '配方清單', headers, rows }], `${fname}.pdf`)
        }
      } else {
        const res = await getFormulaUsageReport()
        const usageData = (res.data.data ?? []) as FormulaUsageReport[]
        const headers = ['配方編號', '配方名稱', '產品類型', '使用次數', '成功', '失敗', '待觀察', '需調整']
        const rows = usageData.map((f) => [
          f.formulaCode, f.formulaName, f.productType,
          f.usageCount, f.successCount, f.failedCount,
          f.observingCount, f.needsAdjustCount,
        ])
        if (format === 'excel') {
          exportToExcel([{ name: '配方使用統計', headers, rows }], `${fname}.xlsx`)
        } else {
          exportToPdf([{ title: '配方使用統計', headers, rows }], `${fname}.pdf`)
        }
      }
      message.success('報表匯出成功')
      setReportOpen(false)
    } catch {
      message.error('匯出失敗')
    } finally {
      setReportLoading(false)
    }
  }

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
    { title: '配方編號', dataIndex: 'code', key: 'code', width: 140 },
    { title: '配方名稱', dataIndex: 'name', key: 'name' },
    { title: '類別', dataIndex: 'category', key: 'category', width: 100, render: (v: string) => v ?? '—' },
    { title: '類型', dataIndex: 'formulaType', key: 'formulaType', width: 100, render: (v: string) => v ?? '—' },
    { title: '產品類型', dataIndex: 'productType', key: 'productType' },
    { title: '版本', dataIndex: 'currentVersion', key: 'currentVersion', width: 70 },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (s: FormulaStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
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

  const activeFilterCount = [filters.name, filters.category, filters.formulaType, filters.status].filter(Boolean).length

  return (
    <Card
      title="配方管理"
      extra={
        <Space>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setReportOpen(true)}
          >
            產出報表
            {activeFilterCount > 0 && <Tag color="blue" style={{ marginLeft: 4 }}>{activeFilterCount} 篩選</Tag>}
          </Button>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/formulas/new')}>
              新增配方
            </Button>
          )}
        </Space>
      }
    >
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="配方名稱"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 160 }}
          onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value || undefined, page: 1 }))}
        />
        <Select
          placeholder="配方類別"
          allowClear
          style={{ width: 130 }}
          options={categoryOptions}
          onChange={(val) => setFilters((f) => ({ ...f, category: val, page: 1 }))}
        />
        <Select
          placeholder="配方類型"
          allowClear
          style={{ width: 130 }}
          options={typeOptions}
          onChange={(val) => setFilters((f) => ({ ...f, formulaType: val, page: 1 }))}
        />
        <Select
          placeholder="狀態"
          allowClear
          style={{ width: 110 }}
          onChange={(val) => setFilters((f) => ({ ...f, status: val, page: 1 }))}
          options={[
            { value: 'DRAFT', label: '草稿' },
            { value: 'REVIEWING', label: '審核中' },
            { value: 'PUBLISHED', label: '已發布' },
            { value: 'ARCHIVED', label: '已封存' },
            { value: 'ACTIVE', label: '啟用（舊）' },
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

      {/* 報表 Modal */}
      <Modal
        title={<Space><BarChartOutlined />產出配方報表</Space>}
        open={reportOpen}
        onCancel={() => setReportOpen(false)}
        footer={null}
        width={480}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>報表類型</Text>
            <Radio.Group
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="list">
                  <Space direction="vertical" size={0}>
                    <Text strong>配方清單</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      含配方編號、名稱、產品類型、類別、狀態、版本（套用目前篩選）
                    </Text>
                  </Space>
                </Radio>
                <Radio value="usage">
                  <Space direction="vertical" size={0}>
                    <Text strong>配方使用統計</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      各配方實驗使用次數、成功 / 失敗 / 待觀察 / 需調整筆數（所有配方）
                    </Text>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>套用篩選條件</Text>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="配方名稱">
                {filters.name ?? <Text type="secondary">全部</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="類別">
                {filters.category ?? <Text type="secondary">全部</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="類型">
                {filters.formulaType ?? <Text type="secondary">全部</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="狀態">
                {filters.status ? STATUS_LABEL[filters.status] : <Text type="secondary">全部</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="目前筆數">
                <Text strong>{total}</Text> 筆
                {reportType === 'usage' && <Text type="secondary">（使用統計報表涵蓋所有配方）</Text>}
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          <Space>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              loading={reportLoading}
              onClick={() => handleExportReport('excel')}
            >
              匯出 Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              loading={reportLoading}
              onClick={() => handleExportReport('pdf')}
            >
              匯出 PDF
            </Button>
          </Space>
        </Space>
      </Modal>
    </Card>
  )
}
