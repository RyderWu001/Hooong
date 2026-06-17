import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-tw'

import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'

import LoginPage from './pages/auth/LoginPage'
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

dayjs.locale('zh-tw')

export default function App() {
  return (
    <ConfigProvider locale={zhTW} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AntApp>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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

            <Route path="reports" element={<ReportsPage />} />

            <Route
              path="users"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
