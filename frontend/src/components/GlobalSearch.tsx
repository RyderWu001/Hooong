import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, Input, Spin, Empty, Tag, Typography, Tooltip } from 'antd'
import {
  SearchOutlined, MedicineBoxOutlined, ShopOutlined, ExperimentOutlined,
  TagsOutlined, BookOutlined, EnterOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  globalSearch, SEARCH_TYPE_ORDER,
  type SearchHit, type SearchType,
} from '../api/search'
import styles from './GlobalSearch.module.css'

const { Text } = Typography

const TYPE_ICON: Record<SearchType, React.ReactNode> = {
  formula: <MedicineBoxOutlined />,
  ingredient: <ShopOutlined />,
  experiment: <ExperimentOutlined />,
  sample: <TagsOutlined />,
  supplier: <ShopOutlined />,
  knowledge: <BookOutlined />,
}

const TYPE_COLOR: Record<SearchType, string> = {
  formula: 'blue',
  ingredient: 'green',
  experiment: 'purple',
  sample: 'orange',
  supplier: 'cyan',
  knowledge: 'magenta',
}

/** 輸入後延遲多久才送出查詢，避免每打一個字就打一次 API */
const DEBOUNCE_MS = 300

interface Props {
  open: boolean
  onClose: () => void
}

export default function GlobalSearch({ open, onClose }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  // 關閉時清空，下次開啟是乾淨狀態
  useEffect(() => {
    if (!open) {
      setQuery('')
      setHits([])
      setActive(0)
    }
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      // 前一次查詢若還沒回來就取消，避免慢的回應覆蓋掉新的結果
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const res = await globalSearch(q, ctrl.signal)
        setHits(res.hits)
        setActive(0)
      } catch {
        // 取消或失敗都不顯示錯誤，維持前一次結果即可
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  const go = useCallback((hit: SearchHit) => {
    onClose()
    navigate(hit.link)
  }, [navigate, onClose])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (hits.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % hits.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + hits.length) % hits.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(hits[active])
    }
  }

  // 依類別分組，維持固定順序
  const grouped = SEARCH_TYPE_ORDER
    .map((type) => ({ type, items: hits.filter((h) => h.type === type) }))
    .filter((g) => g.items.length > 0)

  const trimmed = query.trim()

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={640}
      styles={{ body: { padding: 0 } }}
      style={{ top: 80 }}
      destroyOnHidden
    >
      <Input
        autoFocus
        size="large"
        variant="borderless"
        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
        suffix={loading ? <Spin size="small" /> : null}
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        className={styles.input}
      />

      <div className={styles.results}>
        {trimmed.length < 2 ? (
          <div className={styles.hint}>{t('search.hint')}</div>
        ) : !loading && hits.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('search.noResult', { query: trimmed })}
            style={{ padding: '24px 0' }}
          />
        ) : (
          <>
            {grouped.map((g) => (
              <div key={g.type}>
                <div className={styles.groupTitle}>
                  <Tag color={TYPE_COLOR[g.type]} icon={TYPE_ICON[g.type]}>
                    {t(`searchType.${g.type}`)}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>{g.items.length}</Text>
                </div>
                {g.items.map((hit) => {
                  const idx = hits.indexOf(hit)
                  return (
                    <div
                      key={`${hit.type}-${hit.id}`}
                      className={`${styles.row} ${idx === active ? styles.rowActive : ''}`}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(hit)}
                    >
                      <div className={styles.rowMain}>
                        <div className={styles.rowTitle}>{hit.title}</div>
                        <div className={styles.rowSub}>
                          {hit.subtitle && <span>{hit.subtitle}</span>}
                          {hit.matchedFieldKey && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {t('search.matchedOn', { field: t(hit.matchedFieldKey) })}
                            </Text>
                          )}
                        </div>
                      </div>
                      {idx === active && (
                        <Tooltip title="Enter">
                          <EnterOutlined className={styles.enterHint} />
                        </Tooltip>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            {hits.length > 0 && (
              <div className={styles.footer}>
                {t('search.resultCount', { count: hits.length })}
                <span className={styles.keys}>↑ ↓ Enter</span>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
