import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
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
import SuppliersPage from './pages/suppliers/SuppliersPage'
import RisksPage from './pages/risks/RisksPage'
import DropdownManagePage from './pages/dropdowns/DropdownManagePage'
import SamplesPage from './pages/samples/SamplesPage'
import TraceabilityPage from './pages/traceability/TraceabilityPage'
import KnowledgePage from './pages/knowledge/KnowledgePage'
import PermissionsPage from './pages/permissions/PermissionsPage'

dayjs.locale('zh-tw')

export default function App() {
  return (
    <ConfigProvider locale={zhTW} theme={{ token: { colorPrimary: '#1677ff' } }}>
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
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="risks" element={<RisksPage />} />

            <Route path="reports" element={<ReportsPage />} />
            <Route path="traceability" element={<TraceabilityPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />

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
