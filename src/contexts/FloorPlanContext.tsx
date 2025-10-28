import React, { createContext, useContext, useState, useCallback } from 'react';
import { FloorPlanState, EquipmentItem, CableRoute, ContainmentItem, Zone, PVConfig, PVRoof, PVArray, Task } from '@/lib/floorPlan/types';

interface FloorPlanContextType {
  state: FloorPlanState;
  setState: React.Dispatch<React.SetStateAction<FloorPlanState>>;
  updateState: (updates: Partial<FloorPlanState>) => void;
  addEquipment: (item: EquipmentItem) => void;
  updateEquipment: (id: string, updates: Partial<EquipmentItem>) => void;
  deleteEquipment: (id: string) => void;
  addCable: (cable: CableRoute) => void;
  updateCable: (id: string, updates: Partial<CableRoute>) => void;
  deleteCable: (id: string) => void;
  addContainment: (item: ContainmentItem) => void;
  deleteContainment: (id: string) => void;
  addZone: (zone: Zone) => void;
  updateZone: (id: string, updates: Partial<Zone>) => void;
  deleteZone: (id: string) => void;
  addPVRoof: (roof: PVRoof) => void;
  addPVArray: (array: PVArray) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setSelectedItem: (type: string | null, id: string | null) => void;
  clearAll: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  requestStateFromIframe: () => void;
  sendStateToIframe: (state: Partial<FloorPlanState>) => void;
}

const FloorPlanContext = createContext<FloorPlanContextType | undefined>(undefined);

const initialState: FloorPlanState = {
  pdfFile: null,
  pdfDataUrl: null,
  scaleMetersPerPixel: null,
  designPurpose: null,
  equipment: [],
  cables: [],
  containment: [],
  zones: [],
  pvConfig: null,
  pvRoofs: [],
  pvArrays: [],
  tasks: [],
  activeTool: null,
  selectedItem: null,
  canvasTransform: { x: 0, y: 0, scale: 1 },
};

const MAX_HISTORY = 50;

export function FloorPlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FloorPlanState>(initialState);
  const [history, setHistory] = useState<FloorPlanState[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const saveToHistory = useCallback((newState: FloorPlanState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const updateState = useCallback((updates: Partial<FloorPlanState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      saveToHistory(newState);
      return newState;
    });
  }, [saveToHistory]);

  const addEquipment = useCallback((item: EquipmentItem) => {
    updateState({ equipment: [...state.equipment, item] });
  }, [state.equipment, updateState]);

  const updateEquipment = useCallback((id: string, updates: Partial<EquipmentItem>) => {
    updateState({
      equipment: state.equipment.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    });
  }, [state.equipment, updateState]);

  const deleteEquipment = useCallback((id: string) => {
    updateState({ equipment: state.equipment.filter(item => item.id !== id) });
  }, [state.equipment, updateState]);

  const addCable = useCallback((cable: CableRoute) => {
    updateState({ cables: [...state.cables, cable] });
  }, [state.cables, updateState]);

  const updateCable = useCallback((id: string, updates: Partial<CableRoute>) => {
    updateState({
      cables: state.cables.map(cable =>
        cable.id === id ? { ...cable, ...updates } : cable
      ),
    });
  }, [state.cables, updateState]);

  const deleteCable = useCallback((id: string) => {
    updateState({ cables: state.cables.filter(cable => cable.id !== id) });
  }, [state.cables, updateState]);

  const addContainment = useCallback((item: ContainmentItem) => {
    updateState({ containment: [...state.containment, item] });
  }, [state.containment, updateState]);

  const deleteContainment = useCallback((id: string) => {
    updateState({ containment: state.containment.filter(item => item.id !== id) });
  }, [state.containment, updateState]);

  const addZone = useCallback((zone: Zone) => {
    updateState({ zones: [...state.zones, zone] });
  }, [state.zones, updateState]);

  const updateZone = useCallback((id: string, updates: Partial<Zone>) => {
    updateState({
      zones: state.zones.map(zone =>
        zone.id === id ? { ...zone, ...updates } : zone
      ),
    });
  }, [state.zones, updateState]);

  const deleteZone = useCallback((id: string) => {
    updateState({ zones: state.zones.filter(zone => zone.id !== id) });
  }, [state.zones, updateState]);

  const addPVRoof = useCallback((roof: PVRoof) => {
    updateState({ pvRoofs: [...state.pvRoofs, roof] });
  }, [state.pvRoofs, updateState]);

  const addPVArray = useCallback((array: PVArray) => {
    updateState({ pvArrays: [...state.pvArrays, array] });
  }, [state.pvArrays, updateState]);

  const addTask = useCallback((task: Task) => {
    updateState({ tasks: [...state.tasks, task] });
  }, [state.tasks, updateState]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    updateState({
      tasks: state.tasks.map(task =>
        task.id === id ? { ...task, ...updates } : task
      ),
    });
  }, [state.tasks, updateState]);

  const deleteTask = useCallback((id: string) => {
    updateState({ tasks: state.tasks.filter(task => task.id !== id) });
  }, [state.tasks, updateState]);

  const setSelectedItem = useCallback((type: string | null, id: string | null) => {
    setState(prev => ({
      ...prev,
      selectedItem: type && id ? { type, id } : null,
    }));
  }, []);

  const clearAll = useCallback(() => {
    updateState(initialState);
  }, [updateState]);

  const undo = useCallback(() => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1);
      setState(history[historyIndex - 1]);
    }
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1);
      setState(history[historyIndex + 1]);
    }
  }, [canRedo, history, historyIndex]);

  const requestStateFromIframe = useCallback(() => {
    window.dispatchEvent(new CustomEvent('request-iframe-state'));
  }, []);

  const sendStateToIframe = useCallback((updates: Partial<FloorPlanState>) => {
    window.dispatchEvent(new CustomEvent('load-floor-plan-to-iframe', { detail: updates }));
  }, []);

  return (
    <FloorPlanContext.Provider
      value={{
        state,
        setState,
        updateState,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        addCable,
        updateCable,
        deleteCable,
        addContainment,
        deleteContainment,
        addZone,
        updateZone,
        deleteZone,
        addPVRoof,
        addPVArray,
        addTask,
        updateTask,
        deleteTask,
        setSelectedItem,
        clearAll,
        undo,
        redo,
        canUndo,
        canRedo,
        requestStateFromIframe,
        sendStateToIframe,
      }}
    >
      {children}
    </FloorPlanContext.Provider>
  );
}

export function useFloorPlan() {
  const context = useContext(FloorPlanContext);
  if (!context) {
    throw new Error('useFloorPlan must be used within FloorPlanProvider');
  }
  return context;
}
