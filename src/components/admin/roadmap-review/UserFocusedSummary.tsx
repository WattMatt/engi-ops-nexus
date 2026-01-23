import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User,
  FolderKanban,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  Briefcase,
} from "lucide-react";
import { EnhancedProjectSummary } from "@/utils/roadmapReviewCalculations";

interface UserFocusedSummaryProps {
  projects: EnhancedProjectSummary[];
  userId: string;
  userName: string;
}

export function UserFocusedSummary({ projects, userId, userName }: UserFocusedSummaryProps) {
  const stats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;
    let criticalMilestones = 0;
    let totalVelocity = 0;
    const roles = new Set<string>();

    const today = new Date();
    const soonThreshold = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    projects.forEach((project) => {
      totalItems += project.totalItems;
      completedItems += project.completedItems;
      totalVelocity += project.velocityLast7Days;
      criticalMilestones += project.criticalMilestones.length;

      // Get user's role in this project
      const userMember = project.teamMembers.find((m) => m.id === userId);
      if (userMember?.role) {
        roles.add(userMember.role);
      }

      // Count overdue and due soon
      project.upcomingItems.forEach((item) => {
        if (item.dueDate && !item.isCompleted) {
          const dueDate = new Date(item.dueDate);
          if (dueDate < today) {
            overdueCount++;
          } else if (dueDate < soonThreshold) {
            dueSoonCount++;
          }
        }
      });
    });

    const avgProgress = projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
      : 0;

    return {
      projectCount: projects.length,
      totalItems,
      completedItems,
      avgProgress,
      overdueCount,
      dueSoonCount,
      criticalMilestones,
      totalVelocity,
      roles: Array.from(roles),
    };
  }, [projects, userId]);

  const attentionLevel = useMemo(() => {
    if (stats.overdueCount > 0 || stats.criticalMilestones > 0) return "critical";
    if (stats.dueSoonCount > 3) return "warning";
    return "good";
  }, [stats]);

  return (
    <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-xl">{userName}'s Project Overview</span>
              <div className="flex items-center gap-2 mt-1">
                {stats.roles.map((role) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardTitle>
          
          {attentionLevel === "critical" && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Needs Attention
            </Badge>
          )}
          {attentionLevel === "warning" && (
            <Badge className="bg-amber-500 text-white">
              <Clock className="h-3 w-3 mr-1" />
              Items Due Soon
            </Badge>
          )}
          {attentionLevel === "good" && (
            <Badge className="bg-green-500 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              On Track
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Projects */}
          <div className="text-center p-3 bg-background rounded-lg border">
            <FolderKanban className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">{stats.projectCount}</div>
            <div className="text-xs text-muted-foreground">Active Projects</div>
          </div>
          
          {/* Total Items */}
          <div className="text-center p-3 bg-background rounded-lg border">
            <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <div className="text-xs text-muted-foreground">Total Items</div>
          </div>
          
          {/* Completed */}
          <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold text-green-600">{stats.completedItems}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          
          {/* Avg Progress */}
          <div className="text-center p-3 bg-background rounded-lg border">
            <div className="text-2xl font-bold">{stats.avgProgress}%</div>
            <Progress value={stats.avgProgress} className="h-1.5 mt-1" />
            <div className="text-xs text-muted-foreground mt-1">Avg Progress</div>
          </div>
          
          {/* Due Soon */}
          <div className="text-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <Clock className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <div className="text-2xl font-bold text-amber-600">{stats.dueSoonCount}</div>
            <div className="text-xs text-muted-foreground">Due in 7 Days</div>
          </div>
          
          {/* Overdue */}
          <div className="text-center p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-destructive" />
            <div className="text-2xl font-bold text-destructive">{stats.overdueCount}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
          
          {/* Velocity */}
          <div className="text-center p-3 bg-background rounded-lg border">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-2xl font-bold">{stats.totalVelocity}</div>
            <div className="text-xs text-muted-foreground">7d Velocity</div>
          </div>
        </div>

        {/* Critical Milestones Alert */}
        {stats.criticalMilestones > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <span className="font-medium text-destructive">
                {stats.criticalMilestones} Critical Milestone{stats.criticalMilestones > 1 ? "s" : ""} 
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                require immediate attention across your projects
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
