import { Router } from 'express'

export function createSleepRouter(service) {
  const router = Router()

  router.get('/sleep', (_request, response) => {
    response.json(service.listRecent())
  })

  router.get('/sleep/analytics', (_request, response) => {
    response.json(service.analytics())
  })

  router.post('/sleep', (request, response) => {
    response.status(201).json(service.log(request.body))
  })

  router.delete('/sleep/:id', (request, response) => {
    service.remove(request.params.id)
    response.json({ ok: true })
  })

  return router
}
