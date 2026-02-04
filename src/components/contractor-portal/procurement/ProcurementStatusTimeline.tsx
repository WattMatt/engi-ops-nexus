import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { Clock, CheckCircle2, Truck, Package, ShoppingCart, FileCheck, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatusHistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_by_name: string | null;
  notes: string | null;
  created_at: string;
}

interface ProcurementStatusTimelineProps {
  procurementItemId: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  instructed: { label: 'Instructed', icon: <Clock className="h-4 w-4" />, color: 'text-amber-600' },
  ordered: { label: 'Ordered', icon: <ShoppingCart className="h-4 w-4" />, color: 'text-purple-600' },
  delivered: { label: 'Delivered', icon: <Package className="h-4 w-4" />, color: 'text-green-600' },
  cancelled: { label: 'Cancelled', icon: <AlertCircle className="h-4 w-4" />, color: 'text-destructive' },
};

export function ProcurementStatusTimeline({ procurementItemId }: ProcurementStatusTimelineProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['procurement-status-history', procurementItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_status_history')
        .select('*')
        .eq('procurement_item_id', procurementItemId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StatusHistoryEntry[];
    },
    enabled: !!procurementItemId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No status history available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {history.map((entry, index) => {
        const config = statusConfig[entry.new_status] || statusConfig.instructed;
        const isLast = index === history.length - 1;
        
        return (
          <div key={entry.id} className="relative flex gap-3">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
            )}
            
            {/* Status icon */}
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full bg-background border-2 z-10",
              config.color
            )}>
              {config.icon}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{config.label}</p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(entry.created_at), 'PPp')}
              </p>
              {entry.changed_by_name && (
                <p className="text-xs text-muted-foreground mt-1">
                  By: {entry.changed_by_name}
                </p>
              )}
              {entry.notes && (
                <p className="text-sm mt-1 text-muted-foreground italic">
                  "{entry.notes}"
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
