import { useEffect, useState } from 'react'
import { Form, Input, InputNumber, Button, Card, Select, DatePicker, Space, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { createExperiment } from '../../api/experiments'
import { getFormulas } from '../../api/formulas'
import type { Formula } from '../../types'
import dayjs from 'dayjs'

export default function ExperimentFormPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [formulas, setFormulas] = useState<Formula[]>([])

  useEffect(() => {
    getFormulas({ status: 'ACTIVE', limit: 200 }).then((res) => setFormulas(res.data.data))
  }, [])

  const handleSubmit = async (values: {
    code: string
    formulaId: number
    experimentDate: dayjs.Dayjs
    temperature: number
    humidity: number
    notes: string
  }) => {
    setLoading(true)
    try {
      const res = await createExperiment({
        ...values,
        experimentDate: values.experimentDate.toISOString(),
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
    <Card title="建立實驗紀錄" style={{ maxWidth: 720 }}>
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
