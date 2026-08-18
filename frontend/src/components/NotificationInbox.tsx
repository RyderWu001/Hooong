import { useState, useCallback } from 'react'
import { Popover, Badge, List, Tag, Button, Empty, Spin, Divider, Typography } from 'antd'
import {
  BellOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  HourglassOutlined,
  FileDoneOutlined,
  DashboardOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getAlerts, type AlertItem, type AlertCategory, type AlertSeverity } from '../api/dashboard'
import { useAlertCount } from '../hooks/useAlertCount'

const CATEGORY_ICON: Record<AlertCategory, React.ReactNode> = {
  lowStock:         <WarningOutlined />,
  expired:          <ExclamationCircleOutlined />,
  expiring:         <ClockCircleOutlined />,
  retention:        <HourglassOutlined />,
  pendingSignature: <FileDoneOutlined />,
}

const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: '#ef4444',
  warning:  '#f59e0b',
  info:     '#3b82f6',
}

const SEVERITY_TAG: Record<AlertSeverity, string> = {
  critical: 'error',
  warning:  'warning',
  info:     'processing',
}

const CATEGORY_I18N: Record<AlertCategory, string> = {
  lowStock:         'alert.lowStock',
  expired:          'alert.expired',
  expiring:         'alert.expiring',
  retention:        'alert.retention',
  pendingSignature: 'alert.pendingSignature',
}

export default function NotificationInbox() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { total: alertTotal, refresh } = useAlertCount()

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAlerts()
      // 依嚴重度排序：critical → warning → info
      const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }
      setItems([...data.items].sort((a, b) => order[a.severity] - order[b.severity]))
    } catch {
      // 靜默忽略
    } finally {
      setLoading(false)
    }
  }, [])

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (v) loadAlerts()
  }

  const handleItemClick = (item: AlertItem) => {
    setOpen(false)
    navigate(item.link)
  }

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation()
    loadAlerts()
    refresh()
  }

  const criticalCount = items.filter(i => i.severity === 'critical').length

  const content = (
    <div style={{ width: 380 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <Typography.Text strong style={{ fontSize: 15 }}>
          待處理提醒
          {alertTotal > 0 && (
            <Tag color="red" style={{ marginLeft: 8, fontSize: 12 }}>{alertTotal} 筆</Tag>
          )}
        </Typography.Text>
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          loading={loading}
          onClick={handleRefresh}
        />
      </div>

      {criticalCount > 0 && (
        <div style={{ margin: '0 12px 8px', padding: '6px 10px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
          <Typography.Text style={{ fontSize: 12, color: '#dc2626' }}>
            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
            {criticalCount} 項緊急需要立即處理
          </Typography.Text>
        </div>
      )}

      <Divider style={{ margin: '0 0 4px' }} />

      {/* List */}
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="目前無待處理提醒"
            style={{ padding: '24px 0' }}
          />
        ) : (
          <List
            size="small"
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{ padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
                className="inbox-item"
                onClick={() => handleItemClick(item)}
              >
                <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'flex-start' }}>
                  {/* 圖示 */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${SEVERITY_COLOR[item.severity]}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: SEVERITY_COLOR[item.severity],
                    flexShrink: 0, fontSize: 15,
                  }}>
                    {CATEGORY_ICON[item.category]}
                  </div>

                  {/* 內容 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Typography.Text
                        strong
                        ellipsis
                        style={{ fontSize: 13, flex: 1 }}
                      >
                        {t(item.titleKey, item.titleParams)}
                      </Typography.Text>
                      <Tag
                        color={SEVERITY_TAG[item.severity]}
                        style={{ fontSize: 11, margin: 0, flexShrink: 0 }}
                      >
                        {t(CATEGORY_I18N[item.category])}
                      </Tag>
                    </div>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: 12, display: 'block' }}
                      ellipsis={{ tooltip: t(item.detailKey, item.detailParams) }}
                    >
                      {t(item.detailKey, item.detailParams)}
                    </Typography.Text>
                    {item.daysLeft !== null && (
                      <Typography.Text
                        style={{
                          fontSize: 11,
                          color: item.daysLeft <= 0 ? '#ef4444' : item.daysLeft <= 7 ? '#f59e0b' : '#6b7280',
                        }}
                      >
                        {item.daysLeft <= 0
                          ? `已逾期 ${Math.abs(item.daysLeft)} 天`
                          : `${item.daysLeft} 天後到期`}
                      </Typography.Text>
                    )}
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>

      <Divider style={{ margin: '4px 0 0' }} />

      {/* Footer */}
      <div style={{ padding: '8px 16px' }}>
        <Button
          type="link"
          icon={<DashboardOutlined />}
          size="small"
          style={{ padding: 0 }}
          onClick={() => { setOpen(false); navigate('/dashboard') }}
        >
          查看完整儀表板
        </Button>
      </div>

      <style>{`
        .inbox-item:hover { background: #f8fafc !important; }
      `}</style>
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      arrow={false}
      overlayInnerStyle={{ padding: 0, borderRadius: 10, overflow: 'hidden' }}
      overlayStyle={{ paddingTop: 4 }}
    >
      <Badge count={alertTotal} size="small" overflowCount={99}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
            color: alertTotal > 0 ? '#f59e0b' : undefined,
            transition: 'background 0.15s',
          }}
          className="bell-btn"
        >
          <BellOutlined style={{ fontSize: 18 }} />
        </span>
      </Badge>
      <style>{`
        .bell-btn:hover { background: #f1f5f9; }
      `}</style>
    </Popover>
  )
}
