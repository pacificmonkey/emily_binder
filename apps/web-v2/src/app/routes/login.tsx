import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // Sign-in only (sign-up removed — admin-managed access)
  const signIn = useAuthStore((s) => s.signIn)
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const navigate = useNavigate()

  // Redirect already-authenticated users to the app
  if (!authLoading && user) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('Invalid login')) {
          setError("That password didn't work. Try again or reset your password.")
        } else if (err.message.includes('not authorized')) {
          setError("This email isn't set up yet. Ask your admin to add you.")
        } else if (err.message.includes('already registered')) {
          setError("This email is already registered. Try signing in instead.")
        } else {
          setError(err.message || "Something went wrong. Check your connection and try again.")
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-content">Emily's Missions</h1>
          <p className="mt-2 text-content-secondary">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-content-secondary mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-soft border border-border bg-surface px-3 py-2.5 text-content placeholder:text-content-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-content-secondary mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
              className="w-full rounded-soft border border-border bg-surface px-3 py-2.5 text-content placeholder:text-content-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-soft bg-danger-light p-3 text-sm text-danger-dark">
              {error}
            </div>
          )}

          {success && (
            <div role="status" className="rounded-soft bg-green-50 p-3 text-sm text-green-800">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-soft bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-content-secondary">
          Need access? Contact your administrator.
        </p>
      </div>
    </div>
  )
}
