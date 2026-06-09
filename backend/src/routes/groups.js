import { Router } from 'express'
import { nanoid } from 'nanoid'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// POST /groups — criar grupo
router.post('/', async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Nome do grupo obrigatório' })

  const group = await prisma.group.create({
    data: {
      name,
      inviteCode: nanoid(8).toUpperCase(),
      ownerId: req.user.userId,
      members: {
        create: { userId: req.user.userId },
      },
    },
    include: { members: { include: { user: true } } },
  })

  res.status(201).json(group)
})

// POST /groups/join — entrar num grupo via código
router.post('/join', async (req, res) => {
  const { inviteCode } = req.body
  if (!inviteCode) return res.status(400).json({ error: 'Código de convite obrigatório' })

  const group = await prisma.group.findUnique({ where: { inviteCode } })
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })

  const alreadyMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: req.user.userId } },
  })
  if (alreadyMember) return res.status(400).json({ error: 'Já és membro deste grupo' })

  await prisma.groupMember.create({
    data: { groupId: group.id, userId: req.user.userId },
  })

  res.json({ message: 'Entraste no grupo ' + group.name, group })
})

// GET /groups — os meus grupos
router.get('/', async (req, res) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.user.userId },
    include: {
      group: {
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } },
          challenges: { orderBy: { dayStart: 'desc' }, take: 1 },
        },
      },
    },
  })

  res.json(memberships.map(m => m.group))
})

// GET /groups/:id — detalhe do grupo
router.get('/:id', async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      challenges: { orderBy: { dayStart: 'desc' }, take: 1 },
    },
  })

  if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })

  const isMember = group.members.some(m => m.userId === req.user.userId)
  if (!isMember) return res.status(403).json({ error: 'Não és membro deste grupo' })

  res.json(group)
})

// GET /groups/:id/leaderboard — leaderboard do challenge de hoje
router.get('/:id/leaderboard', async (req, res) => {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  const challenge = await prisma.challenge.findUnique({
    where: { groupId_dayStart: { groupId: req.params.id, dayStart } },
    include: {
      submissions: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { score: 'desc' },
      },
    },
  })

  if (!challenge) {
    return res.json({ message: 'Ainda não há desafio esta semana', leaderboard: [] })
  }

  const leaderboard = challenge.submissions.map((s, i) => ({
    rank:      i + 1,
    user:      s.user,
    reps:      s.reps,
    timeSecs:  s.timeSecs,
    formScore: s.formScore,
    score:     s.score,
  }))

  res.json({
    challenge: {
      exercise: challenge.exercise,
      target:   challenge.target,
      dayStart: challenge.dayStart,
    },
    leaderboard,
  })
})

export default router
