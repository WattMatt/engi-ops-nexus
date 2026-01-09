import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ChevronDown, 
  ChevronRight, 
  MapPin, 
  Users, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { 
  EnhancedProjectSummary, 
  getDueDateStatus,
  getRiskBadgeVariant 
} from "@/utils/roadmapReviewCalculations";

interface EnhancedProjectCardProps {
  project: EnhancedProjectSummary;
}

export function EnhancedProjectCard({ project }: EnhancedProjectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getHealthIcon = (score: number) => {
    if (score >= 70) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (score >= 50) return <Minus className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  };

  const getVelocityIcon = (velocity: number) => {
    if (velocity >= 3) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (velocity >= 1) return <Minus className="h-3 w-3 text-muted-foreground" />;
    return <TrendingDown className="h-3 w-3 text-destructive" />;
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "bg-red-600 text-white";
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-amber-500 text-white";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getDueDateColor = (status: string | null) => {
    switch (status) {
      case "overdue":
        return "text-destructive font-medium";
      case "soon":
        return "text-amber-600 font-medium";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {/* Main Row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-4 bg-card hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Expand Icon */}
          <div className="text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </div>

          {/* Progress Circle */}
          <div className="relative flex items-center justify-center w-12 h-12">
            <svg className="w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="4"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke={project.progress >= 70 ? "hsl(142, 76%, 36%)" : project.progress >= 40 ? "hsl(45, 93%, 47%)" : "hsl(0, 84%, 60%)"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${project.progress * 1.26} 126`}
              />
            </svg>
            <span className="absolute text-xs font-bold">{project.progress}%</span>
          </div>

          {/* Project Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {project.projectName}
              </h3>
              {getHealthIcon(project.healthScore)}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[project.city, project.province].filter(Boolean).join(", ") || "No location"}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {project.teamMembers.length}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Metrics */}
        <div className="flex items-center gap-6">
          {/* Velocity */}
          <div className="text-center hidden sm:block">
            <div className="flex items-center justify-center gap-1">
              {getVelocityIcon(project.velocityLast7Days)}
              <span className="text-sm font-medium">{project.velocityLast7Days}</span>
            </div>
            <span className="text-xs text-muted-foreground">7d velocity</span>
          </div>

          {/* Health Score */}
          <div className="text-center hidden md:block">
            <span className={`text-sm font-medium ${project.healthScore >= 70 ? "text-green-600" : project.healthScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>
              {project.healthScore}%
            </span>
            <p className="text-xs text-muted-foreground">Health</p>
          </div>

          {/* Risk Badge */}
          <Badge variant={getRiskBadgeVariant(project.riskLevel)} className="capitalize">
            {project.riskLevel}
          </Badge>

          {/* Items Counter */}
          <div className="text-right">
            <span className="text-sm font-medium">
              {project.completedItems}/{project.totalItems}
            </span>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="border-t bg-muted/10 px-4 py-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Team Members */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team Members
              </h4>
              {project.teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {project.teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No team members assigned</p>
              )}
            </div>

            {/* Upcoming Items */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next 5 Scheduled Items
              </h4>
              {project.upcomingItems.length > 0 ? (
                <div className="space-y-2">
                  {project.upcomingItems.map((item) => {
                    const status = getDueDateStatus(item.dueDate);
                    return (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between gap-2 p-2 rounded-md bg-background text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Badge className={`text-xs shrink-0 ${getPriorityColor(item.priority)}`}>
                            {item.priority || "Normal"}
                          </Badge>
                          <span className="truncate">{item.title}</span>
                        </div>
                        <span className={`text-xs shrink-0 ${getDueDateColor(status)}`}>
                          {item.dueDate 
                            ? format(new Date(item.dueDate), "MMM d") 
                            : "No date"}
                          {status === "overdue" && " (Overdue)"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No upcoming items scheduled</p>
              )}
            </div>
          </div>

          {/* Critical Milestones */}
          {project.criticalMilestones.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Critical Milestones
              </h4>
              <div className="flex flex-wrap gap-2">
                {project.criticalMilestones.map((milestone, idx) => (
                  <Badge key={idx} variant="destructive" className="text-xs">
                    {milestone.title} - {milestone.daysUntil <= 0 ? "Overdue" : `${milestone.daysUntil}d left`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
