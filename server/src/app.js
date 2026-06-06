import cors from 'cors'
import express from 'express'
import { LOCAL_USER_ID } from './domain.js'
import { createActivityRouter } from './routes/activityRoutes.js'
import { createFinanceRouter } from './routes/financeRoutes.js'
import { createImportRouter } from './routes/importRoutes.js'
import { createGoogleIntegrationRouter } from './routes/googleIntegrationRoutes.js'
import { createTaskRouter } from './routes/taskRoutes.js'
import { createActivityService } from './services/activityService.js'
import { createGoogleCalendarClient } from './services/googleCalendarClient.js'
import { createGoogleIntegrationService } from './services/googleIntegrationService.js'
import { createFinanceService } from './services/financeService.js'
import { createImportService } from './services/importService.js'
import { createTaskService } from './services/taskService.js'

export function createApp({
  db,
  now,
  googleClient,
  googleConfig = {},
}) {
  if (!db) throw new Error('createApp requires a database')

  const app = express()
  app.locals.db = db
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true })
  })

  const resolvedGoogleConfig = {
    clientId: googleConfig.clientId || '',
    clientSecret: googleConfig.clientSecret || '',
    redirectUri: googleConfig.redirectUri || '',
    tokenEncryptionKey: googleConfig.tokenEncryptionKey || '',
    clientOrigin: googleConfig.clientOrigin || 'http://localhost:5173',
    timeZone: googleConfig.timeZone || 'Asia/Manila',
  }
  const resolvedGoogleClient = googleClient || createGoogleCalendarClient(resolvedGoogleConfig)
  const googleService = createGoogleIntegrationService({
    db,
    userId: LOCAL_USER_ID,
    googleClient: resolvedGoogleClient,
    config: resolvedGoogleConfig,
    now,
  })
  const activityService = createActivityService({ db, userId: LOCAL_USER_ID, now })
  const financeService = createFinanceService({ db, userId: LOCAL_USER_ID, now })
  const importService = createImportService({ db, userId: LOCAL_USER_ID, now })
  const taskService = createTaskService({
    db,
    userId: LOCAL_USER_ID,
    calendarService: googleService,
    now,
  })
  app.use('/api', createActivityRouter(activityService))
  app.use('/api', createFinanceRouter(financeService))
  app.use('/api', createImportRouter(importService))
  app.use('/api', createTaskRouter(taskService))
  app.use(
    '/api',
    createGoogleIntegrationRouter(googleService, resolvedGoogleConfig.clientOrigin),
  )

  app.use((error, _request, response, _next) => {
    const status = error.status || 500
    response.status(status).json({
      error: status === 500 ? 'Internal server error' : error.message,
      details: error.details,
    })
  })

  return app
}
