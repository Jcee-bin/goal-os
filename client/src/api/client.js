export async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const attempts = method === 'GET' ? 3 : 1
  let response

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      response = await fetch(`/api${path}`, {
        ...options,
        headers: {
          'content-type': 'application/json',
          ...options.headers,
        },
        body: options.body && typeof options.body !== 'string'
          ? JSON.stringify(options.body)
          : options.body,
      })
      if (response.ok || response.status < 500 || attempt === attempts - 1) break
    } catch (error) {
      if (error.name === 'AbortError' || attempt === attempts - 1) throw error
    }
    await delay(350 * (attempt + 1))
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || (
      response.status >= 500 ? 'Server temporarily unavailable' : 'Request failed'
    ))
    error.status = response.status
    error.details = payload.details || {}
    throw error
  }
  return payload
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export const money = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function pesosToCentavos(value) {
  return Math.round(Number(value) * 100)
}
