import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Row, Col, Statistic, List, Tag, Typography, Space, Empty,
  Button, Segmented, Skeleton, Tooltip,
} from 'antd'
import {
  WarningOutlined, ClockCircleOutlined, InboxOutlined, AuditOutlined,
  ExperimentOutlined, RiseOutlined, FallOutlined, ReloadOutlined,
  CheckCircleOutlined, FileTextOutlined,
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
  const [filter, setFilter] = useState<AlertCategory | 'all'>('all')

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
  const shown = filter === 'all' ? items : items.filter(i => i.category === filter)

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
        {/* 待辦提醒 */}
        <Col xs={24} lg={14}>
          <Card
            size="small"
            title={
              <Space>
                <WarningOutlined />
                {t('dashboard.todoAlerts')}
                {items.length > 0 && <Tag color="red">{items.length}</Tag>}
              </Space>
            }
            styles={{ body: { padding: items.length ? '8px 0 0' : 12 } }}
          >
            {items.length > 0 && (
              <div style={{ padding: '0 12px 8px', overflowX: 'auto' }}>
                <Segmented
                  size="small"
                  value={filter}
                  onChange={(v) => setFilter(v as AlertCategory | 'all')}
                  options={[
                    { label: `${t('common.all')} ${items.length}`, value: 'all' },
                    ...ALERT_CATEGORIES
                      .filter(c => (alerts?.counts[c] ?? 0) > 0)
                      .map(c => ({
                        label: `${t(`alert.${c}`)} ${alerts?.counts[c]}`,
                        value: c,
                      })),
                  ]}
                />
              </div>
            )}

            <Skeleton loading={loading} active>
              {shown.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={items.length === 0 ? t('dashboard.noTodo') : t('dashboard.noneInCategory')}
                />
              ) : (
                <List
                  size="small"
                  dataSource={shown}
                  style={{ maxHeight: 420, overflowY: 'auto' }}
                  renderItem={(item) => (
                    <List.Item
                      style={{ cursor: 'pointer', paddingLeft: 12, paddingRight: 12 }}
                      onClick={() => navigate(item.link)}
                    >
                      <List.Item.Meta
                        avatar={
                          <span style={{ color: SEVERITY_COLOR[item.severity], fontSize: 18 }}>
                            {CATEGORY_ICON[item.category]}
                          </span>
                        }
                        title={
                          <Space size={4} wrap>
                            <Text strong style={{ fontSize: 13 }}>{alertTitle(item)}</Text>
                            {item.daysLeft !== null && item.daysLeft < 0 && (
                              <Tag color="error">{t('dashboard.overdue')}</Tag>
                            )}
                          </Space>
                        }
                        description={<Text type="secondary" style={{ fontSize: 12 }}>{alertDetail(item)}</Text>}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Skeleton>
          </Card>
        </Col>

        {/* 最近實驗 */}
        <Col xs={24} lg={10}>
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
