import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Map, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getPhaseConfig, getBarColorForPhase, type PhaseConfig } from "./gantt/phaseConfig";

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
  config: PhaseConfig;
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
      return [{ 
        phase: "All Tasks", 
        tasks: tasks, 
        isExpanded: true,
        config: getPhaseConfig(null),
      }];
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
      config: getPhaseConfig(phase),
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-white" />;
      case "in_progress":
        return <Clock className="h-3 w-3 text-white" />;
      case "cancelled":
        return <AlertCircle className="h-3 w-3 text-white" />;
      default:
        return null;
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

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phase]: prev[phase] === false ? true : false,
    }));
  };

  const phaseGroups = groupedTasks();

  const renderTaskRow = (task: Task, phaseConfig: PhaseConfig) => {
    const startDate = task.start_date ? new Date(task.start_date) : null;
    const dueDate = task.due_date ? new Date(task.due_date) : null;

    if (!startDate || !dueDate) return null;

    const startOffset = differenceInDays(startDate, minDate);
    const duration = differenceInDays(dueDate, startDate) + 1;
    const startPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;
    
    const phase = task.roadmap_item?.phase || null;
    const barColor = getBarColorForPhase(phase, task.status);
    const isInProgress = task.status === "in_progress";

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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "h-4 text-[10px] gap-1",
                            phaseConfig.bgColor,
                            phaseConfig.textColor
                          )}
                        >
                          <phaseConfig.icon className="h-2.5 w-2.5" />
                          {task.roadmap_item.title.slice(0, 12)}...
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{task.roadmap_item.title}</p>
                        <p className="text-xs text-muted-foreground">Phase: {task.roadmap_item.phase || "No phase"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            <Badge variant={getPriorityColor(task.priority)} className="ml-2 flex-shrink-0">
              {task.priority}
            </Badge>
          </div>
        </div>
        <div className="flex-1 relative h-8 border-l border-border">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "absolute h-6 top-1 rounded-md shadow-sm flex items-center justify-center cursor-pointer transition-all hover:shadow-md hover:scale-y-110",
                    barColor,
                    isInProgress && "animate-pulse"
                  )}
                  style={{
                    left: `${startPercent}%`,
                    width: `${Math.max(widthPercent, 2)}%`,
                  }}
                >
                  <div className="flex items-center gap-1 px-2">
                    {getStatusIcon(task.status)}
                    <span className="text-xs text-white font-medium truncate">
                      {format(startDate, "MMM d")} - {format(dueDate, "MMM d")}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs">
                    {format(startDate, "MMM d, yyyy")} → {format(dueDate, "MMM d, yyyy")}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="h-5">{task.status}</Badge>
                    <Badge variant={getPriorityColor(task.priority)} className="h-5">{task.priority}</Badge>
                  </div>
                  {task.roadmap_item && (
                    <p className="text-xs text-muted-foreground">
                      📍 {task.roadmap_item.title}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  };

  return (
    <Card id="gantt-chart-container">
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
              {phaseGroups.map((group) => {
                const PhaseIcon = group.config.icon;
                
                return (
                  <div key={group.phase}>
                    {groupByPhase && (
                      <Collapsible
                        open={expandedPhases[group.phase] !== false}
                        onOpenChange={() => togglePhase(group.phase)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className={cn(
                            "flex items-center gap-2 p-2 rounded-md border mb-2 cursor-pointer hover:opacity-90 transition-opacity",
                            group.config.bgColor,
                            group.config.textColor,
                            group.config.borderColor
                          )}>
                            {expandedPhases[group.phase] !== false ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <PhaseIcon className="h-4 w-4" />
                            <span className="font-medium">{group.phase}</span>
                            <Badge variant="secondary" className="ml-auto">
                              {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 pl-4">
                            {group.tasks.map((task) => renderTaskRow(task, group.config))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    {!groupByPhase && (
                      <div className="space-y-2">
                        {group.tasks.map((task) => renderTaskRow(task, group.config))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
              <div className="text-xs font-medium text-muted-foreground">Status:</div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-yellow-500 to-yellow-600" />
                <span className="text-xs">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse" />
                <span className="text-xs">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-green-600" />
                <span className="text-xs">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-gray-400 to-gray-500" />
                <span className="text-xs">Cancelled</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
