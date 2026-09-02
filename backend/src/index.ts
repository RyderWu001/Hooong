import 'dotenv/config'
import 'express-async-errors'
import path from 'path'
import express from 'express'
import { ensureBucket } from './db/storage'
import { MAX_UPLOAD_BYTES } from './middleware/upload'
import { apiLimiter, authLimiter } from './middleware/rateLimit'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import authRouter from './routes/auth'
import usersRouter from './routes/users'
import ingredientsRouter from './routes/ingredients'
import formulasRouter from './routes/formulas'
import experimentsRouter from './routes/experiments'
import resultsRouter from './routes/results'
import reportsRouter from './routes/reports'
import materialsRouter from './routes/materials'
import { suppliersRouter, evaluationsRouter, purchasesRouter } from './routes/suppliers'
import risksRouter from './routes/risks'
import dropdownsRouter from './routes/dropdowns'
import samplesRouter from './routes/samples'
import traceabilityRouter from './routes/traceability'
import permissionsRouter, { ensureSeeded as ensurePermissions } from './routes/permissions'
import knowledgeRouter from './routes/knowledge'
import sampleSubmissionsRouter from './routes/sampleSubmissions'
import labDailyLogsRouter from './routes/labDailyLogs'
import commissionScanRouter from './routes/commissionScan'
import chemicalEvaluationsRouter from './routes/chemicalEvaluations'
import chemicalRequestsRouter from './routes/chemicalRequests'
import formSignaturesRouter from './routes/formSignatures'
import qcDailyLogsRouter from './routes/qcDailyLogs'
import productCounterPlansRouter from './routes/productCounterPlans'
import chemPreparationsRouter from './routes/chemPreparations'
import productReworksRouter from './routes/productReworks'
import supplierComplianceAuditsRouter from './routes/supplierComplianceAudits'
import formulaChangeRouter from './routes/formulaChange'
import massProductionRouter from './routes/massProduction'
import dashboardRouter from './routes/dashboard'
import searchRouter from './routes/search'
import assistantRouter from './routes/assistant'

const app = express()
const PORT = Number(process.env.PORT ?? 3000)

// 反向代理後方部署時，需信任 proxy 才能取得真實來源 IP（rate limit 以此計數）
app.set('trust proxy', 1)

app.use(helmet({
  // 上傳的檔案由 Supabase Storage 提供，非同源，故放寬跨來源資源政策
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(compression())

// CORS：未設定 CORS_ORIGIN 時（本機開發）維持全開，正式環境應指定前端網域
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean)
app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins, credentials: true } : {}))

app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

app.use('/api/v1', apiLimiter)
app.use('/api/v1/auth/login', authLimiter)
app.use('/api/v1/auth/register', authLimiter)

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/ingredients', ingredientsRouter)
app.use('/api/v1/formulas', formulasRouter)
app.use('/api/v1/experiments', experimentsRouter)
app.use('/api/v1/results', resultsRouter)
app.use('/api/v1/reports', reportsRouter)
app.use('/api/v1/materials', materialsRouter)
app.use('/api/v1/suppliers', suppliersRouter)
app.use('/api/v1/evaluations', evaluationsRouter)
app.use('/api/v1/purchases', purchasesRouter)
app.use('/api/v1/risks', risksRouter)
app.use('/api/v1/dropdowns', dropdownsRouter)
app.use('/api/v1/samples', samplesRouter)
app.use('/api/v1/traceability', traceabilityRouter)
app.use('/api/v1/permissions', permissionsRouter)
app.use('/api/v1/knowledge', knowledgeRouter)
app.use('/api/v1/sample-submissions', sampleSubmissionsRouter)
app.use('/api/v1/lab-daily-logs', labDailyLogsRouter)
app.use('/api/v1/commission-scan', commissionScanRouter)
app.use('/api/v1/chemical-evaluations', chemicalEvaluationsRouter)
app.use('/api/v1/chemical-requests', chemicalRequestsRouter)
app.use('/api/v1/form-signatures', formSignaturesRouter)
app.use('/api/v1/qc-daily-logs', qcDailyLogsRouter)
app.use('/api/v1/product-counter-plans', productCounterPlansRouter)
app.use('/api/v1/chem-preparations', chemPreparationsRouter)
app.use('/api/v1/product-reworks', productReworksRouter)
app.use('/api/v1/supplier-compliance-audits', supplierComplianceAuditsRouter)
app.use('/api/v1/formula-changes', formulaChangeRouter)
app.use('/api/v1/mass-production-approvals', massProductionRouter)
app.use('/api/v1/dashboard', dashboardRouter)
app.use('/api/v1/search', searchRouter)
app.use('/api/v1/assistant', assistantRouter)

app.get('/api/v1/health', (_, res) => res.json({ status: 'ok' }))

// 全域錯誤處理
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const e = err as { code?: string; message?: string }
  if (e.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: `檔案過大，單檔上限 ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` },
    })
    return
  }
  if (e.code === 'INVALID_FILE_TYPE' || e.code === 'LIMIT_FILE_COUNT' || e.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_FILE', message: e.message ?? '檔案不符合規定' },
    })
    return
  }
  if (e.code === 'P2003' || e.code === 'P2014') {
    res.status(409).json({ success: false, error: { code: 'FOREIGN_KEY', message: '此資料仍被其他紀錄引用，無法刪除' } })
    return
  }
  if (e.code === 'P2025') {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到資料' } })
    return
  }
  console.error(err)
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: '伺服器錯誤' } })
})

// 匯出供測試使用：測試需要 app 本身，但不應真的佔用連接埠
export default app

// 被 import 時（測試）不啟動伺服器
if (require.main === module) {
  app.listen(PORT, async () => {
    await ensurePermissions().catch((e) => console.warn('⚠️  權限預設值初始化失敗:', e.message))
    await ensureBucket().catch((e) => console.warn('Storage bucket init:', e.message))
    console.log(`🚀 Server running at http://localhost:${PORT}`)
  })
}
