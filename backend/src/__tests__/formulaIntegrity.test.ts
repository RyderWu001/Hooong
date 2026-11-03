import { expect, it } from 'vitest'
import { normalizeFormulaStatus, planFormulaRepair } from '../lib/formulaIntegrity'
const formula = () => ({ id: 1, code: 'QA', status: '草稿', currentVersion: 4, ingredients: [{ ingredientId: 2, ratio: 100, unit: '%', ingredient: { name: 'QA', unitPrice: 0 } }], versions: [] as { version: number }[] })
it('normalizes legacy statuses without reactivating frozen formulas or accepting unknown properties', () => {
  expect(normalizeFormulaStatus('已凍結')).toBe('INACTIVE')
  expect(normalizeFormulaStatus('已發布')).toBe('PUBLISHED')
  for (const s of ['toString', '__proto__', 'INVALID']) expect(normalizeFormulaStatus(s)).toBeNull()
})
it('repairs only a missing current snapshot, preserving its number, zero price and current composition', () => {
  const plan = planFormulaRepair(formula())
  expect(plan.status).toBe('DRAFT'); expect(plan.version).toBe(4); expect(plan.addSnapshot).toBe(true)
  expect(plan.snapshot).toEqual([{ ingredientId: 2, ingredientName: 'QA', ratio: 100, unit: '%', unitPrice: 0 }])
  // No invented snapshots for unrecorded versions 1–3; a second run is a no-op.
  const fixed = formula(); fixed.status = 'DRAFT'; fixed.versions = [{ version: 4 }]
  expect(planFormulaRepair(fixed)).toMatchObject({ changeStatus: false, addSnapshot: false })
})
it('stops on ambiguous statuses, invalid version numbers and duplicate version records', () => {
  expect(() => planFormulaRepair({ ...formula(), status: '未知' })).toThrow()
  expect(() => planFormulaRepair({ ...formula(), currentVersion: 0 })).toThrow()
  expect(() => planFormulaRepair({ ...formula(), versions: [{ version: 4 }, { version: 4 }] })).toThrow()
})
