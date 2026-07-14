import { useState } from 'react'
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import styles from './LoginPage.module.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: { username: string; email: string; password: string }) => {
    setLoading(true)
    try {
      const res = await register(values)
      const { token, user } = res.data.data
      setAuth(token, user)
      message.success(`歡迎加入，${user.username}！`)
      navigate('/')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        message.error('此 Email 已被使用，請換一個或直接登入')
      } else if (status === 400) {
        message.error('密碼至少 8 個字元')
      } else {
        message.error('註冊失敗，請確認後端服務是否已啟動')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <Card className={styles.card}>
        <Typography.Title level={3} className={styles.title}>
          建立帳號
        </Typography.Title>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: '請輸入姓名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="姓名" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[{ required: true, type: 'email', message: '請輸入有效的 Email' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, min: 8, message: '密碼至少 8 個字元' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密碼（至少 8 個字元）" size="large" autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '請再次輸入密碼' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve()
                  return Promise.reject(new Error('兩次密碼不一致'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="確認密碼" size="large" autoComplete="new-password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              註冊
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.forgotLink}>
          已有帳號？<Link to="/login">立即登入</Link>
        </div>
      </Card>
    </div>
  )
}
