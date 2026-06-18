import { StorageClient } from '@supabase/storage-js'
import path from 'path'

const storageUrl = `${process.env.SUPABASE_URL}/storage/v1`
const serviceKey = process.env.SUPABASE_SERVICE_KEY!

const storage = new StorageClient(storageUrl, {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
})

const BUCKET = 'uploads'

export async function ensureBucket() {
  const { data: buckets, error } = await storage.listBuckets()
  if (error) throw error
  const exists = buckets?.some((b) => b.name === BUCKET)
  if (!exists) {
    const { error: createError } = await storage.createBucket(BUCKET, { public: true })
    if (createError) throw createError
  }
}

export async function uploadToStorage(
  buffer: Buffer,
  originalName: string,
  mimetype: string
): Promise<string> {
  const ext = path.extname(originalName)
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  const { error } = await storage.from(BUCKET).upload(filename, buffer, {
    contentType: mimetype,
    upsert: false,
  })
  if (error) throw error

  const { data } = storage.from(BUCKET).getPublicUrl(filename)
  return data.publicUrl
}
