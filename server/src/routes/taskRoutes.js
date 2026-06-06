import { Router } from 'express'

export function createTaskRouter(service) {
  const router = Router()

  router.get('/tasks', (request, response) => {
    response.json(service.list(request.query.date))
  })
  router.post('/tasks', async (request, response) => {
    response.status(201).json(await service.create(request.body))
  })
  router.patch('/tasks/:id', async (request, response) => {
    response.json(await service.update(request.params.id, request.body))
  })
  router.delete('/tasks/:id', async (request, response) => {
    response.json(await service.delete(request.params.id))
  })
  router.post('/tasks/:id/complete', async (request, response) => {
    response.json(await service.complete(request.params.id))
  })
  router.post('/tasks/:id/reopen', async (request, response) => {
    response.json(await service.reopen(request.params.id))
  })
  router.post('/tasks/:id/retry-sync', async (request, response) => {
    response.json(await service.retry(request.params.id))
  })

  return router
}
