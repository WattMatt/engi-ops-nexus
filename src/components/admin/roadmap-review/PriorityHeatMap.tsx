import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EnhancedProjectSummary } from "@/utils/roadmapReviewCalculations";

interface PriorityHeatMapProps {
  projects: EnhancedProjectSummary[];
}

const priorityOrder = ['critical', 'high', 'medium', 'normal', 'low'];

export function PriorityHeatMap({ projects }: PriorityHeatMapProps) {
  // Show ALL projects, sorted by total priority items
  const priorityMatrix = projects
    .map((project) => {
      const counts: Record<string, number> = {};
      priorityOrder.forEach((p) => (counts[p] = 0));
      
      project.priorityDistribution.forEach((pd) => {
        const normalizedPriority = pd.priority.toLowerCase();
        if (priorityOrder.includes(normalizedPriority)) {
          counts[normalizedPriority] = pd.count;
        } else {
          counts['normal'] += pd.count;
        }
      });
      
      return {
        name: project.projectName,
        shortName: project.projectName.length > 15 
          ? project.projectName.substring(0, 12) + "..." 
          : project.projectName,
        totalPriority: (counts.critical * 4) + (counts.high * 3) + (counts.medium * 2) + counts.normal + counts.low,
        ...counts,
      };
    })
    .sort((a, b) => b.totalPriority - a.totalPriority);

  const getHeatColor = (count: number, priority: string) => {
    if (count === 0) return 'bg-muted/30';
    
    const baseColors: Record<string, string[]> = {
      critical: ['bg-red-100', 'bg-red-300', 'bg-red-500', 'bg-red-700'],
      high: ['bg-orange-100', 'bg-orange-300', 'bg-orange-500', 'bg-orange-700'],
      medium: ['bg-yellow-100', 'bg-yellow-300', 'bg-yellow-500', 'bg-yellow-600'],
      normal: ['bg-blue-100', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500'],
      low: ['bg-slate-100', 'bg-slate-300', 'bg-slate-400', 'bg-slate-500'],
    };
    
    const colors = baseColors[priority] || baseColors.normal;
    if (count <= 2) return colors[0];
    if (count <= 5) return colors[1];
    if (count <= 10) return colors[2];
    return colors[3];
  };

  const priorityLabels: Record<string, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    normal: 'Normal',
    low: 'Low',
  };

  // Calculate row height and max visible rows
  const rowHeight = 44;
  const maxVisibleRows = 8;
  const headerHeight = 40;
  const containerHeight = priorityMatrix.length > maxVisibleRows 
    ? (maxVisibleRows * rowHeight) + headerHeight
    : (priorityMatrix.length * rowHeight) + headerHeight;

  return (
    <Card id="priority-heatmap-chart">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">Priority Distribution Heat Map</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {priorityMatrix.length} projects
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          {/* Sticky header */}
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground w-[140px]">Project</th>
                {priorityOrder.map((priority) => (
                  <th key={priority} className="text-center py-2 px-3 font-medium text-muted-foreground">
                    {priorityLabels[priority]}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
          
          {/* Scrollable body */}
          <ScrollArea style={{ height: `${containerHeight}px` }}>
            <table className="w-full text-sm">
              <tbody>
                {priorityMatrix.map((row, idx) => (
                  <tr key={idx} className="border-t border-border/50">
                    <td className="py-2 px-3 font-medium w-[140px]" title={row.name}>
                      {row.shortName}
                    </td>
                    {priorityOrder.map((priority) => {
                      const count = (row as Record<string, string | number>)[priority] as number || 0;
                      return (
                        <td key={priority} className="py-2 px-3 text-center">
                          <div 
                            className={`inline-flex items-center justify-center w-10 h-8 rounded text-xs font-medium ${getHeatColor(count, priority)} ${count > 5 ? 'text-white' : ''}`}
                            title={`${count} ${priority} priority items`}
                          >
                            {count > 0 ? count : '-'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">Intensity:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted/30 rounded" />
            <span className="text-xs">0</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 rounded" />
            <span className="text-xs">1-2</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 rounded" />
            <span className="text-xs">3-5</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded" />
            <span className="text-xs">6-10</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-800 rounded" />
            <span className="text-xs">10+</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
