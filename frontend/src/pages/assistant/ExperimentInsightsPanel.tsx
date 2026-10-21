import { useEffect, useState } from 'react'
import { Alert, Button, Card, Checkbox, Collapse, Empty, Input, Select, Space, Table, Tag, Typography, message } from 'antd'
import { Link } from 'react-router-dom'
import { analyzeExperimentResults, findHistoryExperiments, getInsightExperiments, type HistoryMatch, type InsightExperiment, type ResultAnalysis, type InsightGroup } from '../../api/assistant'
const { Text, Paragraph } = Typography
const errorText = (e: unknown) => (e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || '讀取失敗，請稍後重試'
function Groups({ groups }: { groups: InsightGroup[] }) {
  return <Collapse size="small" items={groups.map(g => ({ key: g.id, label: g.name, children: <><Paragraph style={{ whiteSpace: 'pre-wrap' }}>{Object.entries(g.conditions).map(([k, v]) => `${k}：${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n') || '未記錄條件'}</Paragraph>{g.steps.length > 0 && <ol>{g.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}</> }))} />
}
export default function ExperimentInsightsPanel({ task }: { task: 'history' | 'analysis' }) {
  const [experiments, setExperiments] = useState<InsightExperiment[]>([])
  const [question, setQuestion] = useState('')
  const [referenceId, setReferenceId] = useState<number>()
  const [ids, setIds] = useState<number[]>([])
  const [comparable, setComparable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<{ matches: HistoryMatch[]; notice: string; capped: boolean } | null>(null)
  const [analysis, setAnalysis] = useState<ResultAnalysis | null>(null)
  const [summary, setSummary] = useState('')
  const [loadError, setLoadError] = useState('')
  const load = () => { setLoadError(''); getInsightExperiments().then(setExperiments).catch(e => setLoadError(errorText(e))) }
  useEffect(load, [])
  const options = experiments.map(e => ({ value: e.id, label: `${e.code}｜${e.date}｜${e.templateName ?? '無範本'}${e.hasResult ? '' : '（尚無結果）'}` }))
  async function run(explain = false) {
    setLoading(true)
    try {
      if (task === 'history') setHistory(await findHistoryExperiments(question, referenceId))
      else { const r = await analyzeExperimentResults(ids, comparable, explain); setAnalysis(r); setSummary(r.summary) }
    } catch (e) { message.error(errorText(e)) } finally { setLoading(false) }
  }
  return <div style={{ overflow: 'auto', padding: 20 }}>
    {loadError && <Alert type="error" message={loadError} action={<Button onClick={load}>重試</Button>} style={{ marginBottom: 12 }} />}
    {task === 'history' ? <>
      <Paragraph>描述產品、實驗目的或條件，搜尋過往紀錄。選擇參照實驗可比較範本、配方與操作差異。資料在本機後端比對。</Paragraph>
      <Input.TextArea aria-label="歷史實驗需求" rows={3} value={question} onChange={e => { setQuestion(e.target.value); setHistory(null) }} maxLength={1000} placeholder="例如：找洗髮精黏度、泡沫與穩定性相關實驗" disabled={loading} />
      <Space wrap style={{ margin: '12px 0' }}><Select aria-label="參照實驗" allowClear showSearch optionFilterProp="label" style={{ width: 460, maxWidth: '100%' }} placeholder="選擇參照實驗（可不選）" options={options} value={referenceId} onChange={v => { setReferenceId(v); setHistory(null) }} disabled={loading} /><Button type="primary" loading={loading} disabled={question.trim().length < 2} onClick={() => run()}>尋找歷史參考</Button></Space>
      {history && <><Alert type="info" message={history.notice} description={history.capped ? '候選已達200筆上限，可補充關鍵詞縮小範圍。' : undefined} style={{ marginBottom: 12 }} />{!history.matches.length && <Empty description="找不到相符紀錄，請試其他產品或條件詞" />}{history.matches.map(m => <Card key={m.id} size="small" title={<Link to={`/experiments/${m.id}`}>{m.code}｜{m.date}</Link>} style={{ marginBottom: 12 }}>
        <Space wrap>{m.templateName && <Tag>{m.templateName}</Tag>}{m.formulaName && <Tag>{m.formulaName}</Tag>}<Text>相似排序分數 {m.score}</Text></Space>
        <Paragraph>{m.reasons.join('；')}</Paragraph><Alert type="info" message="有來源的參考建議" description={m.suggestions.join('\n')} style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }} />{m.differences.length > 0 && <Alert type="warning" message="與参照實驗的差異" description={m.differences.join('；')} />}
        <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{m.purpose || '未記錄目的／說明'}</Paragraph>
        <Text strong>可參考欄位：</Text><Paragraph>{m.fields.map(f => `${f.label}${f.unit ? ` (${f.unit})` : ''}`).join('、') || '未關聯範本'}</Paragraph>
        <Groups groups={m.groups} />
        {m.result && <Paragraph>來源實測值／評分：{Object.entries(m.result.measurements).map(([k, v]) => `${k}=${v}`).join('；') || '未記錄有效數值'}</Paragraph>}
        <Paragraph style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{m.result ? `來源記錄狀態：${m.result.status}\n結果：${m.result.description || '未填'}\n反思：${m.result.reflection || '未填'}\n改善：${m.result.improvement || '未填'}` : '尚無結果；只能參考設計，不代表已成功。'}</Paragraph>
      </Card>)}</>}
    </> : <>
      <Paragraph>選擇1到8筆實驗，比對組別設計與實驗層級結果。數值由程式計算；本機 AI 僅從已核對事實中選出重點。</Paragraph>
      <Select aria-label="結果比較實驗" mode="multiple" maxCount={8} showSearch optionFilterProp="label" style={{ width: '100%' }} placeholder="選擇實驗（最近100筆）" options={options} value={ids} onChange={v => { setIds(v); setAnalysis(null); setSummary(''); setComparable(false) }} disabled={loading} />
      <div style={{ margin: '12px 0' }}><Checkbox checked={comparable} disabled={loading} onChange={e => { setComparable(e.target.checked); setAnalysis(null); setSummary('') }}>已核對所選實驗同名項目的單位、量測方法與評分尺度一致，可計算摘要統計</Checkbox></div>
      <Space wrap><Button type="primary" loading={loading} disabled={!ids.length} onClick={() => run()}>計算結果摘要</Button><Button loading={loading} disabled={!ids.length} onClick={() => run(true)}>本機 AI 整理重點</Button></Space>
      {analysis && <>
        <Tag style={{ marginTop: 12 }} color={analysis.engine === 'local' ? 'green' : 'blue'}>{analysis.engine === 'local' ? '本機 AI 已整理重點' : '本機程式計算'}</Tag>
        <Alert style={{ margin: '12px 0' }} type="info" message="各組條件是設計設定，不是分組量測值；目前無法計算組間實測差異。" description={analysis.modelNotice} />
        <Text strong>組別設計條件比較（設定值）</Text>
        <Table size="small" pagination={false} rowKey={r => `${r.templateName}-${r.field}`} dataSource={analysis.groupComparisons} columns={[
          { title: '範本／欄位', render: (_, r) => `${r.templateName}／${r.field}` },
          { title: '各組設定', render: (_, r) => r.values.map(v => `${v.code}・${v.group}：${JSON.stringify(v.value)}`).join('；') },
          { title: '差異', render: (_, r) => r.varies ? <Tag color="blue">設定不同</Tag> : '設定相同' },
        ]} />
        <Text strong>實驗層級結果比較（實測值與評分）</Text>
        <Table size="small" pagination={false} rowKey="dimension" scroll={{ x: 700 }} dataSource={analysis.metrics} columns={[
          { title: '實測項目／評分', dataIndex: 'dimension' },
          { title: '來源值', render: (_, m) => m.points.map(p => `${p.code}：${p.value ?? '缺漏'}`).join('；') },
          { title: '數據摘要', render: (_, m) => m.stats ? `n=${m.stats.n}；平均=${m.stats.mean.toFixed(4)}；範圍=${m.stats.min}～${m.stats.max}；樣本SD=${m.stats.sampleSd?.toFixed(4) ?? '不足2筆'}` : '尚未確認可比性' },
          { title: '異常候選（IQR）', render: (_, m) => m.stats && m.stats.n >= 4 ? m.stats.outliers.join('、') || '無' : '需可比較的4筆以上' },
        ]} />
        {!analysis.metrics.length && <Empty description="沒有有效數值；下方仍可查看來源、組別與缺漏" />}
        {analysis.warnings.length > 0 && <Alert style={{ marginTop: 12 }} type="warning" message="缺漏與資料檢查" description={analysis.warnings.join('；')} />}
        <Collapse style={{ margin: '12px 0' }} items={analysis.experiments.map(e => ({ key: e.id, label: `${e.code}｜${e.date}`, children: <><Link to={`/experiments/${e.id}`}>查看原始實驗</Link><Paragraph style={{ whiteSpace: 'pre-wrap' }}>{e.resultDescription || '無結果說明'}</Paragraph><Groups groups={e.groups} /></> }))} />
        <Text strong>可編輯摘要（編輯內容尚未寫回實驗）</Text><Input.TextArea aria-label="可編輯結果摘要" rows={12} value={summary} onChange={e => setSummary(e.target.value)} />
        <Button style={{ marginTop: 8 }} onClick={async () => { try { await navigator.clipboard.writeText(summary); message.success('摘要已複製') } catch { message.error('請選取摘要文字後複製') } }}>複製摘要</Button>
      </>}
    </>}
  </div>
}
