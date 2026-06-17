import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import usersRouter from './routes/users'
import ingredientsRouter from './routes/ingredients'
import formulasRouter from './routes/formulas'
import experimentsRouter from './routes/experiments'
import resultsRouter from './routes/results'
import reportsRouter from './routes/reports'

const app = express()
const PORT = Number(process.env.PORT ?? 3000)

app.use(cors())
app.use(express.json())

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/ingredients', ingredientsRouter)
app.use('/api/v1/formulas', formulasRouter)
app.use('/api/v1/experiments', experimentsRouter)
app.use('/api/v1/results', resultsRouter)
app.use('/api/v1/reports', reportsRouter)

app.get('/api/v1/health', (_, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
})
