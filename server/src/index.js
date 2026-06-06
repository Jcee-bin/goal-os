import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createDatabase } from './database.js'

const here = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 8787)
const db = createDatabase({ filename: resolve(here, '..', 'data', 'goal-os.sqlite') })
const app = createApp({
  db,
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
