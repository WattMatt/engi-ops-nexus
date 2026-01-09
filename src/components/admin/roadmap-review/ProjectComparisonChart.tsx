import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedProjectSummary } from "@/utils/roadmapReviewCalculations";

interface ProjectComparisonChartProps {
  projects: EnhancedProjectSummary[];
}

export function ProjectComparisonChart({ projects }: ProjectComparisonChartProps) {
  const data = projects
    .slice(0, 10)
    .map((project) => ({
      name: project.projectName.length > 25 
        ? project.projectName.substring(0, 22) + "..." 
        : project.projectName,
      fullName: project.projectName,
      completed: project.completedItems,
      pending: project.totalItems - project.completedItems - project.overdueCount,
      overdue: project.overdueCount,
      progress: project.progress,
      healthScore: project.healthScore,
    }))
    .sort((a, b) => b.progress - a.progress);

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return "hsl(142, 71%, 45%)";
    if (progress >= 60) return "hsl(48, 96%, 53%)";
    if (progress >= 40) return "hsl(25, 95%, 53%)";
    return "hsl(0, 72%, 51%)";
  };

  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return "hsl(142, 71%, 90%)";
    if (progress >= 60) return "hsl(48, 96%, 89%)";
    if (progress >= 40) return "hsl(25, 95%, 90%)";
    return "hsl(0, 72%, 91%)";
  };

  // Calculate bar height based on number of projects
  const barHeight = Math.max(28, Math.min(40, 400 / data.length));
  const chartHeight = Math.max(350, data.length * (barHeight + 12) + 40);

  return (
    <Card id="project-comparison-chart" className="overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Project Progress Comparison</CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
              <span className="text-muted-foreground">80%+</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(48, 96%, 53%)" }} />
              <span className="text-muted-foreground">60-79%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(25, 95%, 53%)" }} />
              <span className="text-muted-foreground">40-59%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(0, 72%, 51%)" }} />
              <span className="text-muted-foreground">&lt;40%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 50, left: 10, bottom: 10 }}
              barCategoryGap="20%"
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                horizontal={false} 
                vertical={true} 
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                tickFormatter={(val) => `${val}%`}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={160}
                tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg shadow-xl p-4 min-w-[200px]">
                      <p className="font-semibold text-foreground mb-3">{data.fullName}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Completed</span>
                          <span className="text-sm font-medium text-green-600">{data.completed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Pending</span>
                          <span className="text-sm font-medium text-blue-600">{data.pending}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Overdue</span>
                          <span className="text-sm font-medium text-destructive">{data.overdue}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm font-bold">{data.progress}%</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-sm text-muted-foreground">Health Score</span>
                            <span className="text-sm font-medium">{data.healthScore}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="progress" 
                name="Progress"
                radius={[0, 6, 6, 0]}
                barSize={barHeight}
                background={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getProgressColor(entry.progress)}
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
