'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { usePlaceSticker } from '@/hooks/use-sticker-wall';
import type { UserInventory } from '@/types/database';

interface StickerTrayProps {
  inventory: UserInventory[];
  isLoading: boolean;
  isEditMode: boolean;
}

export function StickerTray({
  inventory,
  isLoading,
  isEditMode,
}: StickerTrayProps) {
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const placeStickerMutation = usePlaceSticker();

  const stickerItems = inventory.filter((item) => item.item_type === 'sticker');

  const handleSelectSticker = useCallback((storeItemId: string) => {
    setSelectedStickerId(storeItemId);
    setPlacementMode(true);
  }, []);

  if (!isEditMode) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="h-24 bg-surface rounded-soft animate-pulse" />
    );
  }

  if (stickerItems.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3',
          'h-24 rounded-soft border-2 border-dashed border-gray-300',
          'bg-gray-50'
        )}
      >
        <p className="text-sm font-medium text-gray-600">
          No stickers yet. Visit the Shop to get some!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {placementMode && (
        <div className="rounded-soft bg-blue-100 border border-blue-300 p-3 text-sm text-blue-900">
          Click on the canvas to place <strong>{stickerItems.find((s) => s.store_item_id === selectedStickerId)?.item_name}</strong>. Press Escape to cancel.
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {stickerItems.map((item) => (
          <Button
            key={item.store_item_id}
            onClick={() => handleSelectSticker(item.store_item_id)}
            variant={selectedStickerId === item.store_item_id ? 'default' : 'outline'}
            className={cn(
              'flex-shrink-0 h-auto py-2 px-3',
              'flex flex-col items-center gap-1'
            )}
            disabled={item.quantity === 0 || placeStickerMutation.isPending}
          >
            <span className="text-3xl">{item.sticker?.asset_key || '✨'}</span>
            <div className="flex flex-col items-center text-xs">
              <span className="font-medium line-clamp-1">{item.item_name}</span>
              <span className="text-xs opacity-70">×{item.quantity}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
