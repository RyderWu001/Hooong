import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Button, Card, Select, DatePicker, Space, message, Divider } from 'antd'
import { useNavigate } from 'react-router-dom'
import { createExperiment } from '../../api/experiments'
import { getFormulas } from '../../api/formulas'
import { useDropdownOptions } from '../../hooks/useDropdownOptions'
import type { Formula } from '../../types'
import dayjs from 'dayjs'

export default function ExperimentFormPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [formulas, setFormulas] = useState<Formula[]>([])

  const { selectOptions: categoryOptions } = useDropdownOptions('experiment_category')
  const { selectOptions: acidMethodOptions } = useDropdownOptions('dyeing_acid_method')

  useEffect(() => {
    getFormulas({ status: 'ACTIVE', limit: 200 }).then((res) => setFormulas(res.data.data))
  }, [])

  const handleSubmit = async (values: {
    code: string
    formulaId: number
    experimentDate: dayjs.Dayjs
    category?: string
    temperature: number
    humidity: number
    dyeingMethod?: string
    acidAddingMethod?: string
    bathRatio?: string
    dyeingTemp?: number
    dyeingTime?: number
    pH?: number
    notes: string
  }) => {
    setLoading(true)
    try {
      const res = await createExperiment({
        ...values,
        experimentDate: values.experimentDate.toISOString(),
        category: values.category ?? null,
        dyeingMethod: values.dyeingMethod ?? null,
        acidAddingMethod: values.acidAddingMethod ?? null,
        bathRatio: values.bathRatio ?? null,
        dyeingTemp: values.dyeingTemp ?? null,
        dyeingTime: values.dyeingTime ?? null,
        pH: values.pH ?? null,
      })
      message.success('實驗已建立')
      navigate(`/experiments/${res.data.data.id}`)
    } catch {
      message.error('建立失敗')
    } finally {
      setLoading(false)
    }
  }

  const formulaOptions = formulas.map((f) => ({
    value: f.id,
    label: `${f.code} — ${f.name}`,
  }))

  return (
    <Card title="建立實驗紀錄" style={{ maxWidth: 800 }}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="code" label="實驗編號" rules={[{ required: true }]}>
          <Input placeholder="EXP-2024-001" />
        </Form.Item>

        <Form.Item name="formulaId" label="使用配方" rules={[{ required: true }]}>
          <Select
            options={formulaOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            placeholder="選擇配方"
          />
        </Form.Item>

        <Form.Item name="category" label="實驗分類">
          <Select
            options={categoryOptions}
            allowClear
            placeholder="選擇實驗分類"
          />
        </Form.Item>

        <Form.Item name="experimentDate" label="實驗日期" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Space>
          <Form.Item name="temperature" label="溫度（°C）" rules={[{ required: true }]}>
            <InputNumber placeholder="25.0" step={0.1} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="humidity" label="濕度（%）" rules={[{ required: true }]}>
            <InputNumber placeholder="60.0" step={0.1} min={0} max={100} style={{ width: 160 }} />
          </Form.Item>
        </Space>

        <Divider orientation="left" style={{ fontSize: 13, color: '#888' }}>染色條件（選填）</Divider>

        <Space wrap>
          <Form.Item name="dyeingMethod" label="染色方式" style={{ marginBottom: 8 }}>
            <Input placeholder="例：浸染、軋染" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="acidAddingMethod" label="加酸方式" style={{ marginBottom: 8 }}>
            <Select
              options={acidMethodOptions}
              allowClear
              placeholder="選擇加酸方式"
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item name="bathRatio" label="浴比" style={{ marginBottom: 8 }}>
            <Input placeholder="例：1:10" style={{ width: 140 }} />
          </Form.Item>
        </Space>

        <Space wrap>
          <Form.Item name="dyeingTemp" label="染色溫度（°C）" style={{ marginBottom: 8 }}>
            <InputNumber step={1} style={{ width: 160 }} placeholder="98" />
          </Form.Item>
          <Form.Item name="dyeingTime" label="染色時間（分鐘）" style={{ marginBottom: 8 }}>
            <InputNumber step={1} min={0} style={{ width: 160 }} placeholder="60" />
          </Form.Item>
          <Form.Item name="pH" label="pH 值" style={{ marginBottom: 8 }}>
            <InputNumber step={0.1} min={0} max={14} style={{ width: 140 }} placeholder="4.5" />
          </Form.Item>
        </Space>

        <Form.Item name="notes" label="備註">
          <Input.TextArea rows={3} />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>建立實驗</Button>
          <Button onClick={() => navigate('/experiments')}>取消</Button>
        </Space>
      </Form>
    </Card>
  )
}
