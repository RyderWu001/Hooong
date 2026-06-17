import { Form, Input, Button, Card, Typography, message, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form] = Form.useForm()

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const res = await login(values.email, values.password)
      const { token, user } = res.data
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
