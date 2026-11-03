import type { Request, Response, NextFunction } from 'express'
import prisma from '../db/client'

/** Verify every nested record belongs to the experiment named in the URL. */
export async function requireExperimentScope(req: Request, res: Response, next: NextFunction) {
  const { id, gid, sid, stepId, sampleId, aid, attId, attachmentId } = req.params
  const experimentId = Number(id)
  const notFound = () => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '此實驗中找不到指定的紀錄' } })
  if (!id || String(req.route.path) === '/:id') { next(); return }
  if (!await prisma.experiment.findUnique({ where: { id: experimentId }, select: { id: true } })) { notFound(); return }
  if (gid && !await prisma.experimentGroup.findFirst({ where: { id: Number(gid), experimentId }, select: { id: true } })) { notFound(); return }
  const step = sid ?? stepId
  if (step && !await prisma.experimentGroupStep.findFirst({ where: { id: Number(step), groupId: Number(gid) }, select: { id: true } })) { notFound(); return }
  if (sampleId && !await prisma.sample.findFirst({ where: { id: Number(sampleId), experimentId }, select: { id: true } })) { notFound(); return }
  if (req.body?.groupId != null && req.body.groupId !== '' && String(req.route.path).includes('/samples')) {
    const groupId = Number(req.body.groupId)
    if (!Number.isSafeInteger(groupId) || groupId < 1) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '實驗組編號不正確' } }); return
    }
    if (!await prisma.experimentGroup.findFirst({ where: { id: groupId, experimentId }, select: { id: true } })) { notFound(); return }
  }
  if (req.method === 'PUT' && String(req.route.path).endsWith('/steps')) {
    const steps = req.body?.steps
    if (!Array.isArray(steps) || steps.some(s => !Number.isSafeInteger(s?.id) || s.id < 1) || new Set(steps.map(s => s.id)).size !== steps.length) {
      res.status(400).json({ success: false, error: { code: 'INVALID_STEPS', message: '操作步驟清單不正確或包含重複編號' } }); return
    }
    const count = await prisma.experimentGroupStep.count({ where: { groupId: Number(gid), id: { in: steps.map(s => s.id) } } })
    if (count !== steps.length) { notFound(); return }
  }
  const attachment = aid ?? attId ?? attachmentId
  if (attachment) {
    const owner = step ? { experimentGroupStepId: Number(step) }
      : gid ? { experimentGroupId: Number(gid) }
      : sampleId ? { sampleId: Number(sampleId) }
      : String(req.route.path).includes('/result/') ? { result: { experimentId } }
      : { experimentId }
    if (!await prisma.attachment.findFirst({ where: { id: Number(attachment), ...owner }, select: { id: true } })) { notFound(); return }
  }
  next()
}
