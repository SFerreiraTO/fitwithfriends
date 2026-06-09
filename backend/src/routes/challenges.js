import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const EXERCISES = ['squat', 'pushup', 'jumpingjack', 'plank', 'situp', 'highknees', 'bicepcurl']
const DEFAULT_TARGETS = { squat: 15, pushup: 10, jumpingjack: 20, plank: 30, situp: 15, highknees: 30, bicepcurl: 12 }

// POST /challenges — owner define o desafio do dia (com target livre)
router.post('/', async (req, res) => {
  const { groupId, exercise, target, date } = req.body

  if (!groupId || !exercise) return res.status(400).json({ error: 'groupId e exercise obrigatórios' })
  if (!EXERCISES.includes(exercise)) return res.status(400).json({ error: 'Exercise inválido' })

  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) return res.status(404).json({ error: 'Grupo não encontrado' })
  if (group.ownerId !== req.user.userId) return res.status(403).json({ error: 'Só o owner pode definir o challenge' })

  const finalTarget = target ? Number(target) : DEFAULT_TARGETS[exercise]
  if (isNaN(finalTarget) || finalTarget < 1) return res.status(400).json({ error: 'Target inválido' })

  const day = date ? new Date(date) : getToday()

  const challenge = await prisma.challenge.upsert({
    where:  { groupId_dayStart: { groupId, dayStart: day } },
    update: { exercise, target: finalTarget },
    create: { groupId, exercise, target: finalTarget, dayStart: day },
  })

  res.status(201).json(challenge)
})

// GET /challenges/current?groupId=xxx — challenge de hoje
router.get('/current', async (req, res) => {
  const { groupId } = req.query
  if (!groupId) return res.status(400).json({ error: 'groupId obrigatório' })

  const challenge = await prisma.challenge.findUnique({
    where: { groupId_dayStart: { groupId, dayStart: getToday() } },
  })

  if (!challenge) return res.json(null)

  const mySubmission = await prisma.submission.findUnique({
    where: { challengeId_userId: { challengeId: challenge.id, userId: req.user.userId } },
  })

  res.json({ ...challenge, mySubmission: mySubmission || null })
})

function getToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export default router
