/**
 * Offline Sync Indicator Component
 * Shows sync status and pending changes count
 */

import { useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface OfflineSyncIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineSyncIndicator({ 
  className,
  showDetails = false,
}: OfflineSyncIndicatorProps) {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    lastSyncAt,
    lastError,
    syncNow,
  } = useOfflineSync();

  const [isOpen, setIsOpen] = useState(false);

  // Determine status
  const getStatus = () => {
    if (!isOnline) return 'offline';
    if (isSyncing) return 'syncing';
    if (pendingCount > 0) return 'pending';
    if (lastError) return 'error';
    return 'synced';
  };

  const status = getStatus();

  const statusConfig = {
    offline: {
      icon: CloudOff,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      label: 'Offline',
      description: 'Changes will sync when connected',
    },
    syncing: {
      icon: RefreshCw,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      label: 'Syncing...',
      description: 'Uploading changes to server',
    },
    pending: {
      icon: Cloud,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      label: `${pendingCount} pending`,
      description: 'Changes waiting to sync',
    },
    error: {
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      label: 'Sync error',
      description: lastError || 'Failed to sync some changes',
    },
    synced: {
      icon: Check,
      color: 'text-success',
      bgColor: 'bg-success/10',
      label: 'Synced',
      description: 'All changes saved',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Simple indicator (just icon with tooltip)
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                config.bgColor,
                config.color,
                className
              )}
            >
              <Icon 
                className={cn(
                  'h-3.5 w-3.5',
                  status === 'syncing' && 'animate-spin'
                )} 
              />
              {pendingCount > 0 && (
                <span>{pendingCount}</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed indicator with popover
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-2 h-8',
            config.color,
            className
          )}
        >
          <Icon 
            className={cn(
              'h-4 w-4',
              status === 'syncing' && 'animate-spin'
            )} 
          />
          <span className="text-xs">{config.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-full', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <div>
              <p className="font-medium text-sm">{config.label}</p>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>

          {lastSyncAt && (
            <div className="text-xs text-muted-foreground">
              Last synced: {format(new Date(lastSyncAt), 'MMM d, h:mm a')}
            </div>
          )}

          {pendingCount > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                {pendingCount} change{pendingCount > 1 ? 's' : ''} pending
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncNow()}
                disabled={!isOnline || isSyncing}
              >
                <RefreshCw className={cn(
                  'h-3 w-3 mr-1',
                  isSyncing && 'animate-spin'
                )} />
                Sync now
              </Button>
            </div>
          )}

          {!isOnline && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                You're working offline. Your changes are saved locally and will be uploaded when you reconnect.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
