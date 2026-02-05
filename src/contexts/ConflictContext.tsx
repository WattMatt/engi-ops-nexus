 /**
  * Conflict Resolution Context
  * Global state management for sync conflicts
  */
 
 import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
 import { ConflictRecord, ConflictResolution } from '@/lib/conflictResolution';
 import { StoreName } from '@/lib/offlineStorage';
 
 interface ConflictContextValue {
   /** Queue of pending conflicts */
   conflicts: ConflictRecord[];
   /** Whether any conflicts exist */
   hasConflicts: boolean;
   /** Number of pending conflicts */
   conflictCount: number;
   /** Currently active conflict for resolution (if dialog open) */
   activeConflict: ConflictRecord | null;
   /** Add a conflict to the queue */
   addConflict: <T extends Record<string, unknown>>(conflict: ConflictRecord<T>) => void;
   /** Remove a conflict after resolution */
   resolveConflict: (id: string, resolution: ConflictResolution) => void;
   /** Clear all conflicts for a specific store */
   clearConflictsForStore: (storeName: StoreName) => void;
   /** Open the resolution dialog for the next conflict */
   openNextConflict: () => void;
   /** Close the resolution dialog */
   closeDialog: () => void;
   /** Whether the dialog is open */
   isDialogOpen: boolean;
   /** Get the resolution callback for external use */
   onResolution: ((id: string, resolution: ConflictResolution, mergedFields?: string[]) => void) | null;
   /** Set the resolution callback */
   setResolutionCallback: (callback: ((id: string, resolution: ConflictResolution, mergedFields?: string[]) => void) | null) => void;
 }
 
 const ConflictContext = createContext<ConflictContextValue | undefined>(undefined);
 
 interface ConflictProviderProps {
   children: ReactNode;
 }
 
 export function ConflictProvider({ children }: ConflictProviderProps) {
   const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
   const [activeConflict, setActiveConflict] = useState<ConflictRecord | null>(null);
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [resolutionCallback, setResolutionCallbackState] = useState<
     ((id: string, resolution: ConflictResolution, mergedFields?: string[]) => void) | null
   >(null);
 
   const addConflict = useCallback(<T extends Record<string, unknown>>(conflict: ConflictRecord<T>) => {
     setConflicts((prev) => {
       // Avoid duplicates
       if (prev.some((c) => c.id === conflict.id)) {
         return prev;
       }
       return [...prev, conflict as ConflictRecord];
     });
 
     // Auto-open dialog if not already open
     if (!isDialogOpen) {
       setActiveConflict(conflict as ConflictRecord);
       setIsDialogOpen(true);
     }
   }, [isDialogOpen]);
 
   const resolveConflict = useCallback((id: string, resolution: ConflictResolution) => {
     setConflicts((prev) => prev.filter((c) => c.id !== id));
 
     // If there are more conflicts, show the next one
     setConflicts((currentConflicts) => {
       if (currentConflicts.length > 0 && isDialogOpen) {
         setActiveConflict(currentConflicts[0]);
       } else {
         setActiveConflict(null);
         setIsDialogOpen(false);
       }
       return currentConflicts;
     });
   }, [isDialogOpen]);
 
   const clearConflictsForStore = useCallback((storeName: StoreName) => {
     setConflicts((prev) => prev.filter((c) => c.storeName !== storeName));
   }, []);
 
   const openNextConflict = useCallback(() => {
     if (conflicts.length > 0) {
       setActiveConflict(conflicts[0]);
       setIsDialogOpen(true);
     }
   }, [conflicts]);
 
   const closeDialog = useCallback(() => {
     setIsDialogOpen(false);
     setActiveConflict(null);
   }, []);
 
   const setResolutionCallback = useCallback(
     (callback: ((id: string, resolution: ConflictResolution, mergedFields?: string[]) => void) | null) => {
       setResolutionCallbackState(() => callback);
     },
     []
   );
 
   const value: ConflictContextValue = {
     conflicts,
     hasConflicts: conflicts.length > 0,
     conflictCount: conflicts.length,
     activeConflict,
     addConflict,
     resolveConflict,
     clearConflictsForStore,
     openNextConflict,
     closeDialog,
     isDialogOpen,
     onResolution: resolutionCallback,
     setResolutionCallback,
   };
 
   return (
     <ConflictContext.Provider value={value}>
       {children}
     </ConflictContext.Provider>
   );
 }
 
 export function useConflictContext() {
   const context = useContext(ConflictContext);
   if (!context) {
     throw new Error('useConflictContext must be used within a ConflictProvider');
   }
   return context;
 }