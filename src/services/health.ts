/**
 * Health service - Medications, providers, pharmacies, and intake tracking
 */

import { supabase } from '@/lib/supabase'
import type {
  HealthAccessConfig,
  HealthPharmacy,
  HealthProvider,
  HealthMedication,
  HealthMedIntakeLog,
  HealthRefillLog,
  HealthAccessLevel,
  ProviderType,
} from '@/types/database'
import { getCanonicalToday, formatDate } from '@/lib/timezone'

// =============================================================================
// ACCESS CONFIG
// =============================================================================

export async function getHealthAccessConfig(
  ownerId: string
): Promise<HealthAccessConfig | null> {
  const { data, error } = await supabase
    .from('health_access_config')
    .select('*')
    .eq('owner_user_id', ownerId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export async function updateHealthAccessConfig(
  ownerId: string,
  updates: {
    support_access?: HealthAccessLevel
    emily_can_log_intake?: boolean
    emily_can_view_intake_history?: boolean
  }
): Promise<HealthAccessConfig> {
  // Try to update existing
  const { data: existing } = await supabase
    .from('health_access_config')
    .select('id')
    .eq('owner_user_id', ownerId)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('health_access_config')
      .update(updates)
      .eq('owner_user_id', ownerId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new
    const { data, error } = await supabase
      .from('health_access_config')
      .insert({
        owner_user_id: ownerId,
        support_access: updates.support_access ?? 'none',
        emily_can_log_intake: updates.emily_can_log_intake ?? false,
        emily_can_view_intake_history: updates.emily_can_view_intake_history ?? false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// =============================================================================
// PHARMACIES
// =============================================================================

export async function getPharmacies(ownerId: string): Promise<HealthPharmacy[]> {
  const { data, error } = await supabase
    .from('health_pharmacies')
    .select('*')
    .eq('owner_user_id', ownerId)
    .eq('active', true)
    .order('name')

  if (error) throw error
  return data ?? []
}

export async function createPharmacy(
  input: Omit<HealthPharmacy, 'id' | 'created_at'>
): Promise<HealthPharmacy> {
  const { data, error } = await supabase
    .from('health_pharmacies')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePharmacy(
  id: string,
  updates: Partial<Omit<HealthPharmacy, 'id' | 'created_at' | 'owner_user_id'>>
): Promise<HealthPharmacy> {
  const { data, error } = await supabase
    .from('health_pharmacies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archivePharmacy(id: string): Promise<void> {
  const { error } = await supabase
    .from('health_pharmacies')
    .update({ active: false })
    .eq('id', id)

  if (error) throw error
}

// =============================================================================
// PROVIDERS (Care Team)
// =============================================================================

export async function getProviders(ownerId: string): Promise<HealthProvider[]> {
  const { data, error } = await supabase
    .from('health_providers')
    .select('*')
    .eq('owner_user_id', ownerId)
    .eq('active', true)
    .order('provider_type')
    .order('name')

  if (error) throw error
  return data ?? []
}

export async function getProvidersByType(
  ownerId: string,
  type: ProviderType
): Promise<HealthProvider[]> {
  const { data, error } = await supabase
    .from('health_providers')
    .select('*')
    .eq('owner_user_id', ownerId)
    .eq('provider_type', type)
    .eq('active', true)
    .order('name')

  if (error) throw error
  return data ?? []
}

export async function createProvider(
  input: Omit<HealthProvider, 'id' | 'created_at'>
): Promise<HealthProvider> {
  const { data, error } = await supabase
    .from('health_providers')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProvider(
  id: string,
  updates: Partial<Omit<HealthProvider, 'id' | 'created_at' | 'owner_user_id'>>
): Promise<HealthProvider> {
  const { data, error } = await supabase
    .from('health_providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveProvider(id: string): Promise<void> {
  const { error } = await supabase
    .from('health_providers')
    .update({ active: false })
    .eq('id', id)

  if (error) throw error
}

// =============================================================================
// MEDICATIONS
// =============================================================================

export interface MedicationWithRelations extends Omit<HealthMedication, 'pharmacy' | 'prescriber'> {
  pharmacy: HealthPharmacy | null
  prescriber: HealthProvider | null
}

// Type for the raw joined query result
interface MedicationWithRelationsRaw extends HealthMedication {
  health_pharmacies: HealthPharmacy | null
  health_providers: HealthProvider | null
}

/**
 * Get all medications for a user (single query with joins)
 */
export async function getMedications(ownerId: string): Promise<MedicationWithRelations[]> {
  const { data, error } = await supabase
    .from('health_medications')
    .select(`
      *,
      health_pharmacies!pharmacy_id(*),
      health_providers!prescriber_provider_id(*)
    `)
    .eq('owner_user_id', ownerId)
    .eq('active', true)
    .order('name')

  if (error) throw error

  // Transform the joined result
  return (data as MedicationWithRelationsRaw[] ?? []).map(med => ({
    ...med,
    pharmacy: med.health_pharmacies || null,
    prescriber: med.health_providers || null,
  }))
}

/**
 * Get a single medication by ID (single query with joins)
 */
export async function getMedicationById(id: string): Promise<MedicationWithRelations | null> {
  const { data, error } = await supabase
    .from('health_medications')
    .select(`
      *,
      health_pharmacies!pharmacy_id(*),
      health_providers!prescriber_provider_id(*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  const raw = data as MedicationWithRelationsRaw
  return {
    ...raw,
    pharmacy: raw.health_pharmacies || null,
    prescriber: raw.health_providers || null,
  }
}

export async function createMedication(
  input: Omit<HealthMedication, 'id' | 'created_at' | 'updated_at' | 'pharmacy' | 'prescriber'>
): Promise<HealthMedication> {
  const { data, error } = await supabase
    .from('health_medications')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateMedication(
  id: string,
  updates: Partial<Omit<HealthMedication, 'id' | 'created_at' | 'updated_at' | 'owner_user_id' | 'pharmacy' | 'prescriber'>>
): Promise<HealthMedication> {
  const { data, error } = await supabase
    .from('health_medications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function archiveMedication(id: string): Promise<void> {
  const { error } = await supabase
    .from('health_medications')
    .update({ active: false })
    .eq('id', id)

  if (error) throw error
}

// =============================================================================
// INTAKE LOGGING
// =============================================================================

export async function logIntake(input: {
  owner_user_id: string
  medication_id: string
  dose_text?: string | null
  note?: string | null
  created_by_user_id: string
}): Promise<HealthMedIntakeLog> {
  const { data, error } = await supabase
    .from('health_med_intake_logs')
    .insert({
      ...input,
      taken_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  // Decrement pills_on_hand if tracked
  const medication = await getMedicationById(input.medication_id)
  if (medication && medication.pills_on_hand !== null && medication.pills_on_hand > 0) {
    await updateMedication(input.medication_id, {
      pills_on_hand: medication.pills_on_hand - 1,
    })
  }

  return data
}

export async function getIntakeLogs(
  medicationId: string,
  limit: number = 50
): Promise<HealthMedIntakeLog[]> {
  const { data, error } = await supabase
    .from('health_med_intake_logs')
    .select('*')
    .eq('medication_id', medicationId)
    .order('taken_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getRecentIntakeLogs(
  ownerId: string,
  days: number = 7
): Promise<HealthMedIntakeLog[]> {
  const today = getCanonicalToday()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('health_med_intake_logs')
    .select('*')
    .eq('owner_user_id', ownerId)
    .gte('taken_at', startDate.toISOString())
    .order('taken_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// =============================================================================
// REFILL LOGGING
// =============================================================================

export async function logRefill(input: {
  owner_user_id: string
  medication_id: string
  pills_added?: number | null
  refills_remaining_after?: number | null
  rx_number_used?: string | null
  note?: string | null
  created_by_user_id: string
}): Promise<HealthRefillLog> {
  const { data, error } = await supabase
    .from('health_refill_logs')
    .insert({
      ...input,
      refill_date: formatDate(getCanonicalToday(), 'yyyy-MM-dd'),
    })
    .select()
    .single()

  if (error) throw error

  // Update medication's pills_on_hand and refills_remaining
  const updates: Partial<HealthMedication> = {
    last_refill_date: formatDate(getCanonicalToday(), 'yyyy-MM-dd'),
  }

  if (input.pills_added !== null && input.pills_added !== undefined) {
    const medication = await getMedicationById(input.medication_id)
    if (medication) {
      updates.pills_on_hand = (medication.pills_on_hand ?? 0) + input.pills_added
    }
  }

  if (input.refills_remaining_after !== null && input.refills_remaining_after !== undefined) {
    updates.refills_remaining = input.refills_remaining_after
  }

  await updateMedication(input.medication_id, updates)

  return data
}

export async function getRefillLogs(
  medicationId: string,
  limit: number = 20
): Promise<HealthRefillLog[]> {
  const { data, error } = await supabase
    .from('health_refill_logs')
    .select('*')
    .eq('medication_id', medicationId)
    .order('refill_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// =============================================================================
// REFILL RISK EVALUATION
// =============================================================================

export interface RefillRisk {
  medication: MedicationWithRelations
  riskLevel: 'critical' | 'warning' | 'ok'
  daysOfSupply: number | null
  message: string
}

export async function evaluateRefillRisks(ownerId: string): Promise<RefillRisk[]> {
  const medications = await getMedications(ownerId)
  const risks: RefillRisk[] = []

  for (const med of medications) {
    // Skip if pills_on_hand is not tracked
    if (med.pills_on_hand === null) continue

    const threshold = med.low_supply_threshold ?? 7 // Default 7 days warning
    const daysOfSupply = med.pills_on_hand // Assuming 1 pill per day

    let riskLevel: RefillRisk['riskLevel'] = 'ok'
    let message = `${daysOfSupply} pills remaining`

    if (daysOfSupply <= 0) {
      riskLevel = 'critical'
      message = 'Out of medication!'
    } else if (daysOfSupply <= Math.ceil(threshold / 2)) {
      riskLevel = 'critical'
      message = `Only ${daysOfSupply} pills left - refill needed immediately`
    } else if (daysOfSupply <= threshold) {
      riskLevel = 'warning'
      message = `${daysOfSupply} pills left - consider refilling soon`
    }

    if (riskLevel !== 'ok') {
      risks.push({
        medication: med,
        riskLevel,
        daysOfSupply,
        message,
      })
    }
  }

  // Sort by risk level (critical first)
  risks.sort((a, b) => {
    const order = { critical: 0, warning: 1, ok: 2 }
    return order[a.riskLevel] - order[b.riskLevel]
  })

  return risks
}

// =============================================================================
// PROVIDER TYPE HELPERS
// =============================================================================

export const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  doctor: 'Doctor',
  therapist: 'Therapist',
  group: 'Support Group',
  other: 'Other',
}

export const PROVIDER_TYPE_ICONS: Record<ProviderType, string> = {
  doctor: '🩺',
  therapist: '💬',
  group: '👥',
  other: '📋',
}
