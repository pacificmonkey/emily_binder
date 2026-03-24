import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getHomeDecorations,
  getUserInventory,
  placeSticker,
  updateDecoration,
  removeDecoration,
} from '@/services/store';
import type {
  HomeDecoration,
  UpdateDecorationInput,
} from '@/types/database';

/**
 * Fetch all home decorations (stickers placed on the wall)
 */
export function useDecorations() {
  return useQuery({
    queryKey: ['decorations'],
    queryFn: getHomeDecorations,
  });
}

/**
 * Fetch user's sticker inventory
 */
export function useUserInventory() {
  return useQuery({
    queryKey: ['user-inventory'],
    queryFn: getUserInventory,
  });
}

/**
 * Place a new sticker on the wall
 */
export function usePlaceSticker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: placeSticker,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decorations'] });
      queryClient.invalidateQueries({ queryKey: ['user-inventory'] });
    },
  });
}

/**
 * Update an existing decoration (position, rotation, scale, z-index)
 * Optimistically updates the cache for immediate UI feedback
 */
export function useUpdateDecoration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDecoration,
    onMutate: async (input: UpdateDecorationInput) => {
      await queryClient.cancelQueries({ queryKey: ['decorations'] });

      const previousDecorations = queryClient.getQueryData<HomeDecoration[]>([
        'decorations',
      ]);

      queryClient.setQueryData<HomeDecoration[]>(
        ['decorations'],
        (old = []) => {
          return old.map((decoration) => {
            if (decoration.home_decoration_id === input.home_decoration_id) {
              return {
                ...decoration,
                position: input.position ?? decoration.position,
                rotation: input.rotation ?? decoration.rotation,
                scale: input.scale ?? decoration.scale,
                z_index: input.z_index ?? decoration.z_index,
              };
            }
            return decoration;
          });
        }
      );

      return { previousDecorations };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousDecorations) {
        queryClient.setQueryData(
          ['decorations'],
          context.previousDecorations
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['decorations'] });
    },
  });
}

/**
 * Remove a decoration (sticker) from the wall
 */
export function useRemoveDecoration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeDecoration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decorations'] });
    },
  });
}
