/**
 * Database types for Supabase
 * These types match the schema defined in the build plan
 */

export type Role = 'emily' | 'support' | 'joey'
export type EndOfDayPolicy = 'carryover_next_day' | 'never_carryover' | 'convert_to_this_week'
export type MissionType = 'one_time' | 'recurring'
export type RecurrencePattern = 'daily' | 'weekly' | 'specific_weekdays'
export type OneTimeAssignment = 'day_assigned' | 'week_assigned'
export type GoalType = 'destiny' | 'quest'
export type MoodQuadrant = 'high_energy_pleasant' | 'high_energy_unpleasant' | 'low_energy_pleasant' | 'low_energy_unpleasant'
export type JoeyTodoType = 'deadline_risk' | 'urgent_report' | 'health_refill_risk'
export type JoeyTodoStatus = 'open' | 'done'
export type ProposalStatus = 'pending' | 'approved' | 'rejected'
export type HealthAccessLevel = 'none' | 'view' | 'edit'
export type ProviderType = 'doctor' | 'therapist' | 'group' | 'other'
export type EventCategory = 'general' | 'medication' | 'appointment' | 'refill'
export type ExpenseFrequency = 'monthly' | 'one_time'

// Budget expense category interface (database-driven, manageable in admin)
export interface BudgetExpenseCategory {
  id: string
  name: string
  icon: string
  vp_value: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  display_name: string
  role_global: Role
  active: boolean
  created_at: string
  updated_at: string
}

export interface SupportLink {
  id: string
  emily_user_id: string
  support_user_id: string
  active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  color: string | null
  icon: string | null
  vp_value: number
  end_of_day_policy: EndOfDayPolicy
  is_mandatory_default: boolean
  sort_order: number
  created_at: string
}

export interface Mission {
  id: string
  owner_user_id: string
  created_by_user_id: string
  title: string
  instructions_md: string | null
  steps: MissionStep[]
  category_id: string
  mission_type: MissionType
  one_time_assignment: OneTimeAssignment | null
  due_date: string | null
  week_start_date: string | null
  deadline: string | null
  recurrence_pattern: RecurrencePattern | null
  weekdays: number[] | null
  snoozed_until: string | null
  sort_order: number
  is_snoozable: boolean
  archived: boolean
  created_at: string
  updated_at: string
  // Joined data
  category?: Category
}

export interface MissionStep {
  id: string
  text: string
  completed: boolean
}

