import { beforeEach, expect, it, vi } from 'vitest'
import jwt from 'jsonwebtoken'
const m = vi.hoisted(() => ({ completion: vi.fn(), templates: vi.fn(), template: vi.fn(), formula: vi.fn(), create: vi.fn() }))
vi.mock('openai', () => ({ default: class { chat = { completions: { create: m.completion } } } }))
vi.mock('../db/client', () => ({ default: { experimentTemplate: { findMany: m.templates, findUnique: m.template }, formula: { findUnique: m.formula }, experiment: { create: m.create } } }))
import { draftSchema, prepareDraft, generateDraft, confirmDraft, signDraft, readDraft, validDate, validateConditions, inspectDraft, groundDraft, needsReview } from '../lib/experimentDraft'
const fields = [{ key: 'temperature', label: '溫度', type: 'number' }, { key: 'method', label: '方法', type: 'select', options: ['攪拌'] }]
const draft = () => draftSchema.parse({ title: '溫度比較', templateKey: 'generic', experimentDate: '2026-10-12', formulaCode: null, notes: '', groups: [{ name: '25°C', conditions: { temperature: 25 }, steps: ['觀察外觀'], repeats: 3 }], suggestions: ['可考慮增加對照組'] })
beforeEach(() => {
  vi.resetAllMocks(); vi.unstubAllEnvs(); vi.stubEnv('JWT_SECRET', 'test-only-draft-secret'); vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434/v1')
  m.templates.mockResolvedValue([{ key: 'generic', name: '通用', fields }]); m.template.mockResolvedValue({ id: 2, name: '通用', isActive: true, fields }); m.formula.mockResolvedValue(null)
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(draft()) } }] }); m.create.mockResolvedValue({ id: 1, code: 'AI-test' })
})
it('generation and refinement never write; only local request is used', async () => {
  const r = await generateDraft('建立溫度比較', undefined, 1)
  await generateDraft('日期改成明天', r.token, 1)
  expect(m.create).not.toHaveBeenCalled(); expect(m.completion).toHaveBeenCalledTimes(2)
  expect(m.completion.mock.calls[1][0].messages[1].content).toContain('建立溫度比較')
})
it('refuses a remote local-model URL', async () => {
  vi.stubEnv('OLLAMA_BASE_URL', 'https://cloud.example/v1')
  await expect(generateDraft('secret recipe', undefined, 1)).rejects.toThrow('本機模型')
  expect(m.completion).not.toHaveBeenCalled()
})
it('rejects malformed model output', async () => {
  m.completion.mockResolvedValue({ choices: [{ message: { content: '{"title":"bad"}' } }] })
  await expect(generateDraft('test', undefined, 1)).rejects.toThrow('格式')
})
it('draft token is bound to owner, audience, expiration and exact content', () => {
  const token = signDraft(1, draft(), 'AI-test', ['text'])
  expect(readDraft(token, 1).draft.title).toBe('溫度比較')
  expect(() => readDraft(token, 2)).toThrow(); expect(() => readDraft(token.slice(0, -3) + 'bad', 1)).toThrow()
  const expired = jwt.sign({ purpose: 'experiment-draft', userId: 1, draft: draft(), code: 'AI-test' }, process.env.JWT_SECRET!, { audience: 'experiment-draft', expiresIn: -1 })
  expect(() => readDraft(expired, 1)).toThrow()
})
it('rejects nonexistent dates and unsafe field values', () => {
  expect(validDate('2026-02-30')).toBe(false); expect(validDate('2026-02-28')).toBe(true)
  const d = draft(); d.groups[0].conditions = { temperature: '25', method: '未定義選項', password: 'secret' }
  expect(validateConditions(d, fields)).toHaveLength(3)
})
it('reports missing dates, inactive templates and unknown formula', async () => {
  m.template.mockResolvedValue({ id: 2, isActive: false, fields }); const d = draft(); d.experimentDate = null; d.formulaCode = 'NOT-FOUND'
  expect((await inspectDraft(d)).missing).toHaveLength(3)
  await expect(confirmDraft(signDraft(1, d, 'AI-test', []), 1)).rejects.toThrow('尚未補齊')
  expect(m.create).not.toHaveBeenCalled()
})
it('checks total repeat limit before any save', async () => {
  const d = draft(); d.groups = Array.from({ length: 4 }, () => ({ ...d.groups[0], repeats: 10 }))
  await expect(confirmDraft(signDraft(1, d, 'AI-test', []), 1)).rejects.toThrow('30')
  expect(m.create).not.toHaveBeenCalled()
})
it('creates all groups and steps in one atomic nested write, excluding suggestions', async () => {
  await confirmDraft(signDraft(7, draft(), 'AI-test', []), 7)
  expect(m.create).toHaveBeenCalledTimes(1)
  const data = m.create.mock.calls[0][0].data
  expect(data.experimenterId).toBe(7); expect(data.groups.create).toHaveLength(3)
  expect(data.groups.create.map((g: { groupOrder: number }) => g.groupOrder)).toEqual([1, 2, 3])
  expect(data.groups.create[0].steps.create[0].description).toBe('觀察外觀')
  expect(JSON.stringify(data)).not.toContain('增加對照組')
})
it('duplicate confirmation is rejected, never retried as another experiment', async () => {
  m.create.mockRejectedValue({ code: 'P2002' })
  await expect(confirmDraft(signDraft(1, draft(), 'AI-test', []), 1)).rejects.toThrow('已經建立過')
  expect(m.create).toHaveBeenCalledTimes(1)
})

