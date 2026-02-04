// Database types for Emily's Missions
// Schema Version: 1.3.0

// Enums
export type TaskTypeKey = 'one_time' | 'recurring' | 'bonus'
export type TaskStatus = 'active' | 'archived'
export type TaskInstanceCompletionStatus = 'not_done' | 'done'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'custom'
export type BonusAvailability = 'daily' | 'weekly' | 'always'
export type TaskGroupStatus = 'active' | 'archived'

// Event enums
export type EventType = 'appointment' | 'social' | 'errand' | 'class' | 'therapy' | 'work' | 'other'
export type EventStatus = 'scheduled' | 'canceled' | 'completed' | 'no_show' | 'rescheduled'

// Notification enums
export type NotificationType = 'reminder' | 'info' | 'custom' | 'dose_reminder' | 'low_stock' | 'refill_due' | 'missed_dose' | 'expiration' | 'interaction_warning'
export type NotificationStatus = 'scheduled' | 'delivered' | 'failed' | 'dismissed' | 'acknowledged'
export type NotificationChannel = 'push' | 'sms' | 'email' | 'in_app'

// Transition buffer enums
export type TransitionBufferType = 'before_event' | 'after_event' | 'between_events' | 'daily_routine'

// Core Tables
export interface Task {
  task_id: string
  workspace_id: string
  patient_id: string
  title: string
  description: string | null
  points: number
  assigned_to_user_id: string
  created_by_user_id: string
  task_type_key: TaskTypeKey
  status: TaskStatus
  assigned_day: string | null // DATE as ISO string
  requires_same_day_completion: boolean
  must_do: boolean
  source_link_type: string | null
  source_link_id: string | null
  created_at: string
  updated_at: string
}

export interface TaskInstance {
  task_instance_id: string
  workspace_id: string
  patient_id: string
  task_id: string
  assigned_day: string // DATE as ISO string
  completion_status: TaskInstanceCompletionStatus
  completed_at: string | null
  points_awarded: number
  completion_notes: string | null
  created_at: string
}

export interface TaskTag {
  task_tag_id: string
  workspace_id: string
  patient_id: string
  name: string
  color_hint: string | null
  created_at: string
  updated_at: string
}

export interface TaskGroup {
  task_group_id: string
  workspace_id: string
  patient_id: string
  name: string
  description: string | null
  threshold_count: number
  bonus_points: number
  status: TaskGroupStatus
  created_at: string
  updated_at: string
}

export interface RecurrenceRule {
  recurrence_rule_id: string
  workspace_id: string
  task_id: string
  frequency: RecurrenceFrequency
  interval: number
  days_of_week: string[] | null
  start_date: string
  end_date: string | null
  time_window_label: string | null
  timezone: string
  created_at: string
  updated_at: string
}

export interface UserProgress {
  user_progress_id: string
  workspace_id: string
  patient_id: string
  total_points: number
  current_level: number
  points_into_level: number
  points_to_next_level: number
  last_recomputed_at: string
}

// Extended types with relations
export interface TaskWithInstance extends Task {
  task_instance?: TaskInstance | null
  tags?: TaskTag[]
  recurrence_rule?: RecurrenceRule | null
}

// Create/Update DTOs
export interface CreateTaskInput {
  title: string
  description?: string | null
  points?: number
  task_type_key?: TaskTypeKey
  assigned_day?: string | null
  requires_same_day_completion?: boolean
  must_do?: boolean
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  points?: number
  status?: TaskStatus
  assigned_day?: string | null
  requires_same_day_completion?: boolean
  must_do?: boolean
}

export interface CompleteTaskInput {
  completion_notes?: string | null
}

