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
    .slice(0, 10) // Show top 10 projects
    .map((project) => ({
      name: project.projectName.length > 20 
        ? project.projectName.substring(0, 17) + "..." 
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
    if (progress >= 80) return "hsl(142, 76%, 36%)";
    if (progress >= 60) return "hsl(45, 93%, 47%)";
    if (progress >= 40) return "hsl(24, 95%, 53%)";
    return "hsl(0, 84%, 60%)";
  };

  return (
    <Card id="project-comparison-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Project Progress Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <p className="font-semibold">{data.fullName}</p>
                      <div className="text-sm space-y-1 mt-2">
                        <p className="text-green-600">Completed: {data.completed}</p>
                        <p className="text-blue-600">Pending: {data.pending}</p>
                        <p className="text-destructive">Overdue: {data.overdue}</p>
                        <p className="font-medium mt-1">Progress: {data.progress}%</p>
                        <p className="text-muted-foreground">Health: {data.healthScore}%</p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="progress" 
                name="Progress"
                radius={[0, 4, 4, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getProgressColor(entry.progress)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
