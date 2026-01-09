import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { format } from "date-fns";
import { EnhancedProjectSummary } from "@/utils/roadmapReviewCalculations";

interface PrintableProjectRoadmapChartProps {
  project: EnhancedProjectSummary;
  projectIndex: number;
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

/**
 * A compact, printable roadmap snapshot for PDF export.
 * Renders at a fixed size suitable for embedding in project pages.
 */
export function PrintableProjectRoadmapChart({ 
  project, 
  projectIndex 
}: PrintableProjectRoadmapChartProps) {
  const stats = useMemo(() => {
    const completed = project.completedItems;
    const total = project.totalItems;
    const pending = total - completed;
    const overdue = project.overdueCount;
    
    // Completion pie data
    const completionData = [
      { name: "Completed", value: completed, color: COLORS.completed },
      { name: "Pending", value: Math.max(0, pending - overdue), color: COLORS.pending },
      { name: "Overdue", value: overdue, color: COLORS.overdue },
    ].filter((d) => d.value > 0);

    // Priority distribution from project
    const priorityData = project.priorityDistribution.map(p => ({
      name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
      value: p.count,
      color: COLORS[p.priority as keyof typeof COLORS] || COLORS.medium,
    })).filter(d => d.value > 0);

    return {
      completed,
      pending,
      overdue,
      total,
      percentage: project.progress,
      completionData,
      priorityData,
    };
  }, [project]);

  // Upcoming tasks for the timeline view
  const upcomingItems = project.upcomingItems.slice(0, 5);

  return (
    <div
      id={`project-roadmap-chart-${projectIndex}`}
      className="bg-white p-4 rounded-lg border border-gray-200"
      style={{ width: '420px', minHeight: '260px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 truncate" style={{ maxWidth: '280px' }}>
          {project.projectName}
        </h3>
        <div className="flex items-center gap-2">
          <span 
            className="text-xs font-bold px-2 py-1 rounded"
            style={{ 
              backgroundColor: project.healthScore >= 70 ? '#dcfce7' : project.healthScore >= 40 ? '#fef3c7' : '#fee2e2',
              color: project.healthScore >= 70 ? '#166534' : project.healthScore >= 40 ? '#92400e' : '#991b1b',
            }}
          >
            {project.healthScore}%
          </span>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left: Completion Pie Chart */}
        <div className="flex-shrink-0" style={{ width: '140px', height: '140px' }}>
          {stats.completionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={50}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {stats.completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value} items`, name]}
                  contentStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
              No data
            </div>
          )}
          <div className="text-center -mt-2">
            <span className="text-lg font-bold text-gray-800">{stats.percentage}%</span>
            <span className="text-xs text-gray-500 block">Complete</span>
          </div>
        </div>

        {/* Right: Upcoming Tasks Timeline */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-medium text-gray-600 mb-2">Upcoming Tasks</h4>
          {upcomingItems.length > 0 ? (
            <div className="space-y-1.5">
              {upcomingItems.map((item, idx) => {
                const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
                const isDueSoon = item.dueDate && 
                  new Date(item.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
                  new Date(item.dueDate) >= new Date();
                
                return (
                  <div 
                    key={item.id || idx}
                    className="flex items-center gap-2 text-xs"
                  >
                    {/* Priority indicator */}
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ 
                        backgroundColor: item.priority === 'critical' ? COLORS.critical :
                          item.priority === 'high' ? COLORS.high :
                          item.priority === 'medium' ? COLORS.medium : COLORS.low
                      }}
                    />
                    {/* Task title */}
                    <span 
                      className="truncate flex-1 text-gray-700"
                      style={{ maxWidth: '140px' }}
                    >
                      {item.title}
                    </span>
                    {/* Due date */}
                    <span 
                      className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: isOverdue ? '#fee2e2' : isDueSoon ? '#fef3c7' : '#f1f5f9',
                        color: isOverdue ? '#991b1b' : isDueSoon ? '#92400e' : '#64748b',
                      }}
                    >
                      {item.dueDate ? format(new Date(item.dueDate), 'MMM d') : 'No date'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-xs italic">No upcoming tasks</div>
          )}
          
          {/* Summary stats */}
          <div className="mt-3 pt-2 border-t border-gray-100 flex gap-3 text-[10px]">
            <span className="text-green-600">
              ✓ {stats.completed} done
            </span>
            <span className="text-gray-500">
              ○ {stats.pending} pending
            </span>
            {stats.overdue > 0 && (
              <span className="text-red-600">
                ! {stats.overdue} overdue
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
