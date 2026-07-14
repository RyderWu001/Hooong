import { useRef, useState } from 'react'
import { Select, Input, Button, Space, Divider, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { SelectProps } from 'antd'
import { useDropdownOptions } from '../hooks/useDropdownOptions'
import { createDropdownOption } from '../api/dropdowns'
import { useAuthStore } from '../stores/authStore'

interface DropdownSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  categoryKey: string
}

export default function DropdownSelect({ categoryKey, onChange, ...rest }: DropdownSelectProps) {
  const { selectOptions, loading, refetch } = useDropdownOptions(categoryKey)
  const { user } = useAuthStore()
  const canAdd = user?.role === 'ADMIN'
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<any>(null)

  const handleAdd = async () => {
    const label = newLabel.trim()
    if (!label) return
    setAdding(true)
    try {
      await createDropdownOption(categoryKey, { value: label, label })
      refetch()
      // 自動選取新增的選項
      onChange?.(label, { value: label, label } as any)
      setNewLabel('')
    } catch {
      message.error('新增失敗')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Select
      {...rest}
      options={selectOptions}
      loading={loading}
      onChange={onChange}
      dropdownRender={(menu) => (
        <>
          {menu}
          {canAdd && (
            <>
              <Divider style={{ margin: '4px 0' }} />
              <Space style={{ padding: '4px 8px 6px' }} size={4}>
                <Input
                  ref={inputRef}
                  size="small"
                  style={{ width: 140 }}
                  placeholder="輸入新選項名稱…"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAdd()
                    }
                  }}
                />
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  loading={adding}
                  onClick={handleAdd}
                  disabled={!newLabel.trim()}
                >
                  新增
                </Button>
              </Space>
            </>
          )}
        </>
      )}
    />
  )
}
