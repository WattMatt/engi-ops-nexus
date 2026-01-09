import { isBefore, addDays, subDays, differenceInDays } from "date-fns";

export interface ProjectRoadmapSummary {
  projectId: string;
  projectName: string;
  city: string | null;
  province: string | null;
  status: string;
  totalItems: number;
  completedItems: number;
  progress: number;
  teamMembers: { id: string; name: string; email: string; role: string }[];
  upcomingItems: {
    id: string;
    title: string;
    dueDate: string | null;
    priority: string | null;
    isCompleted: boolean;
  }[];
}

export interface EnhancedProjectSummary extends ProjectRoadmapSummary {
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  overdueCount: number;
  dueSoonCount: number;
  priorityDistribution: { priority: string; count: number }[];
  phaseBreakdown: { phase: string; completed: number; total: number }[];
  criticalMilestones: { title: string; dueDate: string; daysUntil: number }[];
  recentCompletions: { title: string; completedAt: string }[];
  velocityLast7Days: number;
  velocityLast30Days: number;
}

export interface PortfolioMetrics {
  totalProjects: number;
  averageProgress: number;
  totalHealthScore: number;
  projectsAtRisk: number;
  projectsCritical: number;
  totalOverdueItems: number;
  totalDueSoonItems: number;
  totalTeamMembers: number;
  priorityBreakdown: { priority: string; count: number }[];
}

export function getDueDateStatus(dueDate: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isBefore(date, today)) {
    return "overdue";
  } else if (isBefore(date, addDays(today, 7))) {
    return "soon";
  }
  return "ok";
}

export function calculateHealthScore(summary: ProjectRoadmapSummary): number {
  // Health score formula:
  // 40% - Progress completion
  // 30% - On-time items (no overdue)
  // 20% - Team capacity (has team members)
  // 10% - Active management (has scheduled items)

  const progressScore = summary.progress * 0.4;

  // Calculate overdue penalty
  const overdueItems = summary.upcomingItems.filter(
    (item) => getDueDateStatus(item.dueDate) === "overdue"
  ).length;
  const totalPending = summary.totalItems - summary.completedItems;
  const onTimeScore = totalPending > 0 
    ? Math.max(0, (1 - (overdueItems / totalPending)) * 30)
    : 30;

  // Team capacity score
  const teamScore = summary.teamMembers.length > 0 
    ? Math.min(20, summary.teamMembers.length * 5)
    : 0;

  // Active management score
  const scheduledItems = summary.upcomingItems.filter((item) => item.dueDate).length;
  const activeScore = scheduledItems > 0 ? 10 : 0;

  return Math.round(progressScore + onTimeScore + teamScore + activeScore);
}

export function calculateRiskLevel(healthScore: number, overdueCount: number): 'low' | 'medium' | 'high' | 'critical' {
  if (healthScore >= 80 && overdueCount === 0) return 'low';
  if (healthScore >= 60 && overdueCount <= 2) return 'medium';
  if (healthScore >= 40 || overdueCount <= 5) return 'high';
  return 'critical';
}

export function enhanceProjectSummary(
  summary: ProjectRoadmapSummary,
  allItems: any[] = []
): EnhancedProjectSummary {
  const overdueCount = summary.upcomingItems.filter(
    (item) => getDueDateStatus(item.dueDate) === "overdue"
  ).length;

  const dueSoonCount = summary.upcomingItems.filter(
    (item) => getDueDateStatus(item.dueDate) === "soon"
  ).length;

  const healthScore = calculateHealthScore(summary);
  const riskLevel = calculateRiskLevel(healthScore, overdueCount);

  // Priority distribution
  const priorityMap = new Map<string, number>();
  summary.upcomingItems.forEach((item) => {
    const priority = item.priority || 'normal';
    priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
  });
  const priorityDistribution = Array.from(priorityMap.entries()).map(([priority, count]) => ({
    priority,
    count,
  }));

  // Critical milestones (high priority due soon)
  const today = new Date();
  const criticalMilestones = summary.upcomingItems
    .filter((item) => item.priority === 'high' && item.dueDate)
    .map((item) => ({
      title: item.title,
      dueDate: item.dueDate!,
      daysUntil: differenceInDays(new Date(item.dueDate!), today),
    }))
    .slice(0, 3);

  // Get project items for velocity calculation
  const projectItems = allItems.filter((item) => item.project_id === summary.projectId);
  
  // Calculate velocity (items completed in last 7/30 days)
  const sevenDaysAgo = subDays(today, 7);
  const thirtyDaysAgo = subDays(today, 30);
  
  const velocityLast7Days = projectItems.filter((item) => {
    if (!item.is_completed || !item.updated_at) return false;
    const completedDate = new Date(item.updated_at);
    return completedDate >= sevenDaysAgo;
  }).length;

  const velocityLast30Days = projectItems.filter((item) => {
    if (!item.is_completed || !item.updated_at) return false;
    const completedDate = new Date(item.updated_at);
    return completedDate >= thirtyDaysAgo;
  }).length;

  // Recent completions
  const recentCompletions = projectItems
    .filter((item) => item.is_completed)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)
    .map((item) => ({
      title: item.title,
      completedAt: item.updated_at,
    }));

  return {
    ...summary,
    healthScore,
    riskLevel,
    overdueCount,
    dueSoonCount,
    priorityDistribution,
    phaseBreakdown: [], // Would need phase data from roadmap items
    criticalMilestones,
    recentCompletions,
    velocityLast7Days,
    velocityLast30Days,
  };
}

export function calculatePortfolioMetrics(summaries: EnhancedProjectSummary[]): PortfolioMetrics {
  const totalProjects = summaries.length;
  
  const averageProgress = totalProjects > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.progress, 0) / totalProjects)
    : 0;

  const totalHealthScore = totalProjects > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.healthScore, 0) / totalProjects)
    : 0;

  const projectsAtRisk = summaries.filter((s) => s.riskLevel === 'high').length;
  const projectsCritical = summaries.filter((s) => s.riskLevel === 'critical').length;

  const totalOverdueItems = summaries.reduce((acc, s) => acc + s.overdueCount, 0);
  const totalDueSoonItems = summaries.reduce((acc, s) => acc + s.dueSoonCount, 0);

  // Unique team members across all projects
  const allMembers = new Set<string>();
  summaries.forEach((s) => s.teamMembers.forEach((m) => allMembers.add(m.id)));
  const totalTeamMembers = allMembers.size;

  // Aggregate priority breakdown
  const priorityMap = new Map<string, number>();
  summaries.forEach((s) => {
    s.priorityDistribution.forEach((pd) => {
      priorityMap.set(pd.priority, (priorityMap.get(pd.priority) || 0) + pd.count);
    });
  });
  const priorityBreakdown = Array.from(priorityMap.entries())
    .map(([priority, count]) => ({ priority, count }))
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, normal: 3, low: 4 };
      return (order[a.priority as keyof typeof order] ?? 5) - (order[b.priority as keyof typeof order] ?? 5);
    });

  return {
    totalProjects,
    averageProgress,
    totalHealthScore,
    projectsAtRisk,
    projectsCritical,
    totalOverdueItems,
    totalDueSoonItems,
    totalTeamMembers,
    priorityBreakdown,
  };
}

export function getHealthScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-500';
  return 'text-destructive';
}

export function getHealthScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-destructive';
}

export function getRiskBadgeVariant(riskLevel: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (riskLevel) {
    case 'low': return 'default';
    case 'medium': return 'secondary';
    case 'high': return 'destructive';
    case 'critical': return 'destructive';
    default: return 'outline';
  }
}
