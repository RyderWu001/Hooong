import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

interface SheetConfig {
  name: string
  headers: string[]
  rows: (string | number)[][]
}

export function exportToExcel(sheets: SheetConfig[], filename?: string) {
  const wb = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows])

    // 自動欄寬
    ws['!cols'] = sheet.headers.map((h, i) => ({
      wch: Math.max(
        h.length * 2,
        ...sheet.rows.map((r) => String(r[i] ?? '').length)
      ),
    }))

    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }

  const name = filename ?? `report_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`
  XLSX.writeFile(wb, name)
}
