import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ completion: vi.fn(), create: vi.fn(), ready: vi.fn() }))
vi.mock('openai', () => ({ default: class { chat = { completions: { create: m.completion } } } }))
vi.mock('../db/client', () => ({ default: { experimentTemplate: { create: m.create } } }))
vi.mock('../lib/aiHybrid', () => ({ cloudReady: m.ready }))
import { templatePlan, starterTemplate, prepareTemplate, enrichTemplate, readTemplateDraft, saveTemplate, supplementTemplate } from '../lib/templateDraft'
beforeEach(() => {
  vi.resetAllMocks(); vi.unstubAllEnvs()
  vi.stubEnv('JWT_SECRET', 'template-test-secret'); vi.stubEnv('AI_CLOUD_BASE_URL', 'https://cloud.example/v1'); vi.stubEnv('AI_CLOUD_MODEL', 'model'); vi.stubEnv('AI_CLOUD_API_KEY', 'test'); vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434/v1')
  m.ready.mockReturnValue(true); m.create.mockResolvedValue({ id: 7, name: '範本' })
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(starterTemplate('shampoo')) } }] })
})
it('cloud projection cannot contain arbitrary strings, numbers, names or recipe', () => {
  const p = templatePlan('客戶王小明秘密品牌ABC 洗髮精黏度與泡沫 XYZ原料5.5% 批次777 https://evil.example')
  expect(p.engine).toBe('cloud'); expect(p.payload).toEqual({ topic: 'shampoo', goals: ['viscosity', 'foam'] })
  expect(JSON.stringify(p.payload)).not.toMatch(/ABC|XYZ|777|5.5|王小明|evil/)
})
it('confidential and unknown topics stay local; unavailable cloud uses rules', () => {
  expect(templatePlan('保密洗髮精').engine).toBe('local'); expect(templatePlan('新型奈米催化反應').engine).toBe('local')
  m.ready.mockReturnValue(false); expect(templatePlan('洗髮精').engine).toBe('rules')
})
it('starter is immediate, editable, has viscosity settings and never calls model or database', () => {
  const r = prepareTemplate('洗髮精黏度', 1)
  expect(r.engine).toBe('rules'); expect(r.draft.fields.map(f => f.key)).toEqual(expect.arrayContaining(['measurementTemp', 'spindle', 'speed', 'readingTime']))
  expect(m.completion).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled()
})
it('cloud receives only allowlisted semantic summary and uses no database', async () => {
  const r = await enrichTemplate(prepareTemplate('客戶ABC洗髮精黏度XYZ5%', 1).token, 1)
  expect(r.engine).toBe('cloud'); const call = m.completion.mock.calls[0][0]
  expect(call.messages[1].content).toBe(JSON.stringify({ topic: 'shampoo', goals: ['viscosity'] })); expect(call.store).toBe(false)
  expect(m.create).not.toHaveBeenCalled()
})
it('local receives original text only at loopback', async () => {
  await enrichTemplate(prepareTemplate('保密洗髮精ABC', 1).token, 1)
  expect(m.completion.mock.calls[0][0].messages[1].content).toBe('保密洗髮精ABC')
  vi.stubEnv('OLLAMA_BASE_URL', 'https://external.example/v1')
  await expect(enrichTemplate(prepareTemplate('保密洗髮精', 1).token, 1)).rejects.toThrow('網址')
})
it('rejects insecure cloud URL', async () => {
  vi.stubEnv('AI_CLOUD_BASE_URL', 'http://external.example/v1')
  await expect(enrichTemplate(prepareTemplate('洗髮精', 1).token, 1)).rejects.toThrow('網址'); expect(m.completion).not.toHaveBeenCalled()
})
it('invalid output or provider failure retains starter without another provider', async () => {
  m.completion.mockResolvedValue({ choices: [{ message: { content: '{}' } }] })
  const r = await enrichTemplate(prepareTemplate('洗髮精', 1).token, 1)
  expect(r.engine).toBe('rules'); expect(r.disclosed).toContain('通用產品類型'); expect(r.draft.fields.map(f => f.key)).toContain('acceptanceCriteria'); expect(m.completion).toHaveBeenCalledTimes(1)
  m.completion.mockRejectedValue(Error('provider secret detail')); expect((await enrichTemplate(r.token, 1)).reason).not.toContain('secret')
})
it('cloud deadline cancels request and retains starter', async () => {
  vi.useFakeTimers()
  try {
    m.completion.mockImplementation((_, opts) => new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(Error('aborted')))))
    const pending = enrichTemplate(prepareTemplate('洗髮精', 1).token, 1)
    await vi.advanceTimersByTimeAsync(20000)
    expect((await pending).engine).toBe('rules'); expect(m.completion.mock.calls[0][1].signal.aborted).toBe(true)
  } finally { vi.useRealTimers() }
})
it('tokens are bound to owner, purpose and signed content', () => {
  const r = prepareTemplate('洗髮精', 1)
  expect(readTemplateDraft(r.token, 1).draft.name).toContain('洗髮精')
  expect(() => readTemplateDraft(r.token, 2)).toThrow(); expect(() => readTemplateDraft(r.token + 'x', 1)).toThrow()
})
it('save requires review and rejects duplicates and empty options', async () => {
  const r = prepareTemplate('洗髮精', 1)
  await expect(saveTemplate(r.token, 1, false)).rejects.toThrow('核對')
  const d = structuredClone(r.draft); d.fields[1].key = d.fields[0].key
  await expect(saveTemplate(r.token, 1, true, d)).rejects.toThrow('重複')
  d.fields[1].key = 'other'; d.fields[1].type = 'select'
  await expect(saveTemplate(r.token, 1, true, d)).rejects.toThrow('選項'); expect(m.create).not.toHaveBeenCalled()
})
it('reviewed save uses existing table, one atomic create, and idempotent key', async () => {
  const r = prepareTemplate('洗髮精', 1); const d = { ...r.draft, name: '已核對名稱' }
  await saveTemplate(r.token, 1, true, d)
  expect(m.create).toHaveBeenCalledTimes(1)
  expect(m.create.mock.calls[0][0].data).toMatchObject({ key: readTemplateDraft(r.token, 1).key, name: d.name, isBuiltin: false, fields: d.fields })
  m.create.mockRejectedValue({ code: 'P2002' }); await expect(saveTemplate(r.token, 1, true, d)).rejects.toThrow('已建立')
})

