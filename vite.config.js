import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_URL || 'http://localhost:3000'

  // Customer page routes — must NOT be proxied to backend
  const customerPageRoutes = [
    '/customer/dashboard', '/customer/services', '/customer/transactions',
    '/customer/coins', '/customer/kyc', '/customer/cibil', '/customer/offers',
    '/customer/notifications', '/customer/support', '/customer/security',
    '/customer/register',
  ]

  return {
    plugins: [react()],
    server: {
      historyApiFallback: true,
      proxy: {
        '/api':       { target: backendUrl, changeOrigin: true },
        '/auth':      { target: backendUrl, changeOrigin: true },
        '/dashboard': {
          target: backendUrl,
          changeOrigin: true,
          bypass(req) {
            // Only bypass GET requests with no Authorization header (page navigations)
            if (req.method === 'GET' && !req.headers.authorization) {
              return '/index.html'
            }
          },
        },
        '/customers': { target: backendUrl, changeOrigin: true },
        '/customer': {
          target: backendUrl,
          changeOrigin: true,
          bypass(req) {
            // If it's a page navigation (no Authorization header), serve React app
            if (customerPageRoutes.includes(req.url) && !req.headers.authorization) {
              return '/index.html'
            }
          },
        },
        '/master':         { target: backendUrl, changeOrigin: true },
        '/targets':        { target: backendUrl, changeOrigin: true },
        '/assignments':    { target: backendUrl, changeOrigin: true },
        '/collections':    { target: backendUrl, changeOrigin: true },
        '/superadmin': {
          target: backendUrl,
          changeOrigin: true,
          bypass(req) {
            // Page navigations have no Authorization header — serve React app
            // API calls (redeem-requests, etc.) always have Authorization header
            if (req.method === 'GET' && !req.headers.authorization) return '/index.html'
          },
        },
        '/leads':          { target: backendUrl, changeOrigin: true },
        '/fraud':          { target: backendUrl, changeOrigin: true },
        '/finance':        { target: backendUrl, changeOrigin: true },
        '/notifications': {
          target: backendUrl,
          changeOrigin: true,
          bypass(req) {
            // /superadmin/notifications is a React page — handled by /superadmin proxy
            // Only bypass direct /notifications page navigations
            if (req.method === 'GET' && !req.headers.authorization &&
                (req.url === '/notifications' || req.url.startsWith('/notifications/'))) {
              return '/index.html'
            }
          },
        },
        '/visitors':       { target: backendUrl, changeOrigin: true },
        '/upload':         { target: backendUrl, changeOrigin: true },
        '/gallery': {
          target: backendUrl,
          changeOrigin: true,
          bypass(req) {
            if (req.method === 'GET' && req.headers.accept?.includes('text/html')) return '/index.html'
          },
        },
        '/careers': {
          target: backendUrl,
          changeOrigin: true,
          bypass(req) {
            if (req.method === 'GET' && req.headers.accept?.includes('text/html')) return '/index.html'
          },
        },
      },
    },
  }
})
