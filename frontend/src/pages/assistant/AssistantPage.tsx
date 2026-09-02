import { useEffect, useRef, useState } from 'react'
import {
  Card, Input, Button, Space, Typography, Alert, Tag, Avatar,
  Empty, Spin, Tooltip, Popconfirm,
} from 'antd'
import {
  SendOutlined, RobotOutlined, UserOutlined, ClearOutlined,
  DatabaseOutlined, BulbOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  askAssistant, getAssistantStatus, TOOL_LABEL,
  type ChatTurn, type ToolCallRecord, type AssistantStatus,
} from '../../api/assistant'
import styles from './AssistantPage.module.css'

const { Text, Paragraph } = Typography
const { TextArea } = Input

interface Message extends ChatTurn {
  /** 助理訊息才有：這次回答查了哪些資料 */
  toolCalls?: ToolCallRecord[]
  failed?: boolean
}

const EXAMPLE_KEYS = ['cost', 'priceChange', 'lowStock', 'usage', 'compare', 'expiring'] as const

export default function AssistantPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
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
      const reply = await askAssistant(question, history)
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: reply.answer,
        toolCalls: reply.toolCalls,
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
