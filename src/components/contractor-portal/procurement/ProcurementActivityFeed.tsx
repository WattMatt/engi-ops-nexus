import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format, isToday, isYesterday, startOfDay } from "date-fns";
import { 
  Clock, 
  Package, 
  ShoppingCart, 
  AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ActivityEntry {
  id: string;
  procurement_item_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by_name: string | null;
  notes: string | null;
  created_at: string;
  item_name?: string;
}

interface ProcurementActivityFeedProps {
  projectId: string;
  limit?: number;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  instructed: { label: 'Instructed', icon: <Clock className="h-3 w-3" />, color: 'text-amber-600' },
  ordered: { label: 'Ordered', icon: <ShoppingCart className="h-3 w-3" />, color: 'text-purple-600' },
  delivered: { label: 'Delivered', icon: <Package className="h-3 w-3" />, color: 'text-green-600' },
  cancelled: { label: 'Cancelled', icon: <AlertCircle className="h-3 w-3" />, color: 'text-destructive' },
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMMM d');
}

export function ProcurementActivityFeed({ projectId, limit = 20 }: ProcurementActivityFeedProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['procurement-activity-feed', projectId, limit],
    queryFn: async () => {
      // Get status history with item names
      const { data, error } = await supabase
        .from('procurement_status_history')
        .select(`
          id,
          procurement_item_id,
          previous_status,
          new_status,
          changed_by_name,
          notes,
          created_at,
          project_procurement_items!inner(name, project_id)
        `)
        .eq('project_procurement_items.project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return (data || []).map((entry: any) => ({
        ...entry,
        item_name: entry.project_procurement_items?.name,
      })) as ActivityEntry[];
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
      </div>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = startOfDay(new Date(activity.created_at)).toISOString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityEntry[]>);

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-4 pr-4">
        {Object.entries(groupedActivities).map(([dateKey, dayActivities]) => {
          const date = new Date(dateKey);
          
          return (
            <div key={dateKey}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                {getDateLabel(date)}
              </h4>
              <div className="space-y-2">
                {dayActivities.map((activity) => {
                  const config = statusConfig[activity.new_status] || statusConfig.not_started;
                  
                  return (
                    <div 
                      key={activity.id}
                      className="flex gap-2 text-sm"
                    >
                      <div className={cn(
                        "flex items-center justify-center h-6 w-6 rounded-full bg-muted shrink-0",
                        config.color
                      )}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.item_name}</span>
                          <span className="text-muted-foreground"> changed to </span>
                          <span className={cn("font-medium", config.color)}>
                            {config.label}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          {activity.changed_by_name && ` • ${activity.changed_by_name}`}
                        </p>
                        {activity.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{activity.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