it('unsupported amounts, steps and dates are withheld from actionable conditions', () => {
  const d = draft(); d.groups[0].conditions = { temperature: 25, amount: '100ml' }; d.groups[0].steps = ['觀察外觀', '加入 100ml 溶液']
  const r = groundDraft(d, ['25°C，觀察外觀'], '2026-10-11')
  expect(r.groups[0].conditions).toEqual({ temperature: 25 }); expect(r.groups[0].steps).toEqual(['觀察外觀'])
  expect(r.experimentDate).toBeNull(); expect(r.suggestions.join('')).toContain('100ml')
})

it('common completion retains new fields and steps with server-assigned provenance', () => {
  const d = draft(); d.groups[0].conditions = { temperature: 25, method: '攪拌' }; d.groups[0].steps = ['觀察外觀', '準備量測器材']
  d.plan.equipment = ['量筒']
  const r = groundDraft(d, ['25°C，觀察外觀'], '2026-10-11', 'common')
  expect(r.groups[0].conditions).toEqual({ temperature: 25, method: '攪拌' })
  expect(r.groups[0].inferred.conditions).toEqual(['method']); expect(r.groups[0].inferred.steps).toEqual([1])
  expect(r.groups[0].inferred.repeats).toBe(true); expect(needsReview(r)).toBe(true)
})
it('AI completed fields cannot save until user reviews them; saved records keep provenance', async () => {
  const d = groundDraft(draft(), ['generic，2026-10-12，25°C'], '2026-10-11', 'common')
  d.groups[0].conditions.method = '攪拌'; d.groups[0].inferred.conditions = ['method']; d.plan.measurements = ['外觀變化']
  const token = signDraft(1, d, 'AI-test', [])
  await expect(confirmDraft(token, 1)).rejects.toThrow('請先核對'); expect(m.create).not.toHaveBeenCalled()
  await confirmDraft(token, 1, true)
  const data = m.create.mock.calls[0][0].data
  expect(data.groups.create[0].notes).toContain('method'); expect(data.notes).toContain('外觀變化')
  expect(data.groups.create[0].steps.create[0].notes).toContain('AI 建議')
})
it('model cannot mark invented fields as user-provided', async () => {
  const d = draft(); d.groups[0].conditions.method = '攪拌'; d.groups[0].inferred = { conditions: [], steps: [], repeats: false }
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(d) } }] })
  const r = await generateDraft('通用 25°C，2026-10-12', undefined, 1, 'common')
  expect(r.draft.groups[0].inferred.conditions).toContain('method'); expect(r.reviewRequired).toBe(true)
  expect(m.create).not.toHaveBeenCalled()
})
it('faithful mode clears model-proposed plan and fields', () => {
  const d = draft(); d.plan.equipment = ['量筒']; d.groups[0].conditions.method = '攪拌'
  const r = groundDraft(d, ['25°C，觀察外觀，3次'], '2026-10-11', 'faithful')
  expect(r.plan.equipment).toEqual([]); expect(r.groups[0].conditions.method).toBeUndefined(); expect(needsReview(r)).toBe(false)
})

