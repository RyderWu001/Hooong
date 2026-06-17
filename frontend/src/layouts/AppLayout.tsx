import { useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Typography, Tag } from 'antd'
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
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { logout } from '../api/auth'

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
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    await logout().catch(() => {})
    clearAuth()
    navigate('/login')
  }

  const menuItems = [
    {
      key: '/formulas',
      icon: <MedicineBoxOutlined />,
      label: '配方管理',
    },
    {
      key: '/materials',
      icon: <ShopOutlined />,
      label: '原物料管理',
    },
    {
      key: '/suppliers',
      icon: <TruckOutlined />,
      label: '供應商管理',
    },
    {
      key: '/risks',
      icon: <WarningOutlined />,
      label: '風險管理',
    },
    {
      key: '/experiments',
      icon: <ExperimentOutlined />,
      label: '實驗管理',
    },
    {
      key: '/results',
      icon: <FileTextOutlined />,
      label: '實驗結果',
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: '報表',
    },
    ...(user?.role === 'ADMIN'
      ? [{ key: '/users', icon: <TeamOutlined />, label: '使用者管理' }]
      : []),
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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={220}>
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #303030' }}>
          {!collapsed && (
            <Typography.Text strong style={{ color: '#fff', fontSize: 16 }}>
              泓利廣實驗室
            </Typography.Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <span
            onClick={() => setCollapsed(!collapsed)}
            style={{ cursor: 'pointer', fontSize: 18 }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>

          <Dropdown menu={userMenu} placement="bottomRight">
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} size="small" />
              <span>{user?.username}</span>
              <Tag color={ROLE_COLOR[user?.role ?? '']}>{ROLE_LABEL[user?.role ?? '']}</Tag>
            </span>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
