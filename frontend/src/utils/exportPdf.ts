import dayjs from 'dayjs'

interface TableConfig {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

export function exportToPdf(tables: TableConfig[], filename?: string) {
  const title = tables[0]?.title ?? '報表'

  const tablesHtml = tables
    .map(
      (t) => `
      <h2>${t.title}</h2>
      <table>
        <thead><tr>${t.headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${t.rows
            .map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ''}</td>`).join('')}</tr>`)
            .join('')}
        </tbody>
      </table>`,
    )
    .join('<br/>')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body {
      font-family: 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif;
      font-size: 12px;
      color: #111;
      padding: 24px;
    }
    h1 { font-size: 18px; margin-bottom: 4px; }
    h2 { font-size: 15px; margin: 20px 0 8px; }
    .meta { color: #555; font-size: 11px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; white-space: nowrap; }
    th { background: #1677ff; color: #fff; font-weight: 600; }
    tr:nth-child(even) td { background: #f5f5f5; }
    @media print {
      @page { size: A4 landscape; margin: 15mm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">匯出時間：${dayjs().format('YYYY-MM-DD HH:mm')}${filename ? `　檔名：${filename}` : ''}</p>
  ${tablesHtml}
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) {
    alert('請允許瀏覽器開啟彈出視窗，再重試匯出 PDF')
  }
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}
