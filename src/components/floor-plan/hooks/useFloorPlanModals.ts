/**
 * Floor Plan Modals State Hook
 * Manages all modal/dialog open states for the floor plan editor
 */

import { useState, useCallback } from 'react';
import type { ContainmentType, Point, Task } from '../types';
import type { PVArrayConfig } from '../components/PVArrayModal';
import type { DesignListing } from '../utils/supabase';

export interface PendingLine {
  points: Point[];
  length: number;
}

export interface PendingCircuitCable {
  points: Point[];
  length: number;
}

export interface PendingContainment {
  points: Point[];
  length: number;
  type: ContainmentType;
}

export interface PendingRoofMask {
  points: Point[];
  pitch?: number;
}

export interface UseFloorPlanModalsReturn {
  // Modal states
  isScaleModalOpen: boolean;
  setIsScaleModalOpen: (open: boolean) => void;
  
  isCableModalOpen: boolean;
  setIsCableModalOpen: (open: boolean) => void;
  
  isCircuitCableModalOpen: boolean;
  setIsCircuitCableModalOpen: (open: boolean) => void;
  
  isContainmentModalOpen: boolean;
  setIsContainmentModalOpen: (open: boolean) => void;
  
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  
  isTaskModalOpen: boolean;
  setIsTaskModalOpen: (open: boolean) => void;
  
  isPvConfigModalOpen: boolean;
  setIsPvConfigModalOpen: (open: boolean) => void;
  
  isRoofMaskModalOpen: boolean;
  setIsRoofMaskModalOpen: (open: boolean) => void;
  
  isPvArrayModalOpen: boolean;
  setIsPvArrayModalOpen: (open: boolean) => void;
  
  isLoadDesignModalOpen: boolean;
  setIsLoadDesignModalOpen: (open: boolean) => void;
  
  isSavedReportsModalOpen: boolean;
  setIsSavedReportsModalOpen: (open: boolean) => void;
  
  isLinkDialogOpen: boolean;
  setIsLinkDialogOpen: (open: boolean) => void;
  
  isCircuitScheduleOpen: boolean;
  setIsCircuitScheduleOpen: (open: boolean) => void;
  
  isCircuitPanelOpen: boolean;
  setIsCircuitPanelOpen: (open: boolean) => void;
  
  isDrawingSheetOpen: boolean;
  setIsDrawingSheetOpen: (open: boolean) => void;
  
  // Pending states for modals
  pendingLine: PendingLine | null;
  setPendingLine: (line: PendingLine | null) => void;
  
  pendingCircuitCable: PendingCircuitCable | null;
  setPendingCircuitCable: (cable: PendingCircuitCable | null) => void;
  
  pendingContainment: PendingContainment | null;
  setPendingContainment: (containment: PendingContainment | null) => void;
  
  pendingRoofMask: PendingRoofMask | null;
  setPendingRoofMask: (mask: PendingRoofMask | null) => void;
  
  pendingPvArrayConfig: PVArrayConfig | null;
  setPendingPvArrayConfig: (config: PVArrayConfig | null) => void;
  
  editingTask: Partial<Task> | null;
  setEditingTask: (task: Partial<Task> | null) => void;
  
  editingCableId: string | null;
  setEditingCableId: (id: string | null) => void;
  
  // Design list for load modal
  designList: DesignListing[];
  setDesignList: (list: DesignListing[]) => void;
  isLoadingDesigns: boolean;
  setIsLoadingDesigns: (loading: boolean) => void;
  
  // Global loading
  globalLoadingMessage: string | null;
  setGlobalLoadingMessage: (message: string | null) => void;
  
  // Close all modals
  closeAllModals: () => void;
}

