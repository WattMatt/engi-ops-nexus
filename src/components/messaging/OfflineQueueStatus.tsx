import { Clock, RefreshCw, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOfflineMessageQueue } from "@/hooks/useOfflineMessageQueue";
import { cn } from "@/lib/utils";

interface OfflineQueueStatusProps {
  className?: string;
}

export function OfflineQueueStatus({ className }: OfflineQueueStatusProps) {
  const { queueCount, isSyncing, isOnline, syncPendingMessages } = useOfflineMessageQueue();

  // Don't show if no pending messages and online
  if (queueCount === 0 && isOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
        isOnline ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground",
        className
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
          {queueCount > 0 && (
            <span className="ml-1">
              • {queueCount} message{queueCount > 1 ? 's' : ''} queued
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Syncing messages...</span>
        </>
      ) : queueCount > 0 ? (
        <>
          <Clock className="h-4 w-4" />
          <span>
            {queueCount} message{queueCount > 1 ? 's' : ''} pending
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 ml-2"
            onClick={() => syncPendingMessages()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync Now
          </Button>
        </>
      ) : null}
    </div>
  );
}
