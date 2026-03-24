import { supabase } from '@/lib/supabase'

// ============================================================================
// Types
// ============================================================================

export type UserRole = 'admin' | 'member' | 'support'

export interface UserRoleInfo {
  role: UserRole | null
  workspace_id: string | null
  assigned_patients?: AssignedPatient[]
}

export interface AssignedPatient {
  patient_id: string
  full_name: string
  is_currently_viewing: boolean
}

export interface SupportDashboardData {
  patient_id: string
  patient_name: string
  tasks_today: number
  tasks_completed: number
  vp_earned_today: number
  daily_win_target: number
  daily_win_enabled: boolean
  med_adherence_7d: number | null
  recent_symptoms_7d: number
  active_streaks: number
  open_discussions: number
  error?: string
}

// ============================================================================
// RPC Functions
// ============================================================================

export async function getUserRole(): Promise<UserRoleInfo> {
  const { data, error } = await supabase.rpc('get_user_role')

  if (error) {
    throw new Error(`Failed to get user role: ${error.message}`)
  }

  const result = data as UserRoleInfo
  return {
    role: result.role,
    workspace_id: result.workspace_id,
    assigned_patients: result.assigned_patients,
  }
}

export async function getSupportDashboard(): Promise<SupportDashboardData> {
  const { data, error } = await supabase.rpc('get_support_dashboard')

  if (error) {
    throw new Error(`Failed to get support dashboard: ${error.message}`)
  }

  const result = data as SupportDashboardData

  if (result.error) {
    throw new Error(result.error)
  }

  return result
}

export async function setSupportViewedPatient(patientId: string): Promise<void> {
  const { data, error } = await supabase.rpc('set_support_viewed_patient', {
    p_patient_id: patientId,
  })

  if (error) {
    throw new Error(`Failed to switch patient: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to switch patient')
  }
}

export async function assignSupportToPatient(
  supportUserId: string,
  patientId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('assign_support_to_patient', {
    p_support_user_id: supportUserId,
    p_patient_id: patientId,
  })

  if (error) {
    throw new Error(`Failed to assign support: ${error.message}`)
  }

  const result = data as { success: boolean; support_assignment_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to assign support')
  }

  return result.support_assignment_id!
}

export async function unassignSupportFromPatient(
  supportUserId: string,
  patientId: string
): Promise<void> {
  const { data, error } = await supabase.rpc('unassign_support_from_patient', {
    p_support_user_id: supportUserId,
    p_patient_id: patientId,
  })

  if (error) {
    throw new Error(`Failed to unassign support: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to unassign support')
  }
}
