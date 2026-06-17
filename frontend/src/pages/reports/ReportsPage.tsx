import { useState } from 'react'
import { Card, Tabs, Button, DatePicker, Space, Statistic, Row, Col, Table, Select, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import {
  getFormulaUsageReport, getResultSummaryReport,
  getExperimentReport, exportExcel, exportPdf,
} from '../../api/reports'
import type { FormulaUsageReport, ResultSummaryReport } from '../../types'
import { downloadBlob } from '../../utils/download'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface DateFilter {
  dateFrom?: string
  dateTo?: string
}

export default function ReportsPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>({})
  const [summaryData, setSummaryData] = useState<ResultSummaryReport | null>(null)
  const [usageData, setUsageData] = useState<FormulaUsageReport[]>([])
  const [expData, setExpData] = useState<unknown[]>([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [loadingExp, setLoadingExp] = useState(false)
  const [exportType, setExportType] = useState<'experiment' | 'formula' | 'result'>('experiment')

  const handleDateChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setDateFilter({
      dateFrom: dates?.[0]?.format('YYYY-MM-DD'),
      dateTo: dates?.[1]?.format('YYYY-MM-DD'),
    })
  }

  const fetchSummary = async () => {
    setLoadingSummary(true)
    try {
      const res = await getResultSummaryReport(dateFilter)
      setSummaryData(res.data.data)
    } catch {
      message.error('載入失敗')
    } finally {
      setLoadingSummary(false)
    }
  }

  const fetchUsage = async () => {
    setLoadingUsage(true)
    try {
      const res = await getFormulaUsageReport(dateFilter)
      setUsageData(res.data.data ?? [])
    } catch {
      message.error('載入失敗')
    } finally {
      setLoadingUsage(false)
    }
  }

  const fetchExperiments = async () => {
    setLoadingExp(true)
    try {
      const res = await getExperimentReport(dateFilter)
      setExpData(res.data.data ?? [])
    } catch {
      message.error('載入失敗')
    } finally {
      setLoadingExp(false)
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const params = { ...dateFilter, type: exportType }
      const res = format === 'excel' ? await exportExcel(params) : await exportPdf(params)
      const ext = format === 'excel' ? 'xlsx' : 'pdf'
      downloadBlob(res.data, `report_${exportType}_${dayjs().format('YYYYMMDD')}.${ext}`)
      message.success('匯出成功')
    } catch {
      message.error('匯出失敗')
    }
  }

  const usageColumns = [
    { title: '配方編號', dataIndex: 'formulaCode', key: 'formulaCode' },
    { title: '配方名稱', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '產品類型', dataIndex: 'productType', key: 'productType' },
    { title: '使用次數', dataIndex: 'usageCount', key: 'usageCount' },
    { title: '成功', dataIndex: 'successCount', key: 'successCount' },
    { title: '失敗', dataIndex: 'failedCount', key: 'failedCount' },
    { title: '待觀察', dataIndex: 'observingCount', key: 'observingCount' },
  ]

  const filterBar = (onQuery: () => void) => (
    <Space style={{ marginBottom: 16 }}>
      <RangePicker onChange={(dates) => handleDateChange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
      <Button type="primary" onClick={onQuery}>查詢</Button>
    </Space>
  )

  return (
    <Card title="報表">
      <Tabs
        items={[
          {
            key: 'summary',
            label: '結果統計',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {filterBar(fetchSummary)}
                {summaryData && (
                  <Row gutter={16}>
                    <Col span={4}><Statistic title="總計" value={summaryData.total} loading={loadingSummary} /></Col>
                    <Col span={4}><Statistic title="成功" value={summaryData.successCount} valueStyle={{ color: '#3f8600' }} /></Col>
                    <Col span={4}><Statistic title="失敗" value={summaryData.failedCount} valueStyle={{ color: '#cf1322' }} /></Col>
                    <Col span={4}><Statistic title="待觀察" value={summaryData.observingCount} /></Col>
                    <Col span={4}><Statistic title="需調整" value={summaryData.needsAdjustCount} /></Col>
                    <Col span={4}><Statistic title="成功率" value={summaryData.successRate} /></Col>
                  </Row>
                )}
              </Space>
            ),
          },
          {
            key: 'usage',
            label: '配方使用',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {filterBar(fetchUsage)}
                <Table
                  rowKey="formulaId"
                  loading={loadingUsage}
                  dataSource={usageData}
                  columns={usageColumns}
                  pagination={false}
                />
              </Space>
            ),
          },
          {
            key: 'experiments',
            label: '實驗紀錄',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {filterBar(fetchExperiments)}
                <Table
                  rowKey="id"
                  loading={loadingExp}
                  dataSource={expData as Record<string, unknown>[]}
                  columns={[
                    { title: '實驗編號', dataIndex: 'code', key: 'code' },
                    { title: '配方', dataIndex: 'formulaName', key: 'formulaName' },
                    { title: '實驗人員', dataIndex: 'experimenterName', key: 'experimenterName' },
                    {
                      title: '日期',
                      dataIndex: 'experimentDate',
                      key: 'experimentDate',
                      render: (v: string) => dayjs(v).format('YYYY-MM-DD'),
                    },
                  ]}
                  pagination={false}
                />
              </Space>
            ),
          },
          {
            key: 'export',
            label: '匯出報表',
            children: (
              <Space direction="vertical">
                <Space>
                  <RangePicker onChange={(dates) => handleDateChange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
                  <Select
                    value={exportType}
                    onChange={setExportType}
                    style={{ width: 140 }}
                    options={[
                      { value: 'experiment', label: '實驗紀錄' },
                      { value: 'formula', label: '配方使用' },
                      { value: 'result', label: '實驗結果' },
                    ]}
                  />
                </Space>
                <Space>
                  <Button icon={<DownloadOutlined />} onClick={() => handleExport('excel')}>
                    匯出 Excel
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleExport('pdf')}>
                    匯出 PDF
                  </Button>
                </Space>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )
}