it('model omission of critical viscosity settings is repaired deterministically', async () => {
  const d = starterTemplate('shampoo'); d.fields = d.fields.filter(f => !['readingTime', 'spindle'].includes(f.key))
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(d) } }] })
  const r = await enrichTemplate(prepareTemplate('洗髮精黏度', 1).token, 1)
  expect(r.engine).toBe('cloud'); expect(r.draft.fields.map(f => f.key)).toEqual(expect.arrayContaining(['readingTime', 'spindle']))
})

it('does not invent available spindle options and adds replication setting', async () => {
  const d = starterTemplate('shampoo'); const f = d.fields.find(f => f.key === 'spindle')!; f.type = 'select'; f.options = ['轉子1', '轉子2']
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(d) } }] })
  const r = await enrichTemplate(prepareTemplate('洗髮精', 1).token, 1)
  expect(r.draft.fields.find(f => f.key === 'spindle')).toMatchObject({ type: 'text', options: [] })
  expect(r.draft.fields.find(f => f.key === 'replicateCount')).toBeDefined()
})

it('common knowledge provides actionable guidance and distinct targets and observations', () => {
  const r = prepareTemplate('洗髮精黏度泡沫穩定性', 1)
  expect(r.draft.fields.map(f => f.key)).toEqual(expect.arrayContaining(['objective', 'fixedFactors', 'replicateMethod', 'acceptanceCriteria', 'dataAnalysis', 'measuredViscosity', 'viscosityContainer', 'foamMethod', 'foamWater', 'storageConditions']))
  expect(r.draft.fields.find(f => f.key === 'thickenerLevel')!.placeholder).toContain('未必單調')
  expect(r.draft.protocol.join(' ')).toContain('不能假定'); expect(r.draft.checks.join(' ')).toContain('保存期限')
  expect(r.draft.fields.every(f => f.placeholder.length > 0)).toBe(true)
})
it('manual supplementation preserves edits, is repeatable and never sends a draft to a model or writes', () => {
  const r = prepareTemplate('洗髮精', 1); const edited = structuredClone(r.draft)
  edited.name = '我的內部範本'; edited.fields[0].placeholder = '內部材料代號'; edited.protocol.unshift('依內部流程先檢查設備')
  edited.fields = edited.fields.filter(f => f.key !== 'objective')
  const next = supplementTemplate(r.token, 1, edited)
  expect(next.draft.name).toBe(edited.name); expect(next.draft.fields[0].placeholder).toBe('內部材料代號'); expect(next.draft.protocol[0]).toBe('依內部流程先檢查設備')
  expect(next.draft.fields.map(f => f.key)).toContain('objective')
  expect(supplementTemplate(next.token, 1, next.draft).draft).toEqual(next.draft)
  expect(m.completion).not.toHaveBeenCalled(); expect(m.create).not.toHaveBeenCalled()
  expect(() => supplementTemplate(r.token, 2, edited)).toThrow()
})
it('a valid but sparse model answer cannot erase baseline fields and methods', async () => {
  const d = starterTemplate('generic'); d.fields = [d.fields[0]]; d.protocol = ['記錄結果']; d.checks = []
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(d) } }] })
  const r = await enrichTemplate(prepareTemplate('洗髮精黏度泡沫', 1).token, 1)
  expect(r.engine).toBe('cloud'); expect(r.draft.fields.map(f => f.key)).toEqual(expect.arrayContaining(['control', 'mixing', 'measurementTemp', 'acceptanceCriteria', 'foamMethod']))
  expect(r.draft.protocol.length).toBeGreaterThan(6)
})

