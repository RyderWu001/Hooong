import client from './client'

export interface DropdownOption {
  id: number
  categoryId: number
  value: string
  label: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

export interface DropdownCategory {
  id: number
  key: string
  label: string
  options: DropdownOption[]
}

// 取得所有類別與選項（管理用）
export const getAllDropdowns = () =>
  client.get<{ success: boolean; data: DropdownCategory[] }>('/dropdowns')

// 取得特定 key 的啟用選項（一般使用）
export const getDropdownOptions = (key: string) =>
  client.get<{ success: boolean; data: DropdownOption[] }>(`/dropdowns/${key}`)

// 新增選項
export const createDropdownOption = (
  key: string,
  data: { value: string; label: string }
) => client.post(`/dropdowns/${key}/options`, data)

// 更新選項
export const updateDropdownOption = (
  id: number,
  data: { value?: string; label?: string; isActive?: boolean }
) => client.put(`/dropdowns/options/${id}`, data)

// 刪除選項
export const deleteDropdownOption = (id: number) =>
  client.delete(`/dropdowns/options/${id}`)

// 批量更新排序
export const reorderDropdownOptions = (
  key: string,
  orders: { id: number; sortOrder: number }[]
) => client.put(`/dropdowns/${key}/options/reorder`, { orders })
