import { useEffect } from 'react';
import { useFloorPlan } from '@/contexts/FloorPlanContext';

export function KeyboardShortcuts() {
  const { undo, redo, canUndo, canRedo } = useFloorPlan();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Undo: Ctrl+Z
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey && canUndo) {
        event.preventDefault();
        undo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'z')) {
        if (canRedo) {
          event.preventDefault();
          redo();
        }
      }

      // Escape: Clear selection
      if (event.key === 'Escape') {
        // Clear selection logic
      }

      // Delete: Delete selected item
      if (event.key === 'Delete') {
        // Delete selected item logic
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return null;
}
