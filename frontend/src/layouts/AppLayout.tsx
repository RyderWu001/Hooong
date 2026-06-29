import { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, Tag, Modal, Descriptions, Form, Input, Button, Space, message } from 'antd'
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
  TruckOutlined,
  WarningOutlined,
  SettingOutlined,
  LockOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
  TagsOutlined,
  ApartmentOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { logout, changePassword } from '../api/auth'
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
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

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
    { key: '/formulas',     icon: <MedicineBoxOutlined />, label: '配方管理' },
    { key: '/materials',    icon: <ShopOutlined />,        label: '原物料管理' },
    { key: '/suppliers',    icon: <TruckOutlined />,       label: '供應商管理' },
    { key: '/risks',        icon: <WarningOutlined />,     label: '風險管理' },
    { key: '/experiments',  icon: <ExperimentOutlined />,  label: '實驗管理' },
    { key: '/results',      icon: <FileTextOutlined />,    label: '實驗結果' },
    { key: '/samples',       icon: <TagsOutlined />,              label: '樣品管理' },
    { key: '/reports',       icon: <BarChartOutlined />,          label: '報表' },
    { key: '/traceability',  icon: <ApartmentOutlined />,         label: '溯源管理' },
    { key: '/knowledge',     icon: <BookOutlined />,              label: '知識庫' },
    ...(user?.role === 'ADMIN'
      ? [
          { key: '/users',       icon: <TeamOutlined />,            label: '使用者管理' },
          { key: '/dropdowns',   icon: <UnorderedListOutlined />,   label: '選項管理' },
          { key: '/permissions', icon: <SafetyCertificateOutlined />, label: '權限管理' },
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

  return (
    <Layout className={styles.root}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={220}>
        <div className={styles.siderInner}>
          <div className={styles.siderLogo}>
            {!collapsed && (
              <Typography.Text strong className={styles.logoText}>
                泓利廣實驗室
              </Typography.Text>
            )}
          </div>

          <div className={styles.siderMenuWrap}>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[selectedKey]}
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
      >
        <Descriptions bordered column={1} style={{ marginTop: 8 }}>
          <Descriptions.Item label="使用者名稱">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="電子郵件">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color={ROLE_COLOR[user?.role ?? '']}>{ROLE_LABEL[user?.role ?? '']}</Tag>
          </Descriptions.Item>
        </Descriptions>
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
