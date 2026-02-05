 /**
  * Offline Sync Status Bar Component
  * Shows offline indicator and pending sync count for cable/budget data
  */
 
 import { useState, useEffect } from 'react';
 import { Cloud, CloudOff, RefreshCw, Loader2, Check, AlertTriangle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
 import { useNetworkStatus } from '@/hooks/useNetworkStatus';
 import { useConflictContext } from '@/contexts/ConflictContext';
 import { cn } from '@/lib/utils';

interface OfflineSyncStatusBarProps {
  /** Number of pending items to sync */
  pendingCount: number;
  /** Whether currently syncing */
  isSyncing?: boolean;
  /** Callback to trigger manual sync */
  onSync?: () => void;
  /** Last sync timestamp */
  lastSyncAt?: number | null;
  /** Custom class name */
  className?: string;
  /** Compact mode for toolbar integration */
  compact?: boolean;
}

export function OfflineSyncStatusBar({
  pendingCount,
  isSyncing = false,
  onSync,
  lastSyncAt,
  className,
  compact = false,
}: OfflineSyncStatusBarProps) {
  const { isConnected, connectionType } = useNetworkStatus();
   const { conflictCount, openNextConflict } = useConflictContext();
  const [showSynced, setShowSynced] = useState(false);

  // Show "synced" message briefly after sync completes
  useEffect(() => {
    if (lastSyncAt && pendingCount === 0 && !isSyncing) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncAt, pendingCount, isSyncing]);

  const formatLastSync = () => {
    if (!lastSyncAt) return null;
    const diff = Date.now() - lastSyncAt;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
              isConnected 
                ? 'text-muted-foreground' 
                : 'bg-warning/10 text-warning'
            )}>
              {isConnected ? (
                <Cloud className="h-3.5 w-3.5" />
              ) : (
                <CloudOff className="h-3.5 w-3.5" />
              )}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {pendingCount}
                </Badge>
              )}
               {conflictCount > 0 && (
                 <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                   {conflictCount} conflict{conflictCount > 1 ? 's' : ''}
                 </Badge>
               )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isConnected ? 'Online' : 'Offline'}
              {pendingCount > 0 && ` - ${pendingCount} pending`}
               {conflictCount > 0 && ` - ${conflictCount} conflict${conflictCount > 1 ? 's' : ''}`}
            </p>
          </TooltipContent>
        </Tooltip>

         {conflictCount > 0 && (
           <Button
             variant="destructive"
             size="sm"
             className="h-6 px-2"
             onClick={openNextConflict}
           >
             <AlertTriangle className="h-3 w-3 mr-1" />
             Resolve
           </Button>
         )}
 
        {pendingCount > 0 && isConnected && onSync && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm',
         conflictCount > 0
           ? 'bg-destructive/10 text-destructive border border-destructive/20'
           : isConnected 
          ? pendingCount > 0 
            ? 'bg-warning/10 text-warning border border-warning/20'
            : 'bg-muted/50 text-muted-foreground'
          : 'bg-destructive/10 text-destructive border border-destructive/20',
        className
      )}
    >
      <div className="flex items-center gap-2">
         {conflictCount > 0 ? (
           <>
             <AlertTriangle className="h-4 w-4" />
             <span>
               {conflictCount} sync conflict{conflictCount > 1 ? 's' : ''} detected
             </span>
           </>
         ) : isConnected ? (
          showSynced ? (
            <>
              <Check className="h-4 w-4 text-primary" />
              <span className="text-primary">All changes synced</span>
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4" />
              <span>
                {pendingCount > 0 
                  ? `${pendingCount} pending change${pendingCount > 1 ? 's' : ''}`
                  : 'Online'}
              </span>
            </>
          )
        ) : (
          <>
            <CloudOff className="h-4 w-4" />
            <span>
              Offline
              {pendingCount > 0 && ` - ${pendingCount} queued`}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {lastSyncAt && isConnected && !showSynced && (
          <span className="text-xs text-muted-foreground">
            Last sync: {formatLastSync()}
          </span>
        )}

         {conflictCount > 0 && (
           <Button
             variant="destructive"
             size="sm"
             className="h-7"
             onClick={openNextConflict}
           >
             <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
             Resolve Conflicts
           </Button>
         )}
 
        {pendingCount > 0 && isConnected && onSync && (
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Sync Now
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default OfflineSyncStatusBar;
