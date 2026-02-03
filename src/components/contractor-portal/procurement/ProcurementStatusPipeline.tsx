import { Badge } from "@/components/ui/badge";
import { Clock, FileCheck, CheckCircle2, ShoppingCart, Truck, Package, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcurementStatusPipelineProps {
  statusCounts: Record<string, number>;
  onStatusClick?: (status: string) => void;
  activeStatus?: string | null;
}

const pipelineStages = [
  { 
    key: 'not_started', 
    label: 'Not Started', 
    icon: Clock,
    color: 'bg-muted text-muted-foreground'
  },
  { 
    key: 'pending_quote', 
    label: 'Quoting', 
    icon: FileCheck,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  },
  { 
    key: 'quote_received', 
    label: 'Quoted', 
    icon: FileCheck,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  },
  { 
    key: 'pending_approval', 
    label: 'Approval', 
    icon: Clock,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  },
  { 
    key: 'approved', 
    label: 'Approved', 
    icon: CheckCircle2,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  },
  { 
    key: 'ordered', 
    label: 'Ordered', 
    icon: ShoppingCart,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  },
  { 
    key: 'in_transit', 
    label: 'In Transit', 
    icon: Truck,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
  },
  { 
    key: 'delivered', 
    label: 'Delivered', 
    icon: Package,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  },
];

export function ProcurementStatusPipeline({ 
  statusCounts, 
  onStatusClick,
  activeStatus 
}: ProcurementStatusPipelineProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Status Pipeline</h4>
      <div className="flex flex-wrap gap-2">
        {pipelineStages.map((stage, index) => {
          const Icon = stage.icon;
          const count = statusCounts[stage.key] || 0;
          const isActive = activeStatus === stage.key;
          
          return (
            <div key={stage.key} className="flex items-center">
              <button
                onClick={() => onStatusClick?.(stage.key)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  stage.color,
                  isActive && "ring-2 ring-primary ring-offset-2",
                  onStatusClick && "cursor-pointer hover:opacity-80",
                  !onStatusClick && "cursor-default"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{stage.label}</span>
                <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] justify-center">
                  {count}
                </Badge>
              </button>
              {index < pipelineStages.length - 1 && (
                <div className="hidden sm:block w-4 h-0.5 bg-border mx-1" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Cancelled count if any */}
      {(statusCounts['cancelled'] || 0) > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <XCircle className="h-4 w-4" />
          <span>{statusCounts['cancelled']} cancelled</span>
        </div>
      )}
    </div>
  );
}
