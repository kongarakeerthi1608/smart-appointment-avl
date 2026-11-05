const BASE = '/api'

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && data.message) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, data?.fieldErrors || {})
  }

  return data
}

export const api = {
  dashboard: () => request('/dashboard'),
  appointments: (query = '', status = '') => {
    const params = new URLSearchParams()
    if (query) params.set('query', query)
    if (status && status !== 'ALL') params.set('status', status)
    const suffix = params.toString()
    return request(`/appointments${suffix ? `?${suffix}` : ''}`)
  },
  appointment: (id) => request(`/appointments/${encodeURIComponent(id)}`),
  book: (payload) =>
    request('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancel: (id) =>
    request(`/appointments/${encodeURIComponent(id)}/cancel`, {
      method: 'POST',
    }),
  availability: (date) =>
    request(`/appointments/availability?date=${encodeURIComponent(date)}`),
  nextAvailable: () => request('/appointments/next-available'),
  tree: () => request('/avl/tree'),
  treeHealth: () => request('/avl/health'),
  traversals: () => request('/avl/traversals'),
  avlSearch: (appointmentId) =>
    request('/avl/search', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    }),
  insertSample: () =>
    request('/avl/sample', {
      method: 'POST',
    }),
  avlDelete: (id) =>
    request(`/avl/appointments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  reset: () =>
    request('/avl/reset', {
      method: 'POST',
    }),
  health: () => request('/health'),
}
