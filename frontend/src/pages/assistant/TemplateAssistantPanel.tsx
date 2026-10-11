import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Checkbox, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { prepareTemplateDraft, enrichTemplateDraft, saveTemplateDraft, supplementTemplateDraft, type TemplateDraft, type TemplateReply } from '../../api/assistant'

const types = [{ value: 'text', label: '文字' }, { value: 'textarea', label: '多行文字' }, { value: 'number', label: '數值' }, { value: 'select', label: '單選' }, { value: 'multiselect', label: '多選' }, { value: 'date', label: '日期' }]
export default function TemplateAssistantPanel() {
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState<TemplateReply | null>(null)
  const [draft, setDraft] = useState<TemplateDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [saved, setSaved] = useState(false)
  const sequence = useRef(0)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => { sequence.current++; controller.current?.abort() }, [])
  useEffect(() => { if (!loading) return; setSeconds(0); const t = setInterval(() => setSeconds(n => n + 1), 1000); return () => clearInterval(t) }, [loading])
  const update = (next: TemplateDraft) => { setDraft(next); setReviewed(false) }
  const generate = async () => {
    if (!question.trim() || loading || saving) return
    const version = ++sequence.current
    controller.current?.abort(); const c = new AbortController(); controller.current = c
    setLoading(true); setError(''); setReviewed(false); setSaved(false); setDraft(null); setReply(null)
    try {
      const starter = await prepareTemplateDraft(question.trim(), c.signal)
      if (sequence.current !== version) return
      setReply(starter.target === 'cloud' ? { ...starter, disclosed: ['通用產品類型', '通用設計目標'] } : starter); setDraft(starter.draft)
      if (starter.target !== 'rules') {
        const enriched = await enrichTemplateDraft(starter.token, c.signal)
        if (sequence.current !== version) return
        setReply(enriched); setDraft(enriched.draft)
      }
    } catch (e) {
      if (sequence.current === version) setError((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || '補充未完成；已有基本範本時可繼續編輯，或重新產生。')
    } finally { if (sequence.current === version) setLoading(false) }
  }
  const save = async () => {
    if (!draft || !reply || !reviewed || loading || saving || saved) return
    setSaving(true); setError('')
    try { await saveTemplateDraft(reply.token, { ...draft, protocol: draft.protocol.map(s => s.trim()).filter(Boolean), checks: draft.checks.map(s => s.trim()).filter(Boolean), fields: draft.fields.map(f => ({ ...f, options: ['select', 'multiselect'].includes(f.type) ? f.options.map(s => s.trim()).filter(Boolean) : [] })) }); setSaved(true) }
    catch (e) { setError((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || '儲存失敗，請稍後再試。') }
    finally { setSaving(false) }
  }
  const supplement = async () => {
    if (!draft || !reply || loading || saving || saved) return
    setSaving(true); setReviewed(false); setError('')
    try {
      const result = await supplementTemplateDraft(reply.token, { ...draft, protocol: draft.protocol.map(s => s.trim()).filter(Boolean), checks: draft.checks.map(s => s.trim()).filter(Boolean) })
      setReply({ ...result, disclosed: reply.disclosed, cloudSummary: reply.cloudSummary }); setDraft(result.draft)
    } catch (e) { setError((e as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || '補全失敗，請檢查欄位格式後重試。') }
    finally { setSaving(false) }
  }
  const changeField = (index: number, patch: Partial<TemplateDraft['fields'][number]>) => { if (draft) update({ ...draft, fields: draft.fields.map((f, i) => i === index ? { ...f, ...patch } : f) }) }
  const disabled = loading || saving || saved
  return <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
    <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
      {!draft && <Typography.Paragraph>描述範本用途，例如「洗髮精增稠比較，記錄黏度、泡沫與穩定性」。欄位、量測設定及操作建議都可修改。</Typography.Paragraph>}
      {error && <Alert type="warning" showIcon message={error} style={{ marginBottom: 12 }} />}
      {loading && <Alert type="info" showIcon message={draft ? `基本範本已就緒，正在補充細節（${seconds} 秒）` : '正在整理基本範本…'} description={<Button size="small" onClick={() => { sequence.current++; controller.current?.abort(); setLoading(false) }}>停止補充，保留目前草稿</Button>} style={{ marginBottom: 12 }} />}
      {draft && reply && <Card size="small" title="實驗範本草稿・尚未儲存">
        <Tag color={reply.engine === 'cloud' ? 'purple' : 'green'}>{reply.engine === 'cloud' ? '雲端補充' : reply.engine === 'local' ? '本機模型補充' : '本地基本範本'}</Tag>
        <Typography.Paragraph>{reply.reason}</Typography.Paragraph>
        <Button style={{ marginBottom: 12 }} disabled={disabled} onClick={supplement}>依常識詳細補全（保留修改）</Button>
        <Typography.Paragraph type="secondary">補全包含設計目的、固定條件、獨立重複、設備、判定與數據分析。每個欄位的「填寫建議」提供方法及需確認的條件，數值型欄位的建議也會保留。</Typography.Paragraph>
        {reply.cloudSummary && <details><summary>{reply.disclosed.length > 0 ? '已送出補充請求的通用摘要' : '預計傳送的通用摘要'}</summary><pre>{JSON.stringify(reply.cloudSummary, null, 2)}</pre></details>}
        <Alert type="info" message="這是設計建議，尚未經實驗或文獻驗證。私有配方、指定數值與未辨識的需求不會交給雲端；請在此補入並核對。草稿有效 30 分鐘。" />
        <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
          <Input aria-label="範本名稱" addonBefore="名稱" value={draft.name} disabled={disabled} maxLength={100} onChange={e => update({ ...draft, name: e.target.value })} />
          <Input aria-label="範本領域" addonBefore="領域" value={draft.domain} disabled={disabled} maxLength={80} onChange={e => update({ ...draft, domain: e.target.value })} />
          <Input.TextArea aria-label="範本說明" value={draft.description} disabled={disabled} maxLength={1500} onChange={e => update({ ...draft, description: e.target.value })} autoSize={{ minRows: 2, maxRows: 5 }} />
        </Space>
        <Table rowKey="key" size="small" pagination={false} dataSource={draft.fields} scroll={{ x: 860 }} style={{ marginTop: 12 }} columns={[
          { title: '欄位名稱', width: 160, render: (_, f, i) => <Input aria-label={`欄位名稱 ${i + 1}`} value={f.label} disabled={disabled} maxLength={100} onChange={e => changeField(i, { label: e.target.value })} /> },
          { title: '類型', width: 115, render: (_, f, i) => <Select aria-label={`欄位類型 ${i + 1}`} value={f.type} options={types} disabled={disabled} onChange={type => changeField(i, { type })} style={{ width: '100%' }} /> },
          { title: '單位', width: 100, render: (_, f, i) => <Input value={f.unit} disabled={disabled} maxLength={30} onChange={e => changeField(i, { unit: e.target.value })} /> },
          { title: '分類', width: 130, render: (_, f, i) => <Input value={f.section} disabled={disabled} maxLength={60} onChange={e => changeField(i, { section: e.target.value })} /> },
          { title: '選項／常識填寫建議', width: 230, render: (_, f, i) => ['select', 'multiselect'].includes(f.type) ? <Space direction="vertical"><Input.TextArea value={f.options.join('\n')} disabled={disabled} onChange={e => changeField(i, { options: e.target.value.split('\n') })} /><Input.TextArea aria-label={`填寫建議 ${i + 1}`} value={f.placeholder} disabled={disabled} maxLength={300} onChange={e => changeField(i, { placeholder: e.target.value })} /></Space> : <Input.TextArea aria-label={`填寫建議 ${i + 1}`} value={f.placeholder} disabled={disabled} maxLength={300} autoSize={{ minRows: 2, maxRows: 5 }} onChange={e => changeField(i, { placeholder: e.target.value })} /> },
          { title: '', width: 70, render: (_, f) => <Button danger size="small" disabled={disabled || draft.fields.length <= 1} onClick={() => update({ ...draft, fields: draft.fields.filter(x => x.key !== f.key) })}>移除</Button> },
        ]} />
        <Button style={{ marginTop: 8 }} disabled={disabled || draft.fields.length >= 40} onClick={() => { let n = 1; while (draft.fields.some(f => f.key === `field_${n}`)) n++; update({ ...draft, fields: [...draft.fields, { key: `field_${n}`, label: '新欄位', type: 'text', unit: '', section: '', options: [], placeholder: '' }] }) }}>新增欄位</Button>
        <Typography.Paragraph style={{ marginTop: 16, marginBottom: 4 }}>操作順序（每行一步）</Typography.Paragraph>
        <Input.TextArea aria-label="範本操作順序" value={draft.protocol.join('\n')} disabled={disabled} autoSize={{ minRows: 3, maxRows: 8 }} onChange={e => update({ ...draft, protocol: e.target.value.split('\n') })} />
        <Typography.Paragraph style={{ marginTop: 16, marginBottom: 4 }}>檢查項目與假設（每行一項）</Typography.Paragraph>
        <Input.TextArea aria-label="範本檢查項目" value={draft.checks.join('\n')} disabled={disabled} autoSize={{ minRows: 3, maxRows: 6 }} onChange={e => update({ ...draft, checks: e.target.value.split('\n') })} />
        <Checkbox style={{ marginTop: 16 }} checked={reviewed} disabled={disabled} onChange={e => setReviewed(e.target.checked)}>我已核對欄位、步驟及假設，確認採用</Checkbox>
        <div style={{ marginTop: 12 }}><Popconfirm title="儲存為可重複使用的實驗範本？" onConfirm={save} disabled={!reviewed || disabled}><Button type="primary" disabled={!reviewed || disabled} loading={saving}>確認建立範本</Button></Popconfirm></div>
      </Card>}
      {saved && <Alert type="success" message="範本已建立" description={<Link to="/experiment-templates">前往實驗範本，可用於新增實驗</Link>} style={{ marginTop: 12 }} />}
    </div>
    <Space.Compact style={{ padding: 16, width: '100%' }}>
      <Input.TextArea aria-label="描述新實驗範本" placeholder="描述產品與範本用途；若需保密，請加上「保密／僅本地」。" value={question} maxLength={2000} disabled={loading || saving} onChange={e => setQuestion(e.target.value)} autoSize={{ minRows: 2, maxRows: 4 }} />
      <Button type="primary" loading={loading} disabled={!question.trim() || saving} onClick={generate}>產生範本</Button>
    </Space.Compact>
  </div>
}
