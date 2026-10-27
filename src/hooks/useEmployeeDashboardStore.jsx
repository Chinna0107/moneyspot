import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { api } from '../utils/api'
import { getTokenByRole } from '../utils/tokenUtils'

const CACHE_KEY = 'emp_dashboard_v1'
const STALE_MS  = 5 * 60 * 1000   // data older than 5min triggers background refresh

const Ctx = createContext(null)

const auth = () => ({ Authorization: `Bearer ${getTokenByRole('employee') || getTokenByRole('admin')}` })

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    return { data, ts }
  } catch { return null }
}

function writeCache(data) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

export function EmployeeDashboardProvider({ children }) {
  const cached = readCache()
  const [data, setData]       = useState(cached?.data ?? null)
  const [loading, setLoading] = useState(!cached?.data)
  const fetchingRef           = useRef(false)

  const fetchAll = useCallback(async (force = false) => {
    if (fetchingRef.current) return
    const hit = readCache()
    if (!force && hit && Date.now() - hit.ts < STALE_MS) return

    fetchingRef.current = true
    if (!hit?.data) setLoading(true)

    try {
      // Single API call — backend merges everything into one response
      const result = await api('/dashboard/employee/full', { headers: auth() })
      setData(result)
      writeCache(result)
    } catch {}

    setLoading(false)
    fetchingRef.current = false
  }, [])

  // fetch on mount (uses cache if fresh, background-refreshes if stale)
  useEffect(() => { fetchAll() }, [fetchAll])

  const forceRefresh = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY)
    fetchAll(true)
  }, [fetchAll])

  return (
    <Ctx.Provider value={{ data, loading, forceRefresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useEmployeeDashboard() {
  const ctx = useContext(Ctx)
  if (!ctx) return { data: null, loading: true, forceRefresh: () => {} }
  return ctx
}
