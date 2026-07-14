import { useState } from 'react'
import {
  Card, Tabs, Select, Button, Space, Timeline, Table, Tag, Spin,
  message, Descriptions, Typography, Empty, Statistic, Row, Col,
} from 'antd'
import {
  SearchOutlined, BranchesOutlined, ApartmentOutlined,
  ExperimentOutlined, TeamOutlined, AlertOutlined, TagsOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getFormulaTraceability, getIngredientTraceability } from '../../api/traceability'
import { getFormulas, getIngredients } from '../../api/formulas'
import type { FormulaTraceability, IngredientTraceability, Formula, Ingredient } from '../../types'
import dayjs from 'dayjs'

const { Text } = Typography

const RESULT_COLOR: Record<string, string> = {
  SUCCESS: 'green', FAILED: 'red', OBSERVING: 'orange', NEEDS_ADJUST: 'blue',
}
const RESULT_LABEL: Record<string, string> = {
  SUCCESS: '成功', FAILED: '失敗', OBSERVING: '待觀察', NEEDS_ADJUST: '需調整',
}
const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'default', MEDIUM: 'orange', HIGH: 'red', CRITICAL: 'magenta',
}
const SEVERITY_LABEL: Record<string, string> = {
  LOW: '低', MEDIUM: '中', HIGH: '高', CRITICAL: '緊急',
}
const EVENT_STATUS_COLOR: Record<string, string> = {
  OPEN: 'red', INVESTIGATING: 'orange', RESOLVED: 'green', CLOSED: 'default',
}
const EVENT_STATUS_LABEL: Record<string, string> = {
  OPEN: '開啟', INVESTIGATING: '調查中', RESOLVED: '已解決', CLOSED: '已關閉',
}

