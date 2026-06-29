import { useEffect, useState } from 'react'
import {
  Card, Table, Switch, Button, Space, message, Typography, Popconfirm, Tag, Spin,
} from 'antd'
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { getAllPermissions, updatePermissions, resetPermissions } from '../../api/permissions'
import { clearPermissionsCache } from '../../hooks/usePermission'
import type { RolePermission } from '../../types'

const { Text, Title } = Typography

const MODULE_LABELS: Record<string, string> = {
  formulas: '配方管理',
  materials: '原物料管理',
  suppliers: '供應商管理',
  risks: '風險管理',
  experiments: '實驗管理',
  results: '實驗結果',
  samples: '樣品管理',
  reports: '報表',
  traceability: '溯源管理',
  knowledge: '知識庫',
}

const ROLES = ['LAB_STAFF', 'MANAGER']
const ROLE_LABELS: Record<string, string> = {
  LAB_STAFF: '實驗室人員',
  MANAGER: '經理',
}
const ROLE_COLORS: Record<string, string> = {
  LAB_STAFF: 'green',
  MANAGER: 'blue',
}

type PermMap = Record<string, Record<string, Omit<RolePermission, 'id' | 'role' | 'module'>>>

export default function PermissionsPage() {
  const [permMap, setPermMap] = useState<PermMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getAllPermissions()
      const perms: RolePermission[] = res.data.data
      const map: PermMap = {}
      for (const p of perms) {
        if (!map[p.role]) map[p.role] = {}
        map[p.role][p.module] = { canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete }
      }
      setPermMap(map)
    } catch {
      message.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const toggle = (role: string, module: string, field: keyof Omit<RolePermission, 'id' | 'role' | 'module'>) => {
    setPermMap((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: {
          ...prev[role]?.[module],
          [field]: !prev[role]?.[module]?.[field],
        },
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const permissions = ROLES.flatMap((role) =>
        Object.entries(MODULE_LABELS).map(([module]) => ({
          role, module,
          canView: permMap[role]?.[module]?.canView ?? false,
          canCreate: permMap[role]?.[module]?.canCreate ?? false,
          canEdit: permMap[role]?.[module]?.canEdit ?? false,
          canDelete: permMap[role]?.[module]?.canDelete ?? false,
        }))
      )
      await updatePermissions(permissions)
      clearPermissionsCache()
      message.success('權限已儲存')
    } catch {
      message.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      await resetPermissions()
      clearPermissionsCache()
      message.success('已重置為預設值')
      await load()
    } catch {
      message.error('重置失敗')
    } finally {
      setSaving(false)
    }
  }

  const modules = Object.keys(MODULE_LABELS)

  if (loading) return <Spin style={{ display: 'block', margin: '80px auto' }} />

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Card
        title="細粒度權限管理"
        extra={
          <Space>
            <Popconfirm title="重置所有角色為預設權限？" onConfirm={handleReset} okText="確認" cancelText="取消">
              <Button icon={<ReloadOutlined />} disabled={saving}>重置預設</Button>
            </Popconfirm>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              儲存變更
            </Button>
          </Space>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          管理員 (ADMIN) 擁有所有模組的完整權限，無法修改。以下僅顯示可配置的角色。
        </Text>

        {ROLES.map((role) => (
          <Card
            key={role}
            size="small"
            title={<Space><Tag color={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Tag><Title level={5} style={{ margin: 0 }}>{role}</Title></Space>}
            style={{ marginBottom: 16 }}
          >
            <Table
              dataSource={modules.map((module) => ({ module }))}
              rowKey="module"
              pagination={false}
              size="small"
              columns={[
                {
                  title: '功能模組',
                  dataIndex: 'module',
                  key: 'module',
                  width: 160,
                  render: (v) => <Text strong>{MODULE_LABELS[v]}</Text>,
                },
                {
                  title: '查看',
                  key: 'canView',
                  width: 80,
                  align: 'center' as const,
                  render: (_, row) => (
                    <Switch
                      size="small"
                      checked={permMap[role]?.[row.module]?.canView ?? false}
                      onChange={() => toggle(role, row.module, 'canView')}
                    />
                  ),
                },
                {
                  title: '新增',
                  key: 'canCreate',
                  width: 80,
                  align: 'center' as const,
                  render: (_, row) => (
                    <Switch
                      size="small"
                      checked={permMap[role]?.[row.module]?.canCreate ?? false}
                      onChange={() => toggle(role, row.module, 'canCreate')}
                    />
                  ),
                },
                {
                  title: '編輯',
                  key: 'canEdit',
                  width: 80,
                  align: 'center' as const,
                  render: (_, row) => (
                    <Switch
                      size="small"
                      checked={permMap[role]?.[row.module]?.canEdit ?? false}
                      onChange={() => toggle(role, row.module, 'canEdit')}
                    />
                  ),
                },
                {
                  title: '刪除',
                  key: 'canDelete',
                  width: 80,
                  align: 'center' as const,
                  render: (_, row) => (
                    <Switch
                      size="small"
                      checked={permMap[role]?.[row.module]?.canDelete ?? false}
                      onChange={() => toggle(role, row.module, 'canDelete')}
                    />
                  ),
                },
              ]}
            />
          </Card>
        ))}
      </Card>
    </Space>
  )
}
