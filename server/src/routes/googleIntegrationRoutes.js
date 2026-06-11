import { Router } from 'express'

export function createGoogleIntegrationRouter(service, clientOrigin) {
  const router = Router()

  router.get('/integrations/google/status', (_request, response) => {
    response.json(service.status())
  })
  router.get('/integrations/google/connect', (_request, response) => {
    response.json(service.connect())
  })
  router.get('/integrations/google/callback', async (request, response) => {
    try {
      await service.callback(request.query)
      response.redirect(`${clientOrigin}/?google=connected`)
    } catch {
      response.redirect(`${clientOrigin}/?google=error`)
    }
  })
  router.post('/integrations/google/disconnect', (_request, response) => {
    response.json(service.disconnect())
  })
  router.post('/integrations/google/sync', async (_request, response, next) => {
    try {
      response.json(await service.syncNow())
    } catch (error) {
      next(error)
    }
  })

  return router
}