it('filters model invented operating settings and puts grounded workflow first', async () => {
  const d = starterTemplate('shampoo'); d.protocol = ['於45°C儲存30天', '用標準搖晃法量測泡沫', '記錄外觀照片']; d.fields[0].placeholder = '使用25°C測量'; d.checks = ['重複3次以確保數據可靠']
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(d) } }] })
  const r = await enrichTemplate(prepareTemplate('洗髮精黏度泡沫穩定性', 1).token, 1)
  expect(r.engine).toBe('cloud'); expect(r.draft.protocol[0]).toContain('目的'); expect(r.draft.protocol.join(' ')).not.toMatch(/45°C|30天|標準搖晃法/)
  expect(r.draft.fields[0].placeholder).not.toContain('25°C'); expect(r.draft.checks.join(' ')).not.toContain('確保數據可靠')
})

it('recognizes lubricant instead of sending it to slow generic local fallback', () => {
  const r = prepareTemplate('潤滑液', 1)
  expect(r.target).toBe('cloud'); expect(r.cloudSummary).toEqual({ topic: 'lubricant', goals: ['lubrication'] })
  expect(r.draft.fields.map(f => f.key)).toEqual(expect.arrayContaining(['lubricantUse', 'viscosityMethod', 'frictionMethod', 'frictionConditions', 'materialCompatibility']))
  expect(r.draft.checks.join(' ')).toContain('用途')
  expect(templatePlan('保密潤滑液').engine).toBe('local')
})

it('insecticide management has domain specific records without manufacturing boilerplate', () => {
  const r = prepareTemplate('殺蟲劑實驗管理範本', 1)
  expect(r.target).toBe('cloud'); expect(r.draft.name).toContain('殺蟲劑')
  expect(r.cloudSummary).toEqual({ topic: 'insecticide', goals: ['efficacy'] })
  expect(r.draft.fields.map(f => f.key)).toEqual(expect.arrayContaining(['targetPest', 'pestStage', 'treatmentSetting', 'controlDesign', 'insectCount', 'assessmentTimes', 'knockdownCount', 'deadCount', 'controlValidity']))
  expect(r.draft.protocol.join(' ')).not.toMatch(/攪拌|增稠|黏度|稱量/)
  expect(r.draft.fields.map(f => f.key)).not.toContain('thickener')
})
it('model generic names cannot replace a recognized insecticide template', async () => {
  m.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(starterTemplate('generic')) } }] })
  const r = await enrichTemplate(prepareTemplate('殺蟲劑', 1).token, 1)
  expect(r.draft.name).toContain('殺蟲劑'); expect(r.draft.fields.map(f => f.key)).toContain('targetPest')
})
