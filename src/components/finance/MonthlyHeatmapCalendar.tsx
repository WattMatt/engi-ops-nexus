import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Invoice {
  id: string;
  invoice_date: string;
  total_amount: number;
  client_name: string;
}

interface MonthlyHeatmapCalendarProps {
  currentDate: Date;
  invoices: Invoice[];
  formatCurrency: (amount: number) => string;
}

export function MonthlyHeatmapCalendar({ currentDate, invoices, formatCurrency }: MonthlyHeatmapCalendarProps) {
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start: calStart, end: calEnd });
    
    // Group invoices by date
    const invoicesByDate = new Map<string, { total: number; count: number; invoices: Invoice[] }>();
    invoices?.forEach(inv => {
      const dateKey = inv.invoice_date;
      const existing = invoicesByDate.get(dateKey) || { total: 0, count: 0, invoices: [] };
      invoicesByDate.set(dateKey, {
        total: existing.total + inv.total_amount,
        count: existing.count + 1,
        invoices: [...existing.invoices, inv],
      });
    });

    // Calculate max for intensity scaling
    const maxAmount = Math.max(...Array.from(invoicesByDate.values()).map(d => d.total), 1);

    return { days, invoicesByDate, maxAmount, monthStart, monthEnd };
  }, [currentDate, invoices]);

  const getIntensityClass = (amount: number): string => {
    if (amount === 0) return "bg-muted/30";
    const intensity = amount / calendarData.maxAmount;
    if (intensity < 0.25) return "bg-primary/20";
    if (intensity < 0.5) return "bg-primary/40";
    if (intensity < 0.75) return "bg-primary/60";
    return "bg-primary/90";
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className="p-4">
      <h4 className="text-sm font-semibold mb-3">Invoice Activity Heatmap</h4>
      
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <TooltipProvider>
        <div className="grid grid-cols-7 gap-1">
          {calendarData.days.map((day, idx) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayData = calendarData.invoicesByDate.get(dateKey);
            const isCurrentMonth = day >= calendarData.monthStart && day <= calendarData.monthEnd;
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <Tooltip key={idx}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center text-xs transition-all cursor-default",
                      isCurrentMonth ? getIntensityClass(dayData?.total || 0) : "bg-transparent",
                      isToday && "ring-2 ring-primary ring-offset-1",
                      !isCurrentMonth && "opacity-30"
                    )}
                  >
                    <span className={cn(
                      "font-medium",
                      dayData && dayData.total > 0 && isCurrentMonth && "text-primary-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                    {dayData && dayData.count > 0 && isCurrentMonth && (
                      <span className="text-[10px] text-primary-foreground/80">
                        {dayData.count}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                {dayData && isCurrentMonth && (
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">{format(day, "dd MMM yyyy")}</p>
                      <p className="text-sm">{dayData.count} invoice{dayData.count > 1 ? 's' : ''}</p>
                      <p className="text-sm font-medium">{formatCurrency(dayData.total)}</p>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {dayData.invoices.slice(0, 3).map(inv => (
                          <p key={inv.id}>{inv.client_name}: {formatCurrency(inv.total_amount)}</p>
                        ))}
                        {dayData.invoices.length > 3 && (
                          <p>+{dayData.invoices.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-muted/30" />
          <div className="w-3 h-3 rounded-sm bg-primary/20" />
          <div className="w-3 h-3 rounded-sm bg-primary/40" />
          <div className="w-3 h-3 rounded-sm bg-primary/60" />
          <div className="w-3 h-3 rounded-sm bg-primary/90" />
        </div>
        <span>More</span>
      </div>
    </Card>
  );
}