it('prepares a reviewed starter immediately without a model call or database write', async () => {
  const r = await prepareDraft('通用實驗，2026-11-03，比較20、25與30度，各重複三次，觀察外觀。', undefined, 1, 'common')
  expect(r.engine).toBe('rules'); expect(r.draft.groups.map(g => g.conditions.temperature)).toEqual([20, 25, 30])
  expect(r.draft.groups.map(g => g.repeats)).toEqual([3, 3, 3]); expect(r.missing).toEqual([])
  expect(m.completion).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled()
  await expect(confirmDraft(r.token, 1, false)).rejects.toThrow('請先核對')
  await confirmDraft(r.token, 1, true); expect(m.create).toHaveBeenCalledTimes(1)
})
it('keeps an incomplete starter usable and accepts a later explicit template without losing the description', async () => {
  const first = await prepareDraft('2026-11-03，25與30度各做一次，觀察外觀。', undefined, 1)
  expect(first.missing).toContain('有效的實驗範本'); expect(first.missing).toContain('至少一個實驗組')
  const next = await prepareDraft('使用通用範本', first.token, 1)
  expect(next.code).toBe(first.code); expect(next.draft.groups).toHaveLength(2); expect(next.draft.experimentDate).toBe('2026-11-03')
  expect(m.completion).not.toHaveBeenCalled()
})
it('does not pick an ambiguous date or guess experimental conditions without a matching field', async () => {
  const r = await prepareDraft('通用，2026-11-03 或2026-11-04，記錄結果', undefined, 1)
  expect(r.draft.experimentDate).toBeNull(); expect(r.draft.groups).toEqual([])
  expect(r.missing).toContain('實驗日期（YYYY-MM-DD）')
})

it('AI enrichment can add short suggestions but cannot rewrite starter conditions or bypass review', async () => {
  const first = await prepareDraft('通用，2026-11-03，25與30度各做一次，觀察外觀。', undefined, 1, 'common')
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ objective: '比較溫度影響', equipment: ['溫度計'], measurements: ['外觀'], checks: ['核對設備狀態'], steps: ['同時點記錄外觀'] }) } }] })
  const next = await generateDraft('補全觀察與紀錄建議', first.token, 1, 'common')
  expect(next.draft.groups.map(g => g.conditions.temperature)).toEqual([25, 30])
  expect(next.draft.groups[0].inferred.steps).toContain(1)
  expect(next.draft.experimentDate).toBe('2026-11-03'); expect(next.code).toBe(first.code)
  await expect(confirmDraft(next.token, 1)).rejects.toThrow('請先核對')
  expect(m.create).not.toHaveBeenCalled()
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ objective: '比較溫度影響', steps: ['設定999度並觀察'], checks: ['無異常'] }) } }] })
  const filtered = await generateDraft('補全觀察', first.token, 1, 'common')
  expect(filtered.draft.groups[0].steps).toEqual(['觀察外觀']); expect(filtered.draft.plan.checks).toEqual([])
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ objective: 'QA', groups: [{ conditions: { temperature: 999 } }] }) } }] })
  await expect(generateDraft('補全', first.token, 1, 'common')).rejects.toThrow('格式')
})
