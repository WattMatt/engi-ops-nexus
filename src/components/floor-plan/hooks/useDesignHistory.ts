/**
 * History State Management Hook
 * Provides undo/redo functionality for floor plan design state
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { EquipmentItem, SupplyLine, SupplyZone, Containment, Walkway, RoofMask, PVArrayItem, Task } from '../types';

export interface DesignState {
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  walkways: Walkway[];
  roofMasks: RoofMask[];
  pvArrays: PVArrayItem[];
  tasks: Task[];
}

export const initialDesignState: DesignState = {
  equipment: [],
  lines: [],
  zones: [],
  containment: [],
  walkways: [],
  roofMasks: [],
  pvArrays: [],
  tasks: [],
};

export interface UseDesignHistoryReturn {
  // Current state
  currentDesign: DesignState;
  equipment: EquipmentItem[];
  lines: SupplyLine[];
  zones: SupplyZone[];
  containment: Containment[];
  walkways: Walkway[];
  roofMasks: RoofMask[];
  pvArrays: PVArrayItem[];
  tasks: Task[];
  
  // History controls
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  
  // State setters
  setEquipment: (updater: (prev: EquipmentItem[]) => EquipmentItem[], commit?: boolean) => void;
  setLines: (updater: (prev: SupplyLine[]) => SupplyLine[], commit?: boolean) => void;
  setZones: (updater: (prev: SupplyZone[]) => SupplyZone[], commit?: boolean) => void;
  setContainment: (updater: (prev: Containment[]) => Containment[], commit?: boolean) => void;
  setWalkways: (updater: (prev: Walkway[]) => Walkway[], commit?: boolean) => void;
  setRoofMasks: (updater: (prev: RoofMask[]) => RoofMask[], commit?: boolean) => void;
  setPvArrays: (updater: (prev: PVArrayItem[]) => PVArrayItem[], commit?: boolean) => void;
  setTasks: (updater: (prev: Task[]) => Task[], commit?: boolean) => void;
  
  // Full state management
  setState: (updater: (prevState: DesignState) => DesignState, commit?: boolean) => void;
  resetStateWith: (newState: DesignState) => void;
  resetToInitial: () => void;
}

export function useDesignHistory(): UseDesignHistoryReturn {
  const [history, setHistory] = useState<DesignState[]>([initialDesignState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Use refs to avoid stale closures in setState callback
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  
  // Keep refs in sync with state
  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const currentDesign = history[historyIndex];
  const { equipment, lines, zones, containment, walkways, roofMasks, pvArrays, tasks } = currentDesign;

  const setState = useCallback((updater: (prevState: DesignState) => DesignState, commit: boolean = true) => {
    // Use refs to get the latest values, avoiding stale closure issues
    const currentHistory = historyRef.current;
    const currentIndex = historyIndexRef.current;
    const currentState = currentHistory[currentIndex];
    const newState = updater(currentState);

    if (JSON.stringify(newState) === JSON.stringify(currentState)) {
      return;
    }

    if (commit) {
      const newHistory = currentHistory.slice(0, currentIndex + 1);
      newHistory.push(newState);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      const newHistory = [...currentHistory];
      newHistory[currentIndex] = newState;
      setHistory(newHistory);
    }
  }, []);

  const setEquipment = useCallback(
    (updater: (prev: EquipmentItem[]) => EquipmentItem[], commit: boolean = true) => 
      setState(s => ({ ...s, equipment: updater(s.equipment) }), commit),
    [setState]
  );

  const setLines = useCallback(
    (updater: (prev: SupplyLine[]) => SupplyLine[], commit: boolean = true) => 
      setState(s => ({ ...s, lines: updater(s.lines) }), commit),
    [setState]
  );

  const setZones = useCallback(
    (updater: (prev: SupplyZone[]) => SupplyZone[], commit: boolean = true) => 
      setState(s => ({ ...s, zones: updater(s.zones) }), commit),
    [setState]
  );

  const setContainment = useCallback(
    (updater: (prev: Containment[]) => Containment[], commit: boolean = true) => 
      setState(s => ({ ...s, containment: updater(s.containment) }), commit),
    [setState]
  );

  const setWalkways = useCallback(
    (updater: (prev: Walkway[]) => Walkway[], commit: boolean = true) => 
      setState(s => ({ ...s, walkways: updater(s.walkways) }), commit),
    [setState]
  );

  const setRoofMasks = useCallback(
    (updater: (prev: RoofMask[]) => RoofMask[], commit: boolean = true) => 
      setState(s => ({ ...s, roofMasks: updater(s.roofMasks) }), commit),
    [setState]
  );

  const setPvArrays = useCallback(
    (updater: (prev: PVArrayItem[]) => PVArrayItem[], commit: boolean = true) => 
      setState(s => ({ ...s, pvArrays: updater(s.pvArrays) }), commit),
    [setState]
  );

  const setTasks = useCallback(
    (updater: (prev: Task[]) => Task[], commit: boolean = true) => 
      setState(s => ({ ...s, tasks: updater(s.tasks) }), commit),
    [setState]
  );
  
  const resetStateWith = useCallback((newState: DesignState) => {
    setHistory([newState]);
    setHistoryIndex(0);
  }, []);

  const resetToInitial = useCallback(() => {
    resetStateWith(initialDesignState);
  }, [resetStateWith]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [canUndo, historyIndex]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
    }
  }, [canRedo, historyIndex]);

  return {
    currentDesign,
    equipment,
    lines,
    zones,
    containment,
    walkways,
    roofMasks,
    pvArrays,
    tasks,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    setEquipment,
    setLines,
    setZones,
    setContainment,
    setWalkways,
    setRoofMasks,
    setPvArrays,
    setTasks,
    setState,
    resetStateWith,
    resetToInitial,
  };
}
