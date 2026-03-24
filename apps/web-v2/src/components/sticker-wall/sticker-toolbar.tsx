'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Undo2, Redo2, Trash2 } from 'lucide-react';
import type { HomeDecoration } from '@/types/database';

interface StickerToolbarProps {
  selectedDecoration: HomeDecoration | null;
  isEditMode: boolean;
  onRotationChange: (rotation: number) => void;
  onScaleChange: (scale: number) => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  backgroundPreset: string;
  onBackgroundPresetChange: (preset: string) => void;
}

const BACKGROUND_PRESETS = [
  { id: 'soft_blue', label: 'Soft Blue', color: '#c8e6ff' },
  { id: 'peachy', label: 'Peachy', color: '#ffdcc8' },
  { id: 'minty', label: 'Minty', color: '#b4f0dc' },
  { id: 'sunny', label: 'Sunny', color: '#fffab4' },
  { id: 'lavender', label: 'Lavender', color: '#dcc8f0' },
  { id: 'cloud_white', label: 'Cloud White', color: '#f5f5fa' },
];

export function StickerToolbar({
  selectedDecoration,
  isEditMode,
  onRotationChange,
  onScaleChange,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  backgroundPreset,
  onBackgroundPresetChange,
}: StickerToolbarProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const rotation = selectedDecoration?.rotation ?? 0;
  const scale = selectedDecoration?.scale ?? 1;

  const handleRotationChange = useCallback(
    (value: number[]) => {
      onRotationChange(value[0]);
    },
    [onRotationChange]
  );

  const handleScaleChange = useCallback(
    (value: number[]) => {
      onScaleChange(value[0]);
    },
    [onScaleChange]
  );

  if (!isEditMode) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-soft bg-surface border border-gray-200 p-4">
      {/* Control row: Undo/Redo, Mode toggle buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          variant="outline"
          size="sm"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">Undo</span>
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          variant="outline"
          size="sm"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
          <span className="hidden sm:inline ml-2">Redo</span>
        </Button>

        {selectedDecoration && (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Delete</span>
            </Button>
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogTitle>Remove Sticker?</AlertDialogTitle>
                <AlertDialogDescription>
                  This sticker will be removed from your wall. You can place it again later.
                </AlertDialogDescription>
                <div className="flex gap-3 justify-end mt-4">
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      onDelete();
                      setDeleteConfirmOpen(false);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {/* Rotation control */}
      {selectedDecoration && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="rotation-slider"
              className="text-sm font-medium text-content"
            >
              Rotation
            </label>
            <span className="text-sm font-semibold text-blue-600">{rotation}°</span>
          </div>
          <input
            id="rotation-slider"
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={(e) => handleRotationChange([Number(e.target.value)])}
            className="w-full"
            aria-label="Rotation angle"
          />
        </div>
      )}

      {/* Scale control */}
      {selectedDecoration && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="scale-slider"
              className="text-sm font-medium text-content"
            >
              Size
            </label>
            <span className="text-sm font-semibold text-blue-600">{scale.toFixed(1)}x</span>
          </div>
          <input
            id="scale-slider"
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={scale}
            onChange={(e) => handleScaleChange([Number(e.target.value)])}
            className="w-full"
            aria-label="Sticker scale"
          />
        </div>
      )}

      {/* Background preset selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-content">
          Background
        </label>
        <div className="flex gap-2 flex-wrap">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onBackgroundPresetChange(preset.id)}
              className={cn(
                'w-8 h-8 rounded-soft border-2 transition-all',
                backgroundPreset === preset.id
                  ? 'border-blue-500 ring-2 ring-blue-300'
                  : 'border-gray-200'
              )}
              style={{
                backgroundColor: preset.color,
              }}
              title={preset.label}
              aria-label={`Background: ${preset.label}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
