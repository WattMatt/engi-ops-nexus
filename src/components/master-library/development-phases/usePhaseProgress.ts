import { useState, useEffect, useCallback } from "react";

export type PhaseStatus = "untested" | "in_progress" | "verified";

interface PhaseProgress {
  checkedItems: string[];
  status: PhaseStatus;
  notes: string;
}

interface AllPhasesProgress {
  [phaseId: string]: PhaseProgress;
}

const STORAGE_KEY = "boq-dev-phases-progress";

export function usePhaseProgress() {
  const [progress, setProgress] = useState<AllPhasesProgress>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load phase progress:", e);
    }
  }, []);

  // Save to localStorage whenever progress changes
  const saveProgress = useCallback((newProgress: AllPhasesProgress) => {
    setProgress(newProgress);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    } catch (e) {
      console.error("Failed to save phase progress:", e);
    }
  }, []);

  const getPhaseProgress = useCallback(
    (phaseId: string): PhaseProgress => {
      return (
        progress[phaseId] || {
          checkedItems: [],
          status: "untested" as PhaseStatus,
          notes: "",
        }
      );
    },
    [progress]
  );

  const toggleChecklistItem = useCallback(
    (phaseId: string, itemId: string) => {
      const current = getPhaseProgress(phaseId);
      const newCheckedItems = current.checkedItems.includes(itemId)
        ? current.checkedItems.filter((id) => id !== itemId)
        : [...current.checkedItems, itemId];

      // Auto-update status based on checklist completion
      let newStatus = current.status;
      if (newCheckedItems.length > 0 && newStatus === "untested") {
        newStatus = "in_progress";
      }

      saveProgress({
        ...progress,
        [phaseId]: {
          ...current,
          checkedItems: newCheckedItems,
          status: newStatus,
        },
      });
    },
    [progress, getPhaseProgress, saveProgress]
  );

  const setPhaseStatus = useCallback(
    (phaseId: string, status: PhaseStatus) => {
      const current = getPhaseProgress(phaseId);
      saveProgress({
        ...progress,
        [phaseId]: {
          ...current,
          status,
        },
      });
    },
    [progress, getPhaseProgress, saveProgress]
  );

  const setPhaseNotes = useCallback(
    (phaseId: string, notes: string) => {
      const current = getPhaseProgress(phaseId);
      saveProgress({
        ...progress,
        [phaseId]: {
          ...current,
          notes,
        },
      });
    },
    [progress, getPhaseProgress, saveProgress]
  );

  const resetPhase = useCallback(
    (phaseId: string) => {
      saveProgress({
        ...progress,
        [phaseId]: {
          checkedItems: [],
          status: "untested",
          notes: "",
        },
      });
    },
    [progress, saveProgress]
  );

  const resetAllPhases = useCallback(() => {
    saveProgress({});
  }, [saveProgress]);

  return {
    getPhaseProgress,
    toggleChecklistItem,
    setPhaseStatus,
    setPhaseNotes,
    resetPhase,
    resetAllPhases,
  };
}
