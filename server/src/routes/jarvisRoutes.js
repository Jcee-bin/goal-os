import { Router } from 'express'

export function createJarvisRouter(jarvisService) {
  const router = Router()

  router.post('/jarvis/chat', async (request, response, next) => {
    if (!jarvisService) {
      return response.status(503).json({ error: 'Jarvis not configured — add GROQ_API_KEY to server/.env' })
    }
    try {
      const { message } = request.body
      if (!message || typeof message !== 'string') {
        return response.status(400).json({ error: 'message is required' })
      }
      const result = await jarvisService.chat(message.trim())
      response.json(result)
    } catch (err) {
      const status = err.message.includes('429') ? 429 : err.message.includes('401') ? 401 : 500
      response.status(status).json({ error: err.message.slice(0, 300) })
    }
  })

  return router
}
