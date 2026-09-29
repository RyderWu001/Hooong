import { describe, it, expect } from 'vitest'
import { validateTemplateFields } from '../lib/templateFields'

describe('validateTemplateFields', () => {
  const ok = { key: 'temp', label: '溫度', type: 'number' }

  it('接受合法欄位', () => {
    expect(validateTemplateFields([ok, { key: 'kind', label: '種類', type: 'select', options: ['A', 'B'] }])).toBeNull()
  })
  it('接受 showWhen 的 in / notIn', () => {
    expect(validateTemplateFields([ok, { ...ok, key: 'b', showWhen: { key: 'temp', in: [1] } }])).toBeNull()
    expect(validateTemplateFields([ok, { ...ok, key: 'b', showWhen: { key: 'temp', notIn: [1] } }])).toBeNull()
  })
  it('拒絕非陣列、重複 key、不合法 key 與類型', () => {
    expect(validateTemplateFields({})).not.toBeNull()
    expect(validateTemplateFields([ok, ok])).toMatch(/重複/)
    expect(validateTemplateFields([{ ...ok, key: '1abc' }])).not.toBeNull()
    expect(validateTemplateFields([{ ...ok, type: 'foo' }])).not.toBeNull()
  })
  it('選擇題必須有字串陣列 options', () => {
    expect(validateTemplateFields([{ key: 'k', label: 'K', type: 'select' }])).not.toBeNull()
    expect(validateTemplateFields([{ key: 'k', label: 'K', type: 'multiselect', options: [1] }])).not.toBeNull()
  })
  it('拒絕缺少 in/notIn 的 showWhen', () => {
    expect(validateTemplateFields([ok, { ...ok, key: 'b', showWhen: { key: 'temp' } }])).not.toBeNull()
  })
})
