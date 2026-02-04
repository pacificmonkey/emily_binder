import { supabase } from '@/lib/supabase'
import type {
  SymptomEntry,
  ProviderDiscussionItem,
  CreateSymptomEntryInput,
  CreateDiscussionItemInput,
  SymptomDomain,
  DiscussionItemStatus,
} from '@/types/database'

// Create a new symptom entry
export async function createSymptomEntry(
  input: CreateSymptomEntryInput
): Promise<string> {
  const { data, error } = await supabase.rpc('create_symptom_entry', {
    p_domain: input.domain,
    p_label: input.label,
    p_severity: input.severity,
    p_occurred_at: input.occurred_at || null,
    p_duration_minutes: input.duration_minutes || null,
    p_possible_trigger: input.possible_trigger || null,
    p_what_helped: input.what_helped || null,
    p_notes: input.notes || null,
  })

  if (error) {
    console.error('Error creating symptom entry:', error)
    throw new Error(`Database error: ${error.message}`)
  }

  if (!data) {
    throw new Error('No response from server')
  }

  const result = data as { success: boolean; symptom_entry_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create symptom entry')
  }

  return result.symptom_entry_id!
}

// Get symptom entries
export async function getSymptomEntries(
  startDate?: string,
  endDate?: string,
  domain?: SymptomDomain
): Promise<SymptomEntry[]> {
  const { data, error } = await supabase.rpc('get_symptom_entries', {
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_domain: domain || null,
  })

  if (error) {
    console.error('Error fetching symptom entries:', error)
    throw new Error(`Failed to load symptoms: ${error.message}`)
  }

  if (!data) {
    return []
  }

  const result = data as { success: boolean; entries: SymptomEntry[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch symptom entries')
  }

  return result.entries || []
}

// Delete a symptom entry
export async function deleteSymptomEntry(symptomEntryId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_symptom_entry', {
    p_symptom_entry_id: symptomEntryId,
  })

  if (error) {
    console.error('Error deleting symptom entry:', error)
    throw error
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete symptom entry')
  }
}

// Create a new discussion item
export async function createDiscussionItem(
  input: CreateDiscussionItemInput
): Promise<string> {
  const { data, error } = await supabase.rpc('create_discussion_item', {
    p_title: input.title,
    p_details: input.details || null,
    p_linked_provider_id: input.linked_provider_id || null,
    p_linked_prescription_id: input.linked_prescription_id || null,
    p_linked_symptom_entry_id: input.linked_symptom_entry_id || null,
  })

  if (error) {
    console.error('Error creating discussion item:', error)
    throw error
  }

  const result = data as { success: boolean; discussion_item_id?: string; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to create discussion item')
  }

  return result.discussion_item_id!
}

// Get discussion items
export async function getDiscussionItems(
  status?: DiscussionItemStatus,
  providerId?: string
): Promise<ProviderDiscussionItem[]> {
  const { data, error } = await supabase.rpc('get_discussion_items', {
    p_status: status || null,
    p_provider_id: providerId || null,
  })

  if (error) {
    console.error('Error fetching discussion items:', error)
    throw error
  }

  const result = data as { success: boolean; items: ProviderDiscussionItem[]; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch discussion items')
  }

  return result.items || []
}

// Update discussion item status
export async function updateDiscussionItemStatus(
  discussionItemId: string,
  status: DiscussionItemStatus
): Promise<void> {
  const { data, error } = await supabase.rpc('update_discussion_item_status', {
    p_discussion_item_id: discussionItemId,
    p_status: status,
  })

  if (error) {
    console.error('Error updating discussion item status:', error)
    throw error
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to update discussion item status')
  }
}

// Delete a discussion item
export async function deleteDiscussionItem(discussionItemId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_discussion_item', {
    p_discussion_item_id: discussionItemId,
  })

  if (error) {
    console.error('Error deleting discussion item:', error)
    throw error
  }

  const result = data as { success: boolean; error?: string }

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete discussion item')
  }
}
