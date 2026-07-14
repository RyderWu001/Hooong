import type { Experiment, CommissionTestItem } from '../types'
import dayjs from 'dayjs'

const COMMISSION_TYPE_LABEL: Record<string, string> = {
  K: 'K : R&D 研究開發',
  B: 'B : Comparison 對照測試',
  Q: 'Q : Replace 替代測試',
  O: 'O : Others 其他',
}

const ALL_PURPOSES = ['ΔE', 'Water repellence', 'Quick dry', 'Wicking', 'Handle', 'Tear Strength', 'Density', 'PH', 'Appearance', 'Other']

function renderTestRow(item: CommissionTestItem): string {
  const purposes = (item.testPurposes ?? []).join('、')
  return `
    <tr>
      <td>${item.chemicalName ?? ''}</td>
      <td>${item.lotNo ?? ''}</td>
      <td>${purposes}</td>
      <td style="white-space: pre-wrap;">${item.description ?? ''}</td>
      <td style="white-space: pre-wrap;">${item.result ?? ''}</td>
    </tr>
  `
}

export function printCommissionForm(experiment: Experiment) {
  const items: CommissionTestItem[] = (experiment.testItems as CommissionTestItem[]) ?? []
  const cn = (experiment.commissionNotes as any) ?? {}

  const checkMark = (v: boolean) => v ? '☑' : '☐'

  const win = window.open('', '_blank', 'width=900,height=1100')
  if (!win) return

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <title>實驗室委託單 — ${experiment.code}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Microsoft JhengHei', 'Noto Sans TC', Arial, sans-serif;
      font-size: 11px; color: #000; background: #fff; padding: 20px;
    }
    .center { text-align: center; }
    h1 { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
    h2 { font-size: 12px; font-weight: bold; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #333; padding: 4px 6px; vertical-align: top; }
    th { background: #e8e8e8; font-weight: bold; text-align: center; }
    .no-border { border: none; }
    .section { margin-top: 10px; }
    .sig-row { display: flex; }
    .sig-cell { flex: 1; border: 1px solid #333; min-height: 70px; padding: 6px; text-align: center; font-weight: bold; }
    .sig-cell + .sig-cell { border-left: none; }
    @media print {
      body { padding: 8px; }
      @page { margin: 8mm; }
    }
  </style>
</head>
<body>
  <div class="center"><h1>旺隆責任有限公司 / CÔNG TY TNHH WANG LONG (VIỆT NAM)</h1></div>
  <div class="center"><h2>實驗室委託單（化學品對布料效果測試表）/ PHIẾU YÊU CẦU PHÒNG THÍ NGHIỆM</h2></div>

  <table style="margin-bottom: 8px;">
    <tr>
      <td style="width: 50%">No: <strong>${experiment.code}</strong></td>
      <td style="width: 50%">試驗編號：<strong>${experiment.code}</strong></td>
    </tr>
    <tr>
      <td>客戶公司名稱 / Tên Cty Khách Hàng：${experiment.clientCompany ?? ''}</td>
      <td>申請日期：${dayjs(experiment.experimentDate).format('YYYY-MM-DD')}</td>
    </tr>
    <tr>
      <td>布料代碼 / Mã số vải：${experiment.fabricCode ?? ''}</td>
      <td>預計完成日：${experiment.expectedDate ? dayjs(experiment.expectedDate).format('YYYY-MM-DD') : ''}</td>
    </tr>
    <tr>
      <td>客戶名稱 / Người Liên lạc：${experiment.clientContact ?? ''}</td>
      <td>實際完成日：${experiment.actualDate ? dayjs(experiment.actualDate).format('YYYY-MM-DD') : ''}</td>
    </tr>
    <tr>
      <td colspan="2">
        類型：
        ${Object.entries(COMMISSION_TYPE_LABEL).map(([k, v]) =>
          `${experiment.commissionType === k ? '☑' : '☐'} ${v}&nbsp;&nbsp;&nbsp;`
        ).join('')}
      </td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th style="width:14%">化學品名稱<br>Tên Mẫu</th>
        <th style="width:11%">Lot No<br>Mã Hàng</th>
        <th style="width:22%">測試目的<br>Mục đích</th>
        <th style="width:26%">說明<br>Mô tả</th>
        <th style="width:27%">結果<br>Kết quả</th>
      </tr>
    </thead>
    <tbody>
      ${items.length > 0 ? items.map(renderTestRow).join('') : `
        <tr><td colspan="5" style="text-align:center;color:#999;padding:20px;">（無測試項目）</td></tr>
      `}
      <tr><td colspan="5" style="height:30px;">&nbsp;</td></tr>
    </tbody>
  </table>

  <table class="section">
    <tr>
      <td>
        備註 / Ghi chú：&nbsp;&nbsp;
        ${checkMark(!!cn.waitingForProcessing)} 待加工 đợi gia công &nbsp;&nbsp;
        ${checkMark(!!cn.report)} 報告 báo cáo &nbsp;&nbsp;
        ${checkMark(!!(cn.cost))} 成本 giá thành ${cn.cost ? cn.cost : ''} VND
      </td>
    </tr>
  </table>

  <table class="section">
    <tr>
      <th style="width:50%">結論 Before</th>
      <th style="width:50%">結論 After</th>
    </tr>
    <tr>
      <td style="height: 100px; vertical-align: top; white-space: pre-wrap;">${experiment.conclusionBefore ?? ''}</td>
      <td style="height: 100px; vertical-align: top; white-space: pre-wrap;">${experiment.conclusionAfter ?? ''}</td>
    </tr>
  </table>

  <div class="sig-row section">
    <div class="sig-cell">經理 / Giám Đốc<br><br><br><br><br></div>
    <div class="sig-cell" style="border-left: 1px solid #333;">化驗室人員 / Người phụ trách<br><br><br><br><br></div>
    <div class="sig-cell" style="border-left: 1px solid #333;">建立者 / Người đưa đơn<br><br><br><br><br></div>
  </div>

  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
</body>
</html>`

  win.document.write(html)
  win.document.close()
}
