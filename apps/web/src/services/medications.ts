import { supabase } from '@/lib/supabase'
import type {
  PrescriptionWithMedication,
  CreateMedicationPrescriptionInput,
  LogIntakeInput,
  IntakeEventWithMedication,
} from '@/types/database'

// Get all active prescriptions with medication info
export async function getPrescriptions(): Promise<PrescriptionWithMedication[]> {
  const { data, error } = await supabase.rpc('get_prescriptions')

  if (error) {
    console.error('Error fetching prescriptions:', error)
    throw error
  }

  const result = data as { success: boolean; prescriptions: PrescriptionWithMedication[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch prescriptions')
  }

  return result.prescriptions || []
}

// Create a new medication and prescription
export async function createMedicationPrescription(
  input: CreateMedicationPrescriptionInput
): Promise<{ medication_id: string; prescription_id: string }> {
  const { data, error } = await supabase.rpc('create_medication_prescription', {
    p_display_name: input.display_name,
    p_strength_value: input.strength_value || null,
    p_strength_unit: input.strength_unit || 'mg',
    p_dosage_form: input.dosage_form || 'tablet',
    p_route: input.route || 'oral',
    p_dose_quantity: input.dose_quantity || 1,
    p_dose_unit: input.dose_unit || 'tablet',
    p_frequency_type: input.frequency_type || 'scheduled',
    p_frequency_description: input.frequency_description || null,
    p_times_per_day: input.times_per_day || null,
    p_instructions_sig: input.instructions_sig || null,
    p_with_food: input.with_food || 'none',
    p_is_prn: input.is_prn || false,
    p_prn_reason: input.prn_reason || null,
    p_notes: input.notes || null,
    p_initial_inventory: input.initial_inventory || null,
  })

  if (error) {
    console.error('Error creating medication prescription:', error)
    throw error
  }

  const result = data as {
    success: boolean
    medication_id?: string
    prescription_id?: string
    error?: string
  }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create medication prescription')
  }

  return {
    medication_id: result.medication_id!,
    prescription_id: result.prescription_id!,
  }
}

// Log medication intake
export async function logIntake(input: LogIntakeInput): Promise<string> {
  const { data, error } = await supabase.rpc('log_intake', {
    p_prescription_id: input.prescription_id,
    p_status: input.status,
    p_taken_time: input.taken_time || null,
    p_scheduled_time: input.scheduled_time || null,
    p_reason: input.reason || null,
    p_notes: input.notes || null,
  })

  if (error) {
    console.error('Error logging intake:', error)
    throw error
  }

  const result = data as { success: boolean; intake_event_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to log intake')
  }

  return result.intake_event_id!
}

// Get today's intake events
export async function getTodaysIntakes(): Promise<IntakeEventWithMedication[]> {
  const { data, error } = await supabase.rpc('get_todays_intakes')

  if (error) {
    console.error('Error fetching today\'s intakes:', error)
    throw error
  }

  const result = data as { success: boolean; intakes: IntakeEventWithMedication[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch today\'s intakes')
  }

  return result.intakes || []
}

// Delete a prescription (sets status to discontinued)
export async function deletePrescription(prescriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('prescription')
    .update({ status: 'discontinued', updated_at: new Date().toISOString() })
    .eq('prescription_id', prescriptionId)

  if (error) {
    console.error('Error discontinuing prescription:', error)
    throw error
  }
}

// Update inventory count
export async function updateInventory(
  prescriptionId: string,
  count: number
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: membership } = await supabase
    .from('workspace_membership')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!membership) throw new Error('No active workspace membership')

  // Upsert inventory record
  const { error } = await supabase
    .from('inventory')
    .upsert({
      prescription_id: prescriptionId,
      workspace_id: membership.workspace_id,
      current_on_hand: count,
      as_of: new Date().toISOString(),
      source: 'manual_set',
      confidence: 'high',
    }, {
      onConflict: 'prescription_id'
    })

  if (error) {
    console.error('Error updating inventory:', error)
    throw error
  }
}
