import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography, message,
} from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import {
  createExperimentTemplate, deleteExperimentTemplate, getExperimentTemplates, updateExperimentTemplate,
} from '../../api/experimentTemplates'
import type { ExperimentTemplate, TemplateField, TemplateFieldType } from '../../types'

const { Title, Text } = Typography

const TYPE_OPTIONS: { value: TemplateFieldType; label: string }[] = [
  { value: 'text', label: '單行文字' },
  { value: 'textarea', label: '多行文字' },
  { value: 'number', label: '數字' },
  { value: 'select', label: '單選' },
  { value: 'multiselect', label: '複選' },
  { value: 'date', label: '日期' },
]

const TYPE_LABEL = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, o.label]))

/** 表單內的欄位資料：showWhen 拆成兩個平面欄位，方便編輯 */
interface FieldFormValue extends Omit<TemplateField, 'showWhen'> {
  whenKey?: string
  whenIn?: string[]
}

interface TemplateFormValue {
  key: string
  name: string
  domain?: string
  description?: string
  fields: FieldFormValue[]
}

const toFormFields = (fields: TemplateField[]): FieldFormValue[] =>
  fields.map(({ showWhen, ...rest }) => ({
    ...rest,
    whenKey: showWhen?.key,
    whenIn: showWhen?.in?.map(String),
  }))

const fromFormFields = (fields: FieldFormValue[] = []): TemplateField[] =>
  fields.map(({ whenKey, whenIn, unit, section, placeholder, options, ...rest }) => ({
    ...rest,
    ...(unit ? { unit } : {}),
    ...(section ? { section } : {}),
    ...(placeholder ? { placeholder } : {}),
    ...(rest.type === 'select' || rest.type === 'multiselect' ? { options: options ?? [] } : {}),
    ...(whenKey && whenIn?.length ? { showWhen: { key: whenKey, in: whenIn } } : {}),
  }))

