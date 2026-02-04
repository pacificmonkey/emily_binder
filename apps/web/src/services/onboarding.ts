import { supabase } from '@/lib/supabase'

interface OnboardingStatusResult {
  completed: boolean
  workspace_id?: string
  error?: string
}

interface OnboardingResult {
  success: boolean
  workspace_id?: string
  patient_id?: string
  already_onboarded?: boolean
}

// Check if user has completed onboarding (has workspace membership)
export async function checkOnboardingStatus(): Promise<{ completed: boolean; workspaceId?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { completed: false }

  // Use the RPC function to check status
  const { data, error } = await supabase.rpc('check_onboarding_status')

  if (error) {
    console.error('Error checking onboarding status:', error)
    return { completed: false }
  }

  const result = data as OnboardingStatusResult
  return {
    completed: result.completed,
    workspaceId: result.workspace_id,
  }
}

// Complete onboarding by creating workspace, patient profile, and membership
export async function completeOnboarding(displayName?: string): Promise<{ workspaceId: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Use the RPC function to complete onboarding
  const { data, error } = await supabase.rpc('complete_onboarding', {
    p_display_name: displayName || null,
  })

  if (error) {
    console.error('Onboarding error:', error)
    throw new Error(error.message || 'Failed to complete onboarding')
  }

  const result = data as OnboardingResult
  if (!result.success || !result.workspace_id) {
    throw new Error('Onboarding did not return a workspace ID')
  }

  return { workspaceId: result.workspace_id }
}
