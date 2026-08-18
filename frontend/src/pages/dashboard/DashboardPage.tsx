import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Row, Col, Statistic, List, Tag, Typography, Space, Empty,
  Button, Skeleton, Tooltip,
} from 'antd'
import {
  WarningOutlined, ClockCircleOutlined, InboxOutlined, AuditOutlined,
  ExperimentOutlined, RiseOutlined, FallOutlined, ReloadOutlined,
  CheckCircleOutlined, FileTextOutlined, RightOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  getAlerts, getDashboardSummary,
  type AlertSummary, type AlertItem, type AlertCategory, type DashboardSummary,
} from '../../api/dashboard'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'

const { Text, Title } = Typography

const SEVERITY_COLOR: Record<AlertItem['severity'], string> = {
  critical: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
}

const CATEGORY_ICON: Record<AlertCategory, React.ReactNode> = {
  lowStock: <InboxOutlined />,
  expired: <WarningOutlined />,
  expiring: <ClockCircleOutlined />,
  retention: <ClockCircleOutlined />,
  pendingSignature: <AuditOutlined />,
}

/** 提醒分類的顯示順序 */
const ALERT_CATEGORIES: AlertCategory[] = [
  'lowStock', 'expired', 'expiring', 'retention', 'pendingSignature',
]

/** 各分類點擊後跳轉的頁面（pendingSignature 依項目決定） */
const CATEGORY_LINK: Record<AlertCategory, string> = {
  lowStock:         '/materials?tab=3',
  expired:          '/materials?tab=4',
  expiring:         '/materials?tab=4',
  retention:        '/experiments',
  pendingSignature: '/materials',
}

