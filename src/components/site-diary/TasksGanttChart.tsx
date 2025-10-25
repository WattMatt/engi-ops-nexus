import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  profiles?: { full_name: string | null };
}

interface TasksGanttChartProps {
  projectId: string;
}

export const TasksGanttChart = ({ projectId }: TasksGanttChartProps) => {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["gantt-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select(`
          id,
          title,
          status,
          priority,
          start_date,
          due_date,
          assigned_to
        `)
        .eq("project_id", projectId)
        .not("start_date", "is", null)
        .not("due_date", "is", null)
        .order("start_date", { ascending: true });

      if (error) throw error;

      // Fetch user names separately
      const tasksWithProfiles = await Promise.all(
        (data || []).map(async (task) => {
          if (task.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", task.assigned_to)
              .single();
            
            return { ...task, profiles: profile };
          }
          return { ...task, profiles: null };
        })
      );

      return tasksWithProfiles as Task[];
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">
            No tasks with dates scheduled yet. Add tasks with start and due dates to see the timeline.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Find the date range
  const allDates = tasks.flatMap((t) => [
    t.start_date ? new Date(t.start_date) : null,
    t.due_date ? new Date(t.due_date) : null,
  ].filter(Boolean) as Date[]);

  const minDate = startOfMonth(new Date(Math.min(...allDates.map((d) => d.getTime()))));
  const maxDate = endOfMonth(new Date(Math.max(...allDates.map((d) => d.getTime()))));
  const dateRange = eachDayOfInterval({ start: minDate, end: maxDate });
  const totalDays = dateRange.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "cancelled":
        return "bg-gray-400";
      default:
        return "bg-yellow-500";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Timeline (Gantt View)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header with months */}
            <div className="flex items-center mb-4 ml-64">
              <div className="flex-1 flex">
                {Array.from(new Set(dateRange.map((d) => format(d, "MMM yyyy")))).map((month) => {
                  const monthDays = dateRange.filter((d) => format(d, "MMM yyyy") === month).length;
                  const widthPercent = (monthDays / totalDays) * 100;
                  return (
                    <div
                      key={month}
                      style={{ width: `${widthPercent}%` }}
                      className="text-center font-semibold text-sm border-l border-border px-2"
                    >
                      {month}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {tasks.map((task) => {
                const startDate = task.start_date ? new Date(task.start_date) : null;
                const dueDate = task.due_date ? new Date(task.due_date) : null;

                if (!startDate || !dueDate) return null;

                const startOffset = differenceInDays(startDate, minDate);
                const duration = differenceInDays(dueDate, startDate) + 1;
                const startPercent = (startOffset / totalDays) * 100;
                const widthPercent = (duration / totalDays) * 100;

                return (
                  <div key={task.id} className="flex items-center gap-4">
                    <div className="w-60 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {task.profiles?.full_name || "Unassigned"}
                          </p>
                        </div>
                        <Badge variant={getPriorityColor(task.priority)} className="ml-2 flex-shrink-0">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 relative h-8 border-l border-border">
                      <div
                        className={`absolute h-6 top-1 rounded ${getStatusColor(task.status)} flex items-center justify-center`}
                        style={{
                          left: `${startPercent}%`,
                          width: `${Math.max(widthPercent, 2)}%`,
                        }}
                      >
                        <span className="text-xs text-white font-medium px-2 truncate">
                          {format(startDate, "MMM d")} - {format(dueDate, "MMM d")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500" />
                <span className="text-xs">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-xs">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span className="text-xs">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-400" />
                <span className="text-xs">Cancelled</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};