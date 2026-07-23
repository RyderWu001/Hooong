import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme as antTheme } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-tw'

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
import SupplierComplianceAuditPage from './pages/forms/SupplierComplianceAuditPage'
import FormulaChangePage from './pages/forms/FormulaChangePage'
import MassProductionApprovalPage from './pages/forms/MassProductionApprovalPage'

dayjs.locale('zh-tw')

export default function App() {
  return (
    <ConfigProvider
      locale={zhTW}
      theme={{
        algorithm: antTheme.darkAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          colorBgBase: '#0f172a',
          colorBgContainer: '#1e293b',
          colorBgElevated: '#243855',
          colorBgLayout: '#0f172a',
          colorBorder: '#2d3f55',
          colorBorderSecondary: '#243040',
          colorText: '#e2e8f0',
          colorTextSecondary: '#94a3b8',
          colorTextTertiary: '#64748b',
          colorTextQuaternary: '#475569',
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "'Microsoft JhengHei', 'Noto Sans TC', system-ui, sans-serif",
        },
        components: {
          Layout: {
            siderBg: '#0c1525',
            headerBg: '#1a2744',
            bodyBg: '#0f172a',
            triggerBg: '#0c1525',
          },
          Menu: {
            darkItemBg: '#0c1525',
            darkSubMenuItemBg: '#091120',
            darkItemSelectedBg: '#1d4ed8',
            darkItemHoverBg: '#162540',
            darkGroupTitleColor: '#64748b',
          },
          Card: {
            colorBgContainer: '#1e293b',
            colorBorderSecondary: '#2d3f55',
            headerBg: '#162032',
          },
          Table: {
            colorBgContainer: '#1e293b',
            headerBg: '#162032',
            headerColor: '#94a3b8',
            rowHoverBg: '#243855',
            borderColor: '#2d3f55',
          },
          Modal: {
            contentBg: '#1e293b',
            headerBg: '#162032',
            footerBg: '#1e293b',
          },
          Drawer: {
            colorBgElevated: '#1e293b',
          },
          Descriptions: {
            colorTextLabel: '#94a3b8',
            colorSplit: '#2d3f55',
          },
          Form: {
            labelColor: '#94a3b8',
          },
          Divider: {
            colorSplit: '#2d3f55',
            colorText: '#64748b',
          },
          Tag: {
            defaultBg: '#1e293b',
            defaultColor: '#94a3b8',
          },
          Select: {
            colorBgContainer: '#0f172a',
          },
          Input: {
            colorBgContainer: '#0f172a',
          },
          InputNumber: {
            colorBgContainer: '#0f172a',
          },
          DatePicker: {
            colorBgContainer: '#0f172a',
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
            <Route index element={<Navigate to="/experiments" replace />} />

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
