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
  MedicineBoxOutlined,
  ShopOutlined,
  SettingOutlined,
  LockOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
  TagsOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  FormOutlined,
  CalendarOutlined,
  AuditOutlined,
  FileAddOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { logout, changePassword } from '../api/auth'
import { getMySignature, saveMySignature } from '../api/formSignatures'
import styles from './AppLayout.module.css'

const { Sider, Header, Content } = Layout

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'red',
  MANAGER: 'blue',
  LAB_STAFF: 'green',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '管理員',
  MANAGER: '經理',
  LAB_STAFF: '實驗室人員',
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
    {
      key: '/formulas',
      icon: <MedicineBoxOutlined />,
      label: '配方管理',
      onTitleClick: ({ key }: { key: string }) => navigate(key),
      children: [
        { key: '/traceability', icon: <ApartmentOutlined />, label: '溯源管理' },
      ],
    },
    { key: '/materials', icon: <ShopOutlined />, label: '原物料管理' },
    {
      key: '/experiments',
      icon: <ExperimentOutlined />,
      label: '實驗管理',
      onTitleClick: ({ key }: { key: string }) => navigate(key),
      children: [
        { key: '/samples', icon: <TagsOutlined />, label: '樣品管理' },
      ],
    },
    { key: '/results',   icon: <FileTextOutlined />, label: '實驗結果' },
    {
      key: '/forms',
      icon: <FormOutlined />,
      label: '表單管理',
      children: [
        { key: '/lab-daily-log',                icon: <CalendarOutlined />, label: '每日工作日誌' },
        { key: '/sample-submissions',           icon: <TagsOutlined />,     label: '送樣連絡單' },
        { key: '/chemical-evaluations',         icon: <AuditOutlined />,    label: '化學品評估表' },
        { key: '/chemical-requests',            icon: <FileAddOutlined />,  label: '化學品需求申請單' },
        { key: '/qc-daily-logs',                icon: <CalendarOutlined />, label: 'QC每日工作日誌' },
        { key: '/product-counter-plans',        icon: <AuditOutlined />,    label: '產品對抗計劃' },
        { key: '/chem-preparations',            icon: <FileAddOutlined />,  label: '藥劑泡製紀錄' },
        { key: '/product-reworks',              icon: <FileAddOutlined />,  label: '產品重修紀錄' },
        { key: '/supplier-compliance-audits',   icon: <AuditOutlined />,    label: '供應商合規評鑑' },
      ],
    },
    { key: '/reports',   icon: <BarChartOutlined />, label: '報表' },
    ...(user?.role === 'ADMIN'
      ? [
          {
            type: 'group' as const,
            label: '系統管理',
            children: [
              { key: '/users',       icon: <TeamOutlined />,              label: '使用者管理' },
              { key: '/dropdowns',   icon: <UnorderedListOutlined />,     label: '選項管理' },
              { key: '/permissions', icon: <SafetyCertificateOutlined />, label: '權限管理' },
            ],
          },
        ]
      : []),
  ]

  const settingsMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '個人資料',
      onClick: () => setProfileOpen(true),
    },
    {
      key: 'password',
      icon: <LockOutlined />,
      label: '修改密碼',
      onClick: () => setPasswordOpen(true),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      danger: true,
      onClick: handleLogout,
    },
  ]

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '登出',
        danger: true,
        onClick: handleLogout,
      },
    ],
  }

  const selectedKey = '/' + location.pathname.split('/')[1]

  const CHILD_PARENT: Record<string, string> = {
    '/traceability':                  '/formulas',
    '/samples':                       '/experiments',
    '/lab-daily-log':                 '/forms',
    '/sample-submissions':            '/forms',
    '/chemical-evaluations':          '/forms',
    '/chemical-requests':             '/forms',
    '/qc-daily-logs':                 '/forms',
    '/product-counter-plans':         '/forms',
    '/chem-preparations':             '/forms',
    '/product-reworks':               '/forms',
    '/supplier-compliance-audits':    '/forms',
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
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={220}>
        <div className={styles.siderInner}>
          <div className={styles.siderLogo} style={{ cursor: 'pointer' }} onClick={() => navigate('/login')}>
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
              theme="dark"
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
              theme="dark"
              mode="inline"
              selectable={false}
              items={[
                {
                  key: 'settings',
                  icon: <SettingOutlined />,
                  label: '設定',
                  children: settingsMenuItems,
                },
              ]}
            />
          </div>
        </div>
      </Sider>

      <Layout>
        <Header className={styles.header}>
          <span
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>

          <Dropdown menu={userMenu} placement="bottomRight">
            <span className={styles.userInfo}>
              <Avatar icon={<UserOutlined />} size="small" />
              <span>{user?.username}</span>
              <Tag color={ROLE_COLOR[user?.role ?? '']}>{ROLE_LABEL[user?.role ?? '']}</Tag>
            </span>
          </Dropdown>
        </Header>

        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>

      {/* 個人資料 Modal */}
      <Modal
        title={<Space><InfoCircleOutlined />個人資料</Space>}
        open={profileOpen}
        onCancel={() => setProfileOpen(false)}
        footer={<Button onClick={() => setProfileOpen(false)}>關閉</Button>}
        width={480}
      >
        <Descriptions bordered column={1} style={{ marginTop: 8 }}>
          <Descriptions.Item label="使用者名稱">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="電子郵件">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color={ROLE_COLOR[user?.role ?? '']}>{ROLE_LABEL[user?.role ?? '']}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider orientation="left" style={{ fontSize: 13, margin: '16px 0 10px' }}>我的電子簽名</Divider>

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
        title={<Space><LockOutlined />修改密碼</Space>}
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
          <Form.Item name="currentPassword" label="目前密碼" rules={[{ required: true, message: '請輸入目前密碼' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密碼"
            rules={[
              { required: true, message: '請輸入新密碼' },
              { min: 8, message: '至少 8 個字元' },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="確認新密碼"
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
