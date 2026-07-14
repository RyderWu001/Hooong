import { useEffect, useState } from 'react'
import { Table, Button, Input, Space, Card, DatePicker, Select, Form, Row, Col, message, Badge, Typography, Tag, Modal, Radio, Divider, Descriptions, Upload, Alert, Spin } from 'antd'
import { PlusOutlined, SearchOutlined, ClearOutlined, BarChartOutlined, FileExcelOutlined, FilePdfOutlined, FileSyncOutlined, EditOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getExperiments, createExperiment } from '../../api/experiments'
import { scanCommissionPDF } from '../../api/commissionScan'
import type { ScannedCommission } from '../../api/commissionScan'
import { getResultSummaryReport } from '../../api/reports'
import { getFormulas } from '../../api/formulas'
import { getUsers } from '../../api/auth'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import type { Experiment, Formula, User } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import { exportToExcel } from '../../utils/exportExcel'
import { exportToPdf } from '../../utils/exportPdf'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Text } = Typography

const RESULT_STATUS_LABEL: Record<string, string> = {
  SUCCESS: '成功', FAILED: '失敗', OBSERVING: '待觀察', NEEDS_ADJUST: '需調整',
}

interface Filters {
  code?: string
  formulaId?: number
  experimenterId?: number
  category?: string
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

  const { selectOptions: categoryOptions } = useDropdownOptions('experiment_category')

  const [reportOpen, setReportOpen] = useState(false)
  const [reportType, setReportType] = useState<'experiments' | 'groups' | 'results'>('experiments')
  const [reportLoading, setReportLoading] = useState(false)

