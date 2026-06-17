import { useState } from 'react'
import { Card, Tabs, Button, DatePicker, Space, Statistic, Row, Col, Table, Select, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import {
  getFormulaUsageReport, getResultSummaryReport, getExperimentReport,
} from '../../api/reports'
import type { FormulaUsageReport, ResultSummaryReport, Experiment } from '../../types'
import { exportToExcel } from '../../utils/exportExcel'
import { exportToPdf } from '../../utils/exportPdf'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

interface DateFilter {
  dateFrom?: string
  dateTo?: string
}

type ExportType = 'experiment' | 'formula' | 'result'

export default function ReportsPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>({})
  const [summaryData, setSummaryData] = useState<ResultSummaryReport | null>(null)
  const [usageData, setUsageData] = useState<FormulaUsageReport[]>([])
  const [expData, setExpData] = useState<Experiment[]>([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [loadingExp, setLoadingExp] = useState(false)
  const [exportType, setExportType] = useState<ExportType>('experiment')

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

  // 取得各報表的欄位與資料
  const getExportPayload = async (type: ExportType) => {
    if (type === 'experiment') {
      const res = await getExperimentReport(dateFilter)
      const rows = (res.data.data as Experiment[]).map((e) => [
        e.code,
        e.formulaName ?? '',
        e.experimenterName ?? '',
        dayjs(e.experimentDate).format('YYYY-MM-DD'),
        e.temperature,
        e.humidity,
        e.notes,
      ])
      return {
        title: '實驗紀錄報表',
        headers: ['實驗編號', '配方', '實驗人員', '日期', '溫度(°C)', '濕度(%)', '備註'],
        rows,
      }
    }

    if (type === 'formula') {
      const res = await getFormulaUsageReport(dateFilter)
      const rows = (res.data.data as FormulaUsageReport[]).map((f) => [
        f.formulaCode,
        f.formulaName,
        f.productType,
        f.usageCount,
        f.successCount,
        f.failedCount,
        f.observingCount,
      ])
      return {
        title: '配方使用報表',
        headers: ['配方編號', '配方名稱', '產品類型', '使用次數', '成功', '失敗', '待觀察'],
        rows,
      }
    }

    // result
    const res = await getResultSummaryReport(dateFilter)
    const d = res.data.data as ResultSummaryReport
    return {
      title: '實驗結果統計報表',
      headers: ['項目', '數量'],
      rows: [
        ['總計', d.total],
        ['成功', d.successCount],
        ['失敗', d.failedCount],
        ['待觀察', d.observingCount],
        ['需調整', d.needsAdjustCount],
        ['成功率', d.successRate],
      ],
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const payload = await getExportPayload(exportType)
      const filename = `report_${exportType}_${dayjs().format('YYYYMMDD_HHmm')}`
      if (format === 'excel') {
        exportToExcel([{ name: payload.title, headers: payload.headers, rows: payload.rows }], `${filename}.xlsx`)
      } else {
        exportToPdf([payload], `${filename}.pdf`)
      }
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
                  dataSource={expData}
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
              <Space direction="vertical" size="large">
                <Space>
                  <RangePicker onChange={(dates) => handleDateChange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
                  <Select
                    value={exportType}
                    onChange={setExportType}
                    style={{ width: 140 }}
                    options={[
                      { value: 'experiment', label: '實驗紀錄' },
                      { value: 'formula', label: '配方使用' },
                      { value: 'result', label: '實驗結果統計' },
                    ]}
                  />
                </Space>
                <Space>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('excel')}
                  >
                    匯出 Excel
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleExport('pdf')}
                  >
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
