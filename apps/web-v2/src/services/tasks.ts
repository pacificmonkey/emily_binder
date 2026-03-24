import { supabase } from '@/lib/supabase'
import type {
  Task,
  TaskInstance,
  TaskWithInstance,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/types/database'

// Get user's workspace and patient context
async function getUserContext() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get user's workspace membership
  const { data: membership, error: membershipError } = await supabase
    .from('workspace_membership')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (membershipError || !membership) {
    throw new Error('No active workspace membership found')
  }

  // Get patient profile
  const { data: patient, error: patientError } = await supabase
    .from('patient_profile')
    .select('patient_id')
    .eq('workspace_id', membership.workspace_id)
    .single()

  if (patientError || !patient) {
    throw new Error('No patient profile found')
  }

  return {
    user_id: user.id,
    workspace_id: membership.workspace_id,
    patient_id: patient.patient_id,
  }
}

// Fetch tasks for today using RPC function
export async function getTodaysTasks(): Promise<TaskWithInstance[]> {
  const { data, error } = await supabase.rpc('get_todays_tasks')

  if (error) {
    throw error
  }

  const result = data as { success: boolean; tasks: TaskWithInstance[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch tasks')
  }

  return result.tasks || []
}

// Fetch all active tasks
export async function getAllTasks(): Promise<Task[]> {
  const ctx = await getUserContext()

  const { data, error } = await supabase
    .from('task')
    .select('*')
    .eq('workspace_id', ctx.workspace_id)
    .eq('patient_id', ctx.patient_id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Create a new task using RPC function
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data, error } = await supabase.rpc('create_task', {
    p_title: input.title,
    p_description: input.description || null,
    p_points: input.points ?? null,
    p_task_type_key: input.task_type_key ?? 'one_time',
    p_assigned_day: input.assigned_day || null,
    p_requires_same_day_completion: input.requires_same_day_completion ?? true,
    p_must_do: input.must_do ?? false,
    p_mission_category_id: input.mission_category_id || null,
    p_difficulty: input.difficulty || 'medium',
    p_frequency: input.frequency || null,
    p_interval: input.interval ?? 1,
    p_days_of_week: input.days_of_week || null,
    p_start_date: input.start_date || null,
    p_end_date: input.end_date || null,
    p_time_window_label: input.time_window_label || null,
    p_target_completions_per_period: input.target_completions_per_period || null,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; task: Task; task_id: string }

  if (!result.success) {
    throw new Error('Failed to create task')
  }

  return result.task
}

// Update a task (scoped to user's workspace/patient, points stripped)
export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  const ctx = await getUserContext()

  // Strip points from input — points are computed server-side from category + difficulty
  const { points: _points, ...safeInput } = input

  const { data, error } = await supabase
    .from('task')
    .update(safeInput)
    .eq('task_id', taskId)
    .eq('workspace_id', ctx.workspace_id)
    .eq('patient_id', ctx.patient_id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Archive a task (scoped to user's workspace/patient)
export async function archiveTask(taskId: string): Promise<void> {
  const ctx = await getUserContext()

  const { error } = await supabase
    .from('task')
    .update({ status: 'archived' })
    .eq('task_id', taskId)
    .eq('workspace_id', ctx.workspace_id)
    .eq('patient_id', ctx.patient_id)

  if (error) throw error
}

// Complete a task using RPC function
export async function completeTask(
  taskId: string,
  input?: { completion_notes?: string | null }
): Promise<TaskInstance> {
  const { data, error } = await supabase.rpc('complete_task', {
    p_task_id: taskId,
    p_completion_notes: input?.completion_notes || null,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; task_instance_id: string; points_awarded: number; error?: string; detail?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to complete task')
  }

  // Return a minimal task instance object
  return {
    task_instance_id: result.task_instance_id,
    task_id: taskId,
    completion_status: 'done',
    completed_at: new Date().toISOString(),
    points_awarded: result.points_awarded,
  } as TaskInstance
}

// Uncomplete a task using RPC function
export async function uncompleteTask(taskId: string): Promise<TaskInstance | null> {
  const { data, error } = await supabase.rpc('uncomplete_task', {
    p_task_id: taskId,
  })

  if (error) {
    throw error
  }

  const result = data as { success: boolean; task_instance_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to uncomplete task')
  }

  // Return a minimal task instance object
  return {
    task_instance_id: result.task_instance_id || '',
    task_id: taskId,
    completion_status: 'not_done',
    completed_at: null,
    points_awarded: 0,
  } as TaskInstance
}

// Get user's current progress/points
export async function getUserProgress() {
  const ctx = await getUserContext()

  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('workspace_id', ctx.workspace_id)
    .eq('patient_id', ctx.patient_id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}
