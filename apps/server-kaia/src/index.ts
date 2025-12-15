import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { remindersRouter } from './routes/reminders'
import { configRouter } from './routes/config'

dotenv.config()

const app = express()
const corsOrigin = process.env.CORS_ORIGIN || '*'
app.use(cors({ origin: corsOrigin === '*' ? undefined : corsOrigin }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})

app.use('/api/reminders', remindersRouter)
app.use('/api/config', configRouter)

const port = Number(process.env.PORT || 3060)
app.listen(port, () => {
  console.log(`KAIA server listening on http://localhost:${port}`)
})
