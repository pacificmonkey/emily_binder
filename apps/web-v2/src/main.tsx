import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import * as Sentry from '@sentry/react'
import { queryClient } from '@/lib/query-client'
import { AppRouter } from '@/app/router'
import { useAuthStore } from '@/stores/auth-store'
import { Toaster } from '@/components/ui/toaster'
import './styles/globals.css'

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
}

// Initialize auth
useAuthStore.getState().initialize()

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<AppErrorFallback />}>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <Toaster />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  )
}

function AppErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-content">Something went wrong</h1>
        <p className="mt-2 text-content-secondary">
          The app ran into a problem. Try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-soft bg-accent px-4 py-2 text-accent-contrast hover:bg-accent-hover"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
