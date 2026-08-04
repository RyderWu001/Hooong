/**
 * 將資料庫中的 Supabase 公開網址轉換為物件路徑。
 *
 * 上傳桶原本是公開的，任何人取得網址即可永久存取檔案。要改為私有 + 短效簽名網址
 * （STORAGE_PRIVATE=yes）之前，必須先把已存的完整公開網址轉成純檔名，
 * 否則 getFileUrl() 會把舊網址原樣回傳，切換後那些連結全部失效。
 *
 * 使用方式：
 *   npx tsx scripts/migrate-storage-urls.ts            # 預覽，不寫入
 *   npx tsx scripts/migrate-storage-urls.ts --apply    # 實際寫入
 *
 * 這支腳本可重複執行：已是路徑格式的值會被略過。
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

/** 公開網址格式：{SUPABASE_URL}/storage/v1/object/public/uploads/{filename} */
const PUBLIC_URL_RE = /\/storage\/v1\/object\/public\/uploads\/(.+)$/

function toPath(value: string | null): string | null {
  if (!value) return null
  if (!value.startsWith('http')) return null   // 已是路徑，不需轉換
  const m = value.match(PUBLIC_URL_RE)
  if (!m) return null                          // 外部網址，保持原樣
  return decodeURIComponent(m[1])
}

interface Target {
  label: string
  load: () => Promise<{ id: number; values: (string | null)[] }[]>
  save: (id: number, values: (string | null)[]) => Promise<unknown>
  columns: string[]
}

const TARGETS: Target[] = [
  {
    label: 'Attachment.fileUrl',
    columns: ['fileUrl'],
    load: async () => (await prisma.attachment.findMany({ select: { id: true, fileUrl: true } }))
      .map((r) => ({ id: r.id, values: [r.fileUrl] })),
    save: (id, [fileUrl]) =>
      prisma.attachment.update({ where: { id }, data: { fileUrl: fileUrl! } }),
  },
  {
    label: 'IngredientDocument.fileUrl',
    columns: ['fileUrl'],
    load: async () => (await prisma.ingredientDocument.findMany({ select: { id: true, fileUrl: true } }))
      .map((r) => ({ id: r.id, values: [r.fileUrl] })),
    save: (id, [fileUrl]) =>
      prisma.ingredientDocument.update({ where: { id }, data: { fileUrl: fileUrl! } }),
  },
  {
    label: 'Sample.photoUrl',
    columns: ['photoUrl'],
    load: async () => (await prisma.sample.findMany({ select: { id: true, photoUrl: true } }))
      .map((r) => ({ id: r.id, values: [r.photoUrl] })),
    save: (id, [photoUrl]) =>
      prisma.sample.update({ where: { id }, data: { photoUrl } }),
  },
  {
    label: 'IngredientBatch.qcPhotoAppearance / qcPhotoSolid',
    columns: ['qcPhotoAppearance', 'qcPhotoSolid'],
    load: async () => (await prisma.ingredientBatch.findMany({
      select: { id: true, qcPhotoAppearance: true, qcPhotoSolid: true },
    })).map((r) => ({ id: r.id, values: [r.qcPhotoAppearance, r.qcPhotoSolid] })),
    save: (id, [qcPhotoAppearance, qcPhotoSolid]) =>
      prisma.ingredientBatch.update({ where: { id }, data: { qcPhotoAppearance, qcPhotoSolid } }),
  },
]

async function main() {
  console.log(APPLY ? '⚙️  實際執行模式\n' : '🔍 預覽模式（加上 --apply 才會寫入）\n')

  let totalChanged = 0

  for (const target of TARGETS) {
    const rows = await target.load()
    const updates: { id: number; values: (string | null)[] }[] = []

    for (const row of rows) {
      const converted = row.values.map(toPath)
      // 只在至少有一欄需要轉換時才更新，其餘欄位保留原值
      if (converted.some((v) => v !== null)) {
        updates.push({
          id: row.id,
          values: row.values.map((orig, i) => converted[i] ?? orig),
        })
      }
    }

    console.log(`${target.label}`)
    console.log(`  掃描 ${rows.length} 筆，需轉換 ${updates.length} 筆`)

    if (updates.length > 0) {
      const sample = updates[0]
      console.log(`  範例：${String(rows.find((r) => r.id === sample.id)!.values[0]).slice(0, 70)}…`)
      console.log(`     → ${sample.values[0]}`)
    }

    if (APPLY && updates.length > 0) {
      await prisma.$transaction(updates.map((u) => target.save(u.id, u.values)))
      console.log(`  ✓ 已寫入 ${updates.length} 筆`)
    }

    totalChanged += updates.length
    console.log()
  }

  if (totalChanged === 0) {
    console.log('沒有需要轉換的資料。')
  } else if (APPLY) {
    console.log(`完成，共轉換 ${totalChanged} 筆。`)
    console.log('接下來：於 Supabase 後台將 uploads bucket 改為 private，並設定 STORAGE_PRIVATE=yes。')
  } else {
    console.log(`共 ${totalChanged} 筆待轉換。確認無誤後加上 --apply 執行。`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
