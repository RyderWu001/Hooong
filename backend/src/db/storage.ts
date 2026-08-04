import { StorageClient } from '@supabase/storage-js'
import path from 'path'

function getStorage() {
  const storageUrl = `${process.env.SUPABASE_URL}/storage/v1`
  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? ''
  return new StorageClient(storageUrl, {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  })
}

const BUCKET = 'uploads'

/**
 * 上傳桶是否為公開讀取。
 *
 * 公開桶代表 SDS、COA、客戶樣品照片等檔案，任何人拿到網址就能永久存取，
 * 不受帳號停用影響。設定 STORAGE_PRIVATE=yes 可改為私有桶 + 短效簽名網址。
 *
 * 既有部署切換前需注意：資料庫中已存的是完整公開網址，改為私有後那些連結會失效，
 * 需要一次性轉換（見 README 的儲存設定說明）。
 */
const PRIVATE_MODE = process.env.STORAGE_PRIVATE === 'yes'

/** 簽名網址有效期限（秒）。 */
const SIGNED_URL_TTL = 60 * 60

export async function ensureBucket() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return
  const storage = getStorage()
  const { data: buckets, error } = await storage.listBuckets()
  if (error) throw error
  const existing = buckets?.find((b) => b.name === BUCKET)

  if (!existing) {
    const { error: createError } = await storage.createBucket(BUCKET, { public: !PRIVATE_MODE })
    if (createError) throw createError
    return
  }

  if (PRIVATE_MODE && existing.public) {
    console.warn(
      `⚠️  STORAGE_PRIVATE=yes，但 bucket "${BUCKET}" 目前仍是公開。` +
      '請在 Supabase 後台將其改為 private，並轉換資料庫中既有的公開網址。'
    )
  }
}

/**
 * 上傳檔案並回傳可存取的位址。
 * 公開模式回傳永久公開網址；私有模式回傳物件路徑，由 getFileUrl 換取簽名網址。
 */
export async function uploadToStorage(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<string> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('儲存服務未設定（SUPABASE_URL / SUPABASE_SERVICE_KEY 缺少）')
  }
  const storage = getStorage()
  const ext = path.extname(originalName).toLowerCase().slice(0, 10)
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  const { error } = await storage.from(BUCKET).upload(filename, buffer, {
    contentType: mimetype,
    upsert: false,
  })
  if (error) throw error

  if (PRIVATE_MODE) return filename

  const { data } = storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

/**
 * 將資料庫中儲存的值轉為前端可用的網址。
 * 舊資料存的是完整公開網址，直接原樣回傳；新的私有模式存的是物件路徑，需簽名。
 */
export async function getFileUrl(stored: string | null): Promise<string | null> {
  if (!stored) return null
  if (stored.startsWith('http://') || stored.startsWith('https://')) return stored
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null

  const storage = getStorage()
  const { data, error } = await storage.from(BUCKET).createSignedUrl(stored, SIGNED_URL_TTL)
  if (error) return null
  return data?.signedUrl ?? null
}
