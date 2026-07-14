import { Router } from 'express'
import multer from 'multer'
import { PDFParse } from 'pdf-parse'
import { requireAuth } from '../middleware/auth'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

function extractField(text: string, ...patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return null
}

function parseCommissionPDF(rawText: string) {
  const flat = rawText.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ')

  // ── Header fields ─────────────────────────────────────────────────────────
  const code = extractField(flat,
    /No[:\s：]+([A-Z]{2,}[-][A-Z0-9\-]{3,})/,
    /試驗編號[：:]\s*([A-Z]{2,}[-][A-Z0-9\-]{3,})/,
  )

  const clientCompany = extractField(flat,
    /客戶公司名稱[^：:]*[：:]\s*(.+?)(?=布料代碼|客戶名稱|申請日期|\n)/,
    /Tên Cty Khách Hàng[^：:]*[：:]\s*(.+?)(?=布料代碼|客戶名稱|申請日期|\n)/,
  )

  const fabricCode = extractField(flat,
    /布料代碼[^：:]*[：:]\s*([A-Za-z0-9\-_]+)/,
    /Mã số vải[^：:]*[：:]\s*([A-Za-z0-9\-_]+)/,
  )

  const clientContact = extractField(flat,
    /客戶名稱[^：:]*[：:]\s*(.+?)(?=申請日期|布料代碼|類型|\n)/,
    /Người Liên lạc[^：:]*[：:]\s*(.+?)(?=申請日期|\n)/,
  )

  const experimentDate = extractField(flat, /申請日期[：:]\s*(\d{4}-\d{2}-\d{2})/)
  const expectedDate   = extractField(flat, /預計完成日[：:]\s*(\d{4}-\d{2}-\d{2})/)
  const actualDate     = extractField(flat, /實際完成日[：:]\s*(\d{4}-\d{2}-\d{2})/)

  let commissionType: string | null = null
  if (/☑\s*K/.test(flat)) commissionType = 'K'
  else if (/☑\s*B/.test(flat)) commissionType = 'B'
  else if (/☑\s*Q/.test(flat)) commissionType = 'Q'
  else if (/☑\s*O/.test(flat)) commissionType = 'O'

  const waitingForProcessing = /☑\s*待加工/.test(flat)
  const hasReport = /☑\s*報告/.test(flat)
  const costMatch = flat.match(/(\d[\d,]+)\s*VND/)
  const cost = costMatch ? Number(costMatch[1].replace(/,/g, '')) : null

  // ── Conclusions ────────────────────────────────────────────────────────────
  const conclusionBeforeMatch = flat.match(/結論\s*Before[：:\s]+(.+?)(?=結論\s*After)/s)
  const conclusionAfterMatch  = flat.match(/結論\s*After[：:\s]+(.+?)(?=(?:經理|化驗室人員|建立者|簽名)|$)/s)

  // ── Test items table ───────────────────────────────────────────────────────
  const HEADER_SKIP = /^(化學品名稱|Tên Mẫu|Lot No|Mã Hàng|測試目的|Mục đích|說明|Mô tả|結果|Kết quả)$/
  let testItems: Array<{
    chemicalName: string
    lotNo: string
    testPurposes: string[]
    description: string
    result: string
  }> = []

  const tStartIdx = flat.lastIndexOf('Kết quả')
  const tEndIdx   = flat.indexOf('備註', tStartIdx > 0 ? tStartIdx : 0)

  if (tStartIdx > 0 && tEndIdx > tStartIdx) {
    const tableSection = flat.substring(tStartIdx + 'Kết quả'.length, tEndIdx)
    const tableLines = tableSection
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !HEADER_SKIP.test(l))

    // Strategy 1: 5 lines per row
    for (let i = 0; i + 4 < tableLines.length; i += 5) {
      const [chemicalName, lotNo, purposeStr, description, result] = tableLines.slice(i, i + 5)
      if (!chemicalName || chemicalName.length > 80) continue
      testItems.push({
        chemicalName,
        lotNo: lotNo ?? '',
        testPurposes: (purposeStr ?? '').split(/[,、，]/).map(s => s.trim()).filter(Boolean),
        description: description ?? '',
        result: result ?? '',
      })
    }

    // Strategy 2: wide table rows (cells separated by 2+ spaces)
    if (testItems.length === 0) {
      const fullLine = tableSection.replace(/\n/g, '  ').trim()
      const cells = fullLine.split(/\s{2,}/).map(c => c.trim()).filter(Boolean)
      for (let i = 0; i + 4 < cells.length; i += 5) {
        const [chemicalName, lotNo, purposeStr, description, result] = cells.slice(i, i + 5)
        if (!chemicalName || HEADER_SKIP.test(chemicalName)) continue
        testItems.push({
          chemicalName,
          lotNo: lotNo ?? '',
          testPurposes: (purposeStr ?? '').split(/[,、，]/).map(s => s.trim()).filter(Boolean),
          description: description ?? '',
          result: result ?? '',
        })
      }
    }
  }

  return {
    code,
    clientCompany,
    fabricCode,
    clientContact,
    experimentDate,
    expectedDate,
    actualDate,
    commissionType,
    testItems,
    commissionNotes: { waitingForProcessing, report: hasReport, cost },
    conclusionBefore: conclusionBeforeMatch?.[1]?.trim().replace(/\s+/g, ' ') ?? null,
    conclusionAfter:  conclusionAfterMatch?.[1]?.trim().replace(/\s+/g, ' ') ?? null,
  }
}

router.post('/', requireAuth, upload.single('pdf'), async (req, res) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ success: false, error: { code: 'NO_FILE', message: '請上傳 PDF 檔案' } })
    return
  }
  if (!file.mimetype.includes('pdf')) {
    res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: '只接受 PDF 格式' } })
    return
  }

  const parser = new PDFParse({ data: file.buffer })
  const textResult = await parser.getText()
  const parsed = parseCommissionPDF(textResult.text)

  res.json({ success: true, data: parsed })
})

export default router
