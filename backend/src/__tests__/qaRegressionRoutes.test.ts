import 'express-async-errors'
import { beforeEach, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const m = vi.hoisted(() => {
  const delegate = () => Object.fromEntries(['findMany', 'findUnique', 'findFirst', 'create', 'update', 'updateMany', 'delete', 'count', 'groupBy'].map(k => [k, vi.fn()]))
  return { db: Object.fromEntries(['rolePermission', 'supplier', 'formulaRisk', 'ingredientRisk', 'materialInventory', 'materialTransaction', 'experiment', 'experimentGroup', 'experimentGroupStep', 'sample', 'attachment', 'formSignature', 'sampleSubmission', 'chemicalEvaluation', 'chemicalRequest', 'ingredientBatch', 'formulaChangeApplication', 'massProductionApproval', 'user'].map(k => [k, delegate()])), transaction: vi.fn() }
})
vi.mock('../db/client', () => ({ default: { ...m.db, $transaction: m.transaction } }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const role = req.headers.authorization
    if (!role) return res.sendStatus(401)
    req.user = { id: 1, role, email: 'test@example.invalid' }; next()
  },
  requireRole: (...roles: string[]) => (req: any, res: any, next: any) => roles.includes(req.user.role) ? next() : res.sendStatus(403),
}))
import { invalidatePermissionCache, MODULES } from '../middleware/permission'
import { suppliersRouter } from '../routes/suppliers'
import risks from '../routes/risks'
import materials from '../routes/materials'
import experiments from '../routes/experiments'
import signatures from '../routes/formSignatures'
const app = express(); app.use(express.json())
app.use('/suppliers', suppliersRouter); app.use('/risks', risks); app.use('/materials', materials); app.use('/experiments', experiments); app.use('/signatures', signatures)
app.use((_e: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.sendStatus(500) })
const asLab = { Authorization: 'LAB_STAFF' }
beforeEach(() => {
  vi.resetAllMocks(); invalidatePermissionCache()
  m.db.rolePermission.findMany.mockResolvedValue(['LAB_STAFF', 'MANAGER'].flatMap(role => MODULES.map(module => ({ role, module, canView: true, canCreate: true, canEdit: true, canDelete: false }))))
  m.transaction.mockImplementation((fn: any) => fn(m.db))
  m.db.materialInventory.findUnique.mockResolvedValue({ id: 10, currentStock: 5 })
  m.db.materialInventory.updateMany.mockResolvedValue({ count: 1 })
  m.db.materialTransaction.create.mockResolvedValue({ id: 1 })
  m.db.experiment.findUnique.mockResolvedValue({ id: 1 })
})

