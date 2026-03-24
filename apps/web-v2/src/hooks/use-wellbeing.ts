import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSymptomEntry,
  getSymptomEntries,
  deleteSymptomEntry,
  createDiscussionItem,
  getDiscussionItems,
  updateDiscussionItemStatus,
  deleteDiscussionItem,
} from '@/services/wellbeing'
import type {
  CreateSymptomEntryInput,
  CreateDiscussionItemInput,
  SymptomDomain,
  DiscussionItemStatus,
} from '@/types/database'

// Symptom Queries
export const useSymptomEntries = (
  startDate?: string,
  endDate?: string,
  domain?: SymptomDomain
) => {
  return useQuery({
    queryKey: ['symptoms', startDate, endDate, domain],
    queryFn: () => getSymptomEntries(startDate, endDate, domain),
  })
}

export const useCreateSymptom = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSymptomEntryInput) => createSymptomEntry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptoms'] })
    },
  })
}

export const useDeleteSymptom = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteSymptomEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptoms'] })
    },
  })
}

// Discussion Item Queries
export const useDiscussionItems = (
  status?: DiscussionItemStatus,
  providerId?: string
) => {
  return useQuery({
    queryKey: ['discussion-items', status, providerId],
    queryFn: () => getDiscussionItems(status, providerId),
  })
}

export const useCreateDiscussionItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateDiscussionItemInput) =>
      createDiscussionItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-items'] })
    },
  })
}

export const useUpdateDiscussionStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: DiscussionItemStatus
    }) => updateDiscussionItemStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-items'] })
    },
  })
}

export const useDeleteDiscussionItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteDiscussionItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-items'] })
    },
  })
}
