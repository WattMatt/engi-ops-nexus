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
    key: 'instructed', 
    label: 'Instructed', 
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  },
  { 
    key: 'ordered', 
    label: 'Ordered', 
    icon: ShoppingCart,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
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
