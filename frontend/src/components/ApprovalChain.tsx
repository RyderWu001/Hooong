import { useEffect, useRef, useState, useCallback } from 'react'
import { Button, Modal, Space, Tag, Tooltip, Popconfirm, message, Typography, Upload } from 'antd'
import {
  CheckCircleOutlined, ClockCircleOutlined, UploadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { APPROVAL_CHAINS } from '../constants/approvalChains'
import {
  getFormSignatures, applySignature, retractSignature, getMySignature,
  type FormSignatureRecord,
} from '../api/formSignatures'
import { useAuthStore } from '../stores/authStore'

const { Text } = Typography

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '管理員',
  MANAGER: '經理',
  LAB_STAFF: '實驗室人員',
}

interface Props {
  formType: string
  formId: number
  onUpdate?: () => void
}

export default function ApprovalChain({ formType, formId, onUpdate }: Props) {
  const { user } = useAuthStore()
  const chain = APPROVAL_CHAINS[formType] ?? []
  const [sigs, setSigs] = useState<FormSignatureRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [signingSlot, setSigningSlot] = useState<{ name: string; order: number } | null>(null)
  const [myStoredSig, setMyStoredSig] = useState<string | null>(null)
  const [pastedImg, setPastedImg] = useState<string | null>(null)
  const pasteZoneRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getFormSignatures(formType, formId)
      setSigs(data)
    } finally {
      setLoading(false)
    }
  }, [formType, formId])

  useEffect(() => { load() }, [load])

  const openSignModal = async (slot: { name: string; order: number }) => {
    setSigningSlot(slot)
    setPastedImg(null)
    const stored = await getMySignature().catch(() => null)
    setMyStoredSig(stored)
  }

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    const blob = item.getAsFile()
    if (!blob) return
    const reader = new FileReader()
    reader.onload = ev => setPastedImg(ev.target?.result as string)
    reader.readAsDataURL(blob)
  }, [])

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = ev => setPastedImg(ev.target?.result as string)
    reader.readAsDataURL(file)
    return false
  }

  const handleSign = async () => {
    if (!signingSlot) return
    const img = pastedImg ?? myStoredSig
    if (!img) { message.warning('請先貼上或選擇您的簽名圖片'); return }
    try {
      await applySignature({
        formType, formId,
        slotName: signingSlot.name,
        slotOrder: signingSlot.order,
        signatureImg: img,
      })
      message.success(`「${signingSlot.name}」簽核完成`)
      setSigningSlot(null)
      load()
      onUpdate?.()
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? '簽核失敗')
    }
  }

  const handleRetract = async (sig: FormSignatureRecord) => {
    try {
      await retractSignature(sig.id)
      message.success('已撤回簽核')
      load()
      onUpdate?.()
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? '撤回失敗')
    }
  }

  // Map existing signatures by slotName
  const sigMap = Object.fromEntries(sigs.map(s => [s.slotName, s]))

  // Find first unsigned slot
  const firstUnsignedOrder = chain.find(s => !sigMap[s.name]?.signedAt)?.order ?? Infinity

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {chain.map(slot => {
          const sig = sigMap[slot.name]
          const signed = !!sig?.signedAt
          const isActive = !signed && slot.order === firstUnsignedOrder
          const isLocked = !signed && slot.order > firstUnsignedOrder

          return (
            <div
              key={slot.name}
              style={{
                border: `2px solid ${signed ? '#52c41a' : isActive ? '#1677ff' : '#444'}`,
                borderRadius: 8,
                padding: '10px 14px',
                minWidth: 120,
                textAlign: 'center',
                background: signed ? '#162312' : isActive ? '#111a2c' : '#1a1a1a',
                opacity: isLocked ? 0.45 : 1,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{slot.name}</div>

              {signed ? (
                <>
                  {sig.signatureImg && (
                    <img
                      src={sig.signatureImg}
                      alt="簽名"
                      style={{ maxWidth: 100, maxHeight: 48, display: 'block', margin: '0 auto 4px', objectFit: 'contain' }}
                    />
                  )}
                  <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 10 }}>
                    已簽核
                  </Tag>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                    {sig.signedByName}
                  </div>
                  <div style={{ fontSize: 10, color: '#666' }}>
                    {dayjs(sig.signedAt!).format('YYYY-MM-DD HH:mm')}
                  </div>
                  {sig.signedById === user?.id && (
                    <Popconfirm title="確定撤回此簽核？" onConfirm={() => handleRetract(sig)} okText="撤回" cancelText="取消">
                      <Button type="link" danger size="small" style={{ fontSize: 10, padding: '0 2px', height: 'auto', marginTop: 2 }}>
                        撤回
                      </Button>
                    </Popconfirm>
                  )}
                </>
              ) : isActive ? (
                <>
                  <Tag color="processing" icon={<ClockCircleOutlined />} style={{ fontSize: 10, marginBottom: 6 }}>
                    待簽核
                  </Tag>
                  <br />
                  {user?.role && slot.roles.includes(user.role) ? (
                    <Button
                      type="primary"
                      size="small"
                      style={{ fontSize: 11, marginTop: 4 }}
                      onClick={() => openSignModal(slot)}
                    >
                      簽核
                    </Button>
                  ) : (
                    <Tooltip title={`此欄需由 ${slot.roles.map(r => ROLE_LABEL[r]).join(' / ')} 簽核`}>
                      <Tag color="warning" style={{ fontSize: 10, marginTop: 4, cursor: 'default' }}>
                        無權限
                      </Tag>
                    </Tooltip>
                  )}
                </>
              ) : (
                <Tag color="default" style={{ fontSize: 10 }}>未輪到</Tag>
              )}
            </div>
          )
        })}
      </div>

      {/* 簽核 Modal */}
      <Modal
        title={`簽核：${signingSlot?.name}`}
        open={!!signingSlot}
        onCancel={() => setSigningSlot(null)}
        onOk={handleSign}
        okText="確認簽核"
        cancelText="取消"
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {myStoredSig && !pastedImg && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>您已儲存的簽名（點「確認簽核」直接使用）：</Text>
              <div style={{ border: '1px solid #333', borderRadius: 6, padding: 8, textAlign: 'center', background: '#111', marginTop: 4 }}>
                <img src={myStoredSig} alt="我的簽名" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
              </div>
            </div>
          )}

          {pastedImg && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>已選擇簽名：</Text>
              <div style={{ border: '1px solid #1677ff', borderRadius: 6, padding: 8, textAlign: 'center', background: '#111', marginTop: 4 }}>
                <img src={pastedImg} alt="簽名" style={{ maxHeight: 64, maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <Button type="link" size="small" onClick={() => setPastedImg(null)} style={{ padding: 0, marginTop: 2 }}>
                重選
              </Button>
            </div>
          )}

          <div
            ref={pasteZoneRef}
            contentEditable
            suppressContentEditableWarning
            tabIndex={0}
            style={{
              border: '2px dashed #444',
              borderRadius: 8,
              padding: '16px',
              textAlign: 'center',
              cursor: 'text',
              outline: 'none',
              color: '#888',
              fontSize: 12,
              userSelect: 'none',
            }}
            onPaste={handlePaste}
            onKeyDown={e => {
              if (!((e.ctrlKey || e.metaKey) && e.key === 'v')) e.preventDefault()
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#1677ff')}
            onBlur={e => (e.currentTarget.style.borderColor = '#444')}
          >
            點此處後按 <kbd style={{ background: '#222', border: '1px solid #555', borderRadius: 3, padding: '1px 4px' }}>Ctrl+V</kbd> 或<strong>右鍵 → 貼上</strong>簽名圖片
          </div>

          <Upload beforeUpload={handleFileUpload} showUploadList={false} accept="image/*">
            <Button icon={<UploadOutlined />} size="small">從檔案選擇簽名</Button>
          </Upload>

          <Text type="secondary" style={{ fontSize: 11 }}>
            簽核時間將自動記錄為：{dayjs().format('YYYY-MM-DD HH:mm')}
          </Text>
        </Space>
      </Modal>

      {loading && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>載入中...</div>}
    </div>
  )
}
