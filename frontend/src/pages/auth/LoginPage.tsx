import { Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, LockOutlined, ExperimentOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import LanguageSwitch from '../../components/LanguageSwitch'
import styles from './LoginPage.module.css'

const { Title, Text } = Typography

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form] = Form.useForm()
  const { t } = useTranslation()

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const res = await login(values.email, values.password)
      const { token, user } = res.data.data
      setAuth(token, user)
      navigate('/')
    } catch {
      message.error(t('auth.loginFailed'))
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
          <Title className={styles.brandTitle}>LabMS</Title>
          <div className={styles.brandDivider} />
          <Text className={styles.brandSub}>
            {t('auth.systemName')}<br />
            Laboratory Information Management System
          </Text>
        </div>

        {/* ── 右側表單區 ── */}
        <div className={styles.formPanel}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
            <LanguageSwitch variant="text" />
          </div>
          <Title level={3} className={styles.formTitle}>{t('auth.welcome')}</Title>
          <Text className={styles.formSub}>{t('auth.subtitle')}</Text>

          <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
            <Form.Item
              name="email"
              label="電子郵件"
              rules={[{ required: true, type: 'email', message: t('auth.email') }]}
            >
              <Input prefix={<UserOutlined />} placeholder="your@email.com" />
            </Form.Item>

            <Form.Item
              name="password"
              label="密碼"
              rules={[{ required: true, message: t('auth.password') }]}
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
            <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
            <span>{t('auth.noAccount')}<Link to="/register">{t('auth.registerNow')}</Link></span>
          </div>

          <div className={styles.copyright}>
            © 2025 實驗室資訊管理系統　版權所有
          </div>
        </div>

      </div>
    </div>
  )
}
