import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'

interface TableConfig {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

export function exportToPdf(tables: TableConfig[], filename?: string) {
  const doc = new jsPDF({ orientation: 'landscape' })
  let isFirst = true

  for (const table of tables) {
    if (!isFirst) doc.addPage()
    isFirst = false

    // 標題
    doc.setFontSize(14)
    doc.text(table.title, 14, 18)
    doc.setFontSize(10)
    doc.text(`匯出時間：${dayjs().format('YYYY-MM-DD HH:mm')}`, 14, 26)

    autoTable(doc, {
      startY: 32,
      head: [table.headers],
      body: table.rows.map((r) => r.map(String)),
      styles: { font: 'helvetica', fontSize: 9 },
      headStyles: { fillColor: [22, 119, 255], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })
  }

  const name = filename ?? `report_${dayjs().format('YYYYMMDD_HHmm')}.pdf`
  doc.save(name)
}
