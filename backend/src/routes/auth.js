import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import prisma from '../lib/prisma.js'
import { sendMagicLink } from '../lib/email.js'

const router = Router()

// POST /auth/request-link
// Body: { email, name? }
router.post('/request-link', async (req, res) => {
  const { email, name } = req.body
  if (!email) return res.status(400).json({ error: 'Email obrigatório' })

  // Criar utilizador se não existir
  const user = await prisma.user.upsert({
    where:  { email },
    update: name ? { name } : {},
    create: { email, name: name || email.split('@')[0] },
  })

  // Invalidar tokens anteriores
  await prisma.magicToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  })

  // Criar novo token
  const token = nanoid(32)
  const expiresAt = new Date(
    Date.now() + Number(process.env.MAGIC_LINK_EXPIRES_MINUTES) * 60 * 1000
  )
  await prisma.magicToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  const devUrl = await sendMagicLink(email, token)

  res.json({
    message: 'Link enviado para ' + email,
    ...(devUrl ? { devUrl } : {}),   // só em dev (sem SMTP)
  })
})

// GET /auth/verify?token=xxx
router.get('/verify', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token em falta' })

  const magicToken = await prisma.magicToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!magicToken)                        return res.status(400).json({ error: 'Token inválido' })
  if (magicToken.usedAt)                  return res.status(400).json({ error: 'Token já utilizado' })
  if (magicToken.expiresAt < new Date())  return res.status(400).json({ error: 'Token expirado' })

  // Marcar como usado
  await prisma.magicToken.update({
    where: { id: magicToken.id },
    data:  { usedAt: new Date() },
  })

  // Emitir JWT
  const jwt_token = jwt.sign(
    { userId: magicToken.user.id, email: magicToken.user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  )

  // Browser magic-link click → redirecionar para o frontend com JWT
  if (req.headers.accept?.includes('text/html')) {
    return res.redirect(`${process.env.FRONTEND_URL}?jwt=${jwt_token}`)
  }

  res.json({
    token: jwt_token,
    user: {
      id:    magicToken.user.id,
      email: magicToken.user.email,
      name:  magicToken.user.name,
    },
  })
})

// GET /auth/me
router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autenticado' })

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado' })
    res.json({ id: user.id, email: user.email, name: user.name })
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
})

export default router
