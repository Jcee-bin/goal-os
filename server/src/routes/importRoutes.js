import { Router } from 'express'

export function createImportRouter(service) {
  const router = Router()

  router.get('/import/status', async (_request, response) => {
    try { response.json(await service.status()) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/import/legacy', async (request, response) => {
    try { response.json(await service.importLegacy(request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  return router
}
