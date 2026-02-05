 /**
  * Sync Status Badge Component
  * Visual indicator showing the sync status of individual records
  */
 
 import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
 } from '@/components/ui/tooltip';
 import { cn } from '@/lib/utils';
 
 export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';
 
 interface SyncStatusBadgeProps {
   /** The sync status of the record */
   status: SyncStatus;
   /** Optional error message for error state */
   errorMessage?: string;
   /** Whether to show as a compact icon only */
   compact?: boolean;
   /** Additional CSS classes */
   className?: string;
   /** Last sync timestamp */
   lastSyncAt?: number | null;
   /** Show tooltip with details */
   showTooltip?: boolean;
 }
 
 const statusConfig: Record<SyncStatus, {
   icon: typeof Cloud;
   label: string;
   description: string;
   color: string;
   bgColor: string;
   animate?: boolean;
 }> = {
   synced: {
     icon: Check,
     label: 'Synced',
     description: 'Changes saved to server',
     color: 'text-success',
     bgColor: 'bg-success/10',
   },
   pending: {
     icon: Cloud,
     label: 'Pending',
     description: 'Waiting to sync',
     color: 'text-warning',
     bgColor: 'bg-warning/10',
   },
   syncing: {
     icon: RefreshCw,
     label: 'Syncing',
     description: 'Uploading changes...',
     color: 'text-primary',
     bgColor: 'bg-primary/10',
     animate: true,
   },
   error: {
     icon: AlertCircle,
     label: 'Sync Error',
     description: 'Failed to sync',
     color: 'text-destructive',
     bgColor: 'bg-destructive/10',
   },
   offline: {
     icon: CloudOff,
     label: 'Offline',
     description: 'Saved locally',
     color: 'text-muted-foreground',
     bgColor: 'bg-muted',
   },
 };
 
 export function SyncStatusBadge({
   status,
   errorMessage,
   compact = false,
   className,
   lastSyncAt,
   showTooltip = true,
 }: SyncStatusBadgeProps) {
   const config = statusConfig[status];
   const Icon = config.icon;
 
   const formatLastSync = () => {
     if (!lastSyncAt) return null;
     const diff = Date.now() - lastSyncAt;
     if (diff < 60000) return 'just now';
     if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
     if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
     return new Date(lastSyncAt).toLocaleDateString();
   };
 
   const badge = (
     <Badge
       variant="secondary"
       className={cn(
         'gap-1 font-normal',
         config.bgColor,
         config.color,
         compact && 'p-1',
         className
       )}
     >
       <Icon
         className={cn(
           compact ? 'h-3 w-3' : 'h-3.5 w-3.5',
           config.animate && 'animate-spin'
         )}
       />
       {!compact && <span className="text-xs">{config.label}</span>}
     </Badge>
   );
 
   if (!showTooltip) {
     return badge;
   }
 
   return (
     <Tooltip>
       <TooltipTrigger asChild>{badge}</TooltipTrigger>
       <TooltipContent side="top" className="max-w-xs">
         <div className="space-y-1">
           <p className="font-medium">{config.label}</p>
           <p className="text-xs text-muted-foreground">
             {errorMessage || config.description}
           </p>
           {lastSyncAt && status === 'synced' && (
             <p className="text-xs text-muted-foreground">
               Last synced: {formatLastSync()}
             </p>
           )}
         </div>
       </TooltipContent>
     </Tooltip>
   );
 }
 
 /**
  * Helper to determine sync status from record metadata
  */
 export function getRecordSyncStatus(
   record: { synced?: boolean; localUpdatedAt?: number; syncedAt?: number },
   isOnline: boolean,
   isSyncing: boolean
 ): SyncStatus {
   if (isSyncing && !record.synced) {
     return 'syncing';
   }
   if (!isOnline) {
     return record.synced ? 'synced' : 'offline';
   }
   if (record.synced) {
     return 'synced';
   }
   return 'pending';
 }
 
 export default SyncStatusBadge;