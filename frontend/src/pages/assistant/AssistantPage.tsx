import { useEffect, useRef, useState } from 'react'
import {
  Card, Input, Button, Space, Typography, Alert, Tag, Avatar,
  Empty, Spin, Tooltip, Popconfirm, Select,
} from 'antd'
import {
  SendOutlined, RobotOutlined, UserOutlined, ClearOutlined,
  DatabaseOutlined, BulbOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  askAssistant, getAssistantStatus, TOOL_LABEL,
  type ChatTurn, type ToolCallRecord, type AssistantStatus, type AssistantMode, type RoutingInfo,
} from '../../api/assistant'
import styles from './AssistantPage.module.css'

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
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAssistantStatus().then(setStatus).catch(() => setStatus({ enabled: false, tools: [] }))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
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
        content: code === 'AI_RATE_LIMITED' ? t('assistant.rateLimited') : t('assistant.error'),
        failed: true,
      }])
    } finally {
      setLoading(false)
    }
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
          <Popconfirm title={t('assistant.clear')} onConfirm={() => setMessages([])}>
            <Button size="small" icon={<ClearOutlined />}>{t('assistant.clear')}</Button>
          </Popconfirm>
        )
      }
    >
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee' }}>
        <Space wrap>
          <Text>處理模式</Text>
          <Select aria-label="AI 處理模式" value={mode} disabled={loading} style={{ width: 225 }}
            onChange={(value) => { setMode(value); setMessages([]) }} options={[
              { value: 'local', label: '本地模型' },
              { value: 'preview', label: '遮蔽預覽（不傳送）', disabled: !status?.hybridAllowed },
              { value: 'hybrid', label: '自動分流（本地＋雲端）', disabled: !status?.cloudReady || !status?.hybridAllowed },
            ]} />
        </Space>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">{mode === 'local' ? '問題與查詢結果由本機模型處理。' : mode === 'preview' ? '先在本機辨識需求並查詢，顯示遮蔽後摘要；不會傳送到雲端。' : `送出後，允許的排名、庫存缺口或成本變動百分比將傳至 ${status?.cloudHost}；名稱與配方明細留在本機。多輪與其他需求使用本地模型。`}</Text>
          {!status?.cloudReady && status?.hybridAllowed && <div><Text type="secondary">雲端尚未啟用，可先使用遮蔽預覽。</Text></div>}
        </div>
      </div>
      <div className={styles.thread}>
        {messages.length === 0 ? (
          <div className={styles.intro}>
            <Empty
              image={<RobotOutlined style={{ fontSize: 44, color: '#cbd5e1' }} />}
              description={<Text type="secondary">{t('assistant.intro')}</Text>}
            />
            <div className={styles.examples}>
              {EXAMPLE_KEYS.map((k) => (
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
            {status && status.tools.length > 0 && (
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
              <Space><Spin size="small" /><Text type="secondary">{t('assistant.thinking')}</Text></Space>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.composer}>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('assistant.placeholder')}
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
    </Card>
  )
}
