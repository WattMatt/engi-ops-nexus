import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  roadmap_item_id: string | null;
  profiles?: { full_name: string | null };
  roadmap_item?: { title: string; phase: string | null } | null;
}

interface TasksGanttChartProps {
  projectId: string;
}

interface PhaseGroup {
  phase: string;
  tasks: Task[];
  isExpanded: boolean;
}

export const TasksGanttChart = ({ projectId }: TasksGanttChartProps) => {
  const [groupByPhase, setGroupByPhase] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});

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
          assigned_to,
          roadmap_item_id
        `)
        .eq("project_id", projectId)
        .not("start_date", "is", null)
        .not("due_date", "is", null)
        .order("start_date", { ascending: true });

      if (error) throw error;

      // Fetch user names and roadmap items separately
      const tasksWithProfiles = await Promise.all(
        (data || []).map(async (task) => {
          let profiles = null;
          let roadmap_item = null;
          
          if (task.assigned_to) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", task.assigned_to)
              .single();
            profiles = profile;
          }
          
          if (task.roadmap_item_id) {
            const { data: roadmapItem } = await supabase
              .from("project_roadmap_items")
              .select("title, phase")
              .eq("id", task.roadmap_item_id)
              .single();
            roadmap_item = roadmapItem;
          }
          
          return { ...task, profiles, roadmap_item };
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

  // Group tasks by roadmap phase
  const groupedTasks = (): PhaseGroup[] => {
    if (!groupByPhase) {
      return [{ phase: "All Tasks", tasks: tasks, isExpanded: true }];
    }

    const groups: Record<string, Task[]> = {};
    
    tasks.forEach((task) => {
      const phase = task.roadmap_item?.phase || "Unlinked";
      if (!groups[phase]) {
        groups[phase] = [];
      }
      groups[phase].push(task);
    });

    // Sort phases (put Unlinked last)
    const sortedPhases = Object.keys(groups).sort((a, b) => {
      if (a === "Unlinked") return 1;
      if (b === "Unlinked") return -1;
      return a.localeCompare(b);
    });

    return sortedPhases.map((phase) => ({
      phase,
      tasks: groups[phase],
      isExpanded: expandedPhases[phase] !== false, // Default to expanded
    }));
  };

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

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      "Planning": "bg-blue-100 text-blue-800 border-blue-300",
      "Design": "bg-purple-100 text-purple-800 border-purple-300",
      "Construction": "bg-orange-100 text-orange-800 border-orange-300",
      "Commissioning": "bg-green-100 text-green-800 border-green-300",
      "Drawings": "bg-pink-100 text-pink-800 border-pink-300",
      "Handover": "bg-teal-100 text-teal-800 border-teal-300",
      "Unlinked": "bg-gray-100 text-gray-600 border-gray-300",
    };
    return colors[phase] || "bg-slate-100 text-slate-800 border-slate-300";
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phase]: prev[phase] === false ? true : false,
    }));
  };

  const phaseGroups = groupedTasks();

  const renderTaskRow = (task: Task) => {
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
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground truncate">
                  {task.profiles?.full_name || "Unassigned"}
                </p>
                {task.roadmap_item && (
                  <Badge variant="outline" className="h-4 text-[10px] gap-1 bg-primary/5">
                    <Map className="h-2.5 w-2.5" />
                    {task.roadmap_item.title.slice(0, 15)}...
                  </Badge>
                )}
              </div>
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
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Timeline (Gantt View)</CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="group-by-phase"
              checked={groupByPhase}
              onCheckedChange={setGroupByPhase}
            />
            <Label htmlFor="group-by-phase" className="text-sm cursor-pointer">
              Group by Roadmap Phase
            </Label>
          </div>
        </div>
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

            {/* Task Groups or Flat List */}
            <div className="space-y-4">
              {phaseGroups.map((group) => (
                <div key={group.phase}>
                  {groupByPhase && (
                    <Collapsible
                      open={expandedPhases[group.phase] !== false}
                      onOpenChange={() => togglePhase(group.phase)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className={cn(
                          "flex items-center gap-2 p-2 rounded-md border mb-2 cursor-pointer hover:bg-muted/50 transition-colors",
                          getPhaseColor(group.phase)
                        )}>
                          {expandedPhases[group.phase] !== false ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{group.phase}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 pl-4">
                          {group.tasks.map(renderTaskRow)}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  {!groupByPhase && (
                    <div className="space-y-2">
                      {group.tasks.map(renderTaskRow)}
                    </div>
                  )}
                </div>
              ))}
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
