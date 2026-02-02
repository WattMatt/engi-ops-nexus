/**
 * Status Badge for Cable Verification
 * Displays verification status with appropriate colors and icons
 */
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  HelpCircle
} from "lucide-react";
import { VerificationStatus, VerificationItemStatus } from "@/types/cableVerification";
import { cn } from "@/lib/utils";

interface CableVerificationStatusBadgeProps {
  status: VerificationStatus | VerificationItemStatus;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
    className: 'bg-muted text-muted-foreground',
    Icon: Clock,
  },
  in_progress: {
    label: 'In Progress',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    Icon: Loader2,
  },
  verified: {
    label: 'Verified',
    variant: 'default',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    Icon: CheckCircle2,
  },
  issues_found: {
    label: 'Issues Found',
    variant: 'destructive',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    Icon: AlertTriangle,
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    Icon: XCircle,
  },
  issue: {
    label: 'Issue',
    variant: 'destructive',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    Icon: AlertTriangle,
  },
  not_installed: {
    label: 'Not Installed',
    variant: 'outline',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
    Icon: HelpCircle,
  },
};

export function CableVerificationStatusBadge({ 
  status, 
  size = 'default',
  showIcon = true 
}: CableVerificationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const { Icon, label, className } = config;
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0',
    default: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    default: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge 
      variant="outline"
      className={cn(
        'font-medium gap-1 border-0',
        className,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], status === 'in_progress' && 'animate-spin')} />}
      {label}
    </Badge>
  );
}
