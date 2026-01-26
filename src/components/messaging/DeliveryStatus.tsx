import { Check, CheckCheck, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type DeliveryStatusType = "sending" | "sent" | "delivered" | "read" | "failed";

interface DeliveryStatusProps {
  status: DeliveryStatusType;
  className?: string;
}

export function DeliveryStatus({ status, className }: DeliveryStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "sending":
        return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-primary" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "sending":
        return "Sending...";
      case "sent":
        return "Sent";
      case "delivered":
        return "Delivered";
      case "read":
        return "Read";
      case "failed":
        return "Failed to send";
      default:
        return "Pending";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center", className)}>
          {getStatusIcon()}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{getStatusLabel()}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Hook to determine delivery status based on message state
export function useDeliveryStatus(message: {
  delivery_status?: string;
  is_read?: boolean;
  read_by?: string[];
}): DeliveryStatusType {
  if (message.delivery_status === "failed") {
    return "failed";
  }
  
  if (message.delivery_status === "sending") {
    return "sending";
  }

  // Check if anyone has read it
  if (message.is_read || (message.read_by && message.read_by.length > 0)) {
    return "read";
  }

  // Assume delivered if not read but sent
  if (message.delivery_status === "delivered") {
    return "delivered";
  }

  return "sent";
}
