import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createDatabase } from './database.js'

const here = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 8787)
const db = createDatabase({ filename: resolve(here, '..', 'data', 'goal-os.sqlite') })
const app = createApp({ db })

app.listen(port, () => {
  console.log(`Goal OS API listening on http://localhost:${port}`)
})
