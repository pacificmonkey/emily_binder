'use client';

import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { HomeDecoration } from '@/types/database';

interface StickerCanvasProps {
  decorations: HomeDecoration[];
  selectedDecorationId: string | null;
  onSelectDecoration: (id: string | null) => void;
  onMoveDecoration: (id: string, x: number, y: number) => void;
  onZIndexChange: (id: string, newZIndex: number) => void;
  isEditMode: boolean;
  backgroundPreset: string;
  maxZIndex: number;
}

const BACKGROUND_PRESETS = {
  soft_blue:
    'linear-gradient(135deg, rgba(200, 230, 255, 0.8) 0%, rgba(150, 200, 255, 0.6) 100%)',
  peachy:
    'linear-gradient(135deg, rgba(255, 220, 200, 0.8) 0%, rgba(255, 180, 150, 0.6) 100%)',
  minty:
    'linear-gradient(135deg, rgba(180, 240, 220, 0.8) 0%, rgba(150, 220, 200, 0.6) 100%)',
  sunny:
    'linear-gradient(135deg, rgba(255, 250, 180, 0.8) 0%, rgba(255, 230, 120, 0.6) 100%)',
  lavender:
    'linear-gradient(135deg, rgba(220, 200, 240, 0.8) 0%, rgba(200, 180, 220, 0.6) 100%)',
  cloud_white: 'linear-gradient(135deg, rgba(245, 245, 250, 0.8) 0%, rgba(230, 235, 245, 0.6) 100%)',
};

export function StickerCanvas({
  decorations,
  selectedDecorationId,
  onSelectDecoration,
  onMoveDecoration,
  onZIndexChange,
  isEditMode,
  backgroundPreset,
  maxZIndex,
}: StickerCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef({ startX: 0, startY: 0, currentX: 0, currentY: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, decorationId: string) => {
      if (!isEditMode) return;

      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      dragStateRef.current = { startX, startY, currentX: startX, currentY: startY };
      setDraggedId(decorationId);
      onSelectDecoration(decorationId);
    },
    [isEditMode, onSelectDecoration]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggedId || !isEditMode) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      dragStateRef.current.currentX = currentX;
      dragStateRef.current.currentY = currentY;

      const offsetX = currentX - dragStateRef.current.startX;
      const offsetY = currentY - dragStateRef.current.startY;

      setDragOffset({ x: offsetX, y: offsetY });
    },
    [draggedId, isEditMode]
  );

  const handlePointerUp = useCallback(
    () => {
      if (!draggedId || !canvasRef.current) return;

      const decoration = decorations.find((d) => d.home_decoration_id === draggedId);
      if (!decoration) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      const newX = decoration.position.x + (dragOffset.x / rect.width) * 100;
      const newY = decoration.position.y + (dragOffset.y / rect.height) * 100;

      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(100, newX));
      const clampedY = Math.max(0, Math.min(100, newY));

      onMoveDecoration(draggedId, clampedX, clampedY);

      setDraggedId(null);
      setDragOffset({ x: 0, y: 0 });
    },
    [draggedId, decorations, dragOffset, onMoveDecoration]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === canvasRef.current && isEditMode) {
        onSelectDecoration(null);
      }
    },
    [isEditMode, onSelectDecoration]
  );

  const handleBringToFront = useCallback(
    (decorationId: string) => {
      onZIndexChange(decorationId, maxZIndex + 1);
    },
    [onZIndexChange, maxZIndex]
  );

  const bgStyle =
    BACKGROUND_PRESETS[
      backgroundPreset as keyof typeof BACKGROUND_PRESETS
    ] || BACKGROUND_PRESETS.soft_blue;

  return (
    <div
      ref={canvasRef}
      role="application"
      aria-label="Sticker wall canvas"
      className={cn(
        'relative w-full overflow-hidden rounded-soft bg-surface shadow-soft',
        'aspect-video',
        isEditMode && 'cursor-default'
      )}
      style={{
        background: bgStyle,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleCanvasClick}
    >
      {decorations.map((decoration) => {
        const isSelected = selectedDecorationId === decoration.home_decoration_id;
        const isDragged = draggedId === decoration.home_decoration_id;

        const displayX = isDragged
          ? decoration.position.x + (dragOffset.x / (canvasRef.current?.offsetWidth || 1)) * 100
          : decoration.position.x;
        const displayY = isDragged
          ? decoration.position.y + (dragOffset.y / (canvasRef.current?.offsetHeight || 1)) * 100
          : decoration.position.y;

        return (
          <div
            key={decoration.home_decoration_id}
            className={cn(
              'absolute transform -translate-x-1/2 -translate-y-1/2',
              'transition-shadow duration-200',
              isSelected && 'ring-2 ring-offset-1 ring-blue-400 rounded-soft',
              isEditMode && 'cursor-grab active:cursor-grabbing'
            )}
            style={{
              left: `${displayX}%`,
              top: `${displayY}%`,
              transform: `translate(-50%, -50%) rotate(${decoration.rotation ?? 0}deg) scale(${decoration.scale ?? 1})`,
              zIndex: decoration.z_index ?? 1,
              touchAction: isEditMode ? 'none' : 'auto',
            }}
            onPointerDown={(e) => handlePointerDown(e, decoration.home_decoration_id)}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditMode) {
                onSelectDecoration(decoration.home_decoration_id);
                handleBringToFront(decoration.home_decoration_id);
              }
            }}
            role={isEditMode ? 'button' : undefined}
            aria-pressed={isSelected}
          >
            {/* Sticker emoji/asset representation */}
            <div
              className={cn(
                'relative flex items-center justify-center',
                'min-w-16 min-h-16 select-none',
                'bg-white/80 backdrop-blur-sm rounded-soft',
                'shadow-soft border border-white/50'
              )}
            >
              <span className="text-5xl">{decoration.asset_key || '✨'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
