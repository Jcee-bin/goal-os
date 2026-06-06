import cors from 'cors'
import express from 'express'
import { LOCAL_USER_ID } from './domain.js'
import { createActivityRouter } from './routes/activityRoutes.js'
import { createFinanceRouter } from './routes/financeRoutes.js'
import { createImportRouter } from './routes/importRoutes.js'
import { createActivityService } from './services/activityService.js'
import { createFinanceService } from './services/financeService.js'
import { createImportService } from './services/importService.js'

export function createApp({ db, now }) {
  if (!db) throw new Error('createApp requires a database')

  const app = express()
  app.locals.db = db
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true })
  })

  const activityService = createActivityService({ db, userId: LOCAL_USER_ID, now })
  const financeService = createFinanceService({ db, userId: LOCAL_USER_ID, now })
  const importService = createImportService({ db, userId: LOCAL_USER_ID, now })
  app.use('/api', createActivityRouter(activityService))
  app.use('/api', createFinanceRouter(financeService))
  app.use('/api', createImportRouter(importService))

  app.use((error, _request, response, _next) => {
    const status = error.status || 500
    response.status(status).json({
      error: status === 500 ? 'Internal server error' : error.message,
      details: error.details,
    })
  })

  return app
}