  const [scanOpen, setScanOpen] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scannedData, setScannedData] = useState<ScannedCommission | null>(null)
  const [scanForm] = Form.useForm()
  const [scanCreating, setScanCreating] = useState(false)

  const closeScanModal = () => {
    setScanOpen(false)
    setScannedData(null)
    scanForm.resetFields()
  }

  const handleScanUpload = async (file: File) => {
    setScanLoading(true)
    try {
      const res = await scanCommissionPDF(file)
      const d = res.data.data
      setScannedData(d)
      scanForm.setFieldsValue({
        code: d.code ?? '',
        formulaId: formulas[0]?.id ?? undefined,
        commissionType: d.commissionType ?? undefined,
        clientCompany: d.clientCompany ?? '',
        fabricCode: d.fabricCode ?? '',
        clientContact: d.clientContact ?? '',
        experimentDate: d.experimentDate ? dayjs(d.experimentDate) : dayjs(),
        expectedDate: d.expectedDate ? dayjs(d.expectedDate) : undefined,
        actualDate: d.actualDate ? dayjs(d.actualDate) : undefined,
      })
    } catch {
      message.error('PDF 解析失敗，請確認檔案為系統產生的委託單 PDF')
    } finally {
      setScanLoading(false)
    }
    return false
  }

  const handleScanConfirm = async (values: {
    code: string; formulaId?: number; commissionType?: string
    clientCompany?: string; fabricCode?: string; clientContact?: string
    experimentDate?: dayjs.Dayjs; expectedDate?: dayjs.Dayjs; actualDate?: dayjs.Dayjs
  }) => {
    setScanCreating(true)
    try {
      const res = await createExperiment({
        code: values.code,
        formulaId: values.formulaId ?? null,
        experimentDate: values.experimentDate?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD'),
        expectedDate: values.expectedDate?.format('YYYY-MM-DD') ?? null,
        actualDate: values.actualDate?.format('YYYY-MM-DD') ?? null,
        commissionType: values.commissionType ?? null,
        clientCompany: values.clientCompany ?? null,
        fabricCode: values.fabricCode ?? null,
        clientContact: values.clientContact ?? null,
        testItems: scannedData?.testItems ?? [],
        commissionNotes: scannedData?.commissionNotes ?? { waitingForProcessing: false, report: false, cost: null },
        conclusionBefore: scannedData?.conclusionBefore ?? null,
        conclusionAfter: scannedData?.conclusionAfter ?? null,
      })
      const newId = (res.data as any).data?.id
      message.success('委託單已建立！')
      closeScanModal()
      fetchData(filters)
      if (newId) navigate(`/experiments/${newId}`)
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? '建立失敗')
    } finally {
      setScanCreating(false)
    }
  }

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    setReportLoading(true)
    try {
      const allRes = await getExperiments({ ...filters, page: 1, limit: 9999 })
      const experiments = (allRes.data.data ?? []) as Experiment[]
      const fname = `實驗報表_${dayjs().format('YYYYMMDD_HHmm')}`

      if (reportType === 'experiments') {
        const headers = ['實驗編號', '配方', '分類', '實驗人員', '日期', '溫度(°C)', '濕度(%)', '備註']
        const rows = experiments.map((e) => [
          e.code, e.formulaName ?? '', e.category ?? '', e.experimenterName ?? '',
          dayjs(e.experimentDate).format('YYYY-MM-DD'), e.temperature, e.humidity, e.notes,
        ])
        if (format === 'excel') {
          exportToExcel([{ name: '實驗紀錄', headers, rows }], `${fname}.xlsx`)
        } else {
          exportToPdf([{ title: '實驗紀錄清單', headers, rows }], `${fname}.pdf`)
        }
      } else if (reportType === 'groups') {
        const expHeaders = ['實驗編號', '配方', '分類', '實驗人員', '日期', '備註']
        const expRows = experiments.map((e) => [
          e.code, e.formulaName ?? '', e.category ?? '', e.experimenterName ?? '',
          dayjs(e.experimentDate).format('YYYY-MM-DD'), e.notes,
        ])
        const grpHeaders = [
          '實驗編號', '試驗組', '浴比', '起染pH', '終染pH', '加酸方式',
          '升溫速率', '保溫(分)', '均染劑', '修補劑', '氯化鈣', '固色劑', '染料組合', '添加量', '備註',
        ]
        const grpRows = experiments.flatMap((e) =>
          (e.groups ?? []).map((g) => [
            e.code, g.name, g.bathRatio ?? '', g.startPH ?? '', g.endPH ?? '',
            g.acidMethod ?? '', g.tempRate ?? '', g.holdTime ?? '',
            g.leveler ?? '', g.fixer ?? '', g.calciumChloride ?? '',
            g.colorFixative ?? '', g.dyeCombination ?? '', g.dyeAmount ?? '', g.notes,
          ])
        )
        if (format === 'excel') {
          exportToExcel([
            { name: '實驗總覽', headers: expHeaders, rows: expRows },
            { name: '試驗組條件', headers: grpHeaders, rows: grpRows },
          ], `${fname}.xlsx`)
        } else {
          exportToPdf([{ title: '試驗組條件彙整', headers: grpHeaders, rows: grpRows }], `${fname}.pdf`)
        }
      } else {
        const rRes = await getResultSummaryReport({
          dateFrom: filters.dateFrom, dateTo: filters.dateTo,
        })
        const d = rRes.data.data
        const detail: any[] = d.detail ?? []
        const detailHeaders = ['實驗編號', '配方', '實驗人員', '狀態', '手感', '色光', '色牢度', '說明', '改善方案']
        const detailRows = detail.map((r) => [
          r.experimentCode, r.formulaName, r.experimenterName,
          RESULT_STATUS_LABEL[r.status] ?? r.status,
          r.handFeelScore ?? '', r.colorShadeScore ?? '', r.fastnessScore ?? '',
          r.description, r.improvement,
        ])
        if (format === 'excel') {
          exportToExcel([
            { name: '統計摘要', headers: ['項目', '數量'], rows: [
              ['總計', d.total], ['成功', d.successCount], ['失敗', d.failedCount],
              ['待觀察', d.observingCount], ['需調整', d.needsAdjustCount], ['成功率', d.successRate],
            ]},
            { name: '結果明細', headers: detailHeaders, rows: detailRows },
          ], `${fname}.xlsx`)
        } else {
          exportToPdf([{ title: '實驗結果統計報表', headers: detailHeaders, rows: detailRows }], `${fname}.pdf`)
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
    category?: string
    dateRange?: [dayjs.Dayjs, dayjs.Dayjs]
  }) => {
    setFilters({
      code: values.code || undefined,
      formulaId: values.formulaId,
      experimenterId: values.experimenterId,
      category: values.category,
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
    {
      title: '實驗分類',
      dataIndex: 'category',
      key: 'category',
      render: (v: string | null) => v ? <Tag color="blue">{v}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
    },
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
      title: '附件',
      key: 'attachments',
      render: (_: unknown, record: Experiment) =>
        record.attachments?.length > 0
          ? <Badge count={record.attachments.length} color="blue" />
          : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: Experiment) => (
        <Button size="small" onClick={() => navigate(`/experiments/${record.id}`)}>查看</Button>
      ),
    },
  ]

  const activeFilterCount = [filters.code, filters.formulaId, filters.experimenterId, filters.category, filters.dateFrom].filter(Boolean).length

  return (
    <Card
      title="實驗管理"
      extra={
        <Space>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setReportOpen(true)}
          >
            產出報表
            {activeFilterCount > 0 && <Tag color="blue" style={{ marginLeft: 4 }}>{activeFilterCount} 篩選</Tag>}
          </Button>
          {canCreate && (
            <Button icon={<EditOutlined />} onClick={() => setScanOpen(true)}>
              新增委託實驗
            </Button>
          )}
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/experiments/new')}>
              建立實驗
            </Button>
          )}
        </Space>
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
            <Form.Item name="category" style={{ marginBottom: 0 }}>
              <Select
                placeholder="實驗分類"
                allowClear
                showSearch
                options={categoryOptions}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
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

      {/* 建立委託實驗 Modal */}
      <Modal
        title={<Space><EditOutlined />建立委託實驗</Space>}
        open={scanOpen}
        onCancel={closeScanModal}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form form={scanForm} layout="vertical" onFinish={handleScanConfirm}
          initialValues={{ experimentDate: dayjs() }}
        >
          {/* PDF 掃描區 */}
          {!scannedData ? (
            <Upload
              accept=".pdf"
              multiple={false}
              showUploadList={false}
              beforeUpload={(file) => { handleScanUpload(file); return false }}
              style={{ display: 'block', marginBottom: 16 }}
            >
              <div style={{
                border: '1.5px dashed #2d3f55',
                borderRadius: 8,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                background: 'rgba(59,130,246,0.04)',
              }}>
                {scanLoading
                  ? <Spin size="small" />
                  : <FileSyncOutlined style={{ fontSize: 18, color: '#3b82f6' }} />}
                <div>
                  <div style={{ fontWeight: 500, color: '#94a3b8', lineHeight: 1.4 }}>
                    {scanLoading ? '解析中…' : '掃描委託單 PDF 自動填入'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    點擊選擇或拖曳 PDF，自動辨識表單欄位；也可直接手動填寫下方欄位
                  </div>
                </div>
              </div>
            </Upload>
          ) : (
            <Alert
              type={scannedData.testItems.length > 0 ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
              message={scannedData.testItems.length > 0
                ? `PDF 已解析，識別 ${scannedData.testItems.length} 個測試項目，建立後可於詳情頁自動帶入試驗組`
                : 'PDF 已解析，測試項目未自動識別，建立後請至詳情頁手動補充'}
              action={
                <Upload accept=".pdf" multiple={false} showUploadList={false}
                  beforeUpload={(file) => { handleScanUpload(file); return false }}
                >
                  <Button size="small" loading={scanLoading}>重新掃描</Button>
                </Upload>
              }
            />
          )}

          <Divider style={{ margin: '0 0 16px' }} />

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="code" label="試驗編號" rules={[{ required: true, message: '請輸入試驗編號' }]}>
                <Input placeholder="EXP-XXXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="formulaId" label="配方">
                <Select
                  placeholder="選擇配方（可留空）"
                  allowClear
                  showSearch
                  options={formulas.map(f => ({ value: f.id, label: `${f.code} — ${f.name}` }))}
                  filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientCompany" label="客戶公司名稱">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fabricCode" label="布料代碼">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientContact" label="客戶聯絡人">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="commissionType" label="委託類型">
                <Select allowClear placeholder="K / B / Q / O">
                  <Select.Option value="K">K — R&amp;D 研究開發</Select.Option>
                  <Select.Option value="B">B — Comparison 比較</Select.Option>
                  <Select.Option value="Q">Q — Quality 品質</Select.Option>
                  <Select.Option value="O">O — Other 其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="experimentDate" label="申請日期" rules={[{ required: true, message: '請選擇日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="expectedDate" label="預計完成日">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actualDate" label="實際完成日">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={closeScanModal}>取消</Button>
            <Button type="primary" htmlType="submit" loading={scanCreating}>
              建立實驗
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* 報表 Modal */}
      <Modal
        title={<Space><BarChartOutlined />產出實驗報表</Space>}
        open={reportOpen}
        onCancel={() => setReportOpen(false)}
        footer={null}
        width={520}
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
                <Radio value="experiments">
                  <Space direction="vertical" size={0}>
                    <Text strong>實驗紀錄清單</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>含實驗編號、配方、人員、日期、溫濕度、備註</Text>
                  </Space>
                </Radio>
                <Radio value="groups">
                  <Space direction="vertical" size={0}>
                    <Text strong>試驗組條件彙整</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>含各試驗組染色／助劑／染料條件，Excel 輸出雙分頁</Text>
                  </Space>
                </Radio>
                <Radio value="results">
                  <Space direction="vertical" size={0}>
                    <Text strong>實驗結果統計</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>含結果狀態、評分、說明，Excel 附統計摘要分頁</Text>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>套用篩選條件</Text>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="日期範圍">
                {filters.dateFrom ? `${filters.dateFrom} ~ ${filters.dateTo ?? ''}` : <Text type="secondary">全部</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="配方">
                {filters.formulaId
                  ? formulas.find((f) => f.id === filters.formulaId)?.name ?? `ID ${filters.formulaId}`
                  : <Text type="secondary">全部</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="實驗人員">
                {filters.experimenterId
                  ? users.find((u) => u.id === filters.experimenterId)?.username ?? `ID ${filters.experimenterId}`
                  : <Text type="secondary">全部</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="分類">
                {filters.category ?? <Text type="secondary">全部</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="目前筆數">
                <Text strong>{total}</Text> 筆（報表將匯出全部符合條件的資料）
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
