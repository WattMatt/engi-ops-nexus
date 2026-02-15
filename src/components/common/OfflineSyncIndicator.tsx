/**
 * Offline Sync Indicator Component
 * Composes SimpleIndicator and DetailedIndicator sub-components
 */

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { getSyncStatus, getStatusConfig } from './offline-sync/statusConfig';
import { SimpleIndicator } from './offline-sync/SimpleIndicator';
import { DetailedIndicator } from './offline-sync/DetailedIndicator';

interface OfflineSyncIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function OfflineSyncIndicator({
  className,
  showDetails = false,
}: OfflineSyncIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, lastSyncAt, lastError, syncNow } = useOfflineSync();

  const status = getSyncStatus(isOnline, isSyncing, pendingCount, lastError);
  const config = getStatusConfig(status, pendingCount, lastError);

  if (!showDetails) {
    return <SimpleIndicator config={config} status={status} pendingCount={pendingCount} className={className} />;
  }

  return (
    <DetailedIndicator
      config={config}
      status={status}
      isOnline={isOnline}
      isSyncing={isSyncing}
      pendingCount={pendingCount}
      lastSyncAt={lastSyncAt}
      syncNow={syncNow}
      className={className}
    />
  );
}
