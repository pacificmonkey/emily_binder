import { supabase } from '@/lib/supabase'

export interface Patient {
  patient_id: string
  full_name: string
  email: string
}

export interface ImpersonationStatus {
  is_impersonating: boolean
  session_id?: string
  target_patient_id?: string
  target_patient_name?: string
  started_at?: string
}

// Check if current user is admin
export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')

  if (error) {
    console.error('Error checking admin status:', error)
    return false
  }

  return data === true
}

// Get patients available for impersonation
export async function getPatientsForImpersonation(): Promise<Patient[]> {
  const { data, error } = await supabase.rpc('get_patients_for_impersonation')

  if (error) {
    console.error('Error fetching patients:', error)
    throw new Error(`Failed to fetch patients: ${error.message}`)
  }

  const result = data as { success: boolean; patients?: Patient[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch patients')
  }

  return result.patients || []
}

// Get current impersonation status
export async function getImpersonationStatus(): Promise<ImpersonationStatus> {
  const { data, error } = await supabase.rpc('get_impersonation_status')

  if (error) {
    console.error('Error fetching impersonation status:', error)
    throw new Error(`Failed to get impersonation status: ${error.message}`)
  }

  return data as ImpersonationStatus
}

// Start impersonating a patient
export async function startImpersonation(
  targetPatientId: string,
  reason?: string
): Promise<{ session_id: string; target_patient_id: string }> {
  const { data, error } = await supabase.rpc('start_impersonation', {
    p_target_patient_id: targetPatientId,
    p_reason: reason || null,
  })

  if (error) {
    console.error('Error starting impersonation:', error)
    throw new Error(`Failed to start impersonation: ${error.message}`)
  }

  const result = data as {
    success: boolean
    session_id?: string
    target_patient_id?: string
    error?: string
  }

  if (!result.success) {
    throw new Error(result.error || 'Failed to start impersonation')
  }

  return {
    session_id: result.session_id!,
    target_patient_id: result.target_patient_id!,
  }
}

// Stop impersonating
export async function stopImpersonation(): Promise<void> {
  const { data, error } = await supabase.rpc('stop_impersonation')

  if (error) {
    console.error('Error stopping impersonation:', error)
    throw new Error(`Failed to stop impersonation: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to stop impersonation')
  }
}

// ============================================================================
// Feature Module Management
// ============================================================================

export interface FeatureModule {
  feature_module_id: string
  key: string
  description: string | null
  default_enabled: boolean
  depends_on_module_keys: string[] | null
  is_enabled: boolean
  setting_id: string | null
  set_at: string | null
}

// Get all feature modules with their settings
export async function getFeatureModules(): Promise<FeatureModule[]> {
  const { data, error } = await supabase.rpc('get_feature_modules')

  if (error) {
    console.error('Error fetching feature modules:', error)
    throw new Error(`Failed to fetch feature modules: ${error.message}`)
  }

  return (data as FeatureModule[]) || []
}

// Toggle a feature module
export async function toggleFeatureModule(
  featureKey: string,
  enabled: boolean
): Promise<void> {
  const { data, error } = await supabase.rpc('toggle_feature_module', {
    p_feature_key: featureKey,
    p_enabled: enabled,
  })

  if (error) {
    console.error('Error toggling feature module:', error)
    throw new Error(`Failed to toggle feature: ${error.message}`)
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to toggle feature')
  }
}

// ============================================================================
// Audit Log Management
// ============================================================================

export interface AuditLogEntry {
  audit_event_id: string
  object_type: string
  object_id: string
  action: string
  actor_user_id: string | null
  actor_email: string | null
  field_changes: Record<string, unknown> | null
  occurred_at: string
}

// Get audit log entries
export async function getAuditLog(
  limit = 100,
  offset = 0,
  objectType?: string,
  action?: string
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase.rpc('get_audit_log', {
    p_limit: limit,
    p_offset: offset,
    p_object_type: objectType || null,
    p_action: action || null,
  })

  if (error) {
    console.error('Error fetching audit log:', error)
    throw new Error(`Failed to fetch audit log: ${error.message}`)
  }

  return (data as AuditLogEntry[]) || []
}

// Get audit log count
export async function getAuditLogCount(
  objectType?: string,
  action?: string
): Promise<number> {
  const { data, error } = await supabase.rpc('get_audit_log_count', {
    p_object_type: objectType || null,
    p_action: action || null,
  })

  if (error) {
    console.error('Error fetching audit log count:', error)
    return 0
  }

  return (data as number) || 0
}
