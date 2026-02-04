import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { checkOnboardingStatus, completeOnboarding } from '@/services/onboarding'

interface OnboardingState {
  isLoading: boolean
  isOnboarded: boolean
  workspaceId?: string
  error: Error | null
}

export function useOnboarding() {
  const { user } = useAuth()
  const [state, setState] = useState<OnboardingState>({
    isLoading: true,
    isOnboarded: false,
    error: null,
  })

  useEffect(() => {
    if (!user) {
      setState({ isLoading: false, isOnboarded: false, error: null })
      return
    }

    async function init() {
      try {
        const status = await checkOnboardingStatus()

        if (status.completed) {
          setState({
            isLoading: false,
            isOnboarded: true,
            workspaceId: status.workspaceId,
            error: null,
          })
        } else {
          // Auto-complete onboarding for new users
          const result = await completeOnboarding()
          setState({
            isLoading: false,
            isOnboarded: true,
            workspaceId: result.workspaceId,
            error: null,
          })
        }
      } catch (error) {
        setState({
          isLoading: false,
          isOnboarded: false,
          error: error instanceof Error ? error : new Error('Onboarding failed'),
        })
      }
    }

    init()
  }, [user])

  return state
}
