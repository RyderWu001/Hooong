import { useEffect, useState } from 'react'
import {
  Card, Tabs, Button, DatePicker, Space, Statistic, Row, Col,
  Table, Select, Tag, Divider, message,
} from 'antd'
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import {
  getFormulaUsageReport, getResultSummaryReport, getExperimentReport, getCustomReport,
} from '../../api/reports'
import { getFormulas } from '../../api/formulas'
import { getUsers } from '../../api/auth'
import type {
  FormulaUsageReport, ResultSummaryReport, Experiment,
  ExperimentResult, ResultStatus, Formula, User,
} from '../../types'
import { exportToExcel } from '../../utils/exportExcel'
import { exportToPdf } from '../../utils/exportPdf'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker

const STATUS_COLOR: Record<ResultStatus, string> = {
  SUCCESS: 'green', FAILED: 'red', OBSERVING: 'orange', NEEDS_ADJUST: 'blue',
}
const STATUS_LABEL: Record<ResultStatus, string> = {
  SUCCESS: '成功', FAILED: '失敗', OBSERVING: '待觀察', NEEDS_ADJUST: '需調整',
}

interface CommonFilter {
  formulaId?: number
  experimenterId?: number
  status?: ResultStatus
  productType?: string
  dateFrom?: string
  dateTo?: string
}

// ── 共用：日期 + 條件篩選列 ──────────────────────────────────
function FilterBar({
  filters,
  onChange,
  extras,
}: {
  filters: CommonFilter
  onChange: (f: CommonFilter) => void
  extras?: React.ReactNode
}) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} md={8}>
        <RangePicker
          style={{ width: '100%' }}
          placeholder={['開始日期', '結束日期']}
          onChange={(dates) =>
            onChange({
              ...filters,
              dateFrom: dates?.[0]?.format('YYYY-MM-DD') ?? undefined,
              dateTo: dates?.[1]?.format('YYYY-MM-DD') ?? undefined,
            })
          }
        />
      </Col>
      {extras}
    </Row>
  )
}

// ── 共用：各 Tab 的匯出按鈕 ──────────────────────────────────
function ExportButtons({ onExcel, onPdf }: { onExcel: () => void; onPdf: () => void }) {
  return (
    <Space>
      <Button icon={<DownloadOutlined />} onClick={onExcel}>Excel</Button>
      <Button icon={<DownloadOutlined />} onClick={onPdf}>PDF</Button>
    </Space>
  )
}

