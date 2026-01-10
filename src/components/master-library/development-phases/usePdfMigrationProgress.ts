import { useState, useEffect, useCallback } from "react";

export type MigrationStatus = "pending" | "in_progress" | "completed" | "blocked";

interface FileMigrationProgress {
  status: MigrationStatus;
  notes: string;
  completedAt?: string;
}

interface PhaseMigrationProgress {
  files: { [fileId: string]: FileMigrationProgress };
  status: MigrationStatus;
  notes: string;
}

interface AllMigrationProgress {
  [phaseId: string]: PhaseMigrationProgress;
}

const STORAGE_KEY = "pdf-migration-progress";

export function usePdfMigrationProgress() {
  const [progress, setProgress] = useState<AllMigrationProgress>({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load PDF migration progress:", e);
    }
  }, []);

  // Save to localStorage whenever progress changes
  const saveProgress = useCallback((newProgress: AllMigrationProgress) => {
    setProgress(newProgress);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
    } catch (e) {
      console.error("Failed to save PDF migration progress:", e);
    }
  }, []);

  const getPhaseProgress = useCallback(
    (phaseId: string): PhaseMigrationProgress => {
      return (
        progress[phaseId] || {
          files: {},
          status: "pending" as MigrationStatus,
          notes: "",
        }
      );
    },
    [progress]
  );

  const getFileProgress = useCallback(
    (phaseId: string, fileId: string): FileMigrationProgress => {
      const phase = getPhaseProgress(phaseId);
      return (
        phase.files[fileId] || {
          status: "pending" as MigrationStatus,
          notes: "",
        }
      );
    },
    [getPhaseProgress]
  );

  const setFileStatus = useCallback(
    (phaseId: string, fileId: string, status: MigrationStatus, notes?: string) => {
      const current = getPhaseProgress(phaseId);
      const fileProgress = getFileProgress(phaseId, fileId);
      
      const newFileProgress: FileMigrationProgress = {
        ...fileProgress,
        status,
        notes: notes ?? fileProgress.notes,
        completedAt: status === "completed" ? new Date().toISOString() : fileProgress.completedAt,
      };

      const newFiles = {
        ...current.files,
        [fileId]: newFileProgress,
      };

      // Calculate phase status based on file statuses
      const fileStatuses = Object.values(newFiles);
      let phaseStatus: MigrationStatus = "pending";
      
      if (fileStatuses.every(f => f.status === "completed")) {
        phaseStatus = "completed";
      } else if (fileStatuses.some(f => f.status === "blocked")) {
        phaseStatus = "blocked";
      } else if (fileStatuses.some(f => f.status === "in_progress" || f.status === "completed")) {
        phaseStatus = "in_progress";
      }

      saveProgress({
        ...progress,
        [phaseId]: {
          ...current,
          files: newFiles,
          status: phaseStatus,
        },
      });
    },
    [progress, getPhaseProgress, getFileProgress, saveProgress]
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

  const setFileNotes = useCallback(
    (phaseId: string, fileId: string, notes: string) => {
      const current = getPhaseProgress(phaseId);
      const fileProgress = getFileProgress(phaseId, fileId);
      
      saveProgress({
        ...progress,
        [phaseId]: {
          ...current,
          files: {
            ...current.files,
            [fileId]: {
              ...fileProgress,
              notes,
            },
          },
        },
      });
    },
    [progress, getPhaseProgress, getFileProgress, saveProgress]
  );

  const resetPhase = useCallback(
    (phaseId: string) => {
      saveProgress({
        ...progress,
        [phaseId]: {
          files: {},
          status: "pending",
          notes: "",
        },
      });
    },
    [progress, saveProgress]
  );

  const resetAllProgress = useCallback(() => {
    saveProgress({});
  }, [saveProgress]);

  // Get statistics
  const getStats = useCallback(() => {
    let totalFiles = 0;
    let completedFiles = 0;
    let inProgressFiles = 0;
    let blockedFiles = 0;
    let pendingFiles = 0;

    Object.values(progress).forEach(phase => {
      Object.values(phase.files).forEach(file => {
        totalFiles++;
        switch (file.status) {
          case "completed": completedFiles++; break;
          case "in_progress": inProgressFiles++; break;
          case "blocked": blockedFiles++; break;
          default: pendingFiles++; break;
        }
      });
    });

    return { totalFiles, completedFiles, inProgressFiles, blockedFiles, pendingFiles };
  }, [progress]);

  return {
    getPhaseProgress,
    getFileProgress,
    setFileStatus,
    setPhaseNotes,
    setFileNotes,
    resetPhase,
    resetAllProgress,
    getStats,
  };
}
