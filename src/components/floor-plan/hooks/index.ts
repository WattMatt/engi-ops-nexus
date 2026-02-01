/**
 * Floor Plan Hooks - Barrel Export
 */

export { useDesignHistory, type DesignState, type UseDesignHistoryReturn, initialDesignState } from './useDesignHistory';
export { useFloorPlanModals, type UseFloorPlanModalsReturn, type PendingLine, type PendingCircuitCable, type PendingContainment, type PendingRoofMask } from './useFloorPlanModals';
export { useTakeoffCounts, type CircuitMaterialSummary } from './useTakeoffCounts';
export { useFolders } from './useFolders';
export { useRoomBounds } from './useRoomBounds';
export { useOptimisticUpdate } from './useOptimisticUpdate';
export { useCircuitTemplates } from './useCircuitTemplates';
export { useDebouncedCallback } from './useDebouncedCallback';
export { useThrottledCallback } from './useThrottledCallback';
