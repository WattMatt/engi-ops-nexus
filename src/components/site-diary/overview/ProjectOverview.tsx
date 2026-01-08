import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Target, TrendingUp, Calendar, Clock, CheckCircle2, 
  AlertTriangle, Users, FileText, ChevronRight, Briefcase,
  Building2, MapPin
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface ProjectOverviewProps {
  projectId: string;
  onNavigate?: (tab: string) => void;
}

export const ProjectOverview = ({ projectId, onNavigate }: ProjectOverviewProps) => {
  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project-overview", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch tasks summary
  const { data: tasks } = useQuery({
    queryKey: ["project-tasks-summary", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select("id, status, priority, due_date, group_id")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch task groups
  const { data: groups } = useQuery({
    queryKey: ["project-groups-summary", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_groups")
        .select("id, name, color")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch team members count
  const { data: membersCount } = useQuery({
    queryKey: ["project-members-count", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("project_members")
        .select("*", { count: 'exact', head: true })
        .eq("project_id", projectId);
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch diary entries count
  const { data: diaryCount } = useQuery({
    queryKey: ["diary-entries-count", projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("site_diary_entries")
        .select("*", { count: 'exact', head: true })
        .eq("project_id", projectId);
      if (error) throw error;
      return count || 0;
    },
  });

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
  const inProgressTasks = tasks?.filter(t => t.status === "in_progress").length || 0;
  const overdueTasks = tasks?.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
  ).length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const urgentTasks = tasks?.filter(t => t.priority === "urgent" && t.status !== "completed").length || 0;

  // Use created_at as project start approximation
  const startDate = project?.created_at ? new Date(project.created_at) : null;
  const today = new Date();
  
  let projectProgress = completionRate;
  let daysRemaining = 0;

  // Group phases with task counts
  const phaseData = groups?.map(group => ({
    ...group,
    taskCount: tasks?.filter(t => t.group_id === group.id).length || 0,
    completedCount: tasks?.filter(t => t.group_id === group.id && t.status === "completed").length || 0,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Project Header Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Project Info */}
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{project?.name || "Project"}</h1>
                  {project?.project_number && (
                    <p className="text-muted-foreground">#{project.project_number}</p>
                  )}
                </div>
              </div>
              
              {project?.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                {project?.client_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{project.client_name}</span>
                  </div>
                )}
                {project?.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{project.city}</span>
                  </div>
                )}
                {project?.status && (
                  <Badge variant={
                    project.status === "active" ? "default" :
                    project.status === "completed" ? "secondary" : "outline"
                  }>
                    {project.status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Timeline Progress */}
            <div className="lg:w-80 p-4 bg-background/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Project Timeline</span>
                <span className="text-xs text-muted-foreground">
                  {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Timeline not set"}
                </span>
              </div>
              <Progress value={projectProgress} className="h-2 mb-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{startDate ? format(startDate, "MMM d, yyyy") : "Start date"}</span>
                <span>Based on task completion</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.("board")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="text-green-600">{completedTasks} done</span>
              <span>•</span>
              <span>{inProgressTasks} active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
            <Progress value={completionRate} className="h-1.5 mt-1" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.("team")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{membersCount}</div>
            <p className="text-xs text-muted-foreground">members</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.("entries")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Diary Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{diaryCount}</div>
            <p className="text-xs text-muted-foreground">entries</p>
          </CardContent>
        </Card>

        <Card className={overdueTasks > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attention</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueTasks > 0 || urgentTasks > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueTasks > 0 || urgentTasks > 0 ? "text-destructive" : ""}`}>
              {overdueTasks + urgentTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueTasks} overdue, {urgentTasks} urgent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Phases/Groups Overview */}
      {phaseData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Phases</CardTitle>
            <CardDescription>Current status of each project phase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {phaseData.map(phase => {
                const percent = phase.taskCount > 0 
                  ? Math.round((phase.completedCount / phase.taskCount) * 100) 
                  : 0;
                return (
                  <div 
                    key={phase.id}
                    className="p-4 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                    style={{ borderLeftColor: phase.color, borderLeftWidth: '4px' }}
                    onClick={() => onNavigate?.("board")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{phase.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {phase.taskCount} tasks
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percent} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-10">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Button 
          variant="outline" 
          className="h-auto py-4 justify-start"
          onClick={() => onNavigate?.("board")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Task Board</p>
              <p className="text-xs text-muted-foreground">Manage and track all tasks</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>

        <Button 
          variant="outline" 
          className="h-auto py-4 justify-start"
          onClick={() => onNavigate?.("team")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium">Team Dashboard</p>
              <p className="text-xs text-muted-foreground">View workload & activity</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>

        <Button 
          variant="outline" 
          className="h-auto py-4 justify-start"
          onClick={() => onNavigate?.("timeline")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="font-medium">Timeline View</p>
              <p className="text-xs text-muted-foreground">See project schedule</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>
      </div>
    </div>
  );
};
