 /**
  * Storage Status Card
  * Detailed storage breakdown for Settings page
  */
 
 import { useState } from 'react';
 import {
   HardDrive,
   Database,
   Trash2,
   RefreshCw,
   Shield,
   AlertTriangle,
   ChevronDown,
   ChevronUp,
 } from 'lucide-react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Progress } from '@/components/ui/progress';
 import { Badge } from '@/components/ui/badge';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { useStorageQuota } from '@/hooks/useStorageQuota';
 import {
   formatStorageSize,
   getStorageLevelColor,
   getStoreDisplayName,
   STORAGE_THRESHOLDS,
 } from '@/lib/storageQuota';
 import { cn } from '@/lib/utils';
 import { toast } from 'sonner';
 import { clearStore, STORES } from '@/lib/offlineStorage';
 
 export function StorageStatusCard() {
   const {
     usage,
     quota,
     percentage,
     level,
     breakdown,
     isPersisted,
     isLoading,
     refresh,
     requestPersistence,
   } = useStorageQuota({ showWarnings: false });
 
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [isClearing, setIsClearing] = useState(false);
   const [showBreakdown, setShowBreakdown] = useState(false);
 
   const handleRefresh = async () => {
     setIsRefreshing(true);
     await refresh();
     setIsRefreshing(false);
     toast.success('Storage info updated');
   };
 
   const handleClearSyncedData = async () => {
     setIsClearing(true);
     try {
       // Clear cached data and sync queue (safe to clear)
       await clearStore(STORES.CACHED_DATA);
       await clearStore(STORES.SYNC_QUEUE);
       await refresh();
       toast.success('Cleared cached and synced data');
     } catch (error) {
       console.error('Failed to clear data:', error);
       toast.error('Failed to clear data');
     } finally {
       setIsClearing(false);
     }
   };
 
   const getProgressColor = () => {
     switch (level) {
       case 'danger': return 'bg-destructive';
       case 'critical': return 'bg-orange-500';
       case 'warning': return 'bg-yellow-500';
       default: return 'bg-primary';
     }
   };
 
   const getLevelBadge = () => {
     switch (level) {
       case 'danger':
         return <Badge variant="destructive">Critical</Badge>;
       case 'critical':
         return <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>;
       case 'warning':
         return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">Moderate</Badge>;
       default:
         return <Badge variant="secondary">Healthy</Badge>;
     }
   };
 
   // Sort stores by size for breakdown display
   const sortedStores = Object.entries(breakdown.byStore)
     .sort(([, a], [, b]) => b.estimatedSize - a.estimatedSize)
     .filter(([, data]) => data.count > 0);
 
   return (
     <Card>
       <CardHeader>
         <div className="flex items-center justify-between">
           <div>
             <CardTitle className="flex items-center gap-2">
               <HardDrive className="h-5 w-5" />
               Offline Storage
             </CardTitle>
             <CardDescription>
               IndexedDB and cache storage usage
             </CardDescription>
           </div>
           <div className="flex items-center gap-2">
             {getLevelBadge()}
             <Button
               size="icon"
               variant="ghost"
               onClick={handleRefresh}
               disabled={isRefreshing}
             >
               <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
             </Button>
           </div>
         </div>
       </CardHeader>
       <CardContent className="space-y-6">
         {/* Main Progress Bar */}
         <div className="space-y-2">
           <div className="flex items-center justify-between text-sm">
             <span className={getStorageLevelColor(level)}>
               {Math.round(percentage)}% used
             </span>
             <span className="text-muted-foreground">
               {formatStorageSize(usage)} / {formatStorageSize(quota)}
             </span>
           </div>
           <div className="relative">
             <Progress value={percentage} className="h-3" />
             {/* Threshold markers */}
             <div
               className="absolute top-0 h-full w-px bg-yellow-500/50"
               style={{ left: `${STORAGE_THRESHOLDS.WARNING * 100}%` }}
             />
             <div
               className="absolute top-0 h-full w-px bg-orange-500/50"
               style={{ left: `${STORAGE_THRESHOLDS.CRITICAL * 100}%` }}
             />
             <div
               className="absolute top-0 h-full w-px bg-destructive/50"
               style={{ left: `${STORAGE_THRESHOLDS.DANGER * 100}%` }}
             />
           </div>
           <div className="flex justify-between text-xs text-muted-foreground">
             <span>0%</span>
             <span>80%</span>
             <span>90%</span>
             <span>100%</span>
           </div>
         </div>
 
         {/* Warning Message */}
         {level !== 'healthy' && (
           <div className={cn(
             'flex items-start gap-2 p-3 rounded-lg border',
             level === 'danger' ? 'bg-destructive/10 border-destructive' :
             level === 'critical' ? 'bg-orange-500/10 border-orange-500' :
             'bg-yellow-500/10 border-yellow-500'
           )}>
             <AlertTriangle className={cn(
               'h-4 w-4 mt-0.5 shrink-0',
               level === 'danger' ? 'text-destructive' :
               level === 'critical' ? 'text-orange-500' : 'text-yellow-500'
             )} />
             <div className="text-sm">
               {level === 'danger' && (
                 <>
                   <p className="font-medium">Storage critically full</p>
                   <p className="text-muted-foreground">
                     New offline saves are blocked. Clear old data or sync immediately.
                   </p>
                 </>
               )}
               {level === 'critical' && (
                 <>
                   <p className="font-medium">Storage almost full</p>
                   <p className="text-muted-foreground">
                     Sync your data and clear old records to free up space.
                   </p>
                 </>
               )}
               {level === 'warning' && (
                 <>
                   <p className="font-medium">Storage getting full</p>
                   <p className="text-muted-foreground">
                     Consider syncing and clearing cached data.
                   </p>
                 </>
               )}
             </div>
           </div>
         )}
 
         {/* Persistence Status */}
         <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
           <div className="flex items-center gap-2">
             <Shield className={cn('h-4 w-4', isPersisted ? 'text-green-500' : 'text-muted-foreground')} />
             <div>
               <p className="text-sm font-medium">Persistent Storage</p>
               <p className="text-xs text-muted-foreground">
                 {isPersisted
                   ? 'Your data is protected from browser cleanup'
                   : 'Data may be cleared when storage is low'}
               </p>
             </div>
           </div>
           {!isPersisted && (
             <Button size="sm" variant="outline" onClick={requestPersistence}>
               Enable
             </Button>
           )}
         </div>
 
         {/* Storage Breakdown */}
         <Collapsible open={showBreakdown} onOpenChange={setShowBreakdown}>
           <CollapsibleTrigger asChild>
             <Button variant="ghost" className="w-full justify-between">
               <span className="flex items-center gap-2">
                 <Database className="h-4 w-4" />
                 Storage Breakdown
               </span>
               {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
             </Button>
           </CollapsibleTrigger>
           <CollapsibleContent className="space-y-2 pt-2">
             {sortedStores.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-4">
                 No offline data stored
               </p>
             ) : (
               sortedStores.map(([storeName, data]) => (
                 <div
                   key={storeName}
                   className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                 >
                   <span>{getStoreDisplayName(storeName)}</span>
                   <div className="flex items-center gap-3 text-muted-foreground">
                     <span>{data.count} records</span>
                     <span className="text-xs">~{formatStorageSize(data.estimatedSize)}</span>
                   </div>
                 </div>
               ))
             )}
 
             {/* Summary */}
             <div className="pt-2 border-t space-y-1 text-sm">
               <div className="flex justify-between">
                 <span className="text-muted-foreground">IndexedDB (estimated)</span>
                 <span>{formatStorageSize(breakdown.indexedDB)}</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-muted-foreground">Cache Storage (estimated)</span>
                 <span>{formatStorageSize(breakdown.caches)}</span>
               </div>
             </div>
           </CollapsibleContent>
         </Collapsible>
 
         {/* Actions */}
         <div className="flex gap-2">
           <Button
             variant="outline"
             className="flex-1"
             onClick={handleClearSyncedData}
             disabled={isClearing}
           >
             <Trash2 className="h-4 w-4 mr-2" />
             {isClearing ? 'Clearing...' : 'Clear Cached Data'}
           </Button>
         </div>
       </CardContent>
     </Card>
   );
 }