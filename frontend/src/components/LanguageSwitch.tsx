import { Dropdown, Tooltip } from 'antd'
import { GlobalOutlined, CheckOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, setLanguage, type LanguageCode } from '../i18n'

interface Props {
  /** 顯示樣式：頂部列用圖示，登入頁用文字 */
  variant?: 'icon' | 'text'
  className?: string
}

export default function LanguageSwitch({ variant = 'icon', className }: Props) {
  const { i18n } = useTranslation()
  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0]

  const items = LANGUAGES.map((l) => ({
    key: l.code,
    label: (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 110 }}>
        <span style={{ flex: 1 }}>{l.label}</span>
        {l.code === current.code && <CheckOutlined style={{ fontSize: 12 }} />}
      </span>
    ),
    onClick: () => setLanguage(l.code as LanguageCode),
  }))

  const trigger = variant === 'icon'
    ? (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <GlobalOutlined />
        <span style={{ fontSize: 12 }}>{current.short}</span>
      </span>
    )
    : (
      <span className={className} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <GlobalOutlined />
        {current.label}
      </span>
    )

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      {variant === 'icon'
        ? <Tooltip title={current.label}>{trigger}</Tooltip>
        : trigger}
    </Dropdown>
  )
}
