import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Tag, Select, Switch, Modal,
  Form, Input, Space, Popconfirm, App,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { getUsers, updateUser, adminRegister } from '../../api/auth'
import type { User, Role } from '../../types'

const ROLE_COLOR: Record<Role, string> = {
  ADMIN: 'red', LAB_STAFF: 'green', MANAGER: 'blue',
}
const ROLE_LABEL: Record<Role, string> = {
  ADMIN: '管理員', LAB_STAFF: '實驗室人員', MANAGER: '經理',
}

export default function UserManagementPage() {
  const { message } = App.useApp()
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await getUsers({ limit: 200 })
      setData(res.data.data ?? [])
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleRoleChange = async (id: number, role: Role) => {
    try {
      await updateUser(id, { role })
      message.success('角色已更新')
      fetchData()
    } catch {
      message.error('更新失敗')
    }
  }

  const handleActiveChange = async (id: number, isActive: boolean) => {
    try {
      await updateUser(id, { isActive })
      message.success(isActive ? '帳號已啟用' : '帳號已停用')
      fetchData()
    } catch {
      message.error('更新失敗')
    }
  }

  const handleRegister = async (values: {
    username: string; email: string; password: string; role: Role
  }) => {
    setSubmitting(true)
    try {
      await adminRegister(values)
      message.success(`已建立帳號：${values.username}`)
      setModalOpen(false)
      form.resetFields()
      fetchData()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        message.error('此 Email 已被使用')
      } else {
        message.error('建立失敗，請稍後再試')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setModalOpen(false)
    form.resetFields()
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '帳號名稱', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: Role, record: User) => (
        <Select
          value={role}
          onChange={(val) => handleRoleChange(record.id, val)}
          options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))}
          style={{ width: 140 }}
          variant="borderless"
        />
      ),
    },
    {
      title: '角色標籤',
      key: 'roleTag',
      dataIndex: 'role',
      render: (role: Role) => <Tag color={ROLE_COLOR[role]}>{ROLE_LABEL[role]}</Tag>,
    },
    {
      title: '帳號狀態',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean, record: User) => (
        <Popconfirm
          title={`確定${active ? '停用' : '啟用'}「${record.username}」的帳號？`}
          onConfirm={() => handleActiveChange(record.id, !active)}
          okText="確定"
          cancelText="取消"
        >
          <Switch checked={active} checkedChildren="啟用" unCheckedChildren="停用" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <Card
      title="使用者管理"
      extra={
        <Button icon={<PlusOutlined />} type="primary" onClick={() => setModalOpen(true)}>
          新增使用者
        </Button>
      }
    >
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data}
        pagination={{ showTotal: (t) => `共 ${t} 位使用者` }} />

      <Modal
        title="新增使用者"
        open={modalOpen}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleRegister} style={{ marginTop: 16 }}>
          <Form.Item name="username" label="帳號名稱" rules={[{ required: true, message: '請輸入帳號名稱' }]}>
            <Input placeholder="例：王大明" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: '請輸入有效的 Email' }]}
          >
            <Input placeholder="example@company.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="初始密碼"
            rules={[{ required: true, min: 8, message: '密碼至少 8 個字元' }]}
          >
            <Input.Password placeholder="至少 8 個字元" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="確認密碼"
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
            <Input.Password placeholder="再次輸入密碼" />
          </Form.Item>

          <Form.Item name="role" label="角色" rules={[{ required: true, message: '請選擇角色' }]}>
            <Select
              placeholder="請選擇角色"
              options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>建立帳號</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  )
}
