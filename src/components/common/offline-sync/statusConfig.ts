import { Cloud, CloudOff, RefreshCw, Check, AlertCircle, LucideIcon } from 'lucide-react';

export type SyncStatus = 'offline' | 'syncing' | 'pending' | 'error' | 'synced';

export interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
  description: string;
}

export function getSyncStatus(isOnline: boolean, isSyncing: boolean, pendingCount: number, lastError: string | null): SyncStatus {
  if (!isOnline) return 'offline';
  if (isSyncing) return 'syncing';
  if (pendingCount > 0) return 'pending';
  if (lastError) return 'error';
  return 'synced';
}

export function getStatusConfig(status: SyncStatus, pendingCount: number, lastError: string | null): StatusConfig {
  const configs: Record<SyncStatus, StatusConfig> = {
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
  return configs[status];
}
