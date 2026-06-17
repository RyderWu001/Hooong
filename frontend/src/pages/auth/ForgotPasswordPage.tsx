import { Form, Input, Button, Card, Typography, message, Result } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api/auth'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const handleSubmit = async (values: { email: string }) => {
    try {
      await forgotPassword(values.email)
      setSent(true)
    } catch {
      message.error('發送失敗，請確認 Email 是否正確')
    }
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Result
          status="success"
          title="重設連結已寄出"
          subTitle="請檢查您的信箱，並依照信件指示重設密碼。"
          extra={<Link to="/login"><Button type="primary">返回登入</Button></Link>}
        />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
          忘記密碼
        </Typography.Title>
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: '請輸入有效的 Email' }]}>
            <Input prefix={<MailOutlined />} placeholder="請輸入註冊 Email" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">送出重設連結</Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Link to="/login">返回登入</Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}
