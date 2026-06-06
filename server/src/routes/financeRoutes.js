import { Router } from 'express'

export function createFinanceRouter(service) {
  const router = Router()

  router.get('/transactions', (request, response) => {
    response.json(service.listTransactions(request.query))
  })
  router.post('/transactions', (request, response) => {
    response.status(201).json(service.create(request.body))
  })
  router.delete('/transactions/:id', (request, response) => {
    response.json(service.delete(request.params.id))
  })
  router.post('/transactions/bulk', (request, response) => {
    response.json(service.bulk(request.body))
  })
  router.get('/budget/summary', (request, response) => {
    response.json(service.summary({
      period: request.query.period,
      projected: request.query.projected === 'true',
    }))
  })
  router.get('/budget/analytics', (request, response) => {
    response.json(service.analytics({ period: request.query.period }))
  })
  router.post('/budget/reset', (_request, response) => response.json(service.reset()))

  return router
}
