import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createDatabase } from './database.js'

const here = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 8787)
const dbPathArg = process.argv.find((a) => a.startsWith('--db-path='))?.split('=').slice(1).join('=')
const dbFile = dbPathArg ?? resolve(here, '..', 'data', 'goal-os.sqlite')
const db = createDatabase({ filename: dbFile })
const { app, googleService } = createApp({
  db,
  groqApiKey: process.env.GROQ_API_KEY,
  googleConfig: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY,
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    timeZone: process.env.APP_TIME_ZONE || 'Asia/Manila',
  },
})

app.listen(port, () => {
  console.log(`Goal OS API listening on http://localhost:${port}`)
})

const POLL_INTERVAL_MS = 5 * 60 * 1000
setInterval(async () => {
  try {
    await googleService.pollInbound()
  } catch (error) {
    console.error('[Google Calendar] Poll failed:', error.message)
  }
}, POLL_INTERVAL_MS)
