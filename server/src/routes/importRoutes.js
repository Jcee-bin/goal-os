import { Router } from 'express'

export function createImportRouter(service) {
  const router = Router()
  router.get('/import/status', (_request, response) => response.json(service.status()))
  router.post('/import/legacy', (request, response) => {
    response.json(service.importLegacy(request.body))
  })
  return router
}
