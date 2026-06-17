import dayjs from 'dayjs'

interface TableConfig {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

export function exportToPdf(tables: TableConfig[], filename?: string) {
  const exportTime = dayjs().format('YYYY-MM-DD HH:mm')
  const docTitle = filename?.replace(/\.pdf$/, '') ?? '報表'

  const tableHtml = tables
    .map(
      (t) => `
      <section>
        <h2>${t.title}</h2>
        <table>
          <thead>
            <tr>${t.headers.map((h) => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${t.rows
              .map(
                (r) =>
                  `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </section>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", sans-serif;
      font-size: 13px;
      color: #222;
      padding: 28px 32px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #1677ff;
      padding-bottom: 8px;
      margin-bottom: 24px;
    }
    header h1 { font-size: 18px; color: #1677ff; }
    header span { font-size: 11px; color: #888; }
    section { margin-bottom: 36px; }
    h2 {
      font-size: 14px;
      color: #1677ff;
      margin-bottom: 8px;
      padding-left: 6px;
      border-left: 3px solid #1677ff;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #1677ff;
      color: #fff;
      padding: 7px 10px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 6px 10px;
      border-bottom: 1px solid #e8e8e8;
    }
    tr:nth-child(even) td { background: #f7f9ff; }
    @page { size: A4 landscape; margin: 12mm; }
    @media print {
      body { padding: 0; }
      section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${docTitle}</h1>
    <span>匯出時間：${exportTime}</span>
  </header>
  ${tableHtml}
  <script>
    window.onload = function () {
      window.print();
    };
  </script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1000,height=700')
  if (!win) {
    alert('請允許彈出視窗以匯出 PDF')
    return
  }
  win.document.write(html)
  win.document.close()
}
