import { Router } from 'express'

export function createActivityRouter(service) {
  const router = Router()

  router.get('/dashboard', async (_request, response) => {
    try { response.json(await service.dashboard()) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.get('/profile', async (_request, response) => {
    try { response.json(await service.getProfile()) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.patch('/profile', async (request, response) => {
    try { response.json(await service.updateProfile(request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  router.get('/habits', async (_request, response) => {
    try { response.json(await service.listHabits()) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/habits', async (request, response) => {
    try { response.status(201).json(await service.createHabit(request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.patch('/habits/:id', async (request, response) => {
    try { response.json(await service.updateHabit(request.params.id, request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.delete('/habits/:id', async (request, response) => {
    try { response.json(await service.deleteHabit(request.params.id)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/habits/:id/completions', async (request, response) => {
    try { response.status(201).json(await service.completeHabit(request.params.id)) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  router.get('/goals', async (_request, response) => {
    try { response.json(await service.listGoals()) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/goals', async (request, response) => {
    try { response.status(201).json(await service.createGoal(request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.patch('/goals/:id', async (request, response) => {
    try { response.json(await service.updateGoal(request.params.id, request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.delete('/goals/:id', async (request, response) => {
    try { response.json(await service.deleteGoal(request.params.id)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/goals/:id/progress', async (request, response) => {
    try { response.json(await service.progressGoal(request.params.id, request.body.amount ?? 1)) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  router.get('/evidence', async (request, response) => {
    try { response.json(await service.listEvidence(request.query.limit)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.get('/analytics', async (_request, response) => {
    try { response.json(await service.analytics()) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/reset-logs', async (_request, response) => {
    try { response.json(await service.resetLogs()) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  return router
}
