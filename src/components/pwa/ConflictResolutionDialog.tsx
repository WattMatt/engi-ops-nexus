 /**
  * Conflict Resolution Dialog
  * Shows side-by-side comparison for sync conflicts
  */
 
 import { useState, useMemo } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogDescription,
   DialogFooter,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Checkbox } from '@/components/ui/checkbox';
 import { AlertTriangle, Clock, Server, Smartphone, Check } from 'lucide-react';
 import { useConflictContext } from '@/contexts/ConflictContext';
 import {
   ConflictResolution,
   getDetailedDiffs,
   formatFieldName,
   formatValueForDisplay,
 } from '@/lib/conflictResolution';
 import { formatDistanceToNow } from 'date-fns';
 import { cn } from '@/lib/utils';
 
 interface FieldSelectionState {
   [field: string]: 'local' | 'server';
 }
 
 export function ConflictResolutionDialog() {
   const {
     activeConflict,
     isDialogOpen,
     closeDialog,
     resolveConflict,
     conflicts,
     onResolution,
   } = useConflictContext();
 
   const [showMerge, setShowMerge] = useState(false);
   const [fieldSelections, setFieldSelections] = useState<FieldSelectionState>({});
 
   // Calculate diffs for the active conflict
   const diffs = useMemo(() => {
     if (!activeConflict) return [];
     return getDetailedDiffs(
       activeConflict.localVersion as Record<string, unknown>,
       activeConflict.serverVersion as Record<string, unknown>
     );
   }, [activeConflict]);
 
   // Initialize field selections when entering merge mode
   const handleShowMerge = () => {
     const initialSelections: FieldSelectionState = {};
     diffs.forEach((diff) => {
       initialSelections[diff.field] = 'local'; // Default to local
     });
     setFieldSelections(initialSelections);
     setShowMerge(true);
   };
 
   const handleResolution = (resolution: ConflictResolution, mergedFields?: string[]) => {
     if (!activeConflict) return;
 
     // Call external callback if set
     if (onResolution) {
       onResolution(activeConflict.id, resolution, mergedFields);
     }
 
     resolveConflict(activeConflict.id, resolution);
     setShowMerge(false);
     setFieldSelections({});
   };
 
   const handleMergeConfirm = () => {
     const localFields = Object.entries(fieldSelections)
       .filter(([, choice]) => choice === 'local')
       .map(([field]) => field);
 
     handleResolution(ConflictResolution.MERGE, localFields);
   };
 
   const currentIndex = activeConflict
     ? conflicts.findIndex((c) => c.id === activeConflict.id) + 1
     : 0;
 
   const localTimestamp = activeConflict?.localVersion?.localUpdatedAt;
   const serverTimestamp = activeConflict?.serverVersion?.updated_at;
 
   if (!activeConflict) return null;
 
   return (
     <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
       <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
         <DialogHeader>
           <div className="flex items-center gap-2">
             <AlertTriangle className="h-5 w-5 text-warning" />
             <DialogTitle>Sync Conflict Detected</DialogTitle>
           </div>
           <DialogDescription className="flex items-center justify-between">
             <span>
               This record was modified both offline and on the server. Choose which version to keep.
             </span>
             {conflicts.length > 1 && (
               <Badge variant="secondary">
                 {currentIndex} of {conflicts.length}
               </Badge>
             )}
           </DialogDescription>
         </DialogHeader>
 
         <ScrollArea className="flex-1 min-h-0">
           {!showMerge ? (
             <div className="grid grid-cols-2 gap-4 p-1">
               {/* Local Version */}
               <div className="border rounded-lg overflow-hidden">
                 <div className="bg-primary/10 px-4 py-2 flex items-center gap-2">
                   <Smartphone className="h-4 w-4 text-primary" />
                   <span className="font-medium">Your Changes</span>
                 </div>
                 {localTimestamp && (
                   <div className="px-4 py-1 text-xs text-muted-foreground flex items-center gap-1">
                     <Clock className="h-3 w-3" />
                     {formatDistanceToNow(localTimestamp, { addSuffix: true })}
                   </div>
                 )}
                 <div className="p-4 space-y-2">
                   {diffs.map((diff) => (
                     <div
                       key={diff.field}
                       className="flex justify-between items-start py-1 border-b border-border/50 last:border-0"
                     >
                       <span className="text-sm text-muted-foreground">
                         {formatFieldName(diff.field)}
                       </span>
                       <span className="text-sm font-medium text-right max-w-[60%] break-words">
                         {formatValueForDisplay(diff.localValue)}
                       </span>
                     </div>
                   ))}
                 </div>
               </div>
 
               {/* Server Version */}
               <div className="border rounded-lg overflow-hidden">
                 <div className="bg-secondary/50 px-4 py-2 flex items-center gap-2">
                   <Server className="h-4 w-4 text-muted-foreground" />
                   <span className="font-medium">Server Version</span>
                 </div>
                 {serverTimestamp && (
                   <div className="px-4 py-1 text-xs text-muted-foreground flex items-center gap-1">
                     <Clock className="h-3 w-3" />
                     {formatDistanceToNow(new Date(serverTimestamp), { addSuffix: true })}
                   </div>
                 )}
                 <div className="p-4 space-y-2">
                   {diffs.map((diff) => (
                     <div
                       key={diff.field}
                       className="flex justify-between items-start py-1 border-b border-border/50 last:border-0"
                     >
                       <span className="text-sm text-muted-foreground">
                         {formatFieldName(diff.field)}
                       </span>
                       <span className="text-sm font-medium text-right max-w-[60%] break-words">
                         {formatValueForDisplay(diff.serverValue)}
                       </span>
                     </div>
                   ))}
                 </div>
               </div>
             </div>
           ) : (
             /* Merge Mode */
             <div className="space-y-3 p-1">
               <p className="text-sm text-muted-foreground mb-4">
                 Select which version to use for each field:
               </p>
               {diffs.map((diff) => (
                 <div key={diff.field} className="border rounded-lg p-3">
                   <div className="font-medium mb-2">{formatFieldName(diff.field)}</div>
                   <div className="grid grid-cols-2 gap-2">
                     <button
                       onClick={() =>
                         setFieldSelections((prev) => ({ ...prev, [diff.field]: 'local' }))
                       }
                       className={cn(
                         'p-2 rounded border text-left text-sm transition-colors',
                         fieldSelections[diff.field] === 'local'
                           ? 'border-primary bg-primary/10'
                           : 'border-border hover:border-primary/50'
                       )}
                     >
                       <div className="flex items-center gap-2 mb-1">
                         <Smartphone className="h-3 w-3" />
                         <span className="text-xs text-muted-foreground">Your Version</span>
                         {fieldSelections[diff.field] === 'local' && (
                           <Check className="h-3 w-3 text-primary ml-auto" />
                         )}
                       </div>
                       <div className="font-medium">{formatValueForDisplay(diff.localValue)}</div>
                     </button>
                     <button
                       onClick={() =>
                         setFieldSelections((prev) => ({ ...prev, [diff.field]: 'server' }))
                       }
                       className={cn(
                         'p-2 rounded border text-left text-sm transition-colors',
                         fieldSelections[diff.field] === 'server'
                           ? 'border-primary bg-primary/10'
                           : 'border-border hover:border-primary/50'
                       )}
                     >
                       <div className="flex items-center gap-2 mb-1">
                         <Server className="h-3 w-3" />
                         <span className="text-xs text-muted-foreground">Server Version</span>
                         {fieldSelections[diff.field] === 'server' && (
                           <Check className="h-3 w-3 text-primary ml-auto" />
                         )}
                       </div>
                       <div className="font-medium">{formatValueForDisplay(diff.serverValue)}</div>
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </ScrollArea>
 
         <DialogFooter className="gap-2 sm:gap-0">
           {!showMerge ? (
             <>
               <Button
                 variant="outline"
                 onClick={() => handleResolution(ConflictResolution.USE_SERVER)}
               >
                 Use Server Version
               </Button>
               <Button
                 variant="outline"
                 onClick={handleShowMerge}
               >
                 Merge Fields...
               </Button>
               <Button onClick={() => handleResolution(ConflictResolution.USE_LOCAL)}>
                 Keep My Changes
               </Button>
             </>
           ) : (
             <>
               <Button variant="outline" onClick={() => setShowMerge(false)}>
                 Back
               </Button>
               <Button onClick={handleMergeConfirm}>
                 Apply Merged Version
               </Button>
             </>
           )}
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 }
 
 export default ConflictResolutionDialog;