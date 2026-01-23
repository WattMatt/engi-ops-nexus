import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Briefcase,
  MapPin,
  UserCheck,
} from "lucide-react";
import { format, differenceInDays, isBefore, addDays } from "date-fns";
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
  isAssignedToUser: boolean;
  daysUntil: number | null;
  status: "overdue" | "due-soon" | "upcoming" | "completed";
}

export function UserFocusedProjectCard({ project, userId }: UserFocusedProjectCardProps) {
  // Find the user's role and member ID in this project
  const userMember = useMemo(() => {
    return project.teamMembers.find((m) => m.id === userId);
  }, [project.teamMembers, userId]);

  // Get the user's member ID for assignment matching
  const userMemberId = userMember?.memberId;

  // Get upcoming items with assignment info
  const allItems = useMemo<UserRoadmapItem[]>(() => {
    const today = new Date();
    const soonThreshold = addDays(today, 7);

    return project.upcomingItems.map((item) => {
      let status: UserRoadmapItem["status"] = "upcoming";
      let daysUntil: number | null = null;
      const isAssignedToUser = item.assignedTo === userMemberId;

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
        id: item.id,
        title: item.title,
        dueDate: item.dueDate,
        priority: item.priority,
        isCompleted: item.isCompleted,
        isAssignedToUser,
        daysUntil,
        status,
      };
    });
  }, [project.upcomingItems, userMemberId]);

  // Filter to items assigned to this user
  const assignedItems = allItems.filter((i) => i.isAssignedToUser);
  const unassignedItems = allItems.filter((i) => !i.isAssignedToUser);
  
  const assignedOverdue = assignedItems.filter((i) => i.status === "overdue");
  const assignedDueSoon = assignedItems.filter((i) => i.status === "due-soon");
  const allOverdue = allItems.filter((i) => i.status === "overdue");
  const allDueSoon = allItems.filter((i) => i.status === "due-soon");

  const getStatusBadge = (status: UserRoadmapItem["status"], isAssigned: boolean) => {
    if (isAssigned) {
      switch (status) {
        case "overdue":
          return <Badge variant="destructive" className="text-xs">Your Task - Overdue</Badge>;
        case "due-soon":
          return <Badge className="bg-amber-500 text-white text-xs">Your Task - Due Soon</Badge>;
        case "completed":
          return <Badge variant="secondary" className="text-xs">Done</Badge>;
        default:
          return <Badge className="bg-primary text-primary-foreground text-xs">Assigned to You</Badge>;
      }
    }
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
        {/* Quick Stats Row - Focusing on user's assigned items */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-2 bg-primary/10 rounded-lg border border-primary/20">
            <div className="text-lg font-bold text-primary">{assignedItems.length}</div>
            <div className="text-xs text-muted-foreground">Assigned to You</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-foreground">{project.totalItems}</div>
            <div className="text-xs text-muted-foreground">Total Items</div>
          </div>
          <div className="text-center p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="text-lg font-bold text-amber-600">{assignedDueSoon.length}</div>
            <div className="text-xs text-muted-foreground">Your Due Soon</div>
          </div>
          <div className="text-center p-2 bg-destructive/10 rounded-lg border border-destructive/20">
            <div className="text-lg font-bold text-destructive">{assignedOverdue.length}</div>
            <div className="text-xs text-muted-foreground">Your Overdue</div>
          </div>
        </div>

        {/* User's Critical Alerts */}
        {(assignedOverdue.length > 0 || project.criticalMilestones.length > 0) && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm">
              <AlertTriangle className="h-4 w-4" />
              Your Attention Required
            </div>
            <div className="space-y-1 text-sm">
              {assignedOverdue.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-destructive">
                  <span className="flex items-center gap-2 truncate">
                    <UserCheck className="h-3 w-3" />
                    {item.title}
                  </span>
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

        {/* Assigned Items Section */}
        {assignedItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-primary">
              <UserCheck className="h-4 w-4" />
              Your Assigned Tasks ({assignedItems.length})
            </h4>
            <div className="space-y-2">
              {assignedItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2 rounded-md border-l-4 bg-primary/5 border border-primary/20 ${getPriorityColor(item.priority)}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className="text-sm truncate font-medium">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.dueDate), "MMM d")}
                      </span>
                    )}
                    {getStatusBadge(item.status, true)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Project Items */}
        {unassignedItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              Other Project Tasks ({unassignedItems.length})
            </h4>
            <div className="space-y-2 opacity-70">
              {unassignedItems.slice(0, 3).map((item) => (
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
                    {getStatusBadge(item.status, false)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No assignments message */}
        {assignedItems.length === 0 && (
          <div className="p-4 text-center bg-muted/30 rounded-lg border border-dashed">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Assign tasks to track your specific deliverables
            </p>
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