const RESULT_COLOR: Record<string, string> = {
  SUCCESS: 'success',
  FAILED: 'error',
  OBSERVING: 'processing',
  NEEDS_ADJUST: 'warning',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t, i18n } = useTranslation()
  const [alerts, setAlerts] = useState<AlertSummary | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, s] = await Promise.all([
        getAlerts().catch(() => null),
        getDashboardSummary().catch(() => null),
      ])
      setAlerts(a)
      setSummary(s)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // 提醒文字由 key + 參數組合，其中 formKey/slotKey 是需要再翻譯一層的巢狀 key
  const alertTitle = (i: AlertItem) => t(i.titleKey, {
    ...i.titleParams,
    form: i.titleParams.formKey ? t(String(i.titleParams.formKey)) : undefined,
  })
  const alertDetail = (i: AlertItem) => t(i.detailKey, {
    ...i.detailParams,
    slot: i.detailParams.slotKey
      ? t(String(i.detailParams.slotKey), { defaultValue: String(i.detailParams.slotFallback ?? '') })
      : undefined,
  })

  const items = alerts?.items ?? []

  const monthDelta = summary
    ? summary.experiments.thisMonth - summary.experiments.prevMonth
    : 0

  const greeting = (() => {
    const h = dayjs().hour()
    if (h < 12) return t('dashboard.greetingMorning')
    if (h < 18) return t('dashboard.greetingAfternoon')
    return t('dashboard.greetingEvening')
  })()

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            {greeting}，{user?.username}
          </Title>
          <Text type="secondary">
            {i18n.language === 'vi' ? dayjs().format('dddd, DD/MM/YYYY') : dayjs().format('YYYY 年 MM 月 DD 日 dddd')}
          </Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>{t('common.refresh')}</Button>
        </Col>
      </Row>

      {/* 統計卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Skeleton loading={loading} active paragraph={false}>
              <Statistic
                title={t('dashboard.monthExperiments')}
                value={summary?.experiments.thisMonth ?? 0}
                suffix={t('common.records')}
                prefix={<ExperimentOutlined style={{ color: '#3b82f6' }} />}
              />
              {summary && summary.experiments.prevMonth > 0 && (
                <Text type={monthDelta >= 0 ? 'success' : 'danger'} style={{ fontSize: 12 }}>
                  {monthDelta >= 0 ? <RiseOutlined /> : <FallOutlined />}
                  {' '}{t('dashboard.vsLastMonth')} {monthDelta >= 0 ? '+' : ''}{monthDelta}
                </Text>
              )}
            </Skeleton>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Skeleton loading={loading} active paragraph={false}>
              {/* 尚無已判定結果時顯示 —，避免 0% 被誤讀成全部失敗 */}
              <Statistic
                title={t('dashboard.monthSuccessRate')}
                value={summary?.experiments.successRate ?? '—'}
                suffix={summary?.experiments.successRate !== null ? '%' : ''}
                prefix={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {summary?.experiments.successRate === null
                  ? t('dashboard.noJudgedResults')
                  : t('dashboard.successFailed', {
                      success: summary?.experiments.byStatus.SUCCESS ?? 0,
                      failed: summary?.experiments.byStatus.FAILED ?? 0,
                    })}
              </Text>
            </Skeleton>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Skeleton loading={loading} active paragraph={false}>
              <Statistic
                title={t('dashboard.pendingAlerts')}
                value={alerts?.total ?? 0}
                suffix={t('common.items')}
                valueStyle={{ color: (alerts?.criticalCount ?? 0) > 0 ? '#dc2626' : undefined }}
                prefix={<WarningOutlined style={{ color: (alerts?.criticalCount ?? 0) > 0 ? '#dc2626' : '#94a3b8' }} />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {(alerts?.criticalCount ?? 0) > 0
                  ? t('dashboard.criticalCount', { count: alerts?.criticalCount })
                  : t('dashboard.noCritical')}
              </Text>
            </Skeleton>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card size="small">
            <Skeleton loading={loading} active paragraph={false}>
              <Statistic
                title={t('dashboard.formulasIngredients')}
                value={summary?.totals.formulas ?? 0}
                suffix={`／${summary?.totals.ingredients ?? 0}`}
                prefix={<FileTextOutlined style={{ color: '#8b5cf6' }} />}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('dashboard.activeSamples', { count: summary?.totals.activeSamples ?? 0 })}
              </Text>
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 待辦提醒：分類彙總（個別項目請由右上角鈴鐺查閱） */}
        <Col xs={24} lg={10}>
          <Card
            size="small"
            title={
              <Space>
                <WarningOutlined />
                {t('dashboard.todoAlerts')}
                {items.length > 0 && <Tag color="red">{items.length}</Tag>}
              </Space>
            }
            styles={{ body: { padding: '4px 0' } }}
          >
            <Skeleton loading={loading} active paragraph={{ rows: 5 }}>
              {items.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('dashboard.noTodo')}
                  style={{ padding: '16px 0' }}
                />
              ) : (
                <>
                  {ALERT_CATEGORIES.map(cat => {
                    const count = alerts?.counts[cat] ?? 0
                    const catItems = items.filter(i => i.category === cat)
                    const hasCritical = catItems.some(i => i.severity === 'critical')
                    const hasWarning  = catItems.some(i => i.severity === 'warning')
                    const iconColor   = count === 0 ? '#cbd5e1'
                      : hasCritical ? '#dc2626'
                      : hasWarning  ? '#d97706'
                      : '#2563eb'
                    const tagColor = hasCritical ? 'error' : hasWarning ? 'warning' : 'processing'

                    const handleCatClick = () => {
                      if (count === 0) return
                      if (cat === 'pendingSignature' && catItems.length === 1) {
                        navigate(catItems[0].link)
                      } else {
                        navigate(CATEGORY_LINK[cat])
                      }
                    }

                    const tooltipItems = catItems.slice(0, 6).map(i => alertTitle(i))
                    const tooltipExtra = catItems.length > 6 ? `…等 ${catItems.length} 筆` : null

                    return (
                      <Tooltip
                        key={cat}
                        placement="right"
                        title={
                          count > 0 ? (
                            <div>
                              {tooltipItems.map((title, idx) => (
                                <div key={idx} style={{ lineHeight: '1.8' }}>· {title}</div>
                              ))}
                              {tooltipExtra && <div style={{ opacity: 0.7 }}>{tooltipExtra}</div>}
                            </div>
                          ) : null
                        }
                      >
                        <div
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 16px',
                            cursor: count > 0 ? 'pointer' : 'default',
                            opacity: count === 0 ? 0.45 : 1,
                            transition: 'background 0.15s',
                          }}
                          className={count > 0 ? 'alert-cat-row' : ''}
                          onClick={handleCatClick}
                        >
                          <span style={{ color: iconColor, fontSize: 17, width: 20, flexShrink: 0, textAlign: 'center' }}>
                            {CATEGORY_ICON[cat]}
                          </span>
                          <Text style={{ flex: 1, fontSize: 13 }}>{t(`alert.${cat}`)}</Text>
                          {count > 0
                            ? <Tag color={tagColor} style={{ margin: 0 }}>{count} {t('common.records')}</Tag>
                            : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
                          }
                          {count > 0 && <RightOutlined style={{ fontSize: 11, color: '#94a3b8' }} />}
                        </div>
                      </Tooltip>
                    )
                  })}
                  <style>{`.alert-cat-row:hover { background: #f8fafc; }`}</style>
                </>
              )}
            </Skeleton>
          </Card>
        </Col>

        {/* 最近實驗 */}
        <Col xs={24} lg={14}>
          <Card
            size="small"
            title={<Space><ExperimentOutlined />{t('dashboard.recentExperiments')}</Space>}
            extra={<Button type="link" size="small" onClick={() => navigate('/experiments')}>{t('common.all')}</Button>}
          >
            <Skeleton loading={loading} active>
              {(summary?.recentExperiments.length ?? 0) === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('dashboard.noExperiments')} />
              ) : (
                <List
                  size="small"
                  dataSource={summary?.recentExperiments ?? []}
                  renderItem={(e) => {
                    const color = e.resultStatus ? RESULT_COLOR[e.resultStatus] : null
                    return (
                      <List.Item
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/experiments/${e.id}`)}
                      >
                        <List.Item.Meta
                          title={
                            <Space size={6}>
                              <Text strong style={{ fontSize: 13 }}>{e.code}</Text>
                              {color
                                ? <Tag color={color}>{t(`resultStatus.${e.resultStatus}`)}</Tag>
                                : <Tag>{t('dashboard.undetermined')}</Tag>}
                            </Space>
                          }
                          description={
                            <Tooltip title={e.formulaName}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {e.formulaName} · {e.experimenterName} · {dayjs(e.experimentDate).format('MM/DD')}
                              </Text>
                            </Tooltip>
                          }
                        />
                      </List.Item>
                    )
                  }}
                />
              )}
            </Skeleton>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
