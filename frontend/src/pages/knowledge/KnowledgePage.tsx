import { useEffect, useRef, useState } from 'react'
import {
  Card, List, Button, Input, Select, Modal, Form, Tag, Space, Typography,
  Drawer, Divider, Popconfirm, message, Empty, Spin, Avatar, Tooltip,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined,
  RobotOutlined, SendOutlined, UserOutlined, BookOutlined,
} from '@ant-design/icons'
import {
  getArticles, getArticleCategories, createArticle, updateArticle, deleteArticle, aiChat,
} from '../../api/knowledge'
import type { KnowledgeArticle } from '../../types'
import { useAuthStore } from '../../stores/authStore'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text, Paragraph, Title } = Typography

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function KnowledgePage() {
  const { user } = useAuthStore()
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const canDelete = user?.role === 'ADMIN'

  const [articles, setArticles] = useState<KnowledgeArticle[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<string | undefined>()
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null)
  const [modalSaving, setModalSaving] = useState(false)
  const [form] = Form.useForm()

  // AI chat
  const [chatOpen, setChatOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const res = await getArticles({ keyword: keyword || undefined, category, limit: 50 })
      setArticles(res.data.data ?? [])
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await getArticleCategories()
      setCategories(res.data.data ?? [])
    } catch { }
  }

  useEffect(() => {
    fetchArticles()
    fetchCategories()
  }, [])

  const openCreate = () => {
    setEditingArticle(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article)
    form.setFieldsValue({ title: article.title, content: article.content, category: article.category, tags: article.tags })
    setModalOpen(true)
  }

  const handleModalSave = async (values: { title: string; content: string; category?: string; tags?: string }) => {
    setModalSaving(true)
    try {
      if (editingArticle) {
        await updateArticle(editingArticle.id, values)
        message.success('已更新')
      } else {
        await createArticle(values)
        message.success('已新增')
      }
      setModalOpen(false)
      fetchArticles()
      fetchCategories()
    } catch {
      message.error('儲存失敗')
    } finally {
      setModalSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteArticle(id)
      message.success('已刪除')
      if (selectedArticle?.id === id) { setSelectedArticle(null); setDrawerOpen(false) }
      fetchArticles()
    } catch {
      message.error('刪除失敗')
    }
  }

  const handleSendChat = async () => {
    const q = chatInput.trim()
    if (!q) return
    setChatInput('')
    const userMsg: ChatMessage = { role: 'user', content: q }
    setChatHistory((h) => [...h, userMsg])
    setChatLoading(true)
    try {
      const res = await aiChat(q, chatHistory.slice(-6))
      const answer = res.data.data.answer as string
      setChatHistory((h) => [...h, { role: 'assistant', content: answer }])
    } catch {
      setChatHistory((h) => [...h, { role: 'assistant', content: '⚠️ 發生錯誤，請稍後再試。' }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card
        title={<Space><BookOutlined />知識庫</Space>}
        extra={
          <Space>
            <Button
              icon={<RobotOutlined />}
              onClick={() => setChatOpen(true)}
            >
              AI 問答
            </Button>
            {canManage && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新增文章
              </Button>
            )}
          </Space>
        }
      >
        {/* 搜尋列 */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜尋標題、內容、標籤"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={fetchArticles}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="分類"
            options={categories.map((c) => ({ value: c, label: c }))}
            value={category}
            onChange={(v) => setCategory(v)}
            allowClear
            style={{ width: 160 }}
          />
          <Button icon={<SearchOutlined />} onClick={fetchArticles}>搜尋</Button>
          <Button onClick={() => { setKeyword(''); setCategory(undefined); }}>清除</Button>
        </Space>

        {loading
          ? <Spin style={{ display: 'block', margin: '40px auto' }} />
          : articles.length === 0
            ? <Empty description="尚無文章" />
            : (
              <List
                dataSource={articles}
                renderItem={(article) => (
                  <List.Item
                    style={{ cursor: 'pointer', padding: '12px 8px', borderRadius: 6 }}
                    actions={canManage ? [
                      <Tooltip title="編輯">
                        <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEdit(article) }} />
                      </Tooltip>,
                      canDelete && (
                        <Popconfirm
                          title="刪除此文章？"
                          onConfirm={(e) => { e?.stopPropagation(); handleDelete(article.id) }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      ),
                    ].filter(Boolean) : []}
                    onClick={() => { setSelectedArticle(article); setDrawerOpen(true) }}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{article.title}</Text>
                          {article.category && <Tag color="blue">{article.category}</Tag>}
                          {article.tags && article.tags.split(',').filter(Boolean).map((t) => (
                            <Tag key={t} color="default">{t.trim()}</Tag>
                          ))}
                        </Space>
                      }
                      description={
                        <Space>
                          <Text type="secondary">{article.content.substring(0, 80)}{article.content.length > 80 ? '…' : ''}</Text>
                          <Text type="secondary">· {article.createdByName} · {dayjs(article.updatedAt).format('YYYY-MM-DD')}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )
        }
      </Card>

      {/* 文章詳情 Drawer */}
      <Drawer
        title={selectedArticle?.title}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
        extra={
          canManage && selectedArticle && (
            <Space>
              <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(selectedArticle)}>編輯</Button>
              {canDelete && (
                <Popconfirm title="刪除此文章？" onConfirm={() => handleDelete(selectedArticle.id)}>
                  <Button danger size="small" icon={<DeleteOutlined />}>刪除</Button>
                </Popconfirm>
              )}
            </Space>
          )
        }
      >
        {selectedArticle && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              {selectedArticle.category && <Tag color="blue">{selectedArticle.category}</Tag>}
              {selectedArticle.tags && selectedArticle.tags.split(',').filter(Boolean).map((t) => (
                <Tag key={t}>{t.trim()}</Tag>
              ))}
            </Space>
            <Text type="secondary">
              作者：{selectedArticle.createdByName} · 最後更新：{dayjs(selectedArticle.updatedAt).format('YYYY-MM-DD HH:mm')}
            </Text>
            <Divider />
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {selectedArticle.content}
            </div>
          </Space>
        )}
      </Drawer>

      {/* 新增 / 編輯 Modal */}
      <Modal
        title={editingArticle ? '編輯文章' : '新增文章'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleModalSave}>
          <Form.Item name="title" label="標題" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分類">
            <Input placeholder="例：染色知識、品質管理、安全注意事項" />
          </Form.Item>
          <Form.Item name="tags" label="標籤（逗號分隔）">
            <Input placeholder="例：染料, 溫度, pH值" />
          </Form.Item>
          <Form.Item name="content" label="內容" rules={[{ required: true }]}>
            <TextArea rows={12} placeholder="輸入文章內容…" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={modalSaving}>儲存</Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>

      {/* AI 問答 Drawer */}
      <Drawer
        title={<Space><RobotOutlined />AI 知識庫問答</Space>}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        width={560}
        footer={
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="輸入問題，例如：酸性染料的最佳 pH 值範圍？"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onPressEnter={handleSendChat}
              disabled={chatLoading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendChat}
              loading={chatLoading}
              disabled={!chatInput.trim()}
            >
              送出
            </Button>
          </Space.Compact>
        }
      >
        {chatHistory.length === 0 && (
          <Empty
            description={
              <span>
                輸入問題，AI 將根據知識庫內容作答<br />
                <Text type="secondary">例：染色時如何控制 pH 值？</Text>
              </span>
            }
          />
        )}
        <List
          dataSource={chatHistory}
          renderItem={(msg) => (
            <List.Item style={{ border: 'none', padding: '8px 0', alignItems: 'flex-start' }}>
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                    style={{ background: msg.role === 'user' ? '#1677ff' : '#52c41a', flexShrink: 0 }}
                  />
                }
                title={<Text strong>{msg.role === 'user' ? '您' : 'AI 助理'}</Text>}
                description={
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, marginTop: 4 }}>
                    {msg.content}
                  </div>
                }
              />
            </List.Item>
          )}
        />
        {chatLoading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <Spin size="small" /> <Text type="secondary"> AI 思考中…</Text>
          </div>
        )}
        <div ref={chatEndRef} />
      </Drawer>
    </Space>
  )
}
