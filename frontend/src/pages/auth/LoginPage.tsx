import { Form, Input, Button, Card, Typography, message, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import type { User } from '../../types'
import styles from './LoginPage.module.css'

const MOCK_ACCOUNTS: Record<string, { password: string; user: User }> = {
  'admin@test.com': {
    password: 'admin123',
    user: { id: 1, username: '管理員', email: 'admin@test.com', role: 'ADMIN', isActive: true },
  },
  'lab@test.com': {
    password: 'lab123',
    user: { id: 2, username: '實驗員', email: 'lab@test.com', role: 'LAB_STAFF', isActive: true },
  },
  'manager@test.com': {
    password: 'manager123',
    user: { id: 3, username: '經理', email: 'manager@test.com', role: 'MANAGER', isActive: true },
  },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form] = Form.useForm()

  const handleSubmit = async (values: { email: string; password: string }) => {
    const mock = MOCK_ACCOUNTS[values.email]
    if (mock && mock.password === values.password) {
      setAuth('mock-token', mock.user)
      navigate('/')
      return
    }
    try {
      const res = await login(values.email, values.password)
      const { token, user } = res.data.data
      setAuth(token, user)
      navigate('/')
    } catch {
      message.error('帳號或密碼錯誤')
    }
  }

  return (
    <div className={styles.wrapper}>
      <Card className={styles.card}>
        <Typography.Title level={3} className={styles.title}>
          泓利廣實驗室系統
        </Typography.Title>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: '請輸入有效的 Email' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item name="password" rules={[{ required: true, message: '請輸入密碼' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密碼" size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              登入
            </Button>
          </Form.Item>

          <div className={styles.forgotLink}>
            <Link to="/forgot-password">忘記密碼？</Link>
          </div>
        </Form>

        <Divider plain>測試帳號</Divider>
        <div className={styles.mockHint}>
          <div>管理員：admin@test.com / admin123</div>
          <div>實驗室人員：lab@test.com / lab123</div>
          <div>經理：manager@test.com / manager123</div>
        </div>
      </Card>
    </div>
  )
}
