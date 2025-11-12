import { useState, useCallback } from 'react';

export interface HistoryState {
  extractedText: any[];
  editedTextItems: Map<string, string>;
}

export const usePDFEditorHistory = (initialState: HistoryState) => {
  const [history, setHistory] = useState<HistoryState[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((newState: HistoryState) => {
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      // Add new state
      newHistory.push(newState);
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        setCurrentIndex(prev => prev);
      } else {
        setCurrentIndex(newHistory.length - 1);
      }
      return newHistory;
    });
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [canUndo, currentIndex, history]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [canRedo, currentIndex, history]);

  const getCurrentState = useCallback(() => {
    return history[currentIndex];
  }, [currentIndex, history]);

  return {
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    getCurrentState,
  };
};