it('supplier and risk creation obey the matrix, including a manager grant and a lab revocation', async () => {
  m.db.rolePermission.findMany.mockResolvedValue([
    { role: 'LAB_STAFF', module: 'suppliers', canCreate: false }, { role: 'LAB_STAFF', module: 'risks', canCreate: false },
    { role: 'MANAGER', module: 'suppliers', canCreate: true },
  ])
  expect((await request(app).post('/suppliers').set(asLab).send({ code: 'QA', name: 'QA' })).status).toBe(403)
  expect((await request(app).post('/risks/formulas').set(asLab).send({})).status).toBe(403)
  expect(m.db.supplier.create).not.toHaveBeenCalled(); expect(m.db.formulaRisk.create).not.toHaveBeenCalled()
  m.db.supplier.create.mockResolvedValue({ id: 1, code: 'QA', name: 'QA' })
  expect((await request(app).post('/suppliers').set('Authorization', 'MANAGER').send({ code: 'QA', name: 'QA' })).status).toBe(201)
})
it('view and deletion are separate grants, and unauthenticated requests never query permissions', async () => {
  expect((await request(app).get('/suppliers')).status).toBe(401)
  expect(m.db.rolePermission.findMany).not.toHaveBeenCalled()
  m.db.rolePermission.findMany.mockResolvedValue([{ role: 'LAB_STAFF', module: 'suppliers', canView: false, canDelete: false }])
  expect((await request(app).get('/suppliers').set(asLab)).status).toBe(403)
  expect((await request(app).delete('/suppliers/1').set(asLab)).status).toBe(403)
  expect(m.db.supplier.findMany).not.toHaveBeenCalled(); expect(m.db.supplier.delete).not.toHaveBeenCalled()
})
it('rejects invalid stock types, negative quantities and non-number payloads before any write', async () => {
  for (const data of [{ transactionType: 'BOGUS', quantity: 1 }, { transactionType: 'IN', quantity: -1 }, { transactionType: 'IN', quantity: 0 }, { transactionType: 'IN', quantity: '2' }, { transactionType: 'ADJUST', quantity: null }]) {
    expect((await request(app).post('/materials/inventory/10/adjust').set(asLab).send(data)).status).toBe(400)
  }
  expect(m.transaction).not.toHaveBeenCalled()
  expect((await request(app).post('/materials/inventory').set(asLab).send({ ingredientId: 1, currentStock: -1 })).status).toBe(400)
  expect((await request(app).post('/materials/inventory').set(asLab).send({ ingredientId: 1, currentStock: null })).status).toBe(400)
  expect(m.db.materialInventory.create).not.toHaveBeenCalled()
})
it('allows a zero final balance, rejects overdraw, and prevents lost concurrent adjustments', async () => {
  const adjusted = await request(app).post('/materials/inventory/10/adjust').set(asLab).send({ transactionType: 'ADJUST', quantity: 0 })
  expect(adjusted.status).toBe(200); expect(adjusted.body.data.newStock).toBe(0)
  m.db.materialTransaction.create.mockClear()
  expect((await request(app).post('/materials/inventory/10/adjust').set(asLab).send({ transactionType: 'OUT', quantity: 6 })).status).toBe(409)
  expect(m.db.materialTransaction.create).not.toHaveBeenCalled()
  m.db.materialInventory.updateMany.mockResolvedValue({ count: 0 })
  expect((await request(app).post('/materials/inventory/10/adjust').set(asLab).send({ transactionType: 'IN', quantity: 2 })).status).toBe(409)
  expect(m.db.materialTransaction.create).not.toHaveBeenCalled()
})
it('rejects a group from a different experiment before update, success marking or deletion', async () => {
  m.db.experimentGroup.findFirst.mockResolvedValue(null)
  for (const [method, url] of [['put', '/experiments/2/groups/10'], ['patch', '/experiments/2/groups/10/success'], ['delete', '/experiments/2/groups/10']] as const) {
    expect((await request(app)[method](url).set(asLab).send({ isSuccess: true })).status).toBe(404)
  }
  expect(m.db.experimentGroup.findFirst).toHaveBeenCalledWith({ where: { id: 10, experimentId: 2 }, select: { id: true } })
  expect(m.db.experimentGroup.update).not.toHaveBeenCalled(); expect(m.transaction).not.toHaveBeenCalled(); expect(m.db.experimentGroup.delete).not.toHaveBeenCalled()
})
it('rejects cross-group steps and cross-experiment samples and attachments', async () => {
  m.db.experimentGroup.findFirst.mockResolvedValue({ id: 10 }); m.db.experimentGroupStep.findFirst.mockResolvedValue(null)
  expect((await request(app).delete('/experiments/2/groups/10/steps/20').set(asLab)).status).toBe(404)
  m.db.experimentGroupStep.count.mockResolvedValue(0)
  expect((await request(app).put('/experiments/2/groups/10/steps').set(asLab).send({ steps: [{ id: 20, description: 'QA', stepOrder: 1 }] })).status).toBe(404)
  m.db.sample.findFirst.mockResolvedValue(null)
  expect((await request(app).patch('/experiments/2/samples/30').set(asLab).send({ notes: 'QA' })).status).toBe(404)
  m.db.attachment.findFirst.mockResolvedValue(null)
  expect((await request(app).delete('/experiments/2/attachments/40').set(asLab)).status).toBe(404)
  expect(m.db.sample.update).not.toHaveBeenCalled(); expect(m.db.attachment.delete).not.toHaveBeenCalled()
})
it('validates real approval slots, their roles and the existence of the parent form', async () => {
  const body = { formType: 'SampleSubmission', formId: 1, slotName: '管理部', slotOrder: 3 }
  expect((await request(app).post('/signatures').set(asLab).send(body)).status).toBe(403)
  expect((await request(app).post('/signatures').set(asLab).send({ ...body, formType: '__proto__' })).status).toBe(400)
  expect((await request(app).post('/signatures').set('Authorization', 'MANAGER').send({ ...body, slotOrder: 1 })).status).toBe(400)
  m.db.sampleSubmission.findUnique.mockResolvedValue(null)
  expect((await request(app).post('/signatures').set('Authorization', 'MANAGER').send(body)).status).toBe(404)
  expect(m.db.formSignature.create).not.toHaveBeenCalled()
  m.db.sampleSubmission.findUnique.mockResolvedValue({ id: 1 }); m.db.formSignature.findFirst.mockResolvedValue(null)
  expect((await request(app).post('/signatures').set('Authorization', 'MANAGER').send(body)).status).toBe(422)
  m.db.formSignature.findFirst.mockResolvedValue({ id: 2, signedAt: new Date() }); m.db.user.findUnique.mockResolvedValue({ username: '測試經理' }); m.db.formSignature.create.mockResolvedValue({ id: 3 })
  expect((await request(app).post('/signatures').set('Authorization', 'MANAGER').send(body)).status).toBe(201)
  m.db.formSignature.create.mockRejectedValue({ code: 'P2002' })
  expect((await request(app).post('/signatures').set('Authorization', 'MANAGER').send(body)).status).toBe(409)
})
