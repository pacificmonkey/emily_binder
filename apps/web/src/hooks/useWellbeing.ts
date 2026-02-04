import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSymptomEntries,
  createSymptomEntry,
  deleteSymptomEntry,
  getDiscussionItems,
  createDiscussionItem,
  updateDiscussionItemStatus,
  deleteDiscussionItem,
} from '@/services/wellbeing'
import type {
  CreateSymptomEntryInput,
  CreateDiscussionItemInput,
  SymptomDomain,
  DiscussionItemStatus,
} from '@/types/database'

// Query keys
export const wellbeingKeys = {
  all: ['wellbeing'] as const,
  symptoms: ['wellbeing', 'symptoms'] as const,
  symptomsList: (startDate?: string, endDate?: string, domain?: SymptomDomain) =>
    [...wellbeingKeys.symptoms, 'list', { startDate, endDate, domain }] as const,
  discussions: ['wellbeing', 'discussions'] as const,
  discussionsList: (status?: DiscussionItemStatus, providerId?: string) =>
    [...wellbeingKeys.discussions, 'list', { status, providerId }] as const,
}

// Hook for symptom entries
export function useSymptomEntries(
  startDate?: string,
  endDate?: string,
  domain?: SymptomDomain
) {
  return useQuery({
    queryKey: wellbeingKeys.symptomsList(startDate, endDate, domain),
    queryFn: () => getSymptomEntries(startDate, endDate, domain),
  })
}

// Hook for recent symptoms (last 30 days)
export function useRecentSymptoms() {
  // Use useMemo to prevent creating a new date on every render
  // which would change the query key and cause an infinite loop
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    date.setHours(0, 0, 0, 0) // Normalize to start of day
    return date.toISOString()
  }, [])

  return useSymptomEntries(thirtyDaysAgo)
}

// Mutation: Create symptom entry
export function useCreateSymptomEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSymptomEntryInput) => createSymptomEntry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellbeingKeys.symptoms })
    },
  })
}

// Mutation: Delete symptom entry
export function useDeleteSymptomEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (symptomEntryId: string) => deleteSymptomEntry(symptomEntryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellbeingKeys.symptoms })
    },
  })
}

// Hook for discussion items
export function useDiscussionItems(
  status?: DiscussionItemStatus,
  providerId?: string
) {
  return useQuery({
    queryKey: wellbeingKeys.discussionsList(status, providerId),
    queryFn: () => getDiscussionItems(status, providerId),
  })
}

// Hook for open discussion items only
export function useOpenDiscussionItems() {
  return useDiscussionItems('open')
}

// Mutation: Create discussion item
export function useCreateDiscussionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateDiscussionItemInput) => createDiscussionItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellbeingKeys.discussions })
    },
  })
}

// Mutation: Update discussion item status
export function useUpdateDiscussionItemStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ discussionItemId, status }: { discussionItemId: string; status: DiscussionItemStatus }) =>
      updateDiscussionItemStatus(discussionItemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellbeingKeys.discussions })
    },
  })
}

// Mutation: Delete discussion item
export function useDeleteDiscussionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (discussionItemId: string) => deleteDiscussionItem(discussionItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wellbeingKeys.discussions })
    },
  })
}
