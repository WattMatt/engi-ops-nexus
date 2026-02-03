import { useMemo } from "react";
import { format, isAfter, isBefore, addDays, startOfToday, differenceInDays } from "date-fns";
import { Truck, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProcurementItem {
  id: string;
  name: string;
  status: string;
  expected_delivery: string | null;
  supplier_name: string | null;
}

interface UpcomingDeliveriesProps {
  items: ProcurementItem[];
  daysAhead?: number;
  onItemClick?: (itemId: string) => void;
}

export function UpcomingDeliveries({ 
  items, 
  daysAhead = 14,
  onItemClick 
}: UpcomingDeliveriesProps) {
  const today = startOfToday();
  const cutoffDate = addDays(today, daysAhead);

  const { upcoming, overdue } = useMemo(() => {
    const upcoming: ProcurementItem[] = [];
    const overdue: ProcurementItem[] = [];

    items.forEach(item => {
      if (!item.expected_delivery) return;
      if (item.status === 'delivered' || item.status === 'cancelled') return;

      const deliveryDate = new Date(item.expected_delivery);
      
      if (isBefore(deliveryDate, today)) {
        overdue.push(item);
      } else if (isBefore(deliveryDate, cutoffDate) || format(deliveryDate, 'yyyy-MM-dd') === format(cutoffDate, 'yyyy-MM-dd')) {
        upcoming.push(item);
      }
    });

    // Sort by date
    upcoming.sort((a, b) => 
      new Date(a.expected_delivery!).getTime() - new Date(b.expected_delivery!).getTime()
    );
    overdue.sort((a, b) => 
      new Date(a.expected_delivery!).getTime() - new Date(b.expected_delivery!).getTime()
    );

    return { upcoming, overdue };
  }, [items, today, cutoffDate]);

  if (upcoming.length === 0 && overdue.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No upcoming deliveries in the next {daysAhead} days</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overdue Items */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <h4 className="text-sm font-medium">Overdue ({overdue.length})</h4>
          </div>
          <div className="space-y-1">
            {overdue.map(item => {
              const daysOverdue = differenceInDays(today, new Date(item.expected_delivery!));
              return (
                <button
                  key={item.id}
                  onClick={() => onItemClick?.(item.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-destructive/10 transition-colors text-left"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-destructive/10 text-destructive shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.supplier_name || 'No supplier'} • {daysOverdue} days overdue
                    </p>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    Overdue
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Items */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="h-4 w-4" />
            <h4 className="text-sm font-medium">Next {daysAhead} Days ({upcoming.length})</h4>
          </div>
          <div className="space-y-1">
            {upcoming.map(item => {
              const deliveryDate = new Date(item.expected_delivery!);
              const daysUntil = differenceInDays(deliveryDate, today);
              const isInTransit = item.status === 'in_transit';
              
              return (
                <button
                  key={item.id}
                  onClick={() => onItemClick?.(item.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
                    isInTransit 
                      ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isInTransit ? <Truck className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.supplier_name || 'No supplier'} • {format(deliveryDate, 'EEE, MMM d')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={daysUntil <= 3 ? "default" : "secondary"}>
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
