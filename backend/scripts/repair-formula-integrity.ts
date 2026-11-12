import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { randomUUID, createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { planFormulaRepair } from '../src/lib/formulaIntegrity'

const db = new PrismaClient()
const args = process.argv.slice(2)
const option = (name: string) => args[args.indexOf(name) + 1]
const include = { ingredients: { orderBy: { id: 'asc' }, include: { ingredient: { select: { name: true, unitPrice: true } } } }, versions: { orderBy: { id: 'asc' }, select: { id: true, version: true, changeNote: true, ingredientsSnapshot: true } } } as const
function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]))
  return value
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
type Plan = ReturnType<typeof planFormulaRepair>
type Backup = { runId: string; plans: Plan[]; before: { id: number; status: string; updatedAt: string; currentVersion: number }[]; applied?: { id: number; updatedAt: string }[] }

async function main() {
  if (args.includes('--rollback')) {
    const backup = JSON.parse(fs.readFileSync(option('--rollback'), 'utf8')) as Backup
    if (!backup.applied) throw new Error('備份未標記為已完成，請先人工核對交易結果')
    await db.$transaction(async tx => {
      for (const plan of backup.plans) {
        const current = await tx.formula.findUniqueOrThrow({ where: { id: plan.id }, include })
        const after = backup.applied!.find(f => f.id === plan.id)!
        const actual = planFormulaRepair(current)
        if (current.updatedAt.toISOString() !== after.updatedAt || hash(actual.snapshot) !== hash(plan.snapshot) || current.currentVersion !== plan.version) throw new Error('修補後資料已變動，停止回復以避免覆蓋新資料')
        if (plan.addSnapshot) {
          const versions = current.versions.filter(v => v.changeNote.includes(backup.runId))
          if (versions.length !== 1 || hash(versions[0].ingredientsSnapshot) !== hash(plan.snapshot)) throw new Error('補建版本已變動，停止回復')
          await tx.formulaVersion.delete({ where: { id: versions[0].id } })
        }
        const before = backup.before.find(f => f.id === plan.id)!
        await tx.formula.update({ where: { id: plan.id }, data: { status: before.status, updatedAt: new Date(before.updatedAt) } })
      }
    }, { isolationLevel: 'Serializable', timeout: 120000 })
    console.log(JSON.stringify({ rolledBack: backup.plans.length })); return
  }
  const ids = args.includes('--ids') ? option('--ids')?.split(',').map(Number) : undefined
  if (ids && (!ids.length || ids.some(id => !Number.isSafeInteger(id) || id < 1))) throw new Error('--ids 須為正整數編號清單')
  const before = await db.formula.findMany({ where: ids ? { id: { in: ids } } : {}, include, orderBy: { id: 'asc' } })
  const plans = before.map(planFormulaRepair).filter(p => p.changeStatus || p.addSnapshot)
  console.log(JSON.stringify({ mode: args.includes('--apply') ? 'apply' : 'preview', formulas: plans.length, normalizeStatuses: plans.filter(p => p.changeStatus).length, currentSnapshots: plans.filter(p => p.addSnapshot).length, historicalVersionsReconstructed: 0 }))
  if (!args.includes('--apply') || !plans.length) return
  if (!args.includes('--backup') || !path.isAbsolute(option('--backup'))) throw new Error('--apply 必須指定 --backup 的絕對路徑')
  const actor = await db.user.findFirst({ where: { role: 'ADMIN', isActive: true }, orderBy: { id: 'asc' }, select: { id: true } })
  if (!actor) throw new Error('缺少可記錄修補作業的管理員帳號')
  const backup: Backup = { runId: randomUUID(), plans, before: before.filter(f => plans.some(p => p.id === f.id)).map(f => ({ id: f.id, status: f.status, updatedAt: f.updatedAt.toISOString(), currentVersion: f.currentVersion })) }
  const backupPath = option('--backup')
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), { flag: 'wx', mode: 0o600 })
  backup.applied = await db.$transaction(async tx => {
    const after: { id: number; updatedAt: string }[] = []
    for (const plan of plans) {
      const current = await tx.formula.findUniqueOrThrow({ where: { id: plan.id }, include })
      const original = before.find(f => f.id === plan.id)!
      if (hash(current) !== hash(original)) throw new Error('預覽後配方資料已變動，停止修補，請重新預覽')
      if (plan.addSnapshot) await tx.formulaVersion.create({ data: {
        formulaId: plan.id, version: plan.version, userId: actor.id, ingredientsSnapshot: plan.snapshot,
        changeNote: `資料修補 ${backup.runId}：以修補當下組成補建目前版本快照；不代表歷史配方或原始作者，早期版本未重建。`,
      } })
      const changed = await tx.formula.update({ where: { id: plan.id }, data: { status: plan.status } })
      after.push({ id: changed.id, updatedAt: changed.updatedAt.toISOString() })
    }
    return after
  }, { isolationLevel: 'Serializable', timeout: 120000 })
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), { mode: 0o600 })
  console.log(JSON.stringify({ repaired: backup.applied.length, backup: backupPath }))
}
main().catch(error => { console.error(error instanceof Error ? error.message.split('\n')[0] : '修補失敗'); process.exitCode = 1 }).finally(() => db.$disconnect())