export default function ExperimentTemplatesPage() {
  const [data, setData] = useState<ExperimentTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [viewing, setViewing] = useState<ExperimentTemplate | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ExperimentTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<TemplateFormValue>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getExperimentTemplates(true)
      setData(res.data.data ?? [])
    } catch {
      message.error('載入範本失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = (source?: ExperimentTemplate) => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue(source
      ? {
        key: `${source.key}_copy`, name: `${source.name}（複本）`, domain: source.domain ?? undefined,
        description: source.description, fields: toFormFields(source.fields),
      }
      : { fields: [{ key: '', label: '', type: 'text' }] })
    setOpen(true)
  }

  const openEdit = (t: ExperimentTemplate) => {
    setEditing(t)
    form.resetFields()
    form.setFieldsValue({
      key: t.key, name: t.name, domain: t.domain ?? undefined,
      description: t.description, fields: toFormFields(t.fields),
    })
    setOpen(true)
  }

  const handleSave = async (values: TemplateFormValue) => {
    setSaving(true)
    try {
      const fields = fromFormFields(values.fields)
      if (editing) {
        await updateExperimentTemplate(editing.id, {
          name: values.name, domain: values.domain ?? null, description: values.description ?? '', fields,
        })
      } else {
        await createExperimentTemplate({
          key: values.key, name: values.name, domain: values.domain ?? null,
          description: values.description ?? '', fields,
        })
      }
      message.success('已儲存')
      setOpen(false)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      message.error(msg ?? '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (t: ExperimentTemplate, isActive: boolean) => {
    try {
      await updateExperimentTemplate(t.id, { isActive })
      load()
    } catch { message.error('操作失敗') }
  }

  const handleDelete = async (t: ExperimentTemplate) => {
    try {
      await deleteExperimentTemplate(t.id)
      message.success('已刪除')
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      message.error(msg ?? '刪除失敗')
    }
  }

  return (
    <Card
      title={<Title level={5} style={{ margin: 0 }}>實驗範本管理</Title>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>新增範本</Button>}
    >
      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message="範本決定各試驗組要記錄哪些實驗條件。不同領域（食品、清潔劑、化工…）可建立各自的範本，不需要修改程式。已被實驗使用的範本請用「停用」取代刪除。"
      />
      <Table<ExperimentTemplate>
        rowKey="id" tableLayout="fixed" scroll={{ x: 950 }} loading={loading} dataSource={data} pagination={false}
        columns={[
          {
            title: '名稱', dataIndex: 'name', width: 280,
            render: (v: string, r) => (
              <Space direction="vertical" size={0}>
                <Space>
                  <Text strong>{v}</Text>
                  {r.isBuiltin && <Tag>內建</Tag>}
                </Space>
                {r.description && <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }} ellipsis={{ rows: 2 }}>{r.description.split('\n')[0].slice(0, 130)}</Typography.Paragraph>}
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setViewing(r)}>查看內容</Button>
              </Space>
            ),
          },
          { title: '代碼', dataIndex: 'key', width: 130, render: (v: string) => <Text ellipsis={{ tooltip: v }} style={{ display: 'block' }}>{v}</Text> },
          { title: '領域', dataIndex: 'domain', width: 120, render: (v: string | null) => v ?? '—' },
          { title: '欄位數', dataIndex: 'fields', width: 80, render: (f: TemplateField[]) => f.length },
          {
            title: '啟用', dataIndex: 'isActive', width: 80,
            render: (v: boolean, r) => <Switch size="small" checked={v} onChange={(c) => handleToggle(r, c)} />,
          },
          {
            title: '操作', key: 'op', width: 170,
            render: (_: unknown, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>編輯</Button>
                <Button size="small" icon={<CopyOutlined />} onClick={() => openCreate(r)}>複製</Button>
                {!r.isBuiltin && (
                  <Popconfirm title="確定刪除此範本？" onConfirm={() => handleDelete(r)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal title={viewing?.name} open={!!viewing} onCancel={() => setViewing(null)} footer={<Button onClick={() => setViewing(null)}>關閉</Button>} width={800}>
        {viewing && <>
          <Tag>{viewing.domain || '未分類'}</Tag><Text type="secondary">{viewing.fields.length} 個欄位</Text>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{viewing.description}</Typography.Paragraph>
          <Table<TemplateField> rowKey="key" size="small" pagination={false} dataSource={viewing.fields} columns={[
            { title: '分類', dataIndex: 'section', width: 120 }, { title: '欄位', dataIndex: 'label', width: 160 },
            { title: '單位', dataIndex: 'unit', width: 80 }, { title: '填寫建議', dataIndex: 'placeholder' },
          ]} />
        </>}
      </Modal>
      <Modal
        title={editing ? `編輯範本：${editing.name}` : '新增範本'}
        open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()}
        confirmLoading={saving} destroyOnHidden width={820}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 8 }}>
          <Space style={{ width: '100%' }} size={8} align="start">
            <Form.Item
              name="key" label="代碼" style={{ width: 200 }}
              tooltip="建立後不可修改；小寫英數、底線、連字號"
              rules={[{ required: true, pattern: /^[a-z][a-z0-9_-]*$/, message: '小寫英文開頭，可含數字、_、-' }]}
            >
              <Input disabled={!!editing} placeholder="food_dev" />
            </Form.Item>
            <Form.Item name="name" label="範本名稱" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="食品配方開發" />
            </Form.Item>
            <Form.Item name="domain" label="領域" style={{ width: 160 }}>
              <Input placeholder="食品" />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="說明">
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder="這個範本適用的實驗類型" />
          </Form.Item>

          <Text strong>條件欄位</Text>
          <Form.List name="fields">
            {(list, { add, remove }) => (
              <div style={{ marginTop: 8 }}>
                {list.map(({ key, name }) => (
                  <Card key={key} size="small" style={{ marginBottom: 8 }}
                    extra={<Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />}
                  >
                    <Space style={{ width: '100%' }} size={8} align="start" wrap>
                      <Form.Item name={[name, 'label']} label="顯示名稱" rules={[{ required: true }]} style={{ width: 150, marginBottom: 8 }}>
                        <Input placeholder="加熱溫度" />
                      </Form.Item>
                      <Form.Item
                        name={[name, 'key']} label="欄位代碼" style={{ width: 150, marginBottom: 8 }}
                        rules={[{ required: true, pattern: /^[A-Za-z][A-Za-z0-9_]*$/, message: '英文開頭，僅英數與底線' }]}
                      >
                        <Input placeholder="heatTemp" />
                      </Form.Item>
                      <Form.Item name={[name, 'type']} label="類型" rules={[{ required: true }]} style={{ width: 120, marginBottom: 8 }}>
                        <Select options={TYPE_OPTIONS} />
                      </Form.Item>
                      <Form.Item name={[name, 'unit']} label="單位" style={{ width: 90, marginBottom: 8 }}>
                        <Input placeholder="°C" />
                      </Form.Item>
                      <Form.Item name={[name, 'section']} label="分組標題" style={{ width: 130, marginBottom: 8 }}>
                        <Input placeholder="製程條件" />
                      </Form.Item>
                    </Space>
                    <Form.Item noStyle shouldUpdate>
                      {({ getFieldValue }) => {
                        const type = getFieldValue(['fields', name, 'type'])
                        const others = (getFieldValue('fields') as FieldFormValue[] | undefined ?? [])
                          .map((f, i) => ({ f, i }))
                          .filter(({ f, i }) => i !== name && f?.key && f?.label)
                        return (
                          <>
                            {(type === 'select' || type === 'multiselect') && (
                              <Form.Item name={[name, 'options']} label="選項（輸入後按 Enter）" style={{ marginBottom: 8 }}>
                                <Select mode="tags" tokenSeparators={[',', '、']} open={false} placeholder="選項一、選項二…" />
                              </Form.Item>
                            )}
                            <Space size={8} wrap>
                              <Form.Item name={[name, 'whenKey']} label="僅在下列欄位符合時顯示（選填）" style={{ width: 240, marginBottom: 0 }}>
                                <Select
                                  allowClear placeholder="不限制"
                                  options={others.map(({ f }) => ({ value: f.key, label: f.label }))}
                                />
                              </Form.Item>
                              <Form.Item name={[name, 'whenIn']} label="欄位值為" style={{ width: 300, marginBottom: 0 }}>
                                <Select mode="tags" open={false} tokenSeparators={[',', '、']} placeholder="值（可多個）" />
                              </Form.Item>
                            </Space>
                          </>
                        )
                      }}
                    </Form.Item>
                  </Card>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ key: '', label: '', type: 'text' })}>
                  新增欄位
                </Button>
              </div>
            )}
          </Form.List>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
            類型說明：{Object.values(TYPE_LABEL).join('、')}。修改欄位代碼會使既有資料不再顯示該欄位，請謹慎。
          </Text>
        </Form>
      </Modal>
    </Card>
  )
}
