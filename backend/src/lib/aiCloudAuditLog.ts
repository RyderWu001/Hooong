import { appendFile, mkdir } from 'fs/promises'
import path from 'path'

const DIR = path.join(__dirname, '..', '..', 'audit_logs')

export interface CloudDisclosureEntry {
  userId: number
  userEmail: string
  role: string
  question: string
  tool: string
  disclosed: string[]
  payload: unknown
  outcome: 'sent' | 'failed'
}

/** 每次真正把資料送出雲端（成功或失敗都算）留下永久紀錄，供事後稽核；寫檔失敗絕不能擋住使用者拿到回覆。 */
export async function logCloudDisclosure(entry: CloudDisclosureEntry) {
  try {
    await mkdir(DIR, { recursive: true })
    const date = new Date().toISOString().slice(0, 10)
    const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + '\n'
    await appendFile(path.join(DIR, `ai-cloud-disclosures-${date}.log`), line, 'utf8')
  } catch (e) {
    console.error('雲端揭露稽核紀錄寫入失敗', e)
  }
}
