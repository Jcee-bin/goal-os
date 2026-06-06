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
    await service.callback(request.query)
    response.redirect(`${clientOrigin}/?google=connected`)
  })
  router.post('/integrations/google/disconnect', (_request, response) => {
    response.json(service.disconnect())
  })

  return router
}
