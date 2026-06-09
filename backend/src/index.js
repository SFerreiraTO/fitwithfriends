import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join }  from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

import authRouter        from './routes/auth.js'
import groupsRouter      from './routes/groups.js'
import challengesRouter  from './routes/challenges.js'
import submissionsRouter from './routes/submissions.js'

const app  = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())
// Serve the HTML frontend (project root, 2 levels up from src/)
app.use(express.static(join(__dirname, '../..')))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',        authRouter)
app.use('/groups',      groupsRouter)
app.use('/challenges',  challengesRouter)
app.use('/submissions', submissionsRouter)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
})

app.listen(PORT, () => {
  console.log(`🚀 Server a correr em http://localhost:${PORT}`)
})
