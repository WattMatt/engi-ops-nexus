import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";

interface ProjectAnalyticsProps {
  projectId: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function ProjectAnalytics({ projectId }: ProjectAnalyticsProps) {
  // Fetch tasks for analytics
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["analytics-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select("id, status, priority, due_date, created_at, group_id")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch task groups
  const { data: groups } = useQuery({
    queryKey: ["analytics-groups", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_groups")
        .select("id, name, color")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch roadmap items
  const { data: roadmapItems } = useQuery({
    queryKey: ["analytics-roadmap", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_roadmap")
        .select("id, status, priority, completion_percentage, category")
        .eq("project_id", projectId);
      if (error) throw error;
      return data as { id: string; status: string; priority: string; completion_percentage: number | null; category: string | null }[];
    },
  });

  if (tasksLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  // Calculate task status distribution (using correct status values)
  const taskStatusData = tasks ? [
    { name: "Pending", value: tasks.filter(t => t.status === "pending").length, color: "#6b7280" },
    { name: "In Progress", value: tasks.filter(t => t.status === "in_progress").length, color: "#3b82f6" },
    { name: "Completed", value: tasks.filter(t => t.status === "completed").length, color: "#10b981" },
    { name: "Cancelled", value: tasks.filter(t => t.status === "cancelled").length, color: "#ef4444" },
  ].filter(d => d.value > 0) : [];

  // Calculate priority distribution
  const priorityData = tasks ? [
    { name: "Low", value: tasks.filter(t => t.priority === "low").length },
    { name: "Medium", value: tasks.filter(t => t.priority === "medium").length },
    { name: "High", value: tasks.filter(t => t.priority === "high").length },
    { name: "Urgent", value: tasks.filter(t => t.priority === "urgent").length },
  ].filter(d => d.value > 0) : [];

  // Calculate tasks by group
  const groupData = groups?.map(group => {
    const groupTasks = tasks?.filter(t => t.group_id === group.id) || [];
    return {
      name: group.name,
      total: groupTasks.length,
      completed: groupTasks.filter(t => t.status === "completed").length,
      color: group.color,
    };
  }).filter(g => g.total > 0) || [];

  // Roadmap status distribution
  const roadmapStatusData = roadmapItems ? [
    { name: "Completed", value: roadmapItems.filter(i => i.status === "completed").length, color: "#10b981" },
    { name: "In Progress", value: roadmapItems.filter(i => i.status === "in-progress").length, color: "#3b82f6" },
    { name: "Planned", value: roadmapItems.filter(i => i.status === "planned" || i.status === "not-started").length, color: "#6b7280" },
  ].filter(d => d.value > 0) : [];

  const hasNoData = !tasks?.length && !roadmapItems?.length;

  if (hasNoData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">
            Add tasks and roadmap items to see analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Project Analytics</h2>
        <p className="text-muted-foreground">
          Visual insights into project progress and task distribution
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Status Distribution */}
        {taskStatusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Task Status
              </CardTitle>
              <CardDescription>Distribution of tasks by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Priority Distribution */}
        {priorityData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Priority Distribution
              </CardTitle>
              <CardDescription>Tasks by priority level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks by Group */}
        {groupData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress by Phase
              </CardTitle>
              <CardDescription>Task completion by project phase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="total" name="Total" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Roadmap Status */}
        {roadmapStatusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Roadmap Progress
              </CardTitle>
              <CardDescription>Roadmap items by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roadmapStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {roadmapStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
