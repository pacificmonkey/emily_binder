import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, Button, Input } from '@/components/ui'
import styles from './Login.module.css'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { signIn, user, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  // Redirect if already authenticated (react to auth state changes)
  useEffect(() => {
    if (!authLoading && user) {
      console.log('[Login] User authenticated, navigating to:', from)
      navigate(from, { replace: true })
    }
  }, [user, authLoading, navigate, from])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Start sign in - don't wait for it to complete
    // The useEffect above will handle navigation when auth state changes
    signIn(email, password).then(({ error }) => {
      if (error) {
        setError(error.message)
        setIsLoading(false)
      }
      // Don't navigate here - let useEffect handle it based on auth state
    }).catch((err) => {
      console.error('[Login] Sign in error:', err)
      setError('Failed to sign in. Please try again.')
      setIsLoading(false)
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h1 className={styles.title}>Emily Mission Log</h1>
          <p className={styles.subtitle}>Sign in to continue</p>
        </header>

        <Card variant="elevated">
          <CardContent>
            <form onSubmit={handleSubmit} className={styles.form}>
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
              />

              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" isLoading={isLoading} className={styles.submitButton}>
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className={styles.forgotPassword}>
          <button type="button" onClick={() => navigate('/forgot-password')}>
            Forgot your password?
          </button>
        </p>
      </div>
    </div>
  )
}
