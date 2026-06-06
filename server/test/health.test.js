import assert from 'node:assert/strict'
import test from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/database.js'

test('health endpoint reports a working API', async () => {
  const db = createDatabase()
  const server = createApp({ db }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))

  try {
    const { port } = server.address()
    const response = await fetch(`http://127.0.0.1:${port}/api/health`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
  } finally {
    await new Promise((resolve) => server.close(resolve))
    db.close()
  }
})
