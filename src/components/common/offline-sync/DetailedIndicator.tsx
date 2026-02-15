import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { StatusConfig, SyncStatus } from './statusConfig';

interface DetailedIndicatorProps {
  config: StatusConfig;
  status: SyncStatus;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncNow: () => void;
  className?: string;
}

export function DetailedIndicator({
  config, status, isOnline, isSyncing, pendingCount, lastSyncAt, syncNow, className,
}: DetailedIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = config.icon;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('gap-2 h-8', config.color, className)}>
          <Icon className={cn('h-4 w-4', status === 'syncing' && 'animate-spin')} />
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
              <Button size="sm" variant="outline" onClick={() => syncNow()} disabled={!isOnline || isSyncing}>
                <RefreshCw className={cn('h-3 w-3 mr-1', isSyncing && 'animate-spin')} />
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
