import 'dotenv/config'
import 'express-async-errors'
import path from 'path'
import express from 'express'
import { ensureBucket } from './db/storage'
import cors from 'cors'
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
import permissionsRouter from './routes/permissions'
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

const app = express()
const PORT = Number(process.env.PORT ?? 3000)

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

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

app.get('/api/v1/health', (_, res) => res.json({ status: 'ok' }))

// 全域錯誤處理
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const e = err as { code?: string; message?: string }
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

app.listen(PORT, async () => {
  await ensureBucket().catch((e) => console.warn('Storage bucket init:', e.message))
  console.log(`🚀 Server running at http://localhost:${PORT}`)
})
