import { useEffect, useState } from 'react'
import {
  Form, Input, Button, Card, Table, InputNumber,
  Select, Space, message, Typography, Divider,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getFormula, createFormula, updateFormula,
  getIngredients,
} from '../../api/formulas'
import type { Ingredient } from '../../types'

interface IngredientRow {
  key: string
  ingredientId?: number
  ratio?: number
  unit?: string
}

export default function FormulaFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [rows, setRows] = useState<IngredientRow[]>([{ key: '1' }])

  useEffect(() => {
    getIngredients({ limit: 200 }).then((res) => setIngredients(res.data.data))
    if (isEdit) {
      getFormula(Number(id)).then((res) => {
        const f = res.data.data
        form.setFieldsValue({
          code: f.code,
          name: f.name,
          productType: f.productType,
          description: f.description,
          changeNote: '',
        })
        setRows(
          f.ingredients.map((i, idx) => ({
            key: String(idx),
            ingredientId: i.ingredientId,
            ratio: i.ratio,
            unit: i.unit,
          }))
        )
      })
    }
  }, [id])

  const addRow = () =>
    setRows((r) => [...r, { key: String(Date.now()) }])

  const removeRow = (key: string) =>
    setRows((r) => r.filter((row) => row.key !== key))

  const updateRow = (key: string, field: keyof IngredientRow, value: unknown) =>
    setRows((r) => r.map((row) => row.key === key ? { ...row, [field]: value } : row))

  const handleSubmit = async (values: {
    code: string; name: string; productType: string
    description: string; changeNote?: string
  }) => {
    const ingList = rows.filter((r) => r.ingredientId && r.ratio && r.unit)
    if (ingList.length === 0) {
      message.warning('請至少加入一項原料')
      return
    }
    setLoading(true)
    try {
      const ingredientPayload = ingList.map((r) => ({
        ingredientId: r.ingredientId!,
        ratio: r.ratio!,
        unit: r.unit!,
      }))
      if (isEdit) {
        await updateFormula(Number(id), {
          name: values.name,
          productType: values.productType,
          description: values.description,
          changeNote: values.changeNote ?? '',
          ingredients: ingredientPayload,
        })
        message.success('配方已更新')
      } else {
        await createFormula({ ...values, ingredients: ingredientPayload })
        message.success('配方已建立')
      }
      navigate('/formulas')
    } catch {
      message.error('儲存失敗')
    } finally {
      setLoading(false)
    }
  }

  const ingredientOptions = ingredients.map((i) => ({ value: i.id, label: `${i.name}（${i.unit}）` }))

  const columns = [
    {
      title: '原料',
      key: 'ingredientId',
      render: (_: unknown, record: IngredientRow) => (
        <Select
          style={{ width: '100%' }}
          options={ingredientOptions}
          value={record.ingredientId}
          onChange={(v) => updateRow(record.key, 'ingredientId', v)}
          placeholder="選擇原料"
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
        />
      ),
    },
    {
      title: '比例',
      key: 'ratio',
      width: 140,
      render: (_: unknown, record: IngredientRow) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          max={100}
          value={record.ratio}
          onChange={(v) => updateRow(record.key, 'ratio', v)}
          placeholder="0.00"
        />
      ),
    },
    {
      title: '單位',
      key: 'unit',
      width: 120,
      render: (_: unknown, record: IngredientRow) => (
        <Input
          value={record.unit}
          onChange={(e) => updateRow(record.key, 'unit', e.target.value)}
          placeholder="%"
        />
      ),
    },
    {
      title: '',
      key: 'del',
      width: 48,
      render: (_: unknown, record: IngredientRow) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeRow(record.key)}
        />
      ),
    },
  ]

  return (
    <Card title={isEdit ? '編輯配方' : '新增配方'}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 800 }}>
        {!isEdit && (
          <Form.Item name="code" label="配方編號" rules={[{ required: true }]}>
            <Input placeholder="F-2024-001" />
          </Form.Item>
        )}
        <Form.Item name="name" label="配方名稱" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="productType" label="產品類型" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="說明">
          <Input.TextArea rows={3} />
        </Form.Item>
        {isEdit && (
          <Form.Item name="changeNote" label="修改備註" rules={[{ required: true, message: '請填寫本次修改說明' }]}>
            <Input.TextArea rows={2} placeholder="說明本次修改內容" />
          </Form.Item>
        )}

        <Divider>配方成分</Divider>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          設定此配方所使用的原料及比例
        </Typography.Text>

        <Table
          rowKey="key"
          dataSource={rows}
          columns={columns}
          pagination={false}
          size="small"
        />
        <Button
          style={{ marginTop: 12 }}
          icon={<PlusOutlined />}
          onClick={addRow}
          type="dashed"
          block
        >
          新增原料
        </Button>

        <Space style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? '儲存變更' : '建立配方'}
          </Button>
          <Button onClick={() => navigate('/formulas')}>取消</Button>
        </Space>
      </Form>
    </Card>
  )
}