export default function TraceabilityPage() {
  const [formulaOptions, setFormulaOptions] = useState<Formula[]>([])
  const [ingredientOptions, setIngredientOptions] = useState<Ingredient[]>([])
  const [selectedFormula, setSelectedFormula] = useState<number | null>(null)
  const [selectedIngredient, setSelectedIngredient] = useState<number | null>(null)
  const [formulaData, setFormulaData] = useState<FormulaTraceability | null>(null)
  const [ingredientData, setIngredientData] = useState<IngredientTraceability | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchFormulaOptions = async () => {
    if (formulaOptions.length > 0) return
    try { const res = await getFormulas({ limit: 200 }); setFormulaOptions(res.data.data ?? []) } catch { }
  }

  const fetchIngredientOptions = async () => {
    if (ingredientOptions.length > 0) return
    try { const res = await getIngredients({ limit: 200 }); setIngredientOptions(res.data.data ?? []) } catch { }
  }

  const handleFormulaSearch = async () => {
    if (!selectedFormula) { message.warning('請選擇配方'); return }
    setLoading(true)
    try { const res = await getFormulaTraceability(selectedFormula); setFormulaData(res.data.data) }
    catch { message.error('載入失敗') } finally { setLoading(false) }
  }

  const handleIngredientSearch = async () => {
    if (!selectedIngredient) { message.warning('請選擇原物料'); return }
    setLoading(true)
    try { const res = await getIngredientTraceability(selectedIngredient); setIngredientData(res.data.data) }
    catch { message.error('載入失敗') } finally { setLoading(false) }
  }

  // ── 配方版本溯源 columns ─────────────────────────────────────
  const expColumns: ColumnsType<FormulaTraceability['experiments'][0]> = [
    { title: '實驗編號', dataIndex: 'code', key: 'code', render: (v) => <Text strong>{v}</Text> },
    { title: '實驗日期', dataIndex: 'experimentDate', key: 'date', render: (v) => dayjs(v).format('YYYY-MM-DD') },
    { title: '實驗者', dataIndex: 'experimenterName', key: 'experimenter' },
    {
      title: '結果', key: 'result',
      render: (_, row) => row.result
        ? <Tag color={RESULT_COLOR[row.result.status]}>{RESULT_LABEL[row.result.status]}{row.result.score != null ? ` ${row.result.score}分` : ''}</Tag>
        : <Text type="secondary">未建立</Text>,
    },
    { title: '樣品數', dataIndex: 'samplesCount', key: 'samples' },
  ]

  // ── 原料追溯 5 個子頁籤 ──────────────────────────────────────
  const ingredientSubTabs = ingredientData ? [
    {
      key: 'formula',
      label: <span><BranchesOutlined /> 反查配方</span>,
      children: (
        <Table
          dataSource={ingredientData.formulaUsage}
          rowKey="formulaId"
          size="small"
          pagination={false}
          locale={{ emptyText: '此原料尚未被任何配方使用' }}
          columns={[
            { title: '配方代碼', dataIndex: 'formulaCode', key: 'code', render: (v) => <Tag color="blue">{v}</Tag> },
            { title: '配方名稱', dataIndex: 'formulaName', key: 'name' },
            { title: '使用比例', key: 'ratio', render: (_, r) => `${r.ratio} ${r.unit}` },
            { title: '使用次數（實驗）', dataIndex: 'experimentCount', key: 'count', render: (v) => <Tag color="geekblue">{v} 次</Tag> },
            {
              title: '配方狀態', dataIndex: 'formulaStatus', key: 'status',
              render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v}</Tag>,
            },
          ]}
        />
      ),
    },
    {
      key: 'client',
      label: <span><TeamOutlined /> 反查產品客戶</span>,
      children: ingredientData.clientUsage.length === 0
        ? <Empty description="尚無客戶樣品出貨紀錄" />
        : (
          <Table
            dataSource={ingredientData.clientUsage}
            rowKey="clientName"
            size="small"
            pagination={false}
            expandable={{
              expandedRowRender: (row) => (
                <Table
                  dataSource={row.samples}
                  rowKey={(r) => r.sampleCode + r.experimentCode}
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '樣品編號', dataIndex: 'sampleCode', key: 'sampleCode' },
                    { title: '實驗編號', dataIndex: 'experimentCode', key: 'expCode' },
                    { title: '使用配方', dataIndex: 'formulaName', key: 'formula' },
                    { title: '出貨日期', dataIndex: 'experimentDate', key: 'date', render: (v) => dayjs(v).format('YYYY-MM-DD') },
                    { title: '樣品狀態', dataIndex: 'status', key: 'status', render: (v) => v ? <Tag>{v}</Tag> : '—' },
                  ]}
                />
              ),
            }}
            columns={[
              { title: '客戶名稱', dataIndex: 'clientName', key: 'client', render: (v) => <Text strong>{v}</Text> },
              { title: '出貨樣品數', dataIndex: 'sampleCount', key: 'count', render: (v) => <Tag color="blue">{v} 件</Tag> },
              {
                title: '使用配方', dataIndex: 'formulaNames', key: 'formulas',
                render: (names: string[]) => names.map((f) => <Tag key={f}>{f}</Tag>),
              },
            ]}
          />
        ),
    },
    {
      key: 'experiment',
      label: <span><ExperimentOutlined /> 實驗分析</span>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={4}>
              <Statistic title="總實驗次數" value={ingredientData.experimentStats.total} suffix="次" />
            </Col>
            <Col span={4}>
              <Statistic
                title="成功次數" value={ingredientData.experimentStats.successCount}
                valueStyle={{ color: '#52c41a' }} suffix="次"
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="失敗次數" value={ingredientData.experimentStats.failedCount}
                valueStyle={{ color: '#ff4d4f' }} suffix="次"
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="待觀察" value={ingredientData.experimentStats.observingCount}
                valueStyle={{ color: '#faad14' }} suffix="次"
              />
            </Col>
            <Col span={4}>
              <Statistic
                title="成功率" value={ingredientData.experimentStats.successRate}
                valueStyle={{ color: '#1677ff' }}
              />
            </Col>
          </Row>
          <Table
            dataSource={ingredientData.experimentStats.experiments}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            columns={[
              { title: '實驗編號', dataIndex: 'code', key: 'code', render: (v) => <Text strong>{v}</Text> },
              { title: '使用配方', dataIndex: 'formulaName', key: 'formula' },
              { title: '實驗日期', dataIndex: 'experimentDate', key: 'date', render: (v) => dayjs(v).format('YYYY-MM-DD') },
              { title: '實驗者', dataIndex: 'experimenterName', key: 'experimenter' },
              {
                title: '結果', dataIndex: 'resultStatus', key: 'result',
                render: (v) => v
                  ? <Tag color={RESULT_COLOR[v]}>{RESULT_LABEL[v]}</Tag>
                  : <Text type="secondary">未建立</Text>,
              },
            ]}
          />
        </Space>
      ),
    },
    {
      key: 'anomaly',
      label: <span><AlertOutlined /> 異常追溯</span>,
      children: ingredientData.anomalyEvents.length === 0
        ? <Empty description="此原料目前無異常事件紀錄" />
        : (
          <Table
            dataSource={ingredientData.anomalyEvents}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            expandable={{
              expandedRowRender: (row) => (
                <Descriptions size="small" column={2} bordered>
                  <Descriptions.Item label="描述" span={2}>{row.description || '—'}</Descriptions.Item>
                  <Descriptions.Item label="處理結果" span={2}>{row.resolution || '—'}</Descriptions.Item>
                  {row.resolvedAt && (
                    <Descriptions.Item label="解決時間">{dayjs(row.resolvedAt).format('YYYY-MM-DD')}</Descriptions.Item>
                  )}
                </Descriptions>
              ),
            }}
            columns={[
              { title: '事件代碼', dataIndex: 'eventCode', key: 'code', render: (v) => <Text code>{v}</Text> },
              { title: '標題', dataIndex: 'title', key: 'title' },
              {
                title: '事件類型', dataIndex: 'eventType', key: 'type',
                render: (v) => {
                  const colorMap: Record<string, string> = { '色差異常': 'orange', '分層異常': 'purple', '沉澱異常': 'cyan', '客訴異常': 'red' }
                  return <Tag color={colorMap[v] ?? 'default'}>{v}</Tag>
                },
              },
              {
                title: '嚴重程度', dataIndex: 'severity', key: 'severity',
                render: (v) => <Tag color={SEVERITY_COLOR[v]}>{SEVERITY_LABEL[v]}</Tag>,
              },
              {
                title: '狀態', dataIndex: 'status', key: 'status',
                render: (v) => <Tag color={EVENT_STATUS_COLOR[v]}>{EVENT_STATUS_LABEL[v]}</Tag>,
              },
              { title: '發生時間', dataIndex: 'occurredAt', key: 'date', render: (v) => dayjs(v).format('YYYY-MM-DD') },
            ]}
          />
        ),
    },
    {
      key: 'batch',
      label: <span><TagsOutlined /> 批號追溯</span>,
      children: ingredientData.batches.length === 0
        ? <Empty description="尚無批次紀錄" />
        : (
          <Table
            dataSource={ingredientData.batches}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10 }}
            columns={[
              { title: '製造批號', dataIndex: 'batchNo', key: 'batchNo', render: (v) => <Text strong code>{v}</Text> },
              { title: '供應商批號', dataIndex: 'supplierBatch', key: 'supplierBatch', render: (v) => v ?? '—' },
              { title: '數量', key: 'qty', render: (_, r: any) => `${r.quantity} ${r.unit}` },
              { title: '狀態', dataIndex: 'status', key: 'status', render: (v) => <Tag>{v}</Tag> },
              { title: '製造日期', dataIndex: 'mfgDate', key: 'mfgDate', render: (v) => v ? dayjs(v).format('YYYY-MM-DD') : '—' },
              { title: '到期日', dataIndex: 'expiryDate', key: 'expiryDate', render: (v) => v ? dayjs(v).format('YYYY-MM-DD') : '—' },
              { title: '備註', dataIndex: 'notes', key: 'notes', ellipsis: true, render: (v) => v || '—' },
            ]}
          />
        ),
    },
  ] : []

  // ── 主頁籤 ───────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'formula',
      label: <span><BranchesOutlined /> 配方版本溯源</span>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Select
              showSearch
              placeholder="選擇配方"
              style={{ width: 320 }}
              options={formulaOptions.map((f) => ({ value: f.id, label: `${f.code} — ${f.name}` }))}
              onFocus={fetchFormulaOptions}
              onChange={(v) => setSelectedFormula(v)}
              filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleFormulaSearch} loading={loading}>
              查詢
            </Button>
          </Space>

          {formulaData && (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card size="small" title="配方基本資訊">
                <Descriptions column={3} size="small">
                  <Descriptions.Item label="配方代碼">{formulaData.formula.code}</Descriptions.Item>
                  <Descriptions.Item label="配方名稱">{formulaData.formula.name}</Descriptions.Item>
                  <Descriptions.Item label="當前版本">v{formulaData.formula.currentVersion}</Descriptions.Item>
                  <Descriptions.Item label="產品類型">{formulaData.formula.productType}</Descriptions.Item>
                  <Descriptions.Item label="狀態"><Tag>{formulaData.formula.status}</Tag></Descriptions.Item>
                  <Descriptions.Item label="建立時間">{dayjs(formulaData.formula.createdAt).format('YYYY-MM-DD')}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card size="small" title={`版本歷史（共 ${formulaData.versions.length} 版）`}>
                {formulaData.versions.length === 0
                  ? <Empty description="無版本紀錄" />
                  : (
                    <Timeline
                      items={formulaData.versions.map((v) => ({
                        color: v.version === formulaData.formula.currentVersion ? 'green' : 'blue',
                        children: (
                          <div>
                            <Space>
                              <Tag color={v.version === formulaData.formula.currentVersion ? 'green' : 'default'}>
                                v{v.version}
                              </Tag>
                              <Text type="secondary">{dayjs(v.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
                              <Text type="secondary">by {v.createdBy}</Text>
                            </Space>
                            {v.changeNote && <div><Text>{v.changeNote}</Text></div>}
                            {v.ingredientsSnapshot && Array.isArray(v.ingredientsSnapshot) && (
                              <div style={{ marginTop: 4 }}>
                                {(v.ingredientsSnapshot as any[]).map((ing: any, i: number) => (
                                  <Tag key={i} style={{ marginBottom: 2 }}>
                                    {ing.ingredientName ?? ing.ingredientId}: {ing.ratio}{ing.unit}
                                  </Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        ),
                      }))}
                    />
                  )}
              </Card>

              <Card size="small" title={`使用此配方的實驗（共 ${formulaData.experiments.length} 筆）`}>
                <Table
                  columns={expColumns}
                  dataSource={formulaData.experiments}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            </Space>
          )}

          {!formulaData && !loading && <Empty description="選擇配方後按查詢，即可查看完整版本歷史與實驗紀錄" />}
          {loading && <Spin style={{ display: 'block', margin: '40px auto' }} />}
        </Space>
      ),
    },
    {
      key: 'ingredient',
      label: <span><ApartmentOutlined /> 原料追溯分析</span>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Select
              showSearch
              placeholder="選擇原物料"
              style={{ width: 320 }}
              options={ingredientOptions.map((i) => ({ value: i.id, label: `${i.code ?? i.id} — ${i.name}` }))}
              onFocus={fetchIngredientOptions}
              onChange={(v) => { setSelectedIngredient(v); setIngredientData(null) }}
              filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleIngredientSearch} loading={loading}>
              追溯
            </Button>
          </Space>

          {ingredientData && (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card size="small" title="原物料資訊">
                <Descriptions column={4} size="small">
                  <Descriptions.Item label="名稱">{ingredientData.ingredient.name}</Descriptions.Item>
                  <Descriptions.Item label="代碼">{ingredientData.ingredient.code ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="單位">{ingredientData.ingredient.unit}</Descriptions.Item>
                  <Descriptions.Item label="狀態"><Tag>{ingredientData.ingredient.status}</Tag></Descriptions.Item>
                </Descriptions>
              </Card>

              <Tabs items={ingredientSubTabs} type="card" size="small" />
            </Space>
          )}

          {!ingredientData && !loading && <Empty description="選擇原物料後按追溯，查看反查配方、客戶、實驗分析、異常紀錄與批號" />}
          {loading && <Spin style={{ display: 'block', margin: '40px auto' }} />}
        </Space>
      ),
    },
  ]

  return (
    <Card title="溯源管理">
      <Tabs items={tabItems} />
    </Card>
  )
}
