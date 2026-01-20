/**
 * Sync Status Indicator - Shows sync state with external system
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface SyncStatusIndicatorProps {
  status: string;
  lastSyncAt: string | null;
}

export function SyncStatusIndicator({ status, lastSyncAt }: SyncStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          label: 'Synced',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          label: 'Syncing...',
          animate: true,
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          label: 'Sync Error',
        };
      case 'pending':
      default:
        return {
          icon: CloudOff,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          label: 'Not Synced',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const lastSyncText = lastSyncAt 
    ? `Last synced ${formatDistanceToNow(parseISO(lastSyncAt), { addSuffix: true })}`
    : 'Never synced';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${config.bgColor} ${config.color} border-0 cursor-help`}
          >
            <Icon className={`h-3 w-3 mr-1 ${config.animate ? 'animate-spin' : ''}`} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">wm-solar Integration</p>
            <p className="text-muted-foreground">{lastSyncText}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
