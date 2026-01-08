import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { TrendingUp, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface RoadmapItemData {
  id: string;
  title: string;
  phase: string | null;
  parent_id?: string | null;
  is_completed: boolean;
  priority?: string | null;
  due_date?: string | null;
}

interface RoadmapProgressChartProps {
  items: RoadmapItemData[];
}

const COLORS = {
  completed: "#22c55e",
  pending: "#94a3b8",
  overdue: "#ef4444",
  low: "#3b82f6",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#dc2626",
};

export function RoadmapProgressChart({ items }: RoadmapProgressChartProps) {
  const stats = useMemo(() => {
    const completed = items.filter((i) => i.is_completed).length;
    const total = items.length;
    const pending = total - completed;
    const overdue = items.filter(
      (i) => !i.is_completed && i.due_date && new Date(i.due_date) < new Date()
    ).length;

    // Group by phase
    const phases = [...new Set(items.filter((i) => !i.parent_id).map((i) => i.phase || "General"))];
    const phaseData = phases.map((phase) => {
      const phaseItems = items.filter((i) => (i.phase || "General") === phase);
      return {
        name: phase,
        completed: phaseItems.filter((i) => i.is_completed).length,
        pending: phaseItems.filter((i) => !i.is_completed).length,
        total: phaseItems.length,
      };
    });

    // Priority distribution
    const priorityData = [
      { name: "Critical", value: items.filter((i) => i.priority === "critical").length, color: COLORS.critical },
      { name: "High", value: items.filter((i) => i.priority === "high").length, color: COLORS.high },
      { name: "Medium", value: items.filter((i) => i.priority === "medium").length, color: COLORS.medium },
      { name: "Low", value: items.filter((i) => i.priority === "low").length, color: COLORS.low },
    ].filter((d) => d.value > 0);

    // Completion pie data
    const completionData = [
      { name: "Completed", value: completed, color: COLORS.completed },
      { name: "Pending", value: pending - overdue, color: COLORS.pending },
      { name: "Overdue", value: overdue, color: COLORS.overdue },
    ].filter((d) => d.value > 0);

    return {
      completed,
      pending,
      overdue,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      phaseData,
      priorityData,
      completionData,
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Summary Cards */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-3xl font-bold">{stats.percentage}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.completed} of {stats.total} items completed
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-3xl font-bold text-slate-600">{stats.pending}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Clock className="h-6 w-6 text-slate-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-3xl font-bold text-destructive">{stats.overdue}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completion Pie Chart */}
      {stats.completionData.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.completionData.map((entry, index) => (
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

      {/* Phase Progress Bar Chart */}
      {stats.phaseData.length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Progress by Phase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.phaseData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill={COLORS.completed} stackId="a" />
                  <Bar dataKey="pending" name="Pending" fill={COLORS.pending} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
