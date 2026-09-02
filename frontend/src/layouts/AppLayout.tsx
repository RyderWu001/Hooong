import { useState, useEffect, useRef, useCallback } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, Tag, Modal, Descriptions, Form, Input, Button, Space, message, Upload, Divider } from 'antd'
import {
  ExperimentOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TeamOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ArrowLeftOutlined,
  MedicineBoxOutlined,
  ShopOutlined,
  SettingOutlined,
  LockOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
  BookOutlined,
  TagsOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  FormOutlined,
  CalendarOutlined,
  AuditOutlined,
  FileAddOutlined,
  UploadOutlined,
  DeleteOutlined,
  DashboardOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import NotificationInbox from '../components/NotificationInbox'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTranslation } from 'react-i18next'
import LanguageSwitch from '../components/LanguageSwitch'
import GlobalSearch from '../components/GlobalSearch'
import searchStyles from '../components/GlobalSearch.module.css'
import { logout, changePassword } from '../api/auth'
import { getMySignature, saveMySignature } from '../api/formSignatures'
import styles from './AppLayout.module.css'

const { Sider, Header, Content } = Layout

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'red',
  MANAGER: 'blue',
  LAB_STAFF: 'green',
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordForm] = Form.useForm()
  const [mySignature, setMySignature] = useState<string | null>(null)
  const [signatureSaving, setSignatureSaving] = useState(false)
  const sigPasteRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const { t } = useTranslation()
  const [searchOpen, setSearchOpen] = useState(false)

  // Cmd/Ctrl + K 開啟全域查詢
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const loadSignature = useCallback(async () => {
    const sig = await getMySignature().catch(() => null)
    setMySignature(sig)
  }, [])

  const handleSigPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
    if (!item) return
    e.preventDefault()
    const blob = item.getAsFile()
    if (!blob) return
    const reader = new FileReader()
    reader.onload = ev => setMySignature(ev.target?.result as string)
    reader.readAsDataURL(blob)
  }, [])

  useEffect(() => { if (profileOpen) loadSignature() }, [profileOpen, loadSignature])

  const handleSaveSignature = async () => {
    setSignatureSaving(true)
    try {
      await saveMySignature(mySignature)
      message.success('簽名已儲存')
    } catch {
      message.error('儲存失敗')
    } finally {
      setSignatureSaving(false)
    }
  }

  const handleSigFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = ev => setMySignature(ev.target?.result as string)
    reader.readAsDataURL(file)
    return false
  }

  const handleLogout = async () => {
    await logout().catch(() => {})
    clearAuth()
    navigate('/login')
  }

  const handleChangePassword = async (values: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('兩次密碼不一致')
      return
    }
    setPasswordSaving(true)
    try {
      await changePassword(values.currentPassword, values.newPassword)
      message.success('密碼已更新，請重新登入')
      setPasswordOpen(false)
      passwordForm.resetFields()
      await logout().catch(() => {})
      clearAuth()
      navigate('/login')
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? '更新失敗'
      message.error(msg)
    } finally {
      setPasswordSaving(false)
    }
  }

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t('menu.dashboard') },
    {
      key: '/formulas',
      icon: <MedicineBoxOutlined />,
      label: t('menu.formulas'),
      onTitleClick: ({ key }: { key: string }) => navigate(key),
      children: [
        { key: '/traceability', icon: <ApartmentOutlined />, label: t('menu.traceability') },
      ],
    },
    {
      key: '/experiments',
      icon: <ExperimentOutlined />,
      label: t('menu.experiments'),
      onTitleClick: ({ key }: { key: string }) => navigate(key),
      children: [
        { key: '/samples', icon: <TagsOutlined />, label: t('menu.samples') },
      ],
    },
    { key: '/results',   icon: <FileTextOutlined />, label: t('menu.results') },
    {
      key: '/forms',
      icon: <FormOutlined />,
      label: t('menu.forms'),
      children: [
        // 名稱對齊需求文件的正式表單名稱
        { key: '/lab-daily-log',               icon: <CalendarOutlined />, label: t('menu.labDailyLog') },
        { key: '/sample-submissions',          icon: <TagsOutlined />,     label: t('menu.sampleSubmissions') },
        { key: '/chemical-evaluations',        icon: <AuditOutlined />,    label: t('menu.chemicalEvaluations') },
        { key: '/chemical-requests',           icon: <FileAddOutlined />,  label: t('menu.chemicalRequests') },
        { key: '/qc-daily-logs',               icon: <CalendarOutlined />, label: t('menu.qcDailyLogs') },
        { key: '/product-counter-plans',       icon: <AuditOutlined />,    label: t('menu.productCounterPlans') },
        { key: '/chem-preparations',           icon: <FileAddOutlined />,  label: t('menu.chemPreparations') },
        { key: '/product-reworks',             icon: <FileAddOutlined />,  label: t('menu.productReworks') },
        { key: '/suppliers',                   icon: <ShopOutlined />,     label: t('menu.suppliers') },
        { key: '/supplier-compliance-audits',  icon: <AuditOutlined />,    label: t('menu.supplierComplianceAudits') },
        { key: '/formula-changes',             icon: <FormOutlined />,     label: t('menu.formulaChanges') },
        { key: '/mass-production-approvals',   icon: <AuditOutlined />,    label: t('menu.massProductionApprovals') },
      ],
    },
    { key: '/reports',   icon: <BarChartOutlined />, label: t('menu.reports') },
    { key: '/knowledge', icon: <BookOutlined />, label: t('menu.knowledge') },
    ...(user?.role === 'ADMIN'
      ? [
          {
            type: 'group' as const,
            label: t('menu.system'),
            children: [
              { key: '/users',       icon: <TeamOutlined />,              label: t('menu.users') },
              { key: '/dropdowns',   icon: <UnorderedListOutlined />,     label: t('menu.dropdowns') },
              { key: '/permissions', icon: <SafetyCertificateOutlined />, label: t('menu.permissions') },
            ],
          },
        ]
      : []),
  ]

  const settingsMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('auth.profile'),
      onClick: () => setProfileOpen(true),
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: t('auth.changePassword'),
      onClick: () => setPasswordOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('auth.logout'),
      danger: true,
      onClick: handleLogout,
    },
  ]

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: t('auth.logout'),
        danger: true,
        onClick: handleLogout,
      },
    ],
  }

  const selectedKey = '/' + location.pathname.split('/')[1]

  const CHILD_PARENT: Record<string, string> = {
    '/traceability':               '/formulas',
    '/samples':                    '/experiments',
    '/lab-daily-log':              '/forms',
    '/sample-submissions':         '/forms',
    '/chemical-evaluations':       '/forms',
    '/chemical-requests':          '/forms',
    '/qc-daily-logs':              '/forms',
    '/product-counter-plans':      '/forms',
    '/chem-preparations':          '/forms',
    '/product-reworks':            '/forms',
    '/suppliers':                  '/forms',
    '/supplier-compliance-audits': '/forms',
    '/formula-changes':            '/forms',
    '/mass-production-approvals':  '/forms',
  }

  const getRequiredOpenKeys = (path: string) => {
    const keys: string[] = []
    if (CHILD_PARENT[path]) keys.push(CHILD_PARENT[path])
    if (path === '/formulas' || path === '/experiments') keys.push(path)
    return keys
  }

  const [openKeys, setOpenKeys] = useState<string[]>(() => getRequiredOpenKeys(selectedKey))

  useEffect(() => {
    const required = getRequiredOpenKeys(selectedKey)
    if (required.length > 0) {
      setOpenKeys(prev => [...new Set([...prev, ...required])])
    }
  }, [selectedKey])

  return (
    <Layout className={styles.root}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" width={220}>
        <div className={styles.siderInner} style={{ position: 'relative' }}>
          {/* 折疊把手（貼在 Sider 右邊緣中央） */}
          <div
            className={styles.siderToggle}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? '展開側欄' : '收合側欄'}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <div className={styles.siderLogo} style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            <div className={styles.logoIcon}>H</div>
            {!collapsed && (
              <span className={styles.logoLink}>
                <Typography.Text strong className={styles.logoText}>
                  泓利廣實驗室
                </Typography.Text>
                <span className={styles.logoSubtext}>Lab System</span>
              </span>
            )}
          </div>

          <div className={styles.siderMenuWrap}>
            <Menu
              theme="light"
              mode="inline"
              selectedKeys={[selectedKey]}
              openKeys={openKeys}
              onOpenChange={setOpenKeys}
              items={menuItems}
              onClick={({ key }) => navigate(key)}
            />
          </div>

          <div className={styles.siderBottom}>
            <Menu
              theme="light"
              mode="inline"
              selectable={false}
              items={[
                {
                  key: 'settings',
                  icon: <SettingOutlined />,
                  label: t('auth.settings'),
                  children: settingsMenuItems,
                },
              ]}
            />
          </div>
        </div>
      </Sider>

      <Layout>
        <Header className={styles.header}>
          {/* 子頁面才顯示返回按鈕，頂層頁面此位置空白 */}
          {(() => {
            const parts = location.pathname.split('/').filter(Boolean)
            const isSubPage = parts.length >= 2
            return isSubPage ? (
              <span
                className={styles.collapseBtn}
                onClick={() => navigate(-1)}
                title="返回上一頁"
              >
                <ArrowLeftOutlined />
              </span>
            ) : <span style={{ width: 36 }} />
          })()}

          <button
            type="button"
            className={searchStyles.trigger}
            onClick={() => setSearchOpen(true)}
          >
            <SearchOutlined />
            <span>{t('search.placeholder')}</span>
            <span className={searchStyles.triggerKbd}>
              {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} K
            </span>
          </button>

          <span className={styles.headerRight}>
            <LanguageSwitch className={styles.bellBtn} />

            <NotificationInbox />

          <Dropdown menu={userMenu} placement="bottomRight">
            <span className={styles.userInfo}>
              <Avatar icon={<UserOutlined />} size="small" />
              <span>{user?.username}</span>
              <Tag color={ROLE_COLOR[user?.role ?? '']}>{t(`role.${user?.role}`)}</Tag>
            </span>
          </Dropdown>
          </span>
        </Header>

        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* 個人資料 Modal */}
      <Modal
        title={<Space><InfoCircleOutlined />{t('auth.profile')}</Space>}
        open={profileOpen}
        onCancel={() => setProfileOpen(false)}
        footer={<Button onClick={() => setProfileOpen(false)}>關閉</Button>}
        width={480}
      >
        <Descriptions bordered column={1} style={{ marginTop: 8 }}>
          <Descriptions.Item label={t('auth.username')}>{user?.username}</Descriptions.Item>
          <Descriptions.Item label={t('auth.email')}>{user?.email}</Descriptions.Item>
          <Descriptions.Item label={t('auth.role')}>
            <Tag color={ROLE_COLOR[user?.role ?? '']}>{t(`role.${user?.role}`)}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider titlePlacement="left" style={{ fontSize: 13, margin: '16px 0 10px' }}>我的電子簽名</Divider>

        {mySignature ? (
          <div style={{ border: '1px solid #333', borderRadius: 6, padding: 12, textAlign: 'center', background: '#111', marginBottom: 10 }}>
            <img src={mySignature} alt="我的簽名" style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: 12, marginBottom: 10 }}>尚未設定簽名</div>
        )}

        <div
          ref={sigPasteRef}
          contentEditable
          suppressContentEditableWarning
          tabIndex={0}
          style={{
            border: '2px dashed #444',
            borderRadius: 8,
            padding: '12px',
            textAlign: 'center',
            cursor: 'text',
            outline: 'none',
            color: '#888',
            fontSize: 12,
            marginBottom: 8,
            userSelect: 'none',
          }}
          onPaste={handleSigPaste}
          onKeyDown={e => {
            if (!((e.ctrlKey || e.metaKey) && e.key === 'v')) e.preventDefault()
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#1677ff')}
          onBlur={e => (e.currentTarget.style.borderColor = '#444')}
        >
          點此後按 <kbd style={{ background: '#222', border: '1px solid #555', borderRadius: 3, padding: '1px 4px' }}>Ctrl+V</kbd> 或<strong>右鍵 → 貼上</strong>簽名圖片
        </div>

        <Space style={{ marginBottom: 12 }}>
          <Upload beforeUpload={handleSigFileUpload} showUploadList={false} accept="image/*">
            <Button icon={<UploadOutlined />} size="small">從檔案選擇</Button>
          </Upload>
          {mySignature && (
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              onClick={() => setMySignature(null)}
            >
              清除
            </Button>
          )}
          <Button
            type="primary"
            size="small"
            loading={signatureSaving}
            onClick={handleSaveSignature}
          >
            儲存簽名
          </Button>
        </Space>
      </Modal>

      {/* 修改密碼 Modal */}
      <Modal
        title={<Space><LockOutlined />{t('auth.changePassword')}</Space>}
        open={passwordOpen}
        onCancel={() => { setPasswordOpen(false); passwordForm.resetFields() }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ marginTop: 8 }}
        >
          <Form.Item name="currentPassword" label={t('auth.currentPassword')} rules={[{ required: true, message: '請輸入目前密碼' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={t('auth.newPassword')}
            rules={[
              { required: true, message: '請輸入新密碼' },
              { min: 8, message: '至少 8 個字元' },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t('auth.confirmPassword')}
            rules={[{ required: true, message: '請再次輸入新密碼' }]}
          >
            <Input.Password />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={passwordSaving}>更新密碼</Button>
            <Button onClick={() => { setPasswordOpen(false); passwordForm.resetFields() }}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </Layout>
  )
}