export function useFloorPlanModals(): UseFloorPlanModalsReturn {
  // Modal open states
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isCableModalOpen, setIsCableModalOpen] = useState(false);
  const [isCircuitCableModalOpen, setIsCircuitCableModalOpen] = useState(false);
  const [isContainmentModalOpen, setIsContainmentModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPvConfigModalOpen, setIsPvConfigModalOpen] = useState(false);
  const [isRoofMaskModalOpen, setIsRoofMaskModalOpen] = useState(false);
  const [isPvArrayModalOpen, setIsPvArrayModalOpen] = useState(false);
  const [isLoadDesignModalOpen, setIsLoadDesignModalOpen] = useState(false);
  const [isSavedReportsModalOpen, setIsSavedReportsModalOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isCircuitScheduleOpen, setIsCircuitScheduleOpen] = useState(false);
  const [isCircuitPanelOpen, setIsCircuitPanelOpen] = useState(false);
  const [isDrawingSheetOpen, setIsDrawingSheetOpen] = useState(false);
  
  // Pending states
  const [pendingLine, setPendingLine] = useState<PendingLine | null>(null);
  const [pendingCircuitCable, setPendingCircuitCable] = useState<PendingCircuitCable | null>(null);
  const [pendingContainment, setPendingContainment] = useState<PendingContainment | null>(null);
  const [pendingRoofMask, setPendingRoofMask] = useState<PendingRoofMask | null>(null);
  const [pendingPvArrayConfig, setPendingPvArrayConfig] = useState<PVArrayConfig | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [editingCableId, setEditingCableId] = useState<string | null>(null);
  
  // Design loading
  const [designList, setDesignList] = useState<DesignListing[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  
  // Global loading
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState<string | null>(null);
  
  // Close all modals
  const closeAllModals = useCallback(() => {
    setIsScaleModalOpen(false);
    setIsCableModalOpen(false);
    setIsCircuitCableModalOpen(false);
    setIsContainmentModalOpen(false);
    setIsExportModalOpen(false);
    setIsTaskModalOpen(false);
    setIsPvConfigModalOpen(false);
    setIsRoofMaskModalOpen(false);
    setIsPvArrayModalOpen(false);
    setIsLoadDesignModalOpen(false);
    setIsSavedReportsModalOpen(false);
    setIsLinkDialogOpen(false);
    setIsCircuitScheduleOpen(false);
    setIsCircuitPanelOpen(false);
    setIsDrawingSheetOpen(false);
    setPendingLine(null);
    setPendingCircuitCable(null);
    setPendingContainment(null);
    setPendingRoofMask(null);
    setPendingPvArrayConfig(null);
    setEditingTask(null);
    setEditingCableId(null);
  }, []);

  return {
    isScaleModalOpen,
    setIsScaleModalOpen,
    isCableModalOpen,
    setIsCableModalOpen,
    isCircuitCableModalOpen,
    setIsCircuitCableModalOpen,
    isContainmentModalOpen,
    setIsContainmentModalOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    isTaskModalOpen,
    setIsTaskModalOpen,
    isPvConfigModalOpen,
    setIsPvConfigModalOpen,
    isRoofMaskModalOpen,
    setIsRoofMaskModalOpen,
    isPvArrayModalOpen,
    setIsPvArrayModalOpen,
    isLoadDesignModalOpen,
    setIsLoadDesignModalOpen,
    isSavedReportsModalOpen,
    setIsSavedReportsModalOpen,
    isLinkDialogOpen,
    setIsLinkDialogOpen,
    isCircuitScheduleOpen,
    setIsCircuitScheduleOpen,
    isCircuitPanelOpen,
    setIsCircuitPanelOpen,
    isDrawingSheetOpen,
    setIsDrawingSheetOpen,
    pendingLine,
    setPendingLine,
    pendingCircuitCable,
    setPendingCircuitCable,
    pendingContainment,
    setPendingContainment,
    pendingRoofMask,
    setPendingRoofMask,
    pendingPvArrayConfig,
    setPendingPvArrayConfig,
    editingTask,
    setEditingTask,
    editingCableId,
    setEditingCableId,
    designList,
    setDesignList,
    isLoadingDesigns,
    setIsLoadingDesigns,
    globalLoadingMessage,
    setGlobalLoadingMessage,
    closeAllModals,
  };
}
