export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
    body: options.body && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'Request failed')
    error.status = response.status
    error.details = payload.details || {}
    throw error
  }
  return payload
}

export const money = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
})

export function pesosToCentavos(value) {
  return Math.round(Number(value) * 100)
}
