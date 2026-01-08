import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, CheckCircle2, Clock, AlertCircle, TrendingUp, 
  Calendar, Target, Activity, User
} from "lucide-react";
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface TeamDashboardProps {
  projectId: string;
}

interface TaskWithAssignee {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export const TeamDashboard = ({ projectId }: TeamDashboardProps) => {
  // Fetch all tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_tasks")
        .select("id, title, status, priority, assigned_to, due_date, created_at, updated_at")
        .eq("project_id", projectId);
      if (error) throw error;
      return data as TaskWithAssignee[];
    },
  });

  // Fetch project members with profiles
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["dashboard-members", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("user_id, role, profiles(full_name, avatar_url)")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });

  if (tasksLoading || membersLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  // Calculate statistics
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
  const inProgressTasks = tasks?.filter(t => t.status === "in_progress").length || 0;
  const pendingTasks = tasks?.filter(t => t.status === "pending").length || 0;
  const overdueTasks = tasks?.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
  ).length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Tasks by priority
  const priorityData = [
    { name: "Urgent", value: tasks?.filter(t => t.priority === "urgent").length || 0, color: "#ef4444" },
    { name: "High", value: tasks?.filter(t => t.priority === "high").length || 0, color: "#f97316" },
    { name: "Medium", value: tasks?.filter(t => t.priority === "medium").length || 0, color: "#eab308" },
    { name: "Low", value: tasks?.filter(t => t.priority === "low").length || 0, color: "#22c55e" },
  ].filter(d => d.value > 0);

  // Workload distribution by team member
  const workloadData = members?.map(member => {
    const memberTasks = tasks?.filter(t => t.assigned_to === member.user_id) || [];
    const completed = memberTasks.filter(t => t.status === "completed").length;
    const inProgress = memberTasks.filter(t => t.status === "in_progress").length;
    const pending = memberTasks.filter(t => t.status === "pending").length;
    
    return {
      name: member.profiles?.full_name?.split(' ')[0] || 'Unknown',
      fullName: member.profiles?.full_name || 'Unknown',
      total: memberTasks.length,
      completed,
      inProgress,
      pending,
    };
  }).filter(m => m.total > 0) || [];

  // Recent activity (tasks updated in last 7 days)
  const recentTasks = tasks?.filter(t => {
    const updatedAt = new Date(t.updated_at);
    return isWithinInterval(updatedAt, {
      start: subDays(new Date(), 7),
      end: new Date()
    });
  }).slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} completed, {inProgressTasks} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
            <Progress value={completionRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active on this project
            </p>
          </CardContent>
        </Card>

        <Card className={overdueTasks > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className={`h-4 w-4 ${overdueTasks > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueTasks > 0 ? "text-destructive" : ""}`}>
              {overdueTasks}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueTasks > 0 ? "Require attention" : "All on track"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks by Priority</CardTitle>
            <CardDescription>Distribution of task priorities</CardDescription>
          </CardHeader>
          <CardContent>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No tasks yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Workload</CardTitle>
            <CardDescription>Tasks assigned per team member</CardDescription>
          </CardHeader>
          <CardContent>
            {workloadData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workloadData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={60} />
                  <Tooltip />
                  <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed" />
                  <Bar dataKey="inProgress" stackId="a" fill="#eab308" name="In Progress" />
                  <Bar dataKey="pending" stackId="a" fill="#94a3b8" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No assigned tasks yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Members & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </CardTitle>
            <CardDescription>Who's working on this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members?.map(member => {
                const memberTasks = tasks?.filter(t => t.assigned_to === member.user_id) || [];
                const initials = member.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
                
                return (
                  <div key={member.user_id} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{member.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{memberTasks.length} tasks</p>
                      <p className="text-xs text-muted-foreground">
                        {memberTasks.filter(t => t.status === "completed").length} done
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!members || members.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No team members assigned
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>Tasks updated in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    task.status === "completed" ? "bg-green-500" :
                    task.status === "in_progress" ? "bg-amber-500" : "bg-slate-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated {format(new Date(task.updated_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <Badge variant={
                    task.status === "completed" ? "default" :
                    task.status === "in_progress" ? "secondary" : "outline"
                  } className="text-[10px]">
                    {task.status.replace("_", " ")}
                  </Badge>
                </div>
              ))}
              {recentTasks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
