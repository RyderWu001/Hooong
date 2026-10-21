import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ completion: vi.fn() }))
vi.mock('openai', () => ({ default: class { chat = { completions: { create: mocks.completion } } } }))
import { analyzeResults, emphasizeResults, rankHistory, searchTerms, type EvidenceExperiment } from '../lib/experimentInsights'
function experiment(id: number, value: unknown = 0): EvidenceExperiment {
  return { id, code: `E${id}`, experimentDate: `2026-10-${String(id).padStart(2, '0')}`, notes: '洗髮精黏度比較', category: null, templateId: 1, formulaId: null,
    template: { name: '洗髮精', fields: [{ key: 'temperature', label: '溫度', unit: '°C' }] }, formula: null,
    groups: [{ id, name: '基準組', conditions: { temperature: 25 }, steps: [{ description: '量測黏度' }] }],
    result: { status: 'OBSERVING', score: null, handFeelScore: null, colorShadeScore: null, fastnessScore: null, moistureScore: null, otherScoreName: null, otherScore: null,
      description: '來源紀錄', reflection: '', improvement: '', scoreItems: [{ dimension: '黏度', actualValue: value, confirmedValue: 999, standardValue: 888 }] } }
}
beforeEach(() => { vi.unstubAllEnvs(); mocks.completion.mockReset(); vi.stubEnv('OLLAMA_BASE_URL', 'http://localhost:11434/v1') })
describe('evidence-based experiment comparison', () => {
  it('keeps zero, rejects numeric strings/null and never uses conditions/confirmed/standard as measurements', () => {
    const r = analyzeResults([experiment(1, 0), experiment(2, '100'), experiment(3, null)], true)
    expect(r.metrics).toHaveLength(1); expect(r.metrics[0].points.map(p => p.value)).toEqual([0, null, null])
    expect(r.metrics[0].stats).toMatchObject({ n: 1, min: 0, max: 0, mean: 0, sampleSd: null })
    expect(r.warnings.length).toBeGreaterThan(0); expect(r.summary).toContain('沒有獨立量測值')
  })
  it('requires explicit comparability and computes sample statistics and chronological change', () => {
    const rows = [experiment(2, 4), experiment(1, 2)]
    expect(analyzeResults(rows).metrics[0].stats).toBeNull()
    expect(analyzeResults(rows, true).metrics[0].stats).toMatchObject({ n: 2, mean: 3, sampleSd: Math.sqrt(2), dateChange: 2, outliers: [] })
  })
  it('marks IQR candidates only with four measurements and does not delete values', () => {
    const r = analyzeResults([experiment(1, 1), experiment(2, 1), experiment(3, 1), experiment(4, 100)], true)
    expect(r.metrics[0].stats?.outliers).toEqual(['E4']); expect(r.metrics[0].stats?.n).toBe(4)
  })
  it('excludes duplicate measurements even if first was null; does not classify default group flags as failure', () => {
    const e = experiment(1, null)
    ;(e.result!.scoreItems as unknown[]).push({ dimension: '黏度', actualValue: 5 })
    expect(analyzeResults([e], true).metrics).toHaveLength(0)
    const missing = experiment(2); missing.result = null
    expect(analyzeResults([missing]).warnings).toContain('E2：尚未建立結果')
  })
  it('ranks and cites historical sources, excluding the reference and listing actual differences', () => {
    const e = experiment(2); e.groups[0].conditions = { temperature: 40 }
    const r = rankHistory([experiment(1), e, { ...experiment(3), templateId: 2, notes: '', template: null }], '洗髮精黏度', experiment(1))
    expect(r[0].id).toBe(2); expect(r.every(m => m.id !== 1)).toBe(true)
    expect(r[0].groups[0].conditions).toEqual({ '溫度 (°C)': 40 }); expect(r[0].differences.join()).toContain('條件')
    expect(searchTerms('洗髮精黏度比較')).toContain('黏度')
  })
  it('cannot introduce model invented numbers and falls back on invalid evidence IDs', async () => {
    const r = analyzeResults([experiment(1, 10)])
    mocks.completion.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ focusIds: ['F3'], answer: '99999' }) } }] })
    const enriched = await emphasizeResults(r)
    expect(enriched.engine).toBe('local'); expect(enriched.summary).not.toContain('99999')
    mocks.completion.mockResolvedValue({ choices: [{ message: { content: '{"focusIds":["invented"]}' } }] })
    expect((await emphasizeResults(r)).summary).toBe(r.summary)
    vi.stubEnv('OLLAMA_BASE_URL', 'https://external.example/v1')
    await expect(emphasizeResults(r)).rejects.toThrow('本機模型')
  })
})
