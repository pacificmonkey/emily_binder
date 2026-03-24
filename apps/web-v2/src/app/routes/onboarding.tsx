import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { completeOnboarding } from '@/services/onboarding'

export function OnboardingPage() {
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return

    setLoading(true)
    setError(null)

    try {
      await completeOnboarding(displayName.trim())
      navigate('/')
    } catch {
      setError("Couldn't finish setup. Try again?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-content">Welcome!</h1>
        <p className="mt-2 text-content-secondary">What should we call you?</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            required
            autoFocus
            className="w-full rounded-soft border border-border bg-surface px-3 py-2.5 text-center text-lg text-content placeholder:text-content-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />

          {error && (
            <div role="alert" className="rounded-soft bg-danger-light p-3 text-sm text-danger-dark">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !displayName.trim()}
            className="w-full rounded-soft bg-accent px-4 py-2.5 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Setting up...' : "Let's go!"}
          </button>
        </form>
      </div>
    </div>
  )
}
