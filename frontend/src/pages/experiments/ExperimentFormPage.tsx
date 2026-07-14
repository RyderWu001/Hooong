import { useEffect, useState } from 'react'
import {
  Form, Input, InputNumber, Button, Card, Select, DatePicker, Space, message,
  Divider, Row, Col, Checkbox, Table, Tag,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { createExperiment } from '../../api/experiments'
import { getFormulas } from '../../api/formulas'
import DropdownSelect from '../../components/DropdownSelect'
import type { Formula, CommissionTestItem } from '../../types'
import dayjs from 'dayjs'

const TEST_PURPOSES = ['ΔE', 'Water repellence', 'Quick dry', 'Wicking', 'Handle', 'Tear Strength', 'Density', 'PH', 'Appearance', 'Other']

const COMMISSION_TYPE_OPTIONS = [
  { value: 'K', label: 'K — R&D 研究開發' },
  { value: 'B', label: 'B — Comparison 對照測試' },
  { value: 'Q', label: 'Q — Replace 替代測試' },
  { value: 'O', label: 'O — Others 其他' },
]

function newTestItem(): CommissionTestItem {
  return { chemicalName: '', lotNo: '', testPurposes: [], description: '', result: '' }
}

export default function ExperimentFormPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [testItems, setTestItems] = useState<CommissionTestItem[]>([newTestItem()])

  useEffect(() => {
    getFormulas({ status: 'ACTIVE', limit: 200 }).then((res) => setFormulas(res.data.data))
    form.setFieldsValue({ experimentDate: dayjs(), temperature: 25.0, humidity: 60.0 })
  }, [])

  const updateItem = (idx: number, field: keyof CommissionTestItem, value: any) => {
    setTestItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  const removeItem = (idx: number) => setTestItems((prev) => prev.filter((_, i) => i !== idx))

  const testItemColumns = [
    {
      title: '化學品名稱',
      key: 'chemicalName',
      width: 130,
      render: (_: unknown, _r: CommissionTestItem, idx: number) => (
        <Input size="small" value={testItems[idx].chemicalName}
          onChange={(e) => updateItem(idx, 'chemicalName', e.target.value)}
          placeholder="化學品名稱" />
      ),
    },
    {
      title: 'Lot No',
      key: 'lotNo',
      width: 110,
      render: (_: unknown, _r: CommissionTestItem, idx: number) => (
        <Input size="small" value={testItems[idx].lotNo}
          onChange={(e) => updateItem(idx, 'lotNo', e.target.value)}
          placeholder="批號" />
      ),
    },
    {
      title: '測試目的',
      key: 'testPurposes',
      render: (_: unknown, _r: CommissionTestItem, idx: number) => (
        <Checkbox.Group
          value={testItems[idx].testPurposes}
          onChange={(vals) => updateItem(idx, 'testPurposes', vals)}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}
        >
          {TEST_PURPOSES.map((p) => (
            <Checkbox key={p} value={p} style={{ margin: 0, fontSize: 12 }}>{p}</Checkbox>
          ))}
        </Checkbox.Group>
      ),
    },
    {
      title: '說明',
      key: 'description',
      width: 130,
      render: (_: unknown, _r: CommissionTestItem, idx: number) => (
        <Input.TextArea size="small" rows={2} value={testItems[idx].description}
          onChange={(e) => updateItem(idx, 'description', e.target.value)}
          placeholder="說明" />
      ),
    },
    {
      title: '結果',
      key: 'result',
      width: 130,
      render: (_: unknown, _r: CommissionTestItem, idx: number) => (
        <Input.TextArea size="small" rows={2} value={testItems[idx].result}
          onChange={(e) => updateItem(idx, 'result', e.target.value)}
          placeholder="結果" />
      ),
    },
    {
      title: '',
      key: 'del',
      width: 36,
      render: (_: unknown, _r: CommissionTestItem, idx: number) => (
        <Button size="small" type="text" danger icon={<DeleteOutlined />}
          onClick={() => removeItem(idx)} />
      ),
    },
  ]

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const hasCommission = !!(values.clientCompany || values.fabricCode || values.clientContact || values.commissionType)
      const res = await createExperiment({
        code: values.code,
        formulaId: values.formulaId ?? null,
        experimentDate: values.experimentDate.toISOString(),
        category: values.category ?? null,
        temperature: values.temperature,
        humidity: values.humidity,
        notes: values.notes ?? '',
        ...(hasCommission ? {
          clientCompany: values.clientCompany ?? null,
          fabricCode: values.fabricCode ?? null,
          clientContact: values.clientContact ?? null,
          commissionType: values.commissionType ?? null,
          expectedDate: values.expectedDate ? values.expectedDate.toISOString() : null,
          actualDate: values.actualDate ? values.actualDate.toISOString() : null,
          testItems: testItems.filter((i) => i.chemicalName || i.testPurposes.length > 0),
          commissionNotes: {
            waitingForProcessing: !!(values.commissionNotes_waiting),
            report: !!(values.commissionNotes_report),
            cost: values.commissionNotes_cost ?? null,
          },
          conclusionBefore: values.conclusionBefore ?? null,
          conclusionAfter: values.conclusionAfter ?? null,
        } : {}),
      })
      message.success('實驗已建立')
      navigate(`/experiments/${res.data.data.id}`)
    } catch {
      message.error('建立失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title="建立實驗紀錄">
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 960 }}>

        {/* ── 基本資訊 ── */}
        <Divider titlePlacement="left">基本資訊</Divider>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="code" label="實驗編號" rules={[{ required: true }]}>
              <Input placeholder="EXP-2025-001" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="category" label="實驗分類">
              <DropdownSelect categoryKey="experiment_category" allowClear placeholder="請選擇分類" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="experimentDate" label="實驗日期" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="formulaId" label="使用配方（選填）">
              <Select
                options={formulas.map((f) => ({ value: f.id, label: `${f.code} — ${f.name}` }))}
                showSearch allowClear
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                placeholder="選擇配方（委託單可不填）"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="temperature" label="溫度（°C）" rules={[{ required: true }]}>
              <InputNumber step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="humidity" label="濕度（%）" rules={[{ required: true }]}>
              <InputNumber step={0.1} min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="notes" label="備註">
          <Input.TextArea rows={2} placeholder="實驗目的、委託說明…" />
        </Form.Item>

        {/* ── 委託單資訊 ── */}
        <Divider titlePlacement="left">
          委託單資訊
          <Tag color="blue" style={{ marginLeft: 8, fontWeight: 'normal' }}>選填</Tag>
        </Divider>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="clientCompany" label="客戶公司名稱">
              <Input placeholder="Tên Cty Khách Hàng" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="clientContact" label="客戶聯絡人">
              <Input placeholder="Người Liên lạc" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="fabricCode" label="布料代碼">
              <Input placeholder="Mã số vải" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="commissionType" label="類型">
              <Select options={COMMISSION_TYPE_OPTIONS} allowClear placeholder="選擇類型" />
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

        {/* 測試項目表 */}
        <Form.Item label="測試項目（化學品 × 測試目的）">
          <Table
            rowKey={(_, idx) => String(idx)}
            dataSource={testItems}
            columns={testItemColumns}
            pagination={false}
            size="small"
            scroll={{ x: 700 }}
          />
          <Button
            style={{ marginTop: 8 }}
            icon={<PlusOutlined />}
            onClick={() => setTestItems((prev) => [...prev, newTestItem()])}
            type="dashed"
            block
            size="small"
          >
            新增化學品行
          </Button>
        </Form.Item>

        {/* 備註 */}
        <Row gutter={12} align="middle">
          <Col>
            <Form.Item name="commissionNotes_waiting" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>待加工</Checkbox>
            </Form.Item>
          </Col>
          <Col>
            <Form.Item name="commissionNotes_report" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Checkbox>報告</Checkbox>
            </Form.Item>
          </Col>
          <Col flex="160px">
            <Form.Item name="commissionNotes_cost" label="成本 (VND)" style={{ marginBottom: 0 }}>
              <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
            </Form.Item>
          </Col>
        </Row>

        <Divider titlePlacement="left">結論</Divider>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="conclusionBefore" label="Before">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="conclusionAfter" label="After">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
        </Row>

        <Space style={{ marginTop: 8 }}>
          <Button type="primary" htmlType="submit" loading={loading}>建立實驗</Button>
          <Button onClick={() => navigate('/experiments')}>取消</Button>
        </Space>
      </Form>
    </Card>
  )
}
