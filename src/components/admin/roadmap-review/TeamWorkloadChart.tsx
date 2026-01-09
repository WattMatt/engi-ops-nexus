import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedProjectSummary } from "@/utils/roadmapReviewCalculations";

interface TeamWorkloadChartProps {
  projects: EnhancedProjectSummary[];
}

export function TeamWorkloadChart({ projects }: TeamWorkloadChartProps) {
  // Aggregate team workload across all projects
  const workloadMap = new Map<string, { name: string; projects: number; email: string }>();
  
  projects.forEach((project) => {
    project.teamMembers.forEach((member) => {
      const existing = workloadMap.get(member.id);
      if (existing) {
        existing.projects += 1;
      } else {
        workloadMap.set(member.id, {
          name: member.name,
          projects: 1,
          email: member.email,
        });
      }
    });
  });

  const data = Array.from(workloadMap.values())
    .sort((a, b) => b.projects - a.projects)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      shortName: item.name.length > 12 ? item.name.substring(0, 10) + "..." : item.name,
    }));

  const getBarColor = (count: number) => {
    if (count >= 5) return "hsl(0, 84%, 60%)"; // Overloaded
    if (count >= 3) return "hsl(45, 93%, 47%)"; // High
    return "hsl(142, 76%, 36%)"; // Normal
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Team Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No team members assigned to projects
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Team Workload Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="shortName" 
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                allowDecimals={false}
                label={{ value: 'Projects', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3">
                      <p className="font-semibold">{data.name}</p>
                      <p className="text-sm text-muted-foreground">{data.email}</p>
                      <p className="text-sm mt-1">
                        Assigned to <span className="font-medium">{data.projects}</span> project(s)
                      </p>
                    </div>
                  );
                }}
              />
              <Bar 
                dataKey="projects" 
                name="Projects"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.projects)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-xs text-muted-foreground">1-2 projects</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span className="text-xs text-muted-foreground">3-4 projects</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-destructive" />
            <span className="text-xs text-muted-foreground">5+ projects (overloaded)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
