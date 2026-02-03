/**
 * Offline Sync Status Bar Component
 * Shows offline indicator and pending sync count for cable/budget data
 */

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
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
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isConnected ? 'Online' : 'Offline'}
              {pendingCount > 0 && ` - ${pendingCount} pending`}
            </p>
          </TooltipContent>
        </Tooltip>

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
        isConnected 
          ? pendingCount > 0 
            ? 'bg-warning/10 text-warning border border-warning/20'
            : 'bg-muted/50 text-muted-foreground'
          : 'bg-destructive/10 text-destructive border border-destructive/20',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isConnected ? (
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
