import { describe, it, expect, vi } from 'vitest'

// seedTemplates 會載入 Prisma client；此測試只驗證資料，不需要連線
vi.mock('../db/client', () => ({ default: {} }))

import { BUILTIN_TEMPLATES } from '../db/seedTemplates'
import { validateTemplateFields } from '../lib/templateFields'

describe('內建實驗範本', () => {
  it.each(BUILTIN_TEMPLATES.map((t) => [t.key, t] as const))('%s 欄位結構合法', (_key, t) => {
    expect(validateTemplateFields(t.fields)).toBeNull()
  })

  it('範本代碼唯一，且包含通用範本', () => {
    const keys = BUILTIN_TEMPLATES.map((t) => t.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toContain('generic')
  })

  it('showWhen 只參照同一範本內存在的欄位', () => {
    for (const t of BUILTIN_TEMPLATES) {
      const keys = new Set(t.fields.map((f) => f.key))
      for (const f of t.fields) if (f.showWhen) expect(keys.has(f.showWhen.key)).toBe(true)
    }
  })

  it('染整範本的欄位代碼涵蓋 ExperimentGroup 全部舊欄位（舊資料相容）', () => {
    const legacy = ['experimentType', 'bathRatio', 'startPH', 'endPH', 'acidMethod', 'tempRate', 'holdTime',
      'burningCondition', 'washCondition', 'dyeAuxiliaries', 'leveler', 'fixer', 'calciumChloride',
      'colorFixative', 'dyeCombination', 'dyeAmount', 'fixingTemp', 'fixingAuxAmount', 'fiberSpec',
      'widthShrinkage', 'shrinkTime', 'fixingAuxiliaries']
    const dyeing = BUILTIN_TEMPLATES.find((t) => t.key === 'dyeing')!
    expect(dyeing.fields.map((f) => f.key).sort()).toEqual([...legacy].sort())
  })
})
