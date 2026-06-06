import { Router } from 'express'

export function createActivityRouter(service) {
  const router = Router()

  router.get('/dashboard', (_request, response) => response.json(service.dashboard()))
  router.get('/profile', (_request, response) => response.json(service.getProfile()))
  router.patch('/profile', (request, response) => response.json(service.updateProfile(request.body)))

  router.get('/habits', (_request, response) => response.json(service.listHabits()))
  router.post('/habits', (request, response) => {
    response.status(201).json(service.createHabit(request.body))
  })
  router.patch('/habits/:id', (request, response) => {
    response.json(service.updateHabit(request.params.id, request.body))
  })
  router.delete('/habits/:id', (request, response) => {
    response.json(service.deleteHabit(request.params.id))
  })
  router.post('/habits/:id/completions', (request, response) => {
    response.status(201).json(service.completeHabit(request.params.id))
  })

  router.get('/goals', (_request, response) => response.json(service.listGoals()))
  router.post('/goals', (request, response) => {
    response.status(201).json(service.createGoal(request.body))
  })
  router.patch('/goals/:id', (request, response) => {
    response.json(service.updateGoal(request.params.id, request.body))
  })
  router.delete('/goals/:id', (request, response) => {
    response.json(service.deleteGoal(request.params.id))
  })
  router.post('/goals/:id/progress', (request, response) => {
    response.json(service.progressGoal(request.params.id, request.body.amount ?? 1))
  })

  router.get('/evidence', (request, response) => {
    response.json(service.listEvidence(request.query.limit))
  })
  router.get('/analytics', (_request, response) => response.json(service.analytics()))
  router.post('/reset-logs', (_request, response) => response.json(service.resetLogs()))

  return router
}
