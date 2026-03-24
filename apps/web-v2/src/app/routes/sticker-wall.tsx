'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { StickerCanvas } from '@/components/sticker-wall/sticker-canvas';
import { StickerToolbar } from '@/components/sticker-wall/sticker-toolbar';
import { StickerTray } from '@/components/sticker-wall/sticker-tray';
import {
  useDecorations,
  useUserInventory,
  useUpdateDecoration,
  useRemoveDecoration,
} from '@/hooks/use-sticker-wall';
import { useToast } from '@/components/ui/toaster';
import type { HomeDecoration } from '@/types/database';

// History entry: snapshot of all decorations
interface HistoryEntry {
  decorations: HomeDecoration[];
}

export default function StickerWallPage() {
  const [isEditMode, setIsEditMode] = useState(true);
  const [selectedDecorationId, setSelectedDecorationId] = useState<string | null>(null);
  const [backgroundPreset, setBackgroundPreset] = useState('soft_blue');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const { data: decorations = [], isLoading: isLoadingDecorations } = useDecorations();
  const { data: inventory = [], isLoading: isLoadingInventory } = useUserInventory();
  const updateDecorationMutation = useUpdateDecoration();
  const removeDecorationMutation = useRemoveDecoration();
  const { addToast } = useToast();

  // Initialize history with current decorations
  useEffect(() => {
    if (decorations.length >= 0 && history.length === 0) {
      setHistory([{ decorations }]);
      setHistoryIndex(0);
    }
  }, []);

  const selectedDecoration = useMemo(() => {
    return decorations.find((d) => d.home_decoration_id === selectedDecorationId) || null;
  }, [decorations, selectedDecorationId]);

  const maxZIndex = useMemo(() => {
    if (decorations.length === 0) return 0;
    return Math.max(...decorations.map((d) => d.z_index ?? 1));
  }, [decorations]);

  // Push to history
  const pushToHistory = useCallback((newDecorations: HomeDecoration[]) => {
    setHistory((prev) => {
      // Remove redo stack if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new entry
      newHistory.push({ decorations: newDecorations });
      // Keep only last 10 entries
      if (newHistory.length > 10) {
        newHistory.shift();
        setHistoryIndex(9);
      } else {
        setHistoryIndex(newHistory.length - 1);
      }
      return newHistory;
    });
  }, [historyIndex]);

  const handleMoveDecoration = useCallback(
    (id: string, x: number, y: number) => {
      const decoration = decorations.find((d) => d.home_decoration_id === id);
      if (!decoration) return;

      updateDecorationMutation.mutate(
        { home_decoration_id: id, position: { x, y } },
        {
          onSuccess: () => {
            pushToHistory(
              decorations.map((d) =>
                d.home_decoration_id === id ? { ...d, position: { x, y } } : d
              )
            );
          },
        }
      );
    },
    [decorations, updateDecorationMutation, pushToHistory]
  );

  const handleRotationChange = useCallback(
    (rotation: number) => {
      if (!selectedDecoration) return;

      updateDecorationMutation.mutate(
        { home_decoration_id: selectedDecoration.home_decoration_id, rotation },
        {
          onSuccess: () => {
            pushToHistory(
              decorations.map((d) =>
                d.home_decoration_id === selectedDecoration.home_decoration_id
                  ? { ...d, rotation }
                  : d
              )
            );
          },
        }
      );
    },
    [selectedDecoration, decorations, updateDecorationMutation, pushToHistory]
  );

  const handleScaleChange = useCallback(
    (scale: number) => {
      if (!selectedDecoration) return;

      updateDecorationMutation.mutate(
        { home_decoration_id: selectedDecoration.home_decoration_id, scale },
        {
          onSuccess: () => {
            pushToHistory(
              decorations.map((d) =>
                d.home_decoration_id === selectedDecoration.home_decoration_id
                  ? { ...d, scale }
                  : d
              )
            );
          },
        }
      );
    },
    [selectedDecoration, decorations, updateDecorationMutation, pushToHistory]
  );

  const handleDeleteDecoration = useCallback(() => {
    if (!selectedDecoration) return;

    removeDecorationMutation.mutate(selectedDecoration.home_decoration_id, {
      onSuccess: () => {
        const newDecorations = decorations.filter(
          (d) => d.home_decoration_id !== selectedDecoration.home_decoration_id
        );
        pushToHistory(newDecorations);
        setSelectedDecorationId(null);
        addToast({
          title: 'Sticker removed',
          description: 'Your sticker has been removed from the wall.',
        });
      },
    });
  }, [selectedDecoration, decorations, removeDecorationMutation, pushToHistory, addToast]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
  }, [historyIndex, history.length]);

  const handleZIndexChange = useCallback(
    (id: string, newZIndex: number) => {
      const decoration = decorations.find((d) => d.home_decoration_id === id);
      if (!decoration) return;

      updateDecorationMutation.mutate(
        { home_decoration_id: id, z_index: newZIndex },
        {
          onSuccess: () => {
            pushToHistory(
              decorations.map((d) =>
                d.home_decoration_id === id ? { ...d, z_index: newZIndex } : d
              )
            );
          },
        }
      );
    },
    [decorations, updateDecorationMutation, pushToHistory]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedDecorationId(null);
      } else if (e.key === 'Delete' && selectedDecoration) {
        e.preventDefault();
        handleDeleteDecoration();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, handleUndo, handleRedo, selectedDecoration, handleDeleteDecoration]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <PageHeader
        title="Sticker Wall"
        subtitle="Decorate your space with stickers"
        action={
          <Button
            onClick={() => setIsEditMode(!isEditMode)}
            variant={isEditMode ? 'default' : 'outline'}
          >
            {isEditMode ? 'View' : 'Edit'}
          </Button>
        }
      />

      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Canvas area */}
        {isLoadingDecorations ? (
          <div className="flex-1 rounded-soft bg-gray-100 animate-pulse" />
        ) : (
          <div className="flex-1">
            <StickerCanvas
              decorations={decorations}
              selectedDecorationId={selectedDecorationId}
              onSelectDecoration={setSelectedDecorationId}
              onMoveDecoration={handleMoveDecoration}
              onZIndexChange={handleZIndexChange}
              isEditMode={isEditMode}
              backgroundPreset={backgroundPreset}
              maxZIndex={maxZIndex}
            />
          </div>
        )}

        {/* Toolbar (edit mode only) */}
        {isEditMode && (
          <StickerToolbar
            selectedDecoration={selectedDecoration}
            isEditMode={isEditMode}
            onRotationChange={handleRotationChange}
            onScaleChange={handleScaleChange}
            onDelete={handleDeleteDecoration}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            backgroundPreset={backgroundPreset}
            onBackgroundPresetChange={setBackgroundPreset}
          />
        )}

        {/* Sticker tray (edit mode only) */}
        {isEditMode && (
          <StickerTray
            inventory={inventory}
            isLoading={isLoadingInventory}
            isEditMode={isEditMode}
          />
        )}
      </div>
    </div>
  );
}
