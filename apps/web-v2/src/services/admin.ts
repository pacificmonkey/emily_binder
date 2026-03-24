import { supabase } from '@/lib/supabase'

export interface Patient {
  patient_id: string
  full_name: string
  email: string
  role?: string
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
    return false
  }

  return data === true
}

// Get patients available for impersonation
export async function getPatientsForImpersonation(): Promise<Patient[]> {
  const { data, error } = await supabase.rpc('get_patients_for_impersonation')

  if (error) {
    throw new Error('Failed to fetch patients')
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
    throw new Error('Failed to get impersonation status')
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
    throw new Error('Failed to start impersonation')
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
    throw new Error('Failed to stop impersonation')
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
    throw new Error('Failed to fetch feature modules')
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
    throw new Error('Failed to toggle feature')
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
    throw new Error('Failed to fetch audit log')
  }

  return (data as AuditLogEntry[]) || []
}

// ============================================================================
// Admin Dashboard Stats
// ============================================================================

export interface AdminDashboardStats {
  coins_awarded_this_week: number
  active_streak_count: number
  tasks_completed_today: number
  tasks_total_today: number
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats')

  if (error) {
    throw new Error('Failed to fetch admin stats')
  }

  const result = data as { success: boolean; data?: AdminDashboardStats; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch admin stats')
  }

  return result.data!
}

// ============================================================================
// Task Template Management
// ============================================================================

export interface TaskTemplate {
  task_template_id: string
  title: string
  description: string | null
  category_id: string | null
  default_points: number
  is_must_do: boolean
  recurrence_rule: string | null
  is_active: boolean
  created_at: string
}

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  const { data, error } = await supabase.rpc('get_task_templates')

  if (error) {
    throw new Error('Failed to fetch task templates')
  }

  const result = data as { success: boolean; templates?: TaskTemplate[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch task templates')
  }

  return result.templates || []
}

export async function createTaskTemplate(input: {
  title: string
  description?: string
  category_id?: string
  default_points?: number
  is_must_do?: boolean
  recurrence_rule?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_task_template', {
    p_title: input.title,
    p_description: input.description || null,
    p_category_id: input.category_id || null,
    p_default_points: input.default_points ?? 5,
    p_is_must_do: input.is_must_do ?? false,
    p_recurrence_rule: input.recurrence_rule || null,
  })

  if (error) {
    throw new Error('Failed to create task template')
  }

  const result = data as { success: boolean; task_template_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create task template')
  }

  return result.task_template_id!
}

export async function deleteTaskTemplate(templateId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_task_template', {
    p_task_template_id: templateId,
  })

  if (error) {
    throw new Error('Failed to delete task template')
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete task template')
  }
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
    return 0
  }

  return (data as number) || 0
}

// ============================================================================
// User Management
// ============================================================================

export interface CreateUserInput {
  email: string
  full_name: string
  role: string
  password?: string
}

export interface CreateUserResult {
  user_id: string
  email: string
  full_name: string
  role: string
}

export async function adminCreateUser(input: CreateUserInput): Promise<CreateUserResult> {
  const { data, error } = await supabase.rpc('admin_create_user', {
    p_email: input.email,
    p_full_name: input.full_name,
    p_role: input.role,
    p_password: input.password || null,
  })

  if (error) {
    throw new Error('Failed to create user')
  }

  const result = data as { success: boolean; user_id?: string; email?: string; full_name?: string; role?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create user')
  }

  return {
    user_id: result.user_id!,
    email: result.email!,
    full_name: result.full_name!,
    role: result.role!,
  }
}
