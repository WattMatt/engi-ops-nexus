import { useMemo } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  getDay,
  isBefore,
  startOfToday
} from "date-fns";
import { ChevronLeft, ChevronRight, Package, Truck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ProcurementItem {
  id: string;
  name: string;
  status: string;
  expected_delivery: string | null;
  supplier_name: string | null;
}

interface ProcurementDeliveryCalendarProps {
  items: ProcurementItem[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onItemClick?: (itemId: string) => void;
}

const statusColors: Record<string, string> = {
  ordered: 'bg-purple-500',
  in_transit: 'bg-cyan-500',
  delivered: 'bg-green-500',
  approved: 'bg-emerald-500',
  pending_approval: 'bg-orange-500',
  quote_received: 'bg-blue-500',
};

export function ProcurementDeliveryCalendar({ 
  items, 
  currentMonth, 
  onMonthChange,
  onItemClick 
}: ProcurementDeliveryCalendarProps) {
  const today = startOfToday();
  
  // Get items with expected delivery dates
  const deliveryItems = useMemo(() => {
    return items.filter(item => 
      item.expected_delivery && 
      item.status !== 'delivered' && 
      item.status !== 'cancelled'
    );
  }, [items]);

  // Group items by delivery date
  const itemsByDate = useMemo(() => {
    const grouped: Record<string, ProcurementItem[]> = {};
    deliveryItems.forEach(item => {
      if (item.expected_delivery) {
        const dateKey = format(new Date(item.expected_delivery), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(item);
      }
    });
    return grouped;
  }, [deliveryItems]);

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the day of week for the first day (0 = Sunday)
  const startDayOfWeek = getDay(monthStart);
  
  // Create padding for days before the month starts
  const paddingDays = Array(startDayOfWeek).fill(null);

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div 
            key={day} 
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
        
        {/* Padding days */}
        {paddingDays.map((_, index) => (
          <div key={`padding-${index}`} className="h-20" />
        ))}
        
        {/* Calendar days */}
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayItems = itemsByDate[dateKey] || [];
          const hasDeliveries = dayItems.length > 0;
          const isPast = isBefore(day, today) && !isSameDay(day, today);
          const hasOverdue = hasDeliveries && isPast;
          
          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-20 p-1 border rounded-lg transition-colors",
                isToday(day) && "border-primary bg-primary/5",
                hasOverdue && "border-destructive/50 bg-destructive/5",
                !isToday(day) && !hasOverdue && "border-border"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-xs font-medium",
                  isToday(day) && "text-primary",
                  isPast && "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                {hasOverdue && (
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                )}
              </div>
              
              {/* Delivery items */}
              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map(item => (
                  <HoverCard key={item.id}>
                    <HoverCardTrigger asChild>
                      <button
                        onClick={() => onItemClick?.(item.id)}
                        className={cn(
                          "w-full text-left text-xs px-1 py-0.5 rounded truncate text-white",
                          statusColors[item.status] || 'bg-muted text-muted-foreground'
                        )}
                      >
                        {item.name}
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-64" side="right">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          {item.status === 'in_transit' ? (
                            <Truck className="h-4 w-4 mt-0.5 text-cyan-600" />
                          ) : (
                            <Package className="h-4 w-4 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            {item.supplier_name && (
                              <p className="text-xs text-muted-foreground">
                                {item.supplier_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
                {dayItems.length > 3 && (
                  <button
                    onClick={() => dayItems[0] && onItemClick?.(dayItems[0].id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    +{dayItems.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t">
        <div className="flex items-center gap-1 text-xs">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span>Ordered</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-3 h-3 rounded bg-cyan-500" />
          <span>In Transit</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Approved</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <AlertTriangle className="h-3 w-3 text-destructive" />
          <span>Overdue</span>
        </div>
      </div>
    </div>
  );
}
