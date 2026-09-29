import { Router } from 'express'
import prisma from '../db/client'
import { requireAuth, requireRole } from '../middleware/auth'
import { validateNumericParams } from '../lib/query'

const router = Router()
validateNumericParams(router)

const FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'multiselect', 'date'] as const

const bad = (message: string) => ({ success: false, error: { code: 'VALIDATION_ERROR', message } })

/** 驗證 fields 結構，回傳錯誤訊息；合法時回傳 null。 */
export function validateTemplateFields(fields: unknown): string | null {
  if (!Array.isArray(fields)) return 'fields 必須是陣列'
  const keys = new Set<string>()
  for (const [i, f] of fields.entries()) {
    const n = `第 ${i + 1} 個欄位`
    if (!f || typeof f !== 'object') return `${n}格式錯誤`
    const { key, label, type, options, showWhen } = f as Record<string, any>
    if (typeof key !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) return `${n}的 key 只能使用英數字與底線，且須以英文字母開頭`
    if (keys.has(key)) return `${n}的 key「${key}」重複`
    keys.add(key)
    if (typeof label !== 'string' || !label.trim()) return `${n}缺少顯示名稱`
    if (!FIELD_TYPES.includes(type)) return `${n}的類型不合法`
    if ((type === 'select' || type === 'multiselect') && (!Array.isArray(options) || options.some((o) => typeof o !== 'string'))) {
      return `${n}是選擇題，options 必須是字串陣列`
    }
    if (showWhen != null && (typeof showWhen.key !== 'string' || !('equals' in showWhen))) return `${n}的 showWhen 格式錯誤`
  }
  return null
}

// GET /experiment-templates?all=1 — 預設只回傳啟用中的範本
router.get('/', requireAuth, async (req, res) => {
  const data = await prisma.experimentTemplate.findMany({
    where: req.query.all ? {} : { isActive: true },
    orderBy: [{ isBuiltin: 'desc' }, { id: 'asc' }],
  })
  res.json({ success: true, data })
})

router.get('/:id', requireAuth, async (req, res) => {
  const t = await prisma.experimentTemplate.findUnique({ where: { id: Number(req.params.id) } })
  if (!t) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到範本' } }); return }
  res.json({ success: true, data: t })
})

router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { key, name, domain, description, fields } = req.body
  if (typeof key !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(key)) { res.status(400).json(bad('範本代碼只能使用小寫英數、底線與連字號')); return }
  if (typeof name !== 'string' || !name.trim()) { res.status(400).json(bad('請輸入範本名稱')); return }
  const err = validateTemplateFields(fields)
  if (err) { res.status(400).json(bad(err)); return }
  if (await prisma.experimentTemplate.findUnique({ where: { key } })) { res.status(409).json(bad('範本代碼已存在')); return }
  const t = await prisma.experimentTemplate.create({
    data: { key, name: name.trim(), domain: domain ?? null, description: description ?? '', fields },
  })
  res.status(201).json({ success: true, data: t })
})

router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { name, domain, description, fields, isActive } = req.body
  if (fields !== undefined) {
    const err = validateTemplateFields(fields)
    if (err) { res.status(400).json(bad(err)); return }
  }
  const t = await prisma.experimentTemplate.update({
    where: { id: Number(req.params.id) },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(domain !== undefined ? { domain } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(fields !== undefined ? { fields } : {}),
      ...(isActive !== undefined ? { isActive: !!isActive } : {}),
    },
  })
  res.json({ success: true, data: t })
})

// 內建範本或已被實驗使用的範本不可刪除（請改為停用）
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const id = Number(req.params.id)
  const t = await prisma.experimentTemplate.findUnique({ where: { id }, include: { _count: { select: { experiments: true } } } })
  if (!t) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到範本' } }); return }
  if (t.isBuiltin) { res.status(400).json(bad('內建範本不可刪除，可改為停用')); return }
  if (t._count.experiments > 0) { res.status(400).json(bad(`已有 ${t._count.experiments} 筆實驗使用此範本，請改為停用`)); return }
  await prisma.experimentTemplate.delete({ where: { id } })
  res.json({ success: true, message: '已刪除' })
})

export default router
