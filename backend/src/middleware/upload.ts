import multer from 'multer'

/**
 * 共用的檔案上傳設定。
 *
 * memoryStorage 會把整個檔案讀進記憶體，沒有 limits 時單一請求就能耗盡伺服器記憶體。
 * mimetype 由前端提供且可偽造，因此同時比對副檔名，並禁止會在瀏覽器中執行的型別
 * （上傳桶為公開存取，HTML/SVG 一旦存入即等同在該網域上掛任意腳本）。
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20MB

const ALLOWED = new Map<string, string[]>([
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/gif', ['.gif']],
  ['image/webp', ['.webp']],
  ['application/pdf', ['.pdf']],
  ['application/msword', ['.doc']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
  ['application/vnd.ms-excel', ['.xls']],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ['.xlsx']],
  ['text/csv', ['.csv']],
  ['text/plain', ['.txt']],
])

export class UploadTypeError extends Error {
  code = 'INVALID_FILE_TYPE'
}

function fileFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const allowedExts = ALLOWED.get(file.mimetype)
  if (!allowedExts) {
    cb(new UploadTypeError(`不支援的檔案類型：${file.mimetype}`))
    return
  }
  const name = file.originalname.toLowerCase()
  if (!allowedExts.some((ext) => name.endsWith(ext))) {
    cb(new UploadTypeError('副檔名與檔案類型不符'))
    return
  }
  cb(null, true)
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 10 },
  fileFilter,
})

/** 掃描用途：只收 PDF，額度較大。 */
export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(new UploadTypeError('僅接受 PDF 檔案'))
      return
    }
    cb(null, true)
  },
})
