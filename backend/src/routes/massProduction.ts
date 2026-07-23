import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', requireAuth, async (_req, res) => {
  const data = await prisma.massProductionApproval.findMany({ orderBy: { createdAt: 'desc' } })
  res.json({ success: true, data })
})

router.get('/:id', requireAuth, async (req, res) => {
  const record = await prisma.massProductionApproval.findUnique({ where: { id: Number(req.params.id) } })
  if (!record) { res.status(404).json({ success: false, error: { message: '找不到記錄' } }); return }
  res.json({ success: true, data: record })
})

router.post('/', requireAuth, async (req, res) => {
  const data = await prisma.massProductionApproval.create({ data: sanitize(req.body) })
  res.status(201).json({ success: true, data })
})

router.put('/:id', requireAuth, async (req, res) => {
  const data = await prisma.massProductionApproval.update({
    where: { id: Number(req.params.id) },
    data: sanitize(req.body),
  })
  res.json({ success: true, data })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.massProductionApproval.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true, message: '已刪除' })
})

function sanitize(b: any) {
  return {
    no: b.no ?? null,
    newFormulaCode: b.newFormulaCode ?? null,
    oldFormulaCode: b.oldFormulaCode ?? null,
    date: b.date ? new Date(b.date) : null,
    dept: b.dept ?? null,
    applicant: b.applicant ?? null,
    productName: b.productName ?? null,
    customerUsage: b.customerUsage ?? null,
    testCode: b.testCode ?? null,
    testContent: b.testContent ?? null,
    testTypePhysical: !!b.testTypePhysical,
    testTypeStability: !!b.testTypeStability,
    testTypeApplication: !!b.testTypeApplication,
    officialFormula: b.officialFormula ?? null,
    specStandards: b.specStandards ?? null,
    testSummary: b.testSummary ?? null,
    meetsInternalSpec: b.meetsInternalSpec ?? null,
    testCompletionDate: b.testCompletionDate ? new Date(b.testCompletionDate) : null,
    mrsl1: b.mrsl1 ?? null,
    mrsl2: b.mrsl2 ?? null,
    zdhcMrsl: b.zdhcMrsl ?? null,
    zdhcLevel1Required: !!b.zdhcLevel1Required,
    zdhcLevel1Result: b.zdhcLevel1Result ?? null,
    zdhcLevel3Required: !!b.zdhcLevel3Required,
    zdhcLevel3Result: b.zdhcLevel3Result ?? null,
    zdhcPidCode: b.zdhcPidCode ?? null,
    sdsVersions: b.sdsVersions ?? null,
    tdsVersions: b.tdsVersions ?? null,
    coaResult: b.coaResult ?? null,
    otherRegulations: b.otherRegulations ?? null,
    massProductionDate: b.massProductionDate ? new Date(b.massProductionDate) : null,
    customerQty: b.customerQty ?? null,
    officialProductCode: b.officialProductCode ?? null,
    officialProductName: b.officialProductName ?? null,
    productionRisks: b.productionRisks ?? null,
    reportDept: b.reportDept ?? null,
    reportPerson: b.reportPerson ?? null,
    reportDate: b.reportDate ? new Date(b.reportDate) : null,
    reportTime: b.reportTime ?? null,
    completionProductApp: !!b.completionProductApp,
    completionOperation: !!b.completionOperation,
    completionTechConsult: !!b.completionTechConsult,
    completionTechService: !!b.completionTechService,
    completionOther: !!b.completionOther,
    formulaId: b.formulaId ? Number(b.formulaId) : null,
    updatedAt: new Date(),
  }
}

export default router
