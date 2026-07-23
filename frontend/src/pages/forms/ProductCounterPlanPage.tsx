import { useEffect, useState, useCallback } from 'react'
import {
  Card, Table, Button, Space, Modal, Form, Input, DatePicker,
  Popconfirm, message, Divider, Checkbox, Select, Radio,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PrinterOutlined, ExperimentOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { getProductCounterPlans, createProductCounterPlan, updateProductCounterPlan, deleteProductCounterPlan } from '../../api/productCounterPlans'

const { TextArea } = Input

interface MaterialRow { name: string; ratio: string }
interface FormulaEntry { label: string; materials: MaterialRow[] }
interface CounterMaterial { supplier: string; name: string; model: string; composition: string; tds: string; appearance: string; solid: string; ph: string; brix: string; ionic: string; solubility: string }
interface RankingRow { rank: number; supplier: string; name: string; model: string; pros: string; cons: string }

interface ProductCounterPlan {
  id: number
  date: string | null
  productModel: string | null
  productName: string | null
  proposingDept: string | null
  measureType: string | null
  clientName: string | null
  proposer: string | null
  expectedDate: string | null
  issueSource: string[] | null
  issueDesc: string | null
  abnormalType: string[] | null
  counterFormulas: FormulaEntry[] | null
  counterMaterials: CounterMaterial[] | null
  rankings: RankingRow[] | null
  conclusion: string | null
  executionResult: string | null
  notes: string | null
  createdAt: string
}

const ISSUE_SOURCE_OPTIONS = ['客戶 / Khách hàng', '內部檢驗 / Kiểm tra nội bộ', '現場使用 / Sử dụng tại chỗ', '其他 / Khác']
const ABNORMAL_TYPE_OPTIONS = ['物性 / Vật lý', '穩定性 / Ổn định', '應用 / Ứng dụng', '外觀 / Ngoại quan', '其他 / Khác']

const DEFAULT_FORMULA = (): FormulaEntry => ({
  label: '',
  materials: Array.from({ length: 7 }, () => ({ name: '', ratio: '' })),
})

const DEFAULT_COUNTER_MATERIAL = (): CounterMaterial => ({
  supplier: '', name: '', model: '', composition: '', tds: '', appearance: '', solid: '', ph: '', brix: '', ionic: '', solubility: '',
})

const DEFAULT_RANKING = (rank: number): RankingRow => ({ rank, supplier: '', name: '', model: '', pros: '', cons: '' })

function printProductCounterPlan(row: ProductCounterPlan) {
  const issueSrc = Array.isArray(row.issueSource) ? row.issueSource : []
  const abnType = Array.isArray(row.abnormalType) ? row.abnormalType : []
  const cFormulas = Array.isArray(row.counterFormulas) && row.counterFormulas.length ? row.counterFormulas : Array.from({ length: 5 }, (_, i) => ({ label: `CT${i + 1}`, materials: [] as MaterialRow[] }))
  const cMaterials = Array.isArray(row.counterMaterials) && row.counterMaterials.length ? row.counterMaterials : Array.from({ length: 5 }, () => DEFAULT_COUNTER_MATERIAL())
  const rankings = Array.isArray(row.rankings) && row.rankings.length ? row.rankings : Array.from({ length: 5 }, (_, i) => DEFAULT_RANKING(i + 1))

  const formulaCols = cFormulas.map((f, fi) => {
    const matRows = f.materials.map(m => `<tr><td class="left">${m.name}</td><td>${m.ratio}</td></tr>`).join('')
    return `<td style="padding:4px;vertical-align:top;border-right:1px solid #000"><strong>CT${fi + 1}</strong>${f.label ? `<br><small>${f.label}</small>` : ''}<table style="width:100%;border-collapse:collapse;margin-top:4px;font-size:9px"><thead><tr><th>原料</th><th>%</th></tr></thead><tbody>${matRows}</tbody></table></td>`
  }).join('')

  const materialRows = cMaterials.map(m => `<tr><td>${m.supplier}</td><td>${m.name}</td><td>${m.model}</td><td>${m.composition}</td><td>${m.tds}</td><td>${m.appearance}</td><td>${m.solid}</td><td>${m.ph}</td><td>${m.brix}</td><td>${m.ionic}</td><td>${m.solubility}</td></tr>`).join('')
  const rankingRows = rankings.map(r => `<tr><td>${r.rank}</td><td>${r.supplier}</td><td>${r.name}</td><td>${r.model}</td><td class="left">${r.pros}</td><td class="left">${r.cons}</td></tr>`).join('')

  const cb = (opts: string[], val: string) => opts.includes(val) ? '☑' : '☐'

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>產品對抗計劃執行明細表 CMS03-07-5A</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Microsoft JhengHei','Noto Sans TC',Arial,sans-serif; font-size: 9.5px; color: #000; padding: 8mm; }
  .outer { border: 2px solid #000; }
  .header { display: flex; align-items: stretch; border-bottom: 2px solid #000; }
  .header-logo { width: 140px; border-right: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; }
  .logo-brand { font-size: 16px; font-weight: 900; }
  .logo-sub { font-size: 9px; color: #333; margin-top: 2px; }
  .header-title { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: center; padding: 6px; }
  .header-title h1 { font-size: 11px; font-weight: 900; }
  .header-title h2 { font-size: 10px; font-weight: bold; margin-top: 2px; }
  .header-right { width: 160px; border-left: 1px solid #000; padding: 6px 8px; display: flex; flex-direction: column; justify-content: center; gap: 4px; }
  .field { font-size: 9.5px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .section-title { background: #e8e8e8; padding: 3px 6px; font-weight: bold; font-size: 9.5px; border-bottom: 1px solid #000; border-top: 1px solid #000; }
  .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid #000; }
  .info-cell { padding: 3px 6px; border-right: 1px solid #000; font-size: 9px; }
  .info-cell:nth-child(3n) { border-right: none; }
  .info-label { color: #555; font-size: 8.5px; }
  .info-value { min-height: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th, td { border: 1px solid #000; padding: 2px 4px; text-align: center; }
  th { background: #e8e8e8; }
  td.left { text-align: left; }
  .check-row { padding: 4px 8px; border-bottom: 1px solid #000; font-size: 9.5px; }
  .free-text { padding: 4px 8px; min-height: 40px; border-top: 1px solid #000; white-space: pre-wrap; }
  .sig-row { display: grid; grid-template-columns: repeat(5, 1fr); border-top: 2px solid #000; }
  .sig-cell { padding: 4px 8px; border-right: 1px solid #000; min-height: 50px; text-align: center; }
  .sig-cell:last-child { border-right: none; }
  .sig-label { font-size: 8.5px; font-weight: bold; margin-bottom: 4px; }
  .footer { text-align: center; font-size: 8px; padding: 3px; border-top: 1px solid #ccc; }
  @media print { @page { margin: 6mm; size: A4 landscape; } }
</style>
</head>
<body>
<div class="outer">
  <div class="header">
    <div class="header-logo">
      <div class="logo-brand">RICH<sup>®</sup></div>
      <div class="logo-sub">CÔNG TY TNHH WANG LONG</div>
      <div class="logo-sub">旺隆責任有限公司</div>
    </div>
    <div class="header-title">
      <h1>BẢNG CHI TIẾT THỰC HIỆN KẾ HOẠCH ĐỐI SÁCH SẢN PHẨM</h1>
      <h2>產品對抗計劃執行明細表</h2>
    </div>
    <div class="header-right">
      <div class="field"><strong>表單編號:</strong> CMS03-07-5A</div>
      <div class="field"><strong>NGÀY / 日期:</strong> ${row.date ? dayjs(row.date).format('YYYY-MM-DD') : ''}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-cell"><div class="info-label">MODEL SP / 產品型號</div><div class="info-value">${row.productModel ?? ''}</div></div>
    <div class="info-cell"><div class="info-label">TÊN SẢN PHẨM / 產品名稱</div><div class="info-value">${row.productName ?? ''}</div></div>
    <div class="info-cell"><div class="info-label">BỘ PHẬN ĐỀ XUẤT / 提出部門</div><div class="info-value">${row.proposingDept ?? ''}</div></div>
    <div class="info-cell"><div class="info-label">KHÁCH HÀNG / 客戶名稱</div><div class="info-value">${row.clientName ?? ''}</div></div>
    <div class="info-cell"><div class="info-label">NGƯỜI ĐỀ XUẤT / 提出者</div><div class="info-value">${row.proposer ?? ''}</div></div>
    <div class="info-cell"><div class="info-label">預計完成 / NGÀY DỰ KIẾN</div><div class="info-value">${row.expectedDate ? dayjs(row.expectedDate).format('YYYY-MM-DD') : ''}</div></div>
  </div>

  <div class="check-row">
    <strong>對策類型:</strong>&nbsp;
    ${row.measureType === 'temporary' ? '☑' : '☐'} 臨時對策 / Đối sách tạm thời&nbsp;&nbsp;
    ${row.measureType === 'permanent' ? '☑' : '☐'} 永久對策 / Đối sách vĩnh viễn
  </div>

  <div class="check-row">
    <strong>問題來源 / NGUỒN VẤN ĐỀ:</strong>&nbsp;
    ${ISSUE_SOURCE_OPTIONS.map(o => `${cb(issueSrc, o)} ${o}`).join('&nbsp;&nbsp;')}
  </div>

  <div class="check-row">
    <strong>異常類型 / LOẠI BẤT THƯỜNG:</strong>&nbsp;
    ${ABNORMAL_TYPE_OPTIONS.map(o => `${cb(abnType, o)} ${o}`).join('&nbsp;&nbsp;')}
  </div>

  <div class="free-text">
    <strong>問題描述 / MÔ TẢ VẤN ĐỀ:</strong><br>${row.issueDesc ?? ''}
  </div>

  <div class="section-title">對抗配方 / CÔNG THỨC ĐỐI SÁCH</div>
  <table>
    <thead><tr>${cFormulas.map((_, i) => `<th>CT${i + 1}</th>`).join('')}</tr></thead>
    <tbody><tr>${formulaCols}</tr></tbody>
  </table>

  <div class="section-title">對抗原料內容摘要 / TÓM TẮT NGUYÊN LIỆU ĐỐI SÁCH</div>
  <table>
    <thead>
      <tr>
        <th>來源供應商</th><th>對抗原料名</th><th>型號</th><th>組成份</th><th>TDS/SDS</th>
        <th>外觀</th><th>固成分</th><th>pH1%</th><th>醣度%</th><th>離子性</th><th>溶解性</th>
      </tr>
    </thead>
    <tbody>${materialRows}</tbody>
  </table>

  <div class="section-title">對抗結果排名 / XẾP HẠNG KẾT QUẢ ĐỐI SÁCH</div>
  <table>
    <thead>
      <tr><th>排名</th><th>來源供應商</th><th>原料名</th><th>型號</th><th>優點分析</th><th>缺點分析</th></tr>
    </thead>
    <tbody>${rankingRows}</tbody>
  </table>

  <div class="free-text">
    <strong>結論 / KẾT LUẬN:</strong><br>${row.conclusion ?? ''}
  </div>
  <div class="free-text" style="border-top:1px solid #000">
    <strong>執行結果 / KẾT QUẢ THỰC HIỆN:</strong>&nbsp;${row.executionResult ?? ''}
  </div>
  <div class="free-text" style="border-top:1px solid #000">
    <strong>備註 / GHI CHÚ:</strong><br>${row.notes ?? ''}
  </div>

  <div class="sig-row">
    <div class="sig-cell"><div class="sig-label">董事長<br>CHỦ TỊCH HĐQT</div></div>
    <div class="sig-cell"><div class="sig-label">總經理<br>TỔNG GIÁM ĐỐC</div></div>
    <div class="sig-cell"><div class="sig-label">管理部<br>PHÒNG QUẢN LÝ</div></div>
    <div class="sig-cell"><div class="sig-label">技術經理<br>QUẢN LÝ KỸ THUẬT</div></div>
    <div class="sig-cell"><div class="sig-label">填表人<br>NGƯỜI ĐIỀN BIỂU</div></div>
  </div>

  <div class="footer">(附件11) CMS03-07-5A 產品對抗計劃執行明細表</div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`

  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function ProductCounterPlanPage() {
  const [list, setList] = useState<ProductCounterPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProductCounterPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const [counterFormulas, setCounterFormulas] = useState<FormulaEntry[]>(Array.from({ length: 5 }, DEFAULT_FORMULA))
  const [counterMaterials, setCounterMaterials] = useState<CounterMaterial[]>(Array.from({ length: 5 }, DEFAULT_COUNTER_MATERIAL))
  const [rankings, setRankings] = useState<RankingRow[]>(Array.from({ length: 5 }, (_, i) => DEFAULT_RANKING(i + 1)))

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await getProductCounterPlans({ page: p, limit: 20 })
      setList(res.data.data ?? [])
      setTotal(res.data.pagination?.total ?? 0)
    } catch { message.error('載入失敗') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page) }, [page, load])

  const resetState = () => {
    setCounterFormulas(Array.from({ length: 5 }, DEFAULT_FORMULA))
    setCounterMaterials(Array.from({ length: 5 }, DEFAULT_COUNTER_MATERIAL))
    setRankings(Array.from({ length: 5 }, (_, i) => DEFAULT_RANKING(i + 1)))
  }

  const openAdd = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs() })
    resetState()
    setModalOpen(true)
  }

  const openEdit = (row: ProductCounterPlan) => {
    setEditing(row)
    form.setFieldsValue({
      date: row.date ? dayjs(row.date) : null,
      productModel: row.productModel ?? '',
      productName: row.productName ?? '',
      proposingDept: row.proposingDept ?? '',
      measureType: row.measureType ?? undefined,
      clientName: row.clientName ?? '',
      proposer: row.proposer ?? '',
      expectedDate: row.expectedDate ? dayjs(row.expectedDate) : null,
      issueSource: Array.isArray(row.issueSource) ? row.issueSource : [],
      issueDesc: row.issueDesc ?? '',
      abnormalType: Array.isArray(row.abnormalType) ? row.abnormalType : [],
      conclusion: row.conclusion ?? '',
      executionResult: row.executionResult ?? undefined,
      notes: row.notes ?? '',
    })
    setCounterFormulas(row.counterFormulas?.length ? row.counterFormulas : Array.from({ length: 5 }, DEFAULT_FORMULA))
    setCounterMaterials(row.counterMaterials?.length ? row.counterMaterials : Array.from({ length: 5 }, DEFAULT_COUNTER_MATERIAL))
    setRankings(row.rankings?.length ? row.rankings : Array.from({ length: 5 }, (_, i) => DEFAULT_RANKING(i + 1)))
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload = {
        date: values.date ? values.date.format('YYYY-MM-DD') : null,
        productModel: values.productModel || null,
        productName: values.productName || null,
        proposingDept: values.proposingDept || null,
        measureType: values.measureType || null,
        clientName: values.clientName || null,
        proposer: values.proposer || null,
        expectedDate: values.expectedDate ? values.expectedDate.format('YYYY-MM-DD') : null,
        issueSource: values.issueSource ?? [],
        issueDesc: values.issueDesc || null,
        abnormalType: values.abnormalType ?? [],
        counterFormulas,
        counterMaterials,
        rankings,
        conclusion: values.conclusion || null,
        executionResult: values.executionResult || null,
        notes: values.notes || null,
      }
      if (editing) {
        await updateProductCounterPlan(editing.id, payload); message.success('已更新')
      } else {
        await createProductCounterPlan(payload); message.success('已新增')
      }
      setModalOpen(false); load(page)
    } catch { message.error('儲存失敗') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try { await deleteProductCounterPlan(id); message.success('已刪除'); load(page) }
    catch { message.error('刪除失敗') }
  }

  const updateFormula = (fi: number, mi: number, field: keyof MaterialRow, val: string) => {
    setCounterFormulas(prev => prev.map((f, i) => i === fi ? {
      ...f,
      materials: f.materials.map((m, j) => j === mi ? { ...m, [field]: val } : m),
    } : f))
  }

  const updateMaterial = (idx: number, field: keyof CounterMaterial, val: string) => {
    setCounterMaterials(prev => prev.map((m, i) => i === idx ? { ...m, [field]: val } : m))
  }

  const updateRanking = (idx: number, field: keyof RankingRow, val: string) => {
    setRankings(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const columns: ColumnsType<ProductCounterPlan> = [
    {
      title: '日期', dataIndex: 'date', key: 'date', width: 110,
      render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '—',
    },
    { title: '產品型號 / MODEL', dataIndex: 'productModel', key: 'productModel', render: v => v ?? '—' },
    { title: '產品名稱', dataIndex: 'productName', key: 'productName', render: v => v ?? '—' },
    { title: '客戶名稱', dataIndex: 'clientName', key: 'clientName', width: 130, render: v => v ?? '—' },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printProductCounterPlan(row)}>列印</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="確定刪除？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const matFields: (keyof CounterMaterial)[] = ['supplier', 'name', 'model', 'composition', 'tds', 'appearance', 'solid', 'ph', 'brix', 'ionic', 'solubility']
  const matHeaders = ['來源供應商', '原料名', '型號', '組成份', 'TDS/SDS', '外觀', '固成分', 'pH1%', '醣度%', '離子性', '溶解性']

  return (
    <Card
      title={<Space><ExperimentOutlined />產品對抗計劃執行明細表 (CMS03-07-5A)</Space>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>新增</Button>}
    >
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: t => `共 ${t} 筆` }}
        size="small"
      />

      <Modal
        open={modalOpen}
        title={editing ? '編輯產品對抗計劃執行明細表' : '新增產品對抗計劃執行明細表'}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnHidden
        width={1000}
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Divider plain style={{ margin: '0 0 8px', fontSize: 12 }}>基本資訊</Divider>
          <Space wrap size={8}>
            <Form.Item name="date" label="NGÀY / 日期"><DatePicker format="YYYY-MM-DD" /></Form.Item>
            <Form.Item name="productModel" label="MODEL SP / 產品型號" style={{ width: 140 }}><Input /></Form.Item>
            <Form.Item name="productName" label="TÊN SẢN PHẨM / 產品名稱" style={{ width: 160 }}><Input /></Form.Item>
            <Form.Item name="proposingDept" label="BỘ PHẬN / 提出部門" style={{ width: 140 }}><Input /></Form.Item>
            <Form.Item name="clientName" label="KHÁCH HÀNG / 客戶" style={{ width: 150 }}><Input /></Form.Item>
            <Form.Item name="proposer" label="NGƯỜI ĐỀ XUẤT / 提出者" style={{ width: 130 }}><Input /></Form.Item>
            <Form.Item name="expectedDate" label="預計完成日期"><DatePicker format="YYYY-MM-DD" /></Form.Item>
          </Space>

          <Form.Item name="measureType" label="對策類型 / LOẠI ĐỐI SÁCH">
            <Radio.Group>
              <Radio value="temporary">臨時對策 / Đối sách tạm thời</Radio>
              <Radio value="permanent">永久對策 / Đối sách vĩnh viễn</Radio>
            </Radio.Group>
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>問題描述與風險評估</Divider>
          <Form.Item name="issueSource" label="問題來源 / NGUỒN VẤN ĐỀ">
            <Checkbox.Group options={ISSUE_SOURCE_OPTIONS} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }} />
          </Form.Item>
          <Form.Item name="abnormalType" label="異常類型 / LOẠI BẤT THƯỜNG">
            <Checkbox.Group options={ABNORMAL_TYPE_OPTIONS} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }} />
          </Form.Item>
          <Form.Item name="issueDesc" label="問題描述 / MÔ TẢ VẤN ĐỀ">
            <TextArea rows={3} />
          </Form.Item>

          <Divider plain style={{ margin: '4px 0 8px', fontSize: 12 }}>對抗配方 CT1~CT5 / CÔNG THỨC ĐỐI SÁCH</Divider>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {counterFormulas.map((f, fi) => (
              <div key={fi} style={{ border: '1px solid #2d3f55', borderRadius: 4, padding: 8 }}>
                <div style={{ fontWeight: 'bold', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>CT{fi + 1}</div>
                <Input
                  size="small"
                  placeholder="配方標籤"
                  value={f.label}
                  onChange={e => setCounterFormulas(prev => prev.map((x, i) => i === fi ? { ...x, label: e.target.value } : x))}
                  style={{ marginBottom: 6 }}
                />
                {f.materials.map((m, mi) => (
                  <div key={mi} style={{ display: 'flex', gap: 2, marginBottom: 2 }}>
                    <Input size="small" placeholder="原料名" value={m.name} onChange={e => updateFormula(fi, mi, 'name', e.target.value)} style={{ flex: 3 }} />
                    <Input size="small" placeholder="%" value={m.ratio} onChange={e => updateFormula(fi, mi, 'ratio', e.target.value)} style={{ flex: 1 }} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>對抗原料內容摘要 / TÓM TẮT NGUYÊN LIỆU</Divider>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#162032' }}>
                  {matHeaders.map(h => (
                    <th key={h} style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {counterMaterials.map((m, idx) => (
                  <tr key={idx}>
                    {matFields.map(f => (
                      <td key={f} style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                        <Input size="small" value={m[f]} onChange={e => updateMaterial(idx, f, e.target.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>對抗結果排名 / XẾP HẠNG KẾT QUẢ</Divider>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#162032' }}>
                  {['排名', '來源供應商', '對抗原料名', '型號', '優點分析', '缺點分析'].map(h => (
                    <th key={h} style={{ padding: '3px 4px', border: '1px solid #2d3f55', color: '#94a3b8', fontWeight: 'normal' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rankings.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', padding: '2px 4px', border: '1px solid #2d3f55', color: '#94a3b8' }}>{r.rank}</td>
                    {(['supplier', 'name', 'model', 'pros', 'cons'] as (keyof RankingRow)[]).map(f => (
                      <td key={f} style={{ padding: '2px 3px', border: '1px solid #2d3f55' }}>
                        <Input size="small" value={r[f] as string} onChange={e => updateRanking(idx, f, e.target.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Divider plain style={{ margin: '12px 0 8px', fontSize: 12 }}>結論與執行結果</Divider>
          <Form.Item name="conclusion" label="結論 / KẾT LUẬN"><TextArea rows={3} /></Form.Item>
          <Form.Item name="executionResult" label="執行結果 / KẾT QUẢ THỰC HIỆN">
            <Select
              options={[
                { value: 'effective', label: '有效 / Hiệu quả' },
                { value: 'ineffective', label: '無效 / Không hiệu quả' },
                { value: 'monitoring', label: '持續追蹤 / Tiếp tục theo dõi' },
              ]}
              allowClear
            />
          </Form.Item>
          <Form.Item name="notes" label="備註 / GHI CHÚ"><TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
