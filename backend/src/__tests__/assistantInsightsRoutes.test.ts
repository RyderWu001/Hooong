import { beforeEach, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
const m = vi.hoisted(() => ({ findMany: vi.fn(), findUnique: vi.fn(), allowed: true }))
vi.mock('../db/client', () => ({ default: { experiment: { findMany: m.findMany, findUnique: m.findUnique } } }))
vi.mock('../middleware/auth', () => ({ requireAuth: (req: any, res: any, next: any) => { if (!req.headers.authorization) return res.sendStatus(401); next() } }))
vi.mock('../middleware/permission', () => ({ requirePermission: () => (_req: any, res: any, next: any) => m.allowed ? next() : res.sendStatus(403) }))
vi.mock('../middleware/rateLimit', () => ({ aiLimiter: (_req: any, _res: any, next: any) => next() }))
import router from '../routes/assistantInsights'
const app = express(); app.use(express.json()); app.use('/assistant', router)
beforeEach(() => { vi.resetAllMocks(); m.allowed = true })
it('guards all new endpoints before database queries', async () => {
  for (const path of ['/history-search', '/result-analysis']) {
    expect((await request(app).post(`/assistant${path}`).send({})).status).toBe(401)
    m.allowed = false
    expect((await request(app).post(`/assistant${path}`).set('Authorization', 'test').send({})).status).toBe(403)
  }
  expect((await request(app).get('/assistant/insight-experiments').set('Authorization', 'test')).status).toBe(403)
  expect(m.findMany).not.toHaveBeenCalled()
})
it('does not apply insight permissions to unrelated assistant routes', async () => {
  m.allowed = false
  const r = await request(app).get('/assistant/status')
  expect(r.status).toBe(404)
})
it('rejects invalid IDs, overlarge comparisons and nonexistent references', async () => {
  for (const experimentIds of [[-1], [], Array.from({ length: 9 }, (_, i) => i + 1)]) expect((await request(app).post('/assistant/result-analysis').set('Authorization', 'test').send({ experimentIds })).status).toBe(400)
  m.findUnique.mockResolvedValue(null)
  expect((await request(app).post('/assistant/history-search').set('Authorization', 'test').send({ question: '黏度', referenceId: 1 })).status).toBe(404)
  expect(m.findMany).not.toHaveBeenCalled()
})
it('reports nonexistent selected records rather than silently changing the comparison', async () => {
  m.findMany.mockResolvedValue([])
  expect((await request(app).post('/assistant/result-analysis').set('Authorization', 'test').send({ experimentIds: [1] })).status).toBe(404)
})
