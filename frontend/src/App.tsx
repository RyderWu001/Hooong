import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme as antTheme } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import viVN from 'antd/locale/vi_VN'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/vi'
import './i18n'

import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'

import FormulaListPage from './pages/formulas/FormulaListPage'
import FormulaDetailPage from './pages/formulas/FormulaDetailPage'
import FormulaFormPage from './pages/formulas/FormulaFormPage'

import ExperimentListPage from './pages/experiments/ExperimentListPage'
import ExperimentDetailPage from './pages/experiments/ExperimentDetailPage'
import ExperimentFormPage from './pages/experiments/ExperimentFormPage'

import ResultListPage from './pages/results/ResultListPage'
import ResultDetailPage from './pages/results/ResultDetailPage'

import ReportsPage from './pages/reports/ReportsPage'
import UserManagementPage from './pages/users/UserManagementPage'
import MaterialsPage from './pages/materials/MaterialsPage'
import DropdownManagePage from './pages/dropdowns/DropdownManagePage'
import SamplesPage from './pages/samples/SamplesPage'
import TraceabilityPage from './pages/traceability/TraceabilityPage'
import KnowledgePage from './pages/knowledge/KnowledgePage'
import PermissionsPage from './pages/permissions/PermissionsPage'
import LabDailyLogPage from './pages/forms/LabDailyLogPage'
import SampleSubmissionPage from './pages/forms/SampleSubmissionPage'
import ChemicalEvaluationPage from './pages/forms/ChemicalEvaluationPage'
import ChemicalRequestPage from './pages/forms/ChemicalRequestPage'
import QcDailyLogPage from './pages/forms/QcDailyLogPage'
import ProductCounterPlanPage from './pages/forms/ProductCounterPlanPage'
import ChemPreparationPage from './pages/forms/ChemPreparationPage'
import ProductReworkPage from './pages/forms/ProductReworkPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import SupplierComplianceAuditPage from './pages/forms/SupplierComplianceAuditPage'
import FormulaChangePage from './pages/forms/FormulaChangePage'
import MassProductionApprovalPage from './pages/forms/MassProductionApprovalPage'

export default function App() {
  const { i18n } = useTranslation()
  const isVi = i18n.language === 'vi'
  // dayjs 沒有 React context，需在語系變更時同步切換
  dayjs.locale(isVi ? 'vi' : 'zh-tw')

  return (
    <ConfigProvider
      locale={isVi ? viVN : zhTW}
      theme={{
        algorithm: antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          colorBgBase: '#ffffff',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBgLayout: '#f5f7fa',
          colorBorder: '#e2e8f0',
          colorBorderSecondary: '#f1f5f9',
          colorText: '#1e293b',
          colorTextSecondary: '#475569',
          colorTextTertiary: '#94a3b8',
          colorTextQuaternary: '#cbd5e1',
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "'Microsoft JhengHei', 'Noto Sans TC', system-ui, sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#ffffff',
            headerBg: '#ffffff',
            bodyBg: '#f5f7fa',
            triggerBg: '#f1f5f9',
          },
          Menu: {
            itemBg: '#ffffff',
            subMenuItemBg: '#f8fafc',
            itemSelectedBg: '#eff6ff',
            itemSelectedColor: '#1d4ed8',
            itemHoverBg: '#f1f5f9',
            groupTitleColor: '#94a3b8',
          },
          Card: {
            colorBgContainer: '#ffffff',
            colorBorderSecondary: '#e2e8f0',
            headerBg: '#f8fafc',
          },
          Table: {
            colorBgContainer: '#ffffff',
            headerBg: '#f8fafc',
            headerColor: '#475569',
            rowHoverBg: '#f1f5f9',
            borderColor: '#e2e8f0',
          },
          Modal: {
            contentBg: '#ffffff',
            headerBg: '#f8fafc',
            footerBg: '#ffffff',
          },
          Drawer: {
            colorBgElevated: '#ffffff',
          },
          Descriptions: {
            colorTextLabel: '#64748b',
            colorSplit: '#e2e8f0',
          },
          Form: {
            labelColor: '#475569',
          },
          Divider: {
            colorSplit: '#e2e8f0',
            colorText: '#94a3b8',
          },
          Tag: {
            defaultBg: '#f1f5f9',
            defaultColor: '#475569',
          },
          Select: {
            colorBgContainer: '#ffffff',
          },
          Input: {
            colorBgContainer: '#ffffff',
          },
          InputNumber: {
            colorBgContainer: '#ffffff',
          },
          DatePicker: {
            colorBgContainer: '#ffffff',
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="formulas" element={<FormulaListPage />} />
            <Route path="formulas/new" element={<FormulaFormPage />} />
            <Route path="formulas/:id" element={<FormulaDetailPage />} />
            <Route path="formulas/:id/edit" element={<FormulaFormPage />} />

            <Route path="experiments" element={<ExperimentListPage />} />
            <Route path="experiments/new" element={<ExperimentFormPage />} />
            <Route path="experiments/:id" element={<ExperimentDetailPage />} />
            <Route path="experiments/:id/result" element={<ResultDetailPage />} />

            <Route path="results" element={<ResultListPage />} />
            <Route path="samples" element={<SamplesPage />} />

            <Route path="materials" element={<MaterialsPage />} />

            <Route path="reports" element={<ReportsPage />} />
            <Route path="traceability" element={<TraceabilityPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="lab-daily-log" element={<LabDailyLogPage />} />
            <Route path="sample-submissions" element={<SampleSubmissionPage />} />
            <Route path="chemical-evaluations" element={<ChemicalEvaluationPage />} />
            <Route path="chemical-requests" element={<ChemicalRequestPage />} />
            <Route path="qc-daily-logs" element={<QcDailyLogPage />} />
            <Route path="product-counter-plans" element={<ProductCounterPlanPage />} />
            <Route path="chem-preparations" element={<ChemPreparationPage />} />
            <Route path="product-reworks" element={<ProductReworkPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="supplier-compliance-audits" element={<SupplierComplianceAuditPage />} />
            <Route path="formula-changes" element={<FormulaChangePage />} />
            <Route path="mass-production-approvals" element={<MassProductionApprovalPage />} />

            <Route
              path="users"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="dropdowns"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <DropdownManagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="permissions"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <PermissionsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}