// Event types
export interface Event {
  event_id: string
  workspace_id: string
  patient_id: string
  type: EventType
  title: string
  starts_at: string
  ends_at: string | null
  timezone: string
  location: string | null
  status: EventStatus
  notes: string | null
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface CreateEventInput {
  title: string
  type?: EventType
  starts_at: string
  ends_at?: string | null
  timezone?: string
  location?: string | null
  notes?: string | null
}

export interface UpdateEventInput {
  title?: string
  type?: EventType
  starts_at?: string
  ends_at?: string | null
  timezone?: string
  location?: string | null
  notes?: string | null
  status?: EventStatus
}

// Notification types
export interface Notification {
  notification_id: string
  workspace_id: string
  patient_id: string
  type: NotificationType
  title: string
  body: string | null
  channel: NotificationChannel
  status: NotificationStatus
  scheduled_for: string | null
  delivered_at: string | null
  acknowledged_at: string | null
  snooze_until: string | null
  link_type: string | null
  link_id: string | null
  payload: Record<string, unknown> | null
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

// Transition buffer types
export interface TransitionBuffer {
  transition_buffer_id: string
  workspace_id: string
  patient_id: string
  type: TransitionBufferType
  title: string
  minutes: number
  notes: string | null
  applies_to: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// Health module enums
export type MedicationStrengthUnit = 'mg' | 'mcg' | 'g' | 'ml' | 'units' | 'puffs' | 'drops' | 'patches' | 'other'
export type DosageForm = 'tablet' | 'capsule' | 'liquid' | 'injection' | 'patch' | 'inhaler' | 'drops' | 'cream' | 'suppository' | 'other'
export type Route = 'oral' | 'sublingual' | 'topical' | 'injection' | 'inhalation' | 'ophthalmic' | 'otic' | 'nasal' | 'rectal' | 'vaginal' | 'transdermal' | 'other'
export type PrescriptionStatus = 'active' | 'inactive' | 'discontinued' | 'completed'
export type FrequencyType = 'scheduled' | 'prn' | 'both'
export type IntakeStatus = 'taken' | 'skipped' | 'missed' | 'refused' | 'held'
export type WithFood = 'none' | 'with_food' | 'without_food' | 'empty_stomach'
export type RecordedBy = 'user' | 'caregiver' | 'system' | 'other'
export type InventorySource = 'manual_set' | 'computed' | 'refill' | 'adjustment'
export type InventoryConfidence = 'high' | 'medium' | 'low'

// Health module types
export interface Medication {
  medication_id: string
  workspace_id: string
  display_name: string
  generic_name: string | null
  brand_name: string | null
  strength_value: number | null
  strength_unit: MedicationStrengthUnit
  dosage_form: DosageForm
  route: Route
  notes: string | null
  is_prn_capable: boolean
  created_at: string
  updated_at: string
}

export interface Prescription {
  prescription_id: string
  workspace_id: string
  patient_id: string
  medication_id: string
  status: PrescriptionStatus
  start_date: string | null
  end_date: string | null
  instructions_sig: string
  indication: string | null
  dose_quantity: number
  dose_unit: string
  frequency_type: FrequencyType
  frequency_description: string | null
  times_per_day: number | null
  prn_reason: string | null
  max_doses_per_day: number | null
  with_food: WithFood | null
  prescriber_id: string | null
  pharmacy_id: string | null
  refills_total: number | null
  refills_remaining: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PrescriptionWithMedication extends Prescription {
  medication: Medication
  inventory?: Inventory | null
}

export interface IntakeEvent {
  intake_event_id: string
  workspace_id: string
  patient_id: string
  prescription_id: string
  scheduled_time: string | null
  taken_time: string | null
  status: IntakeStatus
  dose_quantity: number
  dose_unit: string
  reason: string | null
  side_effects: string | null
  notes: string | null
  recorded_by: RecordedBy
  created_at: string
}

export interface Inventory {
  inventory_id: string
  workspace_id: string
  prescription_id: string
  current_on_hand: number
  as_of: string
  source: InventorySource
  confidence: InventoryConfidence
  low_stock_threshold: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Provider {
  provider_id: string
  workspace_id: string
  name: string
  specialty: string | null
  phone: string | null
  fax: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Pharmacy {
  pharmacy_id: string
  workspace_id: string
  name: string
  phone: string | null
  fax: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Health module input types
export interface CreateMedicationPrescriptionInput {
  display_name: string
  strength_value?: number | null
  strength_unit?: MedicationStrengthUnit
  dosage_form?: DosageForm
  route?: Route
  dose_quantity?: number
  dose_unit?: string
  frequency_type?: FrequencyType
  frequency_description?: string | null
  times_per_day?: number | null
  instructions_sig?: string | null
  with_food?: WithFood
  is_prn?: boolean
  prn_reason?: string | null
  notes?: string | null
  initial_inventory?: number | null
}

export interface LogIntakeInput {
  prescription_id: string
  status: IntakeStatus
  taken_time?: string | null
  scheduled_time?: string | null
  reason?: string | null
  notes?: string | null
}

export interface IntakeEventWithMedication extends IntakeEvent {
  medication_name: string
}

// Wellbeing module enums
export type SymptomDomain = 'physical' | 'mental' | 'sensory' | 'sleep' | 'other'
export type SymptomSeverity = 'none' | 'mild' | 'moderate' | 'severe'
export type DiscussionItemStatus = 'open' | 'discussed' | 'resolved' | 'archived'

// Wellbeing module types
export interface SymptomEntry {
  symptom_entry_id: string
  workspace_id: string
  patient_id: string
  domain: SymptomDomain
  label: string
  severity: SymptomSeverity
  occurred_at: string
  duration_minutes: number | null
  possible_trigger: string | null
  what_helped: string | null
  notes: string | null
  created_at: string
}

export interface ProviderDiscussionItem {
  discussion_item_id: string
  workspace_id: string
  patient_id: string
  title: string
  details: string | null
  status: DiscussionItemStatus
  linked_provider_id: string | null
  linked_prescription_id: string | null
  linked_symptom_entry_id: string | null
  provider_name?: string | null
  created_at: string
  updated_at: string
}

// Wellbeing module input types
export interface CreateSymptomEntryInput {
  domain: SymptomDomain
  label: string
  severity: SymptomSeverity
  occurred_at?: string | null
  duration_minutes?: number | null
  possible_trigger?: string | null
  what_helped?: string | null
  notes?: string | null
}

export interface CreateDiscussionItemInput {
  title: string
  details?: string | null
  linked_provider_id?: string | null
  linked_prescription_id?: string | null
  linked_symptom_entry_id?: string | null
}

// Budget module enums
export type BudgetRestrictionType = 'none' | 'category_allowlist' | 'category_blocklist' | 'merchant_allowlist' | 'merchant_blocklist'
export type BudgetEntryStatus = 'planned' | 'posted' | 'canceled'
export type BudgetTransactionType = 'income' | 'expense' | 'transfer'
export type BudgetCadence = 'one_time' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
export type BudgetCategoryKind = 'income' | 'expense'
export type BudgetPlanItemStatus = 'active' | 'paused' | 'archived'

// Budget module types
export interface BudgetAccount {
  budget_account_id: string
  workspace_id: string
  patient_id: string
  name: string
  restriction_type: BudgetRestrictionType
  restriction_rules: Record<string, unknown> | null
  notes: string | null
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface BudgetCategory {
  budget_category_id: string
  workspace_id: string
  patient_id: string
  name: string
  kind: BudgetCategoryKind
  created_at: string
  updated_at: string
}

export interface BudgetTransaction {
  budget_transaction_id: string
  workspace_id: string
  patient_id: string
  type: BudgetTransactionType
  title: string
  category_id: string
  account_id: string
  amount: number
  occurred_at: string
  status: BudgetEntryStatus
  linked_plan_item_id: string | null
  merchant: string | null
  notes: string | null
  category_name?: string
  account_name?: string
  created_at: string
}

export interface BudgetSummary {
  month_start: string
  month_end: string
  total_income: number
  total_expenses: number
  net: number
  by_category: {
    category_id: string
    category_name: string
    kind: BudgetCategoryKind
    total: number
  }[]
}

// Budget module input types
export interface CreateBudgetAccountInput {
  name: string
  restriction_type?: BudgetRestrictionType
  notes?: string | null
}

export interface CreateBudgetCategoryInput {
  name: string
  kind: BudgetCategoryKind
}

export interface CreateBudgetTransactionInput {
  type: BudgetTransactionType
  title: string
  category_id: string
  account_id: string
  amount: number
  occurred_at?: string | null
  merchant?: string | null
  notes?: string | null
}

// Recipe and Shopping module enums
export type RecipeUnit = 'tsp' | 'tbsp' | 'cup' | 'oz' | 'lb' | 'g' | 'kg' | 'mL' | 'L' | 'count' | 'pinch' | 'other'
export type ShoppingListStatus = 'active' | 'completed' | 'archived'
export type ShoppingListItemStatus = 'need_to_check_home' | 'need_to_buy' | 'already_have' | 'purchased' | 'skipped'

// Recipe types
export interface Recipe {
  recipe_id: string
  workspace_id: string
  patient_id: string
  title: string
  description: string | null
  instructions: string | null
  servings: number | null
  prep_minutes: number | null
  cook_minutes: number | null
  tags: string[]
  is_favorite: boolean
  created_at: string
  updated_at: string
  ingredient_count?: number
}

export interface RecipeIngredient {
  recipe_ingredient_id: string
  recipe_id: string
  name: string
  quantity: number | null
  unit: RecipeUnit | null
  notes: string | null
  sort_order: number
  created_at: string
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[]
}

export interface FavoriteItem {
  favorite_item_id: string
  workspace_id: string
  patient_id: string
  name: string
  default_quantity: number | null
  default_unit: string | null
  category_hint: string | null
  created_at: string
  updated_at: string
}

// Shopping types
export interface ShoppingList {
  shopping_list_id: string
  workspace_id: string
  patient_id: string
  title: string
  status: ShoppingListStatus
  created_from: Record<string, unknown> | null
  created_at: string
  updated_at: string
  item_count?: number
  items_remaining?: number
}

export interface ShoppingListItem {
  shopping_list_item_id: string
  shopping_list_id: string
  name: string
  quantity: number | null
  unit: string | null
  status: ShoppingListItemStatus
  category_hint: string | null
  notes: string | null
  source: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ShoppingListWithItems extends ShoppingList {
  items: ShoppingListItem[]
}

// Recipe and Shopping input types
export interface CreateRecipeInput {
  title: string
  description?: string | null
  instructions?: string | null
  servings?: number | null
  prep_minutes?: number | null
  cook_minutes?: number | null
  tags?: string[]
  is_favorite?: boolean
  ingredients?: {
    name: string
    quantity?: number | null
    unit?: RecipeUnit | null
    notes?: string | null
  }[]
}

export interface UpdateRecipeInput {
  title?: string
  description?: string | null
  instructions?: string | null
  servings?: number | null
  prep_minutes?: number | null
  cook_minutes?: number | null
  tags?: string[]
  is_favorite?: boolean
}

export interface CreateFavoriteItemInput {
  name: string
  default_quantity?: number | null
  default_unit?: string | null
  category_hint?: string | null
}

export interface CreateShoppingListInput {
  title: string
  recipe_ids?: string[]
  include_favorites?: boolean
  items?: {
    name: string
    quantity?: number | null
    unit?: string | null
    notes?: string | null
    category_hint?: string | null
  }[]
}

export interface AddShoppingItemInput {
  shopping_list_id: string
  name: string
  quantity?: number | null
  unit?: string | null
  notes?: string | null
  category_hint?: string | null
}

// Store and Gamification module enums
export type StoreItemType = 'sticker' | 'home_decoration' | 'consumable_token' | 'real_world_reward'
export type InventoryItemKind = 'cosmetic' | 'consumable' | 'entitlement'
export type PurchaseStatus = 'pending' | 'completed' | 'canceled' | 'refunded'
export type RedemptionStatus = 'requested' | 'approved' | 'denied' | 'fulfilled' | 'canceled'

export type StreakPeriod = 'daily' | 'weekly'
export type StreakTemplateKey = 'complete_n_filtered' | 'complete_any_filtered' | 'perfect_must_do'
export type StreakStatus = 'active' | 'paused' | 'archived'
export type StreakBreakBehavior = 'break' | 'use_token_if_available' | 'prompt_to_use_token'
export type StreakStateStatus = 'ongoing' | 'broken' | 'shielded' | 'paused'

export type HomeDecorationPlacementStatus = 'active' | 'removed'

// Coin types
export interface CoinWallet {
  coin_wallet_id: string
  workspace_id: string
  patient_id: string
  balance: number
  last_recomputed_at: string
}

export interface CoinLedgerEntry {
  coin_ledger_entry_id: string
  workspace_id: string
  patient_id: string
  delta: number
  reason: string
  link_type: string | null
  link_id: string | null
  occurred_at: string
  created_by_user_id: string | null
  notes: string | null
}

// Store types
export interface StoreItem {
  store_item_id: string
  workspace_id: string
  patient_id: string
  type: StoreItemType
  name: string
  description: string | null
  enabled: boolean
  coin_cost: number
  inventory_kind: InventoryItemKind
  max_purchases_total: number | null
  max_purchases_per_month: number | null
  metadata: Record<string, unknown> | null
  created_by_user_id: string
  created_at: string
  updated_at: string
  owned_quantity?: number
}

export interface Purchase {
  purchase_id: string
  workspace_id: string
  patient_id: string
  store_item_id: string
  quantity: number
  coin_cost_total: number
  status: PurchaseStatus
  purchased_at: string
  notes: string | null
}

export interface Redemption {
  redemption_id: string
  workspace_id: string
  patient_id: string
  purchase_id: string
  store_item_id: string
  status: RedemptionStatus
  requested_at: string
  approved_by_user_id: string | null
  approved_at: string | null
  denied_by_user_id: string | null
  denied_at: string | null
  fulfilled_by_user_id: string | null
  fulfilled_at: string | null
  notes: string | null
}

export interface UserInventory {
  user_inventory_id: string
  workspace_id?: string
  patient_id?: string
  store_item_id: string
  kind: InventoryItemKind
  quantity: number
  acquired_at: string
  expires_at?: string | null
  metadata?: Record<string, unknown> | null
  // Fields from joined data (returned by get_user_inventory RPC)
  item_name?: string
  item_type?: StoreItemType
  sticker?: {
    asset_key: string
    default_scale: number | null
  } | null
}

// Sticker types
export interface Sticker {
  sticker_id: string
  store_item_id: string
  asset_key: string
  default_scale: number | null
  tags: string[] | null
  created_at: string
}

export interface HomeDecoration {
  home_decoration_id: string
  workspace_id: string
  patient_id: string
  store_item_id: string
  sticker_name?: string
  asset_key?: string
  status: HomeDecorationPlacementStatus
  position: { x: number; y: number }
  rotation: number | null
  scale: number | null
  z_index: number | null
  placed_at: string
  removed_at: string | null
}

// Streak types
export interface StreakDefinition {
  streak_definition_id: string
  workspace_id: string
  patient_id: string
  name: string
  status: StreakStatus
  template_key: StreakTemplateKey
  period: StreakPeriod
  filter_config: Record<string, unknown> | null
  count_threshold: number | null
  coin_reward: number
  bonus_milestones: { days: number; coins: number }[] | null
  break_behavior: StreakBreakBehavior
  shield_token_item_id: string | null
  auto_use_token: boolean
  max_token_uses_per_month: number | null
  timezone: string
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface StreakState {
  streak_state_id: string
  workspace_id: string
  streak_definition_id: string
  patient_id: string
  status: StreakStateStatus
  current_count: number
  best_count: number
  current_period_key: string
  period_satisfied: boolean
  last_incremented_at: string | null
  last_broken_at: string | null
  last_shielded_at: string | null
  tokens_used_this_month: number
  updated_at: string
}

export interface StreakWithState extends StreakDefinition {
  state: StreakState | null
}

export interface StreakShieldUse {
  streak_shield_use_id: string
  workspace_id: string
  patient_id: string
  streak_state_id: string
  streak_definition_id: string
  period_key: string
  store_item_id: string
  inventory_id: string | null
  used_at: string
  notes: string | null
}

// Store input types
export interface CreateStoreItemInput {
  type: StoreItemType
  name: string
  coin_cost: number
  inventory_kind: InventoryItemKind
  description?: string | null
  max_purchases_total?: number | null
  max_purchases_per_month?: number | null
  metadata?: Record<string, unknown> | null
}

export interface CreateStickerInput {
  name: string
  asset_key: string
  coin_cost: number
  description?: string | null
  default_scale?: number
  tags?: string[]
}

export interface PlaceStickerInput {
  store_item_id: string
  position: { x: number; y: number }
  rotation?: number
  scale?: number
  z_index?: number
}

export interface UpdateDecorationInput {
  home_decoration_id: string
  position?: { x: number; y: number }
  rotation?: number
  scale?: number
  z_index?: number
}

// Streak input types
export interface CreateStreakInput {
  name: string
  template_key: StreakTemplateKey
  period: StreakPeriod
  coin_reward?: number
  count_threshold?: number | null
  filter_config?: Record<string, unknown> | null
  bonus_milestones?: { days: number; coins: number }[] | null
  break_behavior?: StreakBreakBehavior
  shield_token_item_id?: string | null
  auto_use_token?: boolean
  max_token_uses_per_month?: number | null
  timezone?: string
}
