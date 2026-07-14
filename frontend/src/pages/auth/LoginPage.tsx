import { Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, LockOutlined, ExperimentOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import styles from './LoginPage.module.css'

const { Title, Text } = Typography

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form] = Form.useForm()

  const handleSubmit = async (values: { email: string; password: string }) => {
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
      <div className={styles.card}>

        {/* ── 左側品牌區 ── */}
        <div className={styles.brand}>
          <div className={styles.logoIcon}>
            <ExperimentOutlined style={{ color: '#fff' }} />
          </div>
          <Title className={styles.brandTitle}>泓利廣</Title>
          <div className={styles.brandDivider} />
          <Text className={styles.brandSub}>
            實驗室資訊管理系統<br />
            Laboratory Information Management System
          </Text>
        </div>

        {/* ── 右側表單區 ── */}
        <div className={styles.formPanel}>
          <Title level={3} className={styles.formTitle}>歡迎回來</Title>
          <Text className={styles.formSub}>請輸入您的帳號與密碼以繼續</Text>

          <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
            <Form.Item
              name="email"
              label="電子郵件"
              rules={[{ required: true, type: 'email', message: '請輸入有效的 Email' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="your@email.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label="密碼"
              rules={[{ required: true, message: '請輸入密碼' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                className={styles.loginBtn}
              >
                登入
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.links}>
            <Link to="/forgot-password">忘記密碼？</Link>
            <span>還沒有帳號？<Link to="/register">立即註冊</Link></span>
          </div>

          <div className={styles.copyright}>
            © 2025 泓利廣有限公司　版權所有
          </div>
        </div>

      </div>
    </div>
  )
}
