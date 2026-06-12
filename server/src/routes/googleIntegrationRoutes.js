import { Router } from 'express'

export function createGoogleIntegrationRouter(service, clientOrigin) {
  const router = Router()

  router.get('/integrations/google/status', async (_request, response) => {
    try { response.json(await service.status()) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.get('/integrations/google/connect', async (_request, response) => {
    try { response.json(await service.connect()) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.get('/integrations/google/callback', async (request, response) => {
    try {
      await service.callback(request.query)
      response.redirect(`${clientOrigin}/?google=connected`)
    } catch {
      response.redirect(`${clientOrigin}/?google=error`)
    }
  })
  router.post('/integrations/google/disconnect', async (_request, response) => {
    try { response.json(await service.disconnect()) } catch (e) { response.status(500).json({ error: e.message }) }
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
