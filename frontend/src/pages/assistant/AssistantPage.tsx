import { useEffect, useRef, useState } from 'react'
import {
  Card, Input, Button, Space, Typography, Alert, Tag, Avatar,
  Empty, Spin, Tooltip, Popconfirm, Select, message, Checkbox,
} from 'antd'
import {
  SendOutlined, RobotOutlined, UserOutlined, ClearOutlined,
  DatabaseOutlined, BulbOutlined,
} from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  askAssistant, getAssistantStatus, TOOL_LABEL, prepareExperimentDraft, confirmExperimentDraft, type ExperimentDraftReply,
  type ChatTurn, type ToolCallRecord, type AssistantStatus, type AssistantMode, type RoutingInfo,
} from '../../api/assistant'
import styles from './AssistantPage.module.css'
import TemplateAssistantPanel from './TemplateAssistantPanel'

const { Text, Paragraph } = Typography
const { TextArea } = Input

interface Message extends ChatTurn {
  /** 助理訊息才有：這次回答查了哪些資料 */
  toolCalls?: ToolCallRecord[]
  routing?: RoutingInfo
  failed?: boolean
}

const EXAMPLE_KEYS = ['cost', 'priceChange', 'lowStock', 'usage', 'compare', 'expiring'] as const

export default function AssistantPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<AssistantMode>('local')
  const [task, setTask] = useState<'query' | 'experiment' | 'template'>('query')
  const [completionLevel, setCompletionLevel] = useState<'faithful' | 'common'>('common')
  const [reviewedSuggestions, setReviewedSuggestions] = useState(false)
  const [draft, setDraft] = useState<ExperimentDraftReply | null>(null)
  const [saved, setSaved] = useState<{ id: number; code: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAssistantStatus().then(setStatus).catch(() => setStatus({ enabled: false, tools: [] }))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, draft, saved])

  const send = async (text: string, level: 'faithful' | 'common' = completionLevel) => {
    const question = text.trim()
    if (!question || loading) return

    // 送出前先把使用者訊息畫上去，讓輸入有立即回饋
    const history = messages
      .filter((m) => !m.failed)
      .map(({ role, content }) => ({ role, content }))
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setInput('')
    setLoading(true)

    try {
      if (task === 'experiment') {
        const reply = await prepareExperimentDraft(question, draft?.token, level)
        setReviewedSuggestions(false); setDraft(reply); setSaved(null)
        setMessages(prev => [...prev, { role: 'assistant', content: reply.answer }])
        return
      }
      const reply = await askAssistant(question, history, mode)
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: reply.answer,
        toolCalls: reply.toolCalls,
        routing: reply.routing,
      }])
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || (code === 'AI_RATE_LIMITED' ? t('assistant.rateLimited') : t('assistant.error')),
        failed: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setMessages([]); setDraft(null); setSaved(null); setReviewedSuggestions(false) }
  const confirm = async () => {
    if (!draft || loading || draft.missing.length || (draft.reviewRequired && !reviewedSuggestions)) return
    setLoading(true)
    try {
      setSaved(await confirmExperimentDraft(draft.token, reviewedSuggestions)); setDraft(null)
      message.success('實驗與所有組別已建立')
    } catch (e) {
      message.error((e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || '建立失敗，請重試')
    } finally { setLoading(false) }
  }

  if (status && !status.enabled) {
    return (
      <Card title={<Space><RobotOutlined />{t('assistant.title')}</Space>}>
        <Alert
          type="info"
          showIcon
          message={t('assistant.disabled')}
          description={t('assistant.disabledHint')}
        />
      </Card>
    )
  }

  return (
    <Card
      title={<Space><RobotOutlined />{t('assistant.title')}</Space>}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 210px)' } }}
      extra={
        messages.length > 0 && (
          <Popconfirm title={t('assistant.clear')} onConfirm={reset} disabled={loading}>
            <Button size="small" icon={<ClearOutlined />}>{t('assistant.clear')}</Button>
          </Popconfirm>
        )
      }
    >
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee' }}>
        <Space wrap>
          <Text>操作</Text>
          <Select aria-label="助理操作" value={task} disabled={loading} style={{ width: 190 }}
            onChange={value => { setTask(value); reset() }} options={[
              { value: 'query', label: '查詢與分析資料' },
              { value: 'template', label: '快速建立實驗範本', disabled: !status?.templateAllowed },
              { value: 'experiment', label: '建立實驗與補全', disabled: !status?.draftAllowed },
            ]} />
          {task === 'experiment' && <Select aria-label="實驗補全方式" value={completionLevel} disabled={loading} style={{ width: 195 }}
            onChange={setCompletionLevel} options={[
              { value: 'common', label: '依常識詳細補全' }, { value: 'faithful', label: '只整理已提供內容' },
            ]} />}
          {task !== 'template' && <><Text>處理模式</Text>
          <Select aria-label="AI 處理模式" value={task === 'experiment' ? 'local' : mode} disabled={loading || task === 'experiment'} style={{ width: 225 }}
            onChange={(value) => { setMode(value); reset() }} options={[
              { value: 'local', label: '本地模型' },
              { value: 'preview', label: '遮蔽預覽（不傳送）', disabled: !status?.hybridAllowed },
              { value: 'hybrid', label: '自動分流（本地＋雲端）', disabled: !status?.cloudReady || !status?.hybridAllowed },
            ]} /></>}
          {task === 'template' && <Tag color="purple">自動選擇本地／雲端</Tag>}
        </Space>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">{task === 'template' ? '先產生可編輯基本範本，再補充量測條件與步驟；雲端僅接收通用主題與目標。確認後才儲存。' : task === 'experiment' ? '描述產品、流程與變因。詳細補全可建議條件、步驟、設備及觀察項目，並標示 AI 建議；可用對話修改。請核對實際可用設備、材料與條件，確認後才會儲存。' : mode === 'local' ? '問題與查詢結果由本機模型處理。' : mode === 'preview' ? '先在本機辨識需求並查詢，顯示遮蔽後摘要；不會傳送到雲端。' : `送出後，允許的排名、庫存缺口或成本變動百分比將傳至 ${status?.cloudHost}；名稱與配方明細留在本機。多輪與其他需求使用本地模型。`}</Text>
          {!status?.cloudReady && status?.hybridAllowed && <div><Text type="secondary">雲端尚未啟用，可先使用遮蔽預覽。</Text></div>}
        </div>
      </div>
      {task === 'template' ? <TemplateAssistantPanel /> : <>
      <div className={styles.thread}>
        {messages.length === 0 ? (
          <div className={styles.intro}>
            <Empty
              image={<RobotOutlined style={{ fontSize: 44, color: '#cbd5e1' }} />}
              description={<Text type="secondary">{task === 'experiment' ? '把實驗想法寫在下方，先整理草稿，再用對話補全。' : t('assistant.intro')}</Text>}
            />
            <div className={styles.examples}>
              {task === 'experiment' && <Button icon={<BulbOutlined />} onClick={() => send('建立實驗：使用通用實驗範本，今天比較 25°C、40°C、60°C，各組處理 20 分鐘，重複 3 次，觀察產品外觀。')}>比較三種溫度，各重複三次</Button>}
              {task === 'query' && EXAMPLE_KEYS.map((k) => (
                <Button
                  key={k}
                  size="small"
                  icon={<BulbOutlined />}
                  onClick={() => send(t(`assistant.examples.${k}`))}
                >
                  {t(`assistant.examples.${k}`)}
                </Button>
              ))}
            </div>
            {task === 'query' && status && status.tools.length > 0 && (
              <div className={styles.toolList}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t('assistant.availableTools')}：
                </Text>
                <Space size={[4, 4]} wrap style={{ marginTop: 6 }}>
                  {status.tools.map((tool) => (
                    <Tooltip key={tool.name} title={tool.description}>
                      <Tag icon={<DatabaseOutlined />}>{TOOL_LABEL[tool.name] ?? tool.name}</Tag>
                    </Tooltip>
                  ))}
                </Space>
              </div>
            )}
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={m.role === 'user' ? styles.rowUser : styles.rowBot}>
              <Avatar
                size="small"
                icon={m.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                style={{
                  background: m.role === 'user' ? '#3b82f6' : m.failed ? '#dc2626' : '#16a34a',
                  flexShrink: 0,
                }}
              />
              <div className={m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}>
                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content}</Paragraph>
                {m.routing && <div style={{ marginTop: 8 }}>
                  <Tag color={m.routing.engine === 'cloud' ? 'purple' : 'green'}>{m.routing.engine === 'cloud' ? '雲端摘要' : m.routing.engine === 'preview' ? '遮蔽預覽・未傳送' : '本地處理'}</Tag>
                  <Text type="secondary">{m.routing.reason}</Text>
                  {m.routing.disclosed.length > 0 && <div><Text type="secondary">{m.routing.engine === 'preview' ? '預計傳送' : '傳送內容'}：{m.routing.disclosed.join('、')}</Text></div>}
                  {m.routing.payload !== undefined && <pre style={{ maxHeight: 240, overflow: 'auto', fontSize: 12 }}>{JSON.stringify(m.routing.payload, null, 2)}</pre>}
                </div>}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className={styles.sources}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {t('assistant.dataSource')}：
                    </Text>
                    <Space size={[4, 4]} wrap>
                      {m.toolCalls.map((c, i) => (
                        <Tooltip key={i} title={JSON.stringify(c.input)}>
                          <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>
                            {TOOL_LABEL[c.name] ?? c.name}
                          </Tag>
                        </Tooltip>
                      ))}
                    </Space>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className={styles.rowBot}>
            <Avatar size="small" icon={<RobotOutlined />} style={{ background: '#16a34a', flexShrink: 0 }} />
            <div className={styles.bubbleBot}>
              <Space><Spin size="small" /><Text type="secondary">{task === 'experiment' ? '本機模型正在整理實驗草稿…' : t('assistant.thinking')}</Text></Space>
            </div>
          </div>
        )}
        {draft && <Card size="small" title="實驗草稿・尚未儲存" style={{ margin: '16px 0' }}>
          <Alert type="warning" showIcon message="請核對所有條件與步驟。標示「AI 建議」的內容是試驗起始建議，尚未經實際驗證；確認採用後才會儲存。" />
          <Paragraph style={{ marginTop: 12 }}><strong>{draft.draft.title || '尚未填寫名稱'}</strong><br />
            範本：{draft.templateName || '待補充'} {draft.draft.inferredTemplate && <Tag color="orange">AI 建議</Tag>}　日期：{draft.draft.experimentDate || '待補充'}<br />
            配方：{draft.draft.formulaCode || '不綁定配方'}<br />
            草稿有效期限 30 分鐘，可重新送出描述更新。<br />
            共 {draft.draft.groups.reduce((n, g) => n + g.repeats, 0)} 組（包含重複）
          </Paragraph>
          {draft.draft.notes && <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{draft.draft.notes}</Paragraph>}
          {draft.draft.plan && Object.values(draft.draft.plan).some(v => Array.isArray(v) ? v.length : v) && <Card size="small" title={<Space>實驗計畫<Tag color="orange">AI 建議・待驗證</Tag></Space>} style={{ marginBottom: 12 }}>
            {draft.draft.plan.objective && <Paragraph>目的：{draft.draft.plan.objective}</Paragraph>}
            {([['equipment', '設備與工具'], ['measurements', '觀察／量測項目'], ['checks', '操作前檢查／假設']] as const).map(([key, label]) => draft.draft.plan[key].length > 0 && <div key={key}><Text strong>{label}</Text><ul>{draft.draft.plan[key].map((v, i) => <li key={i}>{v}</li>)}</ul></div>)}
          </Card>}
          {draft.draft.groups.map((g, i) => <Card key={i} size="small" title={<Space>{g.name} × {g.repeats}{g.inferred?.repeats && <Tag color="orange">重複次數：AI 建議</Tag>}</Space>} style={{ marginBottom: 8 }}>
            {Object.entries(g.conditions).map(([key, value]) => {
              const field = draft.fields.find(f => f.key === key)
              return <div key={key}>{field?.label || key}：{Array.isArray(value) ? value.join('、') : String(value)} {field?.unit || ''} <Tag color={g.inferred?.conditions.includes(key) ? 'orange' : 'blue'}>{g.inferred?.conditions.includes(key) ? 'AI 建議・待驗證' : '從描述整理'}</Tag></div>
            })}
            {g.steps.length > 0 && <ol>{g.steps.map((step, j) => <li key={j}>{step} <Tag color={g.inferred?.steps.includes(j) ? 'orange' : 'blue'}>{g.inferred?.steps.includes(j) ? 'AI 建議・待驗證' : '從描述整理'}</Tag></li>)}</ol>}
          </Card>)}
          {draft.draft.suggestions.length > 0 && <Alert type="info" message="待考慮的建議（未加入實驗）" description={draft.draft.suggestions.join('；')} />}
          {draft.missing.length > 0 && <Alert style={{ marginTop: 8 }} type="warning" message="請繼續輸入補充或修正" description={draft.missing.join('、')} />}
          {draft.reviewRequired && <div style={{ marginTop: 12 }}><Checkbox checked={reviewedSuggestions} disabled={loading} onChange={e => setReviewedSuggestions(e.target.checked)}>我已核對 AI 建議的條件、步驟及計畫，並確認採用</Checkbox></div>}
          <Space style={{ marginTop: 12 }}>
            <Button disabled={loading} onClick={() => { setCompletionLevel('common'); send('請依照基本常識補全缺少的條件、步驟、設備、觀察項目與操作前檢查，保留已指定的條件。', 'common') }}>繼續詳細補全</Button>
            <Popconfirm title="確認以上日期、條件與步驟，建立實驗和所有組別？" onConfirm={confirm} disabled={loading || !!draft.missing.length || (draft.reviewRequired && !reviewedSuggestions)}>
              <Button type="primary" disabled={loading || !!draft.missing.length || (draft.reviewRequired && !reviewedSuggestions)}>確認建立實驗</Button>
            </Popconfirm>
            <Button disabled={loading} onClick={reset}>捨棄草稿</Button>
          </Space>
        </Card>}
        {saved && <Alert type="success" showIcon message="實驗已建立" description={<Link to={`/experiments/${saved.id}`}>開啟實驗 {saved.code}</Link>} />}
        <div ref={bottomRef} />
      </div>

      <div className={styles.composer}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={task === 'experiment' ? '描述新實驗，或補充／修改草稿，例如：日期改為 2026-10-12，每組增加至 3 次。' : t('assistant.placeholder')}
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={loading}
          onPressEnter={(e) => {
            // Enter 送出、Shift+Enter 換行
            if (!e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          disabled={!input.trim()}
          onClick={() => send(input)}
        >
          {t('assistant.send')}
        </Button>
      </div>

      <div className={styles.disclaimer}>
        <Text type="secondary" style={{ fontSize: 11 }}>{t('assistant.disclaimer')}</Text>
      </div>
      </>}
    </Card>
  )
}
