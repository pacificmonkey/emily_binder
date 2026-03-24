import { useQuery } from '@tanstack/react-query'
import * as categoriesService from '@/services/categories'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getMissionCategories(),
    staleTime: 10 * 60 * 1000,
  })
}
