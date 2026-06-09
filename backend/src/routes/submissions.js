import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// Fórmula do score:
// score = (reps / target * 1000) + (formScore * 5) - (timeSecs * 2)
// Prioridade: completar o target > boa forma > ser rápido
function calcScore(reps, target, timeSecs, formScore) {
  const repScore  = Math.min(reps / target, 1) * 1000
  const formBonus = formScore * 5
  const timePenalty = timeSecs * 2
  return Math.max(0, repScore + formBonus - timePenalty)
}

// POST /submissions
// Body: { challengeId, reps, timeSecs, formScore }
router.post('/', async (req, res) => {
  const { challengeId, reps, timeSecs, formScore } = req.body

  if (!challengeId || reps == null || timeSecs == null || formScore == null) {
    return res.status(400).json({ error: 'challengeId, reps, timeSecs e formScore são obrigatórios' })
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return res.status(404).json({ error: 'Challenge não encontrado' })

  // Verificar que o utilizador é membro do grupo
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: challenge.groupId, userId: req.user.userId } },
  })
  if (!membership) return res.status(403).json({ error: 'Não és membro deste grupo' })

  const score = calcScore(reps, challenge.target, timeSecs, formScore)

  // Upsert: substitui se já submeteu antes
  const submission = await prisma.submission.upsert({
    where: {
      challengeId_userId: { challengeId, userId: req.user.userId },
    },
    update: { reps, timeSecs, formScore, score, submittedAt: new Date() },
    create: { challengeId, userId: req.user.userId, reps, timeSecs, formScore, score },
  })

  res.status(201).json({ submission, score })
})

// GET /submissions/challenge/:challengeId — as minhas submissões para um challenge
router.get('/challenge/:challengeId', async (req, res) => {
  const submission = await prisma.submission.findUnique({
    where: {
      challengeId_userId: {
        challengeId: req.params.challengeId,
        userId: req.user.userId,
      },
    },
  })

  res.json(submission || null)
})

export default router
