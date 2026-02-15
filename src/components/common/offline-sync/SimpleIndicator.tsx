import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { StatusConfig, SyncStatus } from './statusConfig';

interface SimpleIndicatorProps {
  config: StatusConfig;
  status: SyncStatus;
  pendingCount: number;
  className?: string;
}

export function SimpleIndicator({ config, status, pendingCount, className }: SimpleIndicatorProps) {
  const Icon = config.icon;

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
            <Icon className={cn('h-3.5 w-3.5', status === 'syncing' && 'animate-spin')} />
            {pendingCount > 0 && <span>{pendingCount}</span>}
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
