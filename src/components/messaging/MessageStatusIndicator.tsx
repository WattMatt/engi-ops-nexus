import { Clock, RefreshCw, X, WifiOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageStatusIndicatorProps {
  isQueued?: boolean;
  queueId?: string;
  status?: 'pending' | 'sending' | 'failed' | 'sent' | 'delivered' | 'read';
  onRetry?: (queueId: string) => void;
  onCancel?: (queueId: string) => void;
  className?: string;
}

export function MessageStatusIndicator({
  isQueued,
  queueId,
  status = 'sent',
  onRetry,
  onCancel,
  className,
}: MessageStatusIndicatorProps) {
  // Queued message (offline)
  if (isQueued && queueId) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
      <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-warning">
              <Clock className="h-3 w-3 animate-pulse" />
              <span className="text-xs">Pending</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Message will be sent when you're back online</p>
          </TooltipContent>
        </Tooltip>
        
        {onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            onClick={() => onCancel(queueId)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Status indicators for sent messages
  switch (status) {
    case 'pending':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
              <Clock className="h-3 w-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Sending...</TooltipContent>
        </Tooltip>
      );

    case 'sending':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
              <RefreshCw className="h-3 w-3 animate-spin" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Sending...</TooltipContent>
        </Tooltip>
      );

    case 'failed':
      return (
        <div className={cn("flex items-center gap-1", className)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-destructive">
                <WifiOff className="h-3 w-3" />
                <span className="text-xs">Failed</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Message failed to send</TooltipContent>
          </Tooltip>
          
          {onRetry && queueId && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-primary"
              onClick={() => onRetry(queueId)}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      );

    case 'sent':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center text-muted-foreground", className)}>
              <CheckCircle2 className="h-3 w-3" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Sent</TooltipContent>
        </Tooltip>
      );

    case 'delivered':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center text-primary", className)}>
              <CheckCircle2 className="h-3 w-3" />
              <CheckCircle2 className="h-3 w-3 -ml-1.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Delivered</TooltipContent>
        </Tooltip>
      );

    case 'read':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center text-success", className)}>
              <CheckCircle2 className="h-3 w-3" />
              <CheckCircle2 className="h-3 w-3 -ml-1.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Read</TooltipContent>
        </Tooltip>
      );

    default:
      return null;
  }
}
