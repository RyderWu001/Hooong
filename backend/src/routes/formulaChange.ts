import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const data = await prisma.formulaChangeApplication.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json({ success: true, data })
})

router.get('/:id', requireAuth, async (req, res) => {
  const record = await prisma.formulaChangeApplication.findUnique({
    where: { id: Number(req.params.id) },
  })
  if (!record) { res.status(404).json({ success: false, error: { message: '找不到記錄' } }); return }
  res.json({ success: true, data: record })
})

router.post('/', requireAuth, async (req, res) => {
  const data = await prisma.formulaChangeApplication.create({ data: sanitize(req.body) })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, async (req, res) => {
  const data = await prisma.formulaChangeApplication.update({
    where: { id: Number(req.params.id) },
    data: sanitize(req.body),
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.formulaChangeApplication.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

function sanitize(body: any) {
  const {
    no, date, customerName, productName,
    problem, oldFormula, newFormula, productUsage, responseContent,
    specChanges, notes,
    reportDept, reportPerson, reportDate, reportTime,
    completionProductUsage, completionOperation,
    completionTechConsult, completionTechService, completionOther,
    formulaId,
  } = body
  return {
    no: no ?? null,
    date: date ? new Date(date) : null,
    customerName: customerName ?? null,
    productName: productName ?? null,
    problem: problem ?? null,
    oldFormula: oldFormula ?? null,
    newFormula: newFormula ?? null,
    productUsage: productUsage ?? null,
    responseContent: responseContent ?? null,
    specChanges: specChanges ?? null,
    notes: notes ?? null,
    reportDept: reportDept ?? null,
    reportPerson: reportPerson ?? null,
    reportDate: reportDate ? new Date(reportDate) : null,
    reportTime: reportTime ?? null,
    completionProductUsage: !!completionProductUsage,
    completionOperation: !!completionOperation,
    completionTechConsult: !!completionTechConsult,
    completionTechService: !!completionTechService,
    completionOther: !!completionOther,
    formulaId: formulaId ? Number(formulaId) : null,
    updatedAt: new Date(),
  }
}

export default router
