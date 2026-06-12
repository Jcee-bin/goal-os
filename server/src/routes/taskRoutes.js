import { Router } from 'express'

export function createTaskRouter(service) {
  const router = Router()

  router.get('/tasks', async (request, response) => {
    try { response.json(await service.list(request.query.date)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/tasks', async (request, response) => {
    try { response.status(201).json(await service.create(request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.patch('/tasks/:id', async (request, response) => {
    try { response.json(await service.update(request.params.id, request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.delete('/tasks/:id', async (request, response) => {
    try { response.json(await service.delete(request.params.id)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/tasks/:id/complete', async (request, response) => {
    try { response.json(await service.complete(request.params.id)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/tasks/:id/reopen', async (request, response) => {
    try { response.json(await service.reopen(request.params.id)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/tasks/:id/retry-sync', async (request, response) => {
    try { response.json(await service.retry(request.params.id)) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  return router
}