export default function ReportsPage() {
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [users, setUsers] = useState<User[]>([])

  // 4.1 實驗紀錄
  const [expFilters, setExpFilters] = useState<CommonFilter>({})
  const [expData, setExpData] = useState<Experiment[]>([])
  const [expLoading, setExpLoading] = useState(false)

  // 4.2 配方使用
  const [usageFilters, setUsageFilters] = useState<CommonFilter>({})
  const [usageData, setUsageData] = useState<FormulaUsageReport[]>([])
  const [usageLoading, setUsageLoading] = useState(false)

  // 4.3 實驗結果
  const [resultFilters, setResultFilters] = useState<CommonFilter>({})
  const [resultSummary, setResultSummary] = useState<ResultSummaryReport | null>(null)
  const [resultLoading, setResultLoading] = useState(false)

  // 4.4 條件式查詢
  const [customType, setCustomType] = useState<'experiment' | 'formula' | 'result'>('experiment')
  const [customFilters, setCustomFilters] = useState<CommonFilter>({})
  const [customData, setCustomData] = useState<unknown[]>([])
  const [customLoading, setCustomLoading] = useState(false)

  useEffect(() => {
    getFormulas({ status: 'ACTIVE', limit: 200 }).then((r) => setFormulas(r.data.data ?? []))
    getUsers({ limit: 200 }).then((r) => setUsers(r.data.data ?? []))
  }, [])

  const formulaOptions = formulas.map((f) => ({ value: f.id, label: `${f.name}` }))
  const staffOptions = users
    .filter((u) => u.role === 'LAB_STAFF' || u.role === 'ADMIN')
    .map((u) => ({ value: u.id, label: u.username }))
  const productTypeOptions = [...new Set(formulas.map((f) => f.productType))].map((t) => ({
    value: t, label: t,
  }))

  // ─── 4.1 實驗紀錄 ─────────────────────────────────────────
  const fetchExp = async (f: CommonFilter = expFilters) => {
    setExpLoading(true)
    try {
      const res = await getExperimentReport(f)
      setExpData(res.data.data ?? [])
    } catch { message.error('載入失敗') }
    finally { setExpLoading(false) }
  }

  // ─── 4.2 配方使用 ─────────────────────────────────────────
  const fetchUsage = async (f: CommonFilter = usageFilters) => {
    setUsageLoading(true)
    try {
      const res = await getFormulaUsageReport(f)
      setUsageData(res.data.data ?? [])
    } catch { message.error('載入失敗') }
    finally { setUsageLoading(false) }
  }

  // ─── 4.3 實驗結果 ─────────────────────────────────────────
  const fetchResult = async (f: CommonFilter = resultFilters) => {
    setResultLoading(true)
    try {
      const res = await getResultSummaryReport(f)
      setResultSummary(res.data.data)
    } catch { message.error('載入失敗') }
    finally { setResultLoading(false) }
  }

  // ─── 4.4 條件式查詢 ───────────────────────────────────────
  const fetchCustom = async (f: CommonFilter = customFilters, type = customType) => {
    setCustomLoading(true)
    try {
      const res = await getCustomReport({ ...f, type })
      setCustomData(res.data.data ?? [])
    } catch { message.error('載入失敗') }
    finally { setCustomLoading(false) }
  }

  // ─── 匯出通用 ────────────────────────────────────────────
  const doExport = (format: 'excel' | 'pdf', title: string, headers: string[], rows: (string | number)[][]) => {
    const filename = `${title}_${dayjs().format('YYYYMMDD_HHmm')}`
    if (format === 'excel') {
      exportToExcel([{ name: title, headers, rows }], `${filename}.xlsx`)
    } else {
      exportToPdf([{ title, headers, rows }], `${filename}.pdf`)
    }
    message.success('匯出成功')
  }

  const exportExp = (format: 'excel' | 'pdf') => {
    if (!expData.length) return message.warning('請先查詢資料')
    doExport(format, '實驗紀錄報表',
      ['實驗編號', '配方', '實驗人員', '日期', '溫度(°C)', '濕度(%)', '備註'],
      expData.map((e) => [e.code, e.formulaName ?? '', e.experimenterName ?? '',
        dayjs(e.experimentDate).format('YYYY-MM-DD'), e.temperature, e.humidity, e.notes]),
    )
  }

  const exportUsage = (format: 'excel' | 'pdf') => {
    if (!usageData.length) return message.warning('請先查詢資料')
    doExport(format, '配方使用報表',
      ['配方編號', '配方名稱', '產品類型', '使用次數', '成功', '失敗', '待觀察', '需調整'],
      usageData.map((f) => [f.formulaCode, f.formulaName, f.productType,
        f.usageCount, f.successCount, f.failedCount, f.observingCount, 0]),
    )
  }

  const exportResult = (format: 'excel' | 'pdf') => {
    if (!resultSummary) return message.warning('請先查詢資料')
    const detail = resultSummary.detail ?? []
    if (detail.length) {
      doExport(format, '實驗結果報表',
        ['實驗編號', '配方', '實驗人員', '狀態', '結果說明', '建立日期'],
        detail.map((r) => [r.experimentCode ?? '', r.formulaName ?? '', r.experimenterName ?? '',
          STATUS_LABEL[r.status], r.description, dayjs(r.createdAt).format('YYYY-MM-DD')]),
      )
    } else {
      doExport(format, '實驗結果統計',
        ['項目', '數量'],
        [['總計', resultSummary.total], ['成功', resultSummary.successCount],
         ['失敗', resultSummary.failedCount], ['待觀察', resultSummary.observingCount],
         ['需調整', resultSummary.needsAdjustCount], ['成功率', resultSummary.successRate]],
      )
    }
  }

  const exportCustom = (format: 'excel' | 'pdf') => {
    if (!customData.length) return message.warning('請先查詢資料')
    if (customType === 'experiment') {
      const list = customData as Experiment[]
      doExport(format, '條件式查詢 — 實驗紀錄',
        ['實驗編號', '配方', '實驗人員', '日期', '溫度', '濕度'],
        list.map((e) => [e.code, e.formulaName ?? '', e.experimenterName ?? '',
          dayjs(e.experimentDate).format('YYYY-MM-DD'), e.temperature, e.humidity]),
      )
    } else if (customType === 'formula') {
      const list = customData as FormulaUsageReport[]
      doExport(format, '條件式查詢 — 配方使用',
        ['配方編號', '配方名稱', '產品類型', '使用次數', '成功', '失敗'],
        list.map((f) => [f.formulaCode, f.formulaName, f.productType, f.usageCount, f.successCount, f.failedCount]),
      )
    } else {
      const list = customData as ExperimentResult[]
      doExport(format, '條件式查詢 — 實驗結果',
        ['實驗編號', '配方', '狀態', '結果說明', '建立日期'],
        list.map((r) => [r.experimentCode ?? '', r.formulaName ?? '',
          STATUS_LABEL[r.status], r.description, dayjs(r.createdAt).format('YYYY-MM-DD')]),
      )
    }
  }

  // ─── 欄位定義 ────────────────────────────────────────────
  const expColumns = [
    { title: '實驗編號', dataIndex: 'code', key: 'code' },
    { title: '配方', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '實驗人員', dataIndex: 'experimenterName', key: 'experimenterName' },
    { title: '日期', dataIndex: 'experimentDate', key: 'experimentDate', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    { title: '溫度', dataIndex: 'temperature', key: 'temperature', render: (v: number) => `${v} °C` },
    { title: '濕度', dataIndex: 'humidity', key: 'humidity', render: (v: number) => `${v} %` },
    { title: '備註', dataIndex: 'notes', key: 'notes', ellipsis: true },
  ]

  const usageColumns = [
    { title: '配方編號', dataIndex: 'formulaCode', key: 'formulaCode' },
    { title: '配方名稱', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '產品類型', dataIndex: 'productType', key: 'productType' },
    { title: '使用次數', dataIndex: 'usageCount', key: 'usageCount', sorter: (a: FormulaUsageReport, b: FormulaUsageReport) => a.usageCount - b.usageCount },
    { title: '成功', dataIndex: 'successCount', key: 'successCount', render: (v: number) => <Tag color="green">{v}</Tag> },
    { title: '失敗', dataIndex: 'failedCount', key: 'failedCount', render: (v: number) => <Tag color="red">{v}</Tag> },
    { title: '待觀察', dataIndex: 'observingCount', key: 'observingCount', render: (v: number) => <Tag color="orange">{v}</Tag> },
  ]

  const resultDetailColumns = [
    { title: '實驗編號', dataIndex: 'experimentCode', key: 'experimentCode' },
    { title: '配方', dataIndex: 'formulaName', key: 'formulaName' },
    { title: '實驗人員', dataIndex: 'experimenterName', key: 'experimenterName' },
    { title: '狀態', dataIndex: 'status', key: 'status', render: (s: ResultStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag> },
    { title: '結果說明', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '建立日期', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
  ]

  return (
    <Card title="報表">
      <Tabs
        items={[
          // ──────────────────── 4.1 實驗紀錄 ───────────────────
          {
            key: 'exp',
            label: '4.1 實驗紀錄',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <FilterBar
                  filters={expFilters}
                  onChange={setExpFilters}
                  extras={
                    <>
                      <Col xs={24} sm={12} md={5}>
                        <Select style={{ width: '100%' }} placeholder="配方" allowClear
                          options={formulaOptions}
                          onChange={(v) => setExpFilters((f) => ({ ...f, formulaId: v }))}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={5}>
                        <Select style={{ width: '100%' }} placeholder="實驗人員" allowClear
                          options={staffOptions}
                          onChange={(v) => setExpFilters((f) => ({ ...f, experimenterId: v }))}
                        />
                      </Col>
                      <Col>
                        <Space>
                          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchExp()}>查詢</Button>
                          <ExportButtons onExcel={() => exportExp('excel')} onPdf={() => exportExp('pdf')} />
                        </Space>
                      </Col>
                    </>
                  }
                />
                <Table rowKey="id" loading={expLoading} dataSource={expData} columns={expColumns}
                  pagination={{ showTotal: (t) => `共 ${t} 筆` }} />
              </Space>
            ),
          },

          // ──────────────────── 4.2 配方使用 ───────────────────
          {
            key: 'usage',
            label: '4.2 配方使用',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <FilterBar
                  filters={usageFilters}
                  onChange={setUsageFilters}
                  extras={
                    <>
                      <Col xs={24} sm={12} md={5}>
                        <Select style={{ width: '100%' }} placeholder="配方" allowClear
                          options={formulaOptions}
                          onChange={(v) => setUsageFilters((f) => ({ ...f, formulaId: v }))}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={5}>
                        <Select style={{ width: '100%' }} placeholder="產品類型" allowClear
                          options={productTypeOptions}
                          onChange={(v) => setUsageFilters((f) => ({ ...f, productType: v }))}
                        />
                      </Col>
                      <Col>
                        <Space>
                          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchUsage()}>查詢</Button>
                          <ExportButtons onExcel={() => exportUsage('excel')} onPdf={() => exportUsage('pdf')} />
                        </Space>
                      </Col>
                    </>
                  }
                />
                <Table rowKey="formulaId" loading={usageLoading} dataSource={usageData}
                  columns={usageColumns} pagination={false} />
              </Space>
            ),
          },

          // ──────────────────── 4.3 實驗結果 ───────────────────
          {
            key: 'result',
            label: '4.3 實驗結果',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <FilterBar
                  filters={resultFilters}
                  onChange={setResultFilters}
                  extras={
                    <>
                      <Col xs={24} sm={12} md={4}>
                        <Select style={{ width: '100%' }} placeholder="結果狀態" allowClear
                          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                          onChange={(v) => setResultFilters((f) => ({ ...f, status: v }))}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={4}>
                        <Select style={{ width: '100%' }} placeholder="配方" allowClear
                          options={formulaOptions}
                          onChange={(v) => setResultFilters((f) => ({ ...f, formulaId: v }))}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={4}>
                        <Select style={{ width: '100%' }} placeholder="實驗人員" allowClear
                          options={staffOptions}
                          onChange={(v) => setResultFilters((f) => ({ ...f, experimenterId: v }))}
                        />
                      </Col>
                      <Col>
                        <Space>
                          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchResult()}>查詢</Button>
                          <ExportButtons onExcel={() => exportResult('excel')} onPdf={() => exportResult('pdf')} />
                        </Space>
                      </Col>
                    </>
                  }
                />

                {resultSummary && (
                  <>
                    <Row gutter={16}>
                      {[
                        { title: '總計', value: resultSummary.total },
                        { title: '成功', value: resultSummary.successCount, color: '#3f8600' },
                        { title: '失敗', value: resultSummary.failedCount, color: '#cf1322' },
                        { title: '待觀察', value: resultSummary.observingCount, color: '#d46b08' },
                        { title: '需調整', value: resultSummary.needsAdjustCount, color: '#1677ff' },
                        { title: '成功率', value: resultSummary.successRate },
                      ].map((s) => (
                        <Col key={s.title} xs={12} sm={8} md={4}>
                          <Card size="small">
                            <Statistic title={s.title} value={s.value}
                              valueStyle={s.color ? { color: s.color } : undefined}
                              loading={resultLoading} />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                    {(resultSummary.detail?.length ?? 0) > 0 && (
                      <>
                        <Divider orientation="left">結果明細</Divider>
                        <Table rowKey="id" dataSource={resultSummary.detail}
                          columns={resultDetailColumns}
                          pagination={{ showTotal: (t) => `共 ${t} 筆` }} />
                      </>
                    )}
                  </>
                )}
              </Space>
            ),
          },

          // ──────────────────── 4.4 條件式查詢 ─────────────────
          {
            key: 'custom',
            label: '4.4 條件式查詢',
            children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                  <Col xs={24} sm={12} md={5}>
                    <Select style={{ width: '100%' }} value={customType}
                      onChange={(v) => { setCustomType(v); setCustomData([]) }}
                      options={[
                        { value: 'experiment', label: '實驗紀錄' },
                        { value: 'formula', label: '配方使用' },
                        { value: 'result', label: '實驗結果' },
                      ]}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={7}>
                    <RangePicker style={{ width: '100%' }} placeholder={['開始日期', '結束日期']}
                      onChange={(dates) => setCustomFilters((f) => ({
                        ...f,
                        dateFrom: dates?.[0]?.format('YYYY-MM-DD') ?? undefined,
                        dateTo: dates?.[1]?.format('YYYY-MM-DD') ?? undefined,
                      }))}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={4}>
                    <Select style={{ width: '100%' }} placeholder="配方" allowClear
                      options={formulaOptions}
                      onChange={(v) => setCustomFilters((f) => ({ ...f, formulaId: v }))}
                    />
                  </Col>
                  {customType !== 'formula' && (
                    <Col xs={24} sm={12} md={4}>
                      <Select style={{ width: '100%' }} placeholder="實驗人員" allowClear
                        options={staffOptions}
                        onChange={(v) => setCustomFilters((f) => ({ ...f, experimenterId: v }))}
                      />
                    </Col>
                  )}
                  {customType === 'result' && (
                    <Col xs={24} sm={12} md={4}>
                      <Select style={{ width: '100%' }} placeholder="結果狀態" allowClear
                        options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                        onChange={(v) => setCustomFilters((f) => ({ ...f, status: v }))}
                      />
                    </Col>
                  )}
                  <Col>
                    <Space>
                      <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchCustom()}>查詢</Button>
                      <ExportButtons onExcel={() => exportCustom('excel')} onPdf={() => exportCustom('pdf')} />
                    </Space>
                  </Col>
                </Row>

                {customType === 'experiment' && (
                  <Table rowKey="id" loading={customLoading} dataSource={customData as Experiment[]}
                    columns={expColumns} pagination={{ showTotal: (t) => `共 ${t} 筆` }} />
                )}
                {customType === 'formula' && (
                  <Table rowKey="formulaId" loading={customLoading} dataSource={customData as FormulaUsageReport[]}
                    columns={usageColumns} pagination={false} />
                )}
                {customType === 'result' && (
                  <Table rowKey="id" loading={customLoading} dataSource={customData as ExperimentResult[]}
                    columns={resultDetailColumns} pagination={{ showTotal: (t) => `共 ${t} 筆` }} />
                )}
              </Space>
            ),
          },
        ]}
      />
    </Card>
  )
}
