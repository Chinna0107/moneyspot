import config from '../config'

export const api = async (endpoint, options = {}) => {
  const { headers: extraHeaders, ...rest } = options

  const res = await fetch(`${config.API_URL}${endpoint}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Server error (${res.status}) — is the backend running?`)
  }

  const data = await res.json()

  // Auto-redirect on 401 — token expired or missing
  if (res.status === 401) {
    console.error('API 401 Error on endpoint:', endpoint, 'Headers sent:', options.headers)
    const isCustomer  = endpoint.startsWith('/customer') && !endpoint.startsWith('/customers')
    const isSuperAdmin = endpoint.startsWith('/auth/superadmin') || localStorage.getItem('current_role') === 'superadmin'
    if (isCustomer) {
      localStorage.removeItem('customer_auth')
      // window.location.href = '/login/customer'
    } else if (!isSuperAdmin) {
      // localStorage.removeItem('employee_auth')
      // window.location.href = '/login/employee'
    }
    throw new Error(data.error || 'Session expired. Please log in again.')
  }

  if (!res.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

// ── Upload helper (multipart/form-data) ──────────────────────
// Do NOT set Content-Type — browser sets it with boundary automatically
export const apiUpload = async (endpoint, file, token) => {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${config.API_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Server error (${res.status})`)
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data
}