export interface Event {
  id: string
  owner_user_id: string
  created_by_user_id: string
  title: string
  description_md: string | null
  location: string | null
  event_date: string
  event_time: string | null
  end_time: string | null
  all_day: boolean
  is_mandatory: boolean
  category: EventCategory
  category_id: string | null
  is_recurring: boolean
  recurrence_pattern: RecurrencePattern | null
  weekday_flags: number | null
  recurrence_end_date: string | null
  health_medication_id: string | null
  health_provider_id: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface MissionCompletion {
  id: string
  mission_id: string
  completion_date: string
  completed_by_user_id: string
  vp_awarded: number
  completed_at: string
}

export interface EventCompletion {
  id: string
  event_id: string
  completed_by_user_id: string
  vp_awarded: number
  completed_at: string
}

export interface Goal {
  id: string
  owner_user_id: string
  created_by_user_id: string
  title: string
  description_md: string | null
  goal_type: GoalType
  is_completed: boolean
  completed_at: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface GoalItem {
  id: string
  goal_id: string
  mission_id: string | null
  attachment_url: string | null
  attachment_name: string | null
  sort_order: number
  created_at: string
}

export interface EconomyState {
  id: string
  user_id: string
  total_vp: number
  current_level: number
  coins: number
  updated_at: string
}

export interface EconomyConfig {
  id: string
  level_thresholds: number[]
  coins_per_level: number[]
  daily_win_threshold: number
  mandatory_event_multiplier: number
  grace_token_cost: number
  weekly_streak_prompt_day: number
  weekly_streak_prompt_hour: number
  created_at: string
  updated_at: string
}

export interface WeeklyStreakState {
  id: string
  user_id: string
  mission_id: string
  current_streak: number
  longest_streak: number
  last_completed_week: string | null
  updated_at: string
}

export interface Badge {
  id: string
  user_id: string
  badge_type: string
  badge_name: string
  badge_description: string | null
  badge_icon: string | null
  related_mission_id: string | null
  milestone_value: number | null
  earned_at: string
}

export interface GraceToken {
  id: string
  user_id: string
  quantity: number
  updated_at: string
}

export interface StickerCatalog {
  id: string
  name: string
  image_url: string
  cost_coins: number
  category: string | null
  sort_order: number
  active: boolean
  created_at: string
}

export interface StickerOwnership {
  id: string
  user_id: string
  sticker_id: string
  purchased_at: string
}

export interface StickerPlacement {
  id: string
  user_id: string
  sticker_id: string
  position_x: number
  position_y: number
  scale: number
  rotation: number
  z_index: number
  created_at: string
  updated_at: string
}

export interface MoodFeeling {
  id: string
  name: string
  quadrant: MoodQuadrant
  sort_order: number
  active: boolean
}

export interface MoodLog {
  id: string
  user_id: string
  quadrant: MoodQuadrant
  feelings: string[]
  intensity: number | null
  note: string | null
  logged_at: string
}

export interface BonusObjective {
  id: string
  name: string
  description: string | null
  vp_value: number
  objective_type: string
  active: boolean
  created_at: string
}

export interface BonusCompletion {
  id: string
  user_id: string
  bonus_objective_id: string
  completion_date: string
  completed_at: string
}

export interface JoeyTodo {
  id: string
  type: JoeyTodoType
  title: string
  description: string | null
  related_id: string | null
  status: JoeyTodoStatus
  created_at: string
  resolved_at: string | null
}

export interface MissionProposal {
  id: string
  proposed_by_user_id: string
  target_user_id: string
  title: string
  instructions_md: string | null
  category_id: string
  recurrence_pattern: RecurrencePattern
  weekdays: number[] | null
  is_urgent: boolean
  status: ProposalStatus
  reviewed_by_user_id: string | null
  reviewed_at: string | null
  created_at: string
}

export interface HealthAccessConfig {
  id: string
  owner_user_id: string
  support_access: HealthAccessLevel
  emily_can_log_intake: boolean
  emily_can_view_intake_history: boolean
  created_at: string
  updated_at: string
}

export interface HealthPharmacy {
  id: string
  owner_user_id: string
  name: string
  phone: string | null
  address: string | null
  notes_md: string | null
  active: boolean
  created_at: string
}

export interface HealthProvider {
  id: string
  owner_user_id: string
  provider_type: ProviderType
  name: string
  specialty_or_role: string | null
  phone: string | null
  email: string | null
  address: string | null
  portal_url: string | null
  notes_md: string | null
  active: boolean
  created_at: string
}

export interface HealthMedication {
  id: string
  owner_user_id: string
  name: string
  instructions_md: string | null
  pills_on_hand: number | null
  pills_per_day: number | null
  low_supply_threshold: number | null
  rx_numbers: string[] | null
  refills_remaining: number | null
  refill_instructions: string | null
  renewal_instructions: string | null
  last_refill_date: string | null
  next_refill_due_date: string | null
  pharmacy_id: string | null
  prescriber_provider_id: string | null
  notes_md: string | null
  active: boolean
  created_at: string
  updated_at: string
  // Joined data
  pharmacy?: HealthPharmacy
  prescriber?: HealthProvider
}

export interface HealthMedIntakeLog {
  id: string
  owner_user_id: string
  medication_id: string
  taken_at: string
  dose_text: string | null
  note: string | null
  created_by_user_id: string
  created_at: string
}

export interface HealthRefillLog {
  id: string
  owner_user_id: string
  medication_id: string
  refill_date: string
  pills_added: number | null
  refills_remaining_after: number | null
  rx_number_used: string | null
  note: string | null
  created_by_user_id: string
  created_at: string
}

export interface BudgetIncomeSource {
  id: string
  owner_user_id: string
  name: string
  amount: number
  frequency: string
  allowed_categories: string[] | null  // null = unrestricted, array of category names
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BudgetExpense {
  id: string
  owner_user_id: string
  name: string
  amount: number
  frequency: ExpenseFrequency
  category: string | null  // Category name from budget_expense_categories
  due_date: string | null
  is_paid: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BudgetActualExpense {
  id: string
  owner_user_id: string
  name: string
  amount: number
  category: string | null  // Category name from budget_expense_categories
  expense_date: string
  planned_expense_id: string | null  // Link to planned expense if logged from one
  notes: string | null
  created_at: string
  updated_at: string
}

// Supabase Database type - simplified for manual types
// For full type safety, generate types with: supabase gen types typescript
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Database {}
