import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api', () => {
  it('retries a transient connection failure before returning data', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))

    await expect(api('/health')).resolves.toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry a normal validation error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ error: 'Invalid task' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    ))

    await expect(api('/tasks', { method: 'POST', body: {} }))
      .rejects.toMatchObject({ message: 'Invalid task', status: 400 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
