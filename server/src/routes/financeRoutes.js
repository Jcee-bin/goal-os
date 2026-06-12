import { Router } from 'express'

export function createFinanceRouter(service) {
  const router = Router()

  router.get('/transactions', async (request, response) => {
    try { response.json(await service.listTransactions(request.query)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/transactions', async (request, response) => {
    try { response.status(201).json(await service.create(request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.delete('/transactions/:id', async (request, response) => {
    try { response.json(await service.delete(request.params.id)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/transactions/bulk', async (request, response) => {
    try { response.json(await service.bulk(request.body)) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.get('/budget/summary', async (request, response) => {
    try {
      response.json(await service.summary({
        period: request.query.period,
        projected: request.query.projected === 'true',
      }))
    } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.get('/budget/analytics', async (request, response) => {
    try { response.json(await service.analytics({ period: request.query.period })) } catch (e) { response.status(500).json({ error: e.message }) }
  })
  router.post('/budget/reset', async (_request, response) => {
    try { response.json(await service.reset()) } catch (e) { response.status(500).json({ error: e.message }) }
  })

  return router
}
