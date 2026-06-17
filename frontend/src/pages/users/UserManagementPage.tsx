import { useEffect, useState } from 'react'
import {
  Card, Table, Button, Select, Switch, Modal,
  Form, Input, Space, message, Popconfirm,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { getUsers, updateUser, adminRegister } from '../../api/auth'
import type { User, Role } from '../../types'

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: '管理員', LAB_STAFF: '實驗室人員', MANAGER: '經理',
}

export default function UserManagementPage() {
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
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
      message.success('狀態已更新')
      fetchData()
    } catch {
      message.error('更新失敗')
    }
  }

  const handleRegister = async (values: {
    username: string; email: string; password: string; role: Role
  }) => {
    try {
      await adminRegister(values)
      message.success('使用者已建立')
      setModalOpen(false)
      form.resetFields()
      fetchData()
    } catch {
      message.error('建立失敗，Email 可能已存在')
    }
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '帳號', dataIndex: 'username', key: 'username' },
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
      title: '狀態',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean, record: User) => (
        <Popconfirm
          title={`確定${active ? '停用' : '啟用'}此帳號？`}
          onConfirm={() => handleActiveChange(record.id, !active)}
        >
          <Switch checked={active} />
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
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} />

      <Modal title="新增使用者" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={handleRegister}>
          <Form.Item name="username" label="帳號名稱" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="初始密碼" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">建立</Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  )
}
