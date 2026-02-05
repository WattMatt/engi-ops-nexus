 /**
  * Offline Record Indicator Component
  * Shows visual editing indicator for records created/modified offline
  */
 
 import { Pencil, Clock, Wifi, WifiOff } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { SyncStatusBadge, SyncStatus, getRecordSyncStatus } from './SyncStatusBadge';
 import { useNetworkStatus } from '@/hooks/useNetworkStatus';
 
 interface OfflineRecordIndicatorProps {
   /** Whether the record is synced with the server */
   synced?: boolean;
   /** Local update timestamp */
   localUpdatedAt?: number;
   /** Server sync timestamp */
   syncedAt?: number;
   /** Whether sync is currently in progress */
   isSyncing?: boolean;
   /** Variant style */
   variant?: 'badge' | 'inline' | 'corner' | 'border';
   /** Additional CSS classes */
   className?: string;
 }
 
 export function OfflineRecordIndicator({
   synced = true,
   localUpdatedAt,
   syncedAt,
   isSyncing = false,
   variant = 'badge',
   className,
 }: OfflineRecordIndicatorProps) {
   const { isConnected } = useNetworkStatus();
   
   const status = getRecordSyncStatus(
     { synced, localUpdatedAt, syncedAt },
     isConnected,
     isSyncing
   );
 
   // Don't show anything if synced and online
   if (status === 'synced' && isConnected) {
     return null;
   }
 
   if (variant === 'badge') {
     return (
       <SyncStatusBadge
         status={status}
         compact
         lastSyncAt={syncedAt}
         className={className}
       />
     );
   }
 
   if (variant === 'inline') {
     return (
       <div
         className={cn(
           'inline-flex items-center gap-1 text-xs',
           status === 'pending' && 'text-warning',
           status === 'offline' && 'text-muted-foreground',
           status === 'syncing' && 'text-primary',
           className
         )}
       >
         {status === 'offline' && <WifiOff className="h-3 w-3" />}
         {status === 'pending' && <Clock className="h-3 w-3" />}
         {status === 'syncing' && <Wifi className="h-3 w-3 animate-pulse" />}
         <span>
           {status === 'offline' && 'Saved locally'}
           {status === 'pending' && 'Pending sync'}
           {status === 'syncing' && 'Syncing...'}
         </span>
       </div>
     );
   }
 
   if (variant === 'corner') {
     return (
       <div
         className={cn(
           'absolute top-0 right-0 w-0 h-0',
           'border-l-[12px] border-l-transparent',
           'border-t-[12px]',
           status === 'pending' && 'border-t-warning',
           status === 'offline' && 'border-t-muted-foreground',
           status === 'syncing' && 'border-t-primary animate-pulse',
           className
         )}
         title={
           status === 'offline'
             ? 'Saved locally'
             : status === 'pending'
             ? 'Pending sync'
             : 'Syncing...'
         }
       />
     );
   }
 
   // Border variant
   return (
     <div
       className={cn(
         'absolute inset-0 pointer-events-none border-2 rounded-md',
         status === 'pending' && 'border-warning/50',
         status === 'offline' && 'border-muted-foreground/50 border-dashed',
         status === 'syncing' && 'border-primary/50 animate-pulse',
         className
       )}
     />
   );
 }
 
 /**
  * Row wrapper that adds offline indicator styling
  */
 interface OfflineRowWrapperProps {
   children: React.ReactNode;
   synced?: boolean;
   localUpdatedAt?: number;
   isSyncing?: boolean;
   className?: string;
 }
 
 export function OfflineRowWrapper({
   children,
   synced = true,
   localUpdatedAt,
   isSyncing = false,
   className,
 }: OfflineRowWrapperProps) {
   const { isConnected } = useNetworkStatus();
   
   const isPending = !synced && (isConnected || !isConnected);
   const showIndicator = !synced || !isConnected;
 
   return (
     <div className={cn('relative', className)}>
       {children}
       {showIndicator && (
         <OfflineRecordIndicator
           synced={synced}
           localUpdatedAt={localUpdatedAt}
           isSyncing={isSyncing}
           variant="corner"
         />
       )}
     </div>
   );
 }
 
 export default OfflineRecordIndicator;