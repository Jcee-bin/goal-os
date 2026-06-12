import { Router } from 'express'

export function createSleepRouter(service) {
  const router = Router()

  router.get('/sleep', async (_request, response) => {
    try { response.json(await service.listRecent()) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  router.get('/sleep/analytics', async (_request, response) => {
    try { response.json(await service.analytics()) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  router.post('/sleep', async (request, response) => {
    try { response.status(201).json(await service.log(request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  router.delete('/sleep/:id', async (request, response) => {
    try {
      await service.remove(request.params.id)
      response.json({ ok: true })
    } catch (e) { response.status(500).json({ error: e.message }) }
  })

  return router
}
