import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Briefcase,
  MapPin,
} from "lucide-react";
import { format, differenceInDays, isAfter, isBefore, addDays } from "date-fns";
import { EnhancedProjectSummary, getRiskBadgeVariant } from "@/utils/roadmapReviewCalculations";

interface UserFocusedProjectCardProps {
  project: EnhancedProjectSummary;
  userId: string;
}

interface UserRoadmapItem {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string | null;
  isCompleted: boolean;
  daysUntil: number | null;
  status: "overdue" | "due-soon" | "upcoming" | "completed";
}

export function UserFocusedProjectCard({ project, userId }: UserFocusedProjectCardProps) {
  // Find the user's role in this project
  const userMember = useMemo(() => {
    return project.teamMembers.find((m) => m.id === userId);
  }, [project.teamMembers, userId]);

  // Get upcoming items for display (from project data)
  const userItems = useMemo<UserRoadmapItem[]>(() => {
    const today = new Date();
    const soonThreshold = addDays(today, 7);

    return project.upcomingItems.map((item) => {
      let status: UserRoadmapItem["status"] = "upcoming";
      let daysUntil: number | null = null;

      if (item.isCompleted) {
        status = "completed";
      } else if (item.dueDate) {
        const dueDate = new Date(item.dueDate);
        daysUntil = differenceInDays(dueDate, today);
        
        if (isBefore(dueDate, today)) {
          status = "overdue";
        } else if (isBefore(dueDate, soonThreshold)) {
          status = "due-soon";
        }
      }

      return {
        ...item,
        daysUntil,
        status,
      };
    });
  }, [project.upcomingItems]);

  const overdueItems = userItems.filter((i) => i.status === "overdue");
  const dueSoonItems = userItems.filter((i) => i.status === "due-soon");

  const getStatusBadge = (status: UserRoadmapItem["status"]) => {
    switch (status) {
      case "overdue":
        return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
      case "due-soon":
        return <Badge className="bg-amber-500 text-white text-xs">Due Soon</Badge>;
      case "completed":
        return <Badge variant="secondary" className="text-xs">Done</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Upcoming</Badge>;
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "border-l-red-600";
      case "high":
        return "border-l-destructive";
      case "medium":
        return "border-l-amber-500";
      case "low":
        return "border-l-muted-foreground";
      default:
        return "border-l-border";
    }
  };

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {project.projectName}
              <Badge variant={getRiskBadgeVariant(project.riskLevel)} className="capitalize text-xs">
                {project.riskLevel} Risk
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[project.city, project.province].filter(Boolean).join(", ") || "No location"}
              </span>
              {userMember && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  <span className="font-medium text-primary">{userMember.role}</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Progress Circle */}
          <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
            <svg className="w-14 h-14 -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="4"
              />
              <circle
                cx="28"
                cy="28"
                r="24"
                fill="none"
                stroke={project.progress >= 70 ? "hsl(142, 76%, 36%)" : project.progress >= 40 ? "hsl(45, 93%, 47%)" : "hsl(0, 84%, 60%)"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${project.progress * 1.51} 151`}
              />
            </svg>
            <span className="absolute text-sm font-bold">{project.progress}%</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-foreground">{project.totalItems}</div>
            <div className="text-xs text-muted-foreground">Total Items</div>
          </div>
          <div className="text-center p-2 bg-green-500/10 rounded-lg">
            <div className="text-lg font-bold text-green-600">{project.completedItems}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-2 bg-amber-500/10 rounded-lg">
            <div className="text-lg font-bold text-amber-600">{dueSoonItems.length}</div>
            <div className="text-xs text-muted-foreground">Due Soon</div>
          </div>
          <div className="text-center p-2 bg-destructive/10 rounded-lg">
            <div className="text-lg font-bold text-destructive">{overdueItems.length}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </div>

        {/* Critical Alerts */}
        {(overdueItems.length > 0 || project.criticalMilestones.length > 0) && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              Attention Required
            </div>
            <div className="space-y-1 text-sm">
              {overdueItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-destructive">
                  <span className="truncate">{item.title}</span>
                  <span className="text-xs shrink-0 ml-2">
                    {item.daysUntil !== null && `${Math.abs(item.daysUntil)}d overdue`}
                  </span>
                </div>
              ))}
              {project.criticalMilestones.slice(0, 2).map((milestone, idx) => (
                <div key={idx} className="flex items-center justify-between text-destructive">
                  <span className="truncate">⚡ {milestone.title}</span>
                  <span className="text-xs shrink-0 ml-2">
                    {milestone.daysUntil <= 0 ? "Overdue" : `${milestone.daysUntil}d left`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Items */}
        {userItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4" />
              Upcoming Deliverables
            </h4>
            <div className="space-y-2">
              {userItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-md border-l-4 bg-muted/30 ${getPriorityColor(item.priority)}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.dueDate), "MMM d")}
                      </span>
                    )}
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Velocity & Health Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              {project.velocityLast7Days} items/7d
            </span>
            <span className={`font-medium ${
              project.healthScore >= 70 ? "text-green-600" : 
              project.healthScore >= 50 ? "text-amber-600" : "text-destructive"
            }`}>
              {project.healthScore}% Health
            </span>
          </div>
          <span className="text-muted-foreground">
            {project.teamMembers.length} team members
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
