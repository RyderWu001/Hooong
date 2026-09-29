import { Fragment } from 'react'
import { Checkbox, DatePicker, Divider, Form, Input, InputNumber, Select } from 'antd'
import type { FormInstance } from 'antd'
import type { TemplateField } from '../types'
import { isFieldVisible } from '../utils/experimentTemplate'

const CONDITIONS = 'conditions'

/**
 * Form.Item 會把 value / onChange 注入到直接子元件，因此這裡必須接住並往下傳，
 * 否則畫面不會顯示既有值，輸入的內容也不會進入表單。
 */
interface FieldInputProps<V = unknown> {
  field: TemplateField
  value?: V
  onChange?: (value: V) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 值型別隨欄位類型而異（字串／數字／陣列／dayjs）
function FieldInput({ field, value, onChange }: FieldInputProps<any>) {
  switch (field.type) {
    case 'number':
      return <InputNumber style={{ width: '100%' }} suffix={field.unit} placeholder={field.placeholder} value={value} onChange={onChange} />
    case 'textarea':
      return <Input.TextArea rows={2} placeholder={field.placeholder} value={value} onChange={(e) => onChange?.(e.target.value)} />
    case 'select':
      return <Select allowClear placeholder={field.placeholder ?? '請選擇'} value={value} onChange={onChange} options={(field.options ?? []).map((o) => ({ value: o, label: o }))} />
    case 'multiselect':
      return (
        <Checkbox.Group value={value} onChange={onChange} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {(field.options ?? []).map((o) => <Checkbox key={o} value={o} style={{ margin: 0, fontSize: 12 }}>{o}</Checkbox>)}
        </Checkbox.Group>
      )
    case 'date':
      return <DatePicker style={{ width: '100%' }} value={value} onChange={onChange} />
    default:
      return <Input placeholder={field.placeholder} suffix={field.unit} value={value} onChange={(e) => onChange?.(e.target.value)} />
  }
}

/**
 * 依範本欄位動態渲染條件表單。值會放在 Form 的 `conditions.<key>` 下，
 * 提交時整包 values.conditions 直接送給後端。
 */
export default function ConditionFields({ fields, form }: { fields: TemplateField[]; form: FormInstance }) {
  if (fields.length === 0) {
    return <div style={{ color: '#999', fontSize: 12, padding: '4px 0 12px' }}>此範本未定義條件欄位，可於備註記錄條件。</div>
  }
  return (
    <Form.Item noStyle shouldUpdate>
      {() => {
        const values = (form.getFieldValue(CONDITIONS) ?? {}) as Record<string, unknown>
        let lastSection: string | undefined
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 8 }}>
            {fields.filter((f) => isFieldVisible(f, values)).map((f) => {
              const showSection = f.section && f.section !== lastSection
              lastSection = f.section ?? lastSection
              const wide = f.type === 'multiselect' || f.type === 'textarea'
              return (
                <Fragment key={f.key}>
                  {showSection && <Divider titlePlacement="left" plain style={{ fontSize: 12, color: '#888', margin: '4px 0', width: '100%' }}>{f.section}</Divider>}
                  <Form.Item name={[CONDITIONS, f.key]} label={f.label} style={{ flex: wide ? '0 0 100%' : '0 0 calc(50% - 4px)' }}>
                    <FieldInput field={f} />
                  </Form.Item>
                </Fragment>
              )
            })}
          </div>
        )
      }}
    </Form.Item>
  )
}
