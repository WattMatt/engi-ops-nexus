import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  FolderKanban, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Users, 
  CheckCircle2 
} from "lucide-react";
import { PortfolioMetrics } from "@/utils/roadmapReviewCalculations";

interface ExecutiveSummaryCardsProps {
  metrics: PortfolioMetrics;
}

export function ExecutiveSummaryCards({ metrics }: ExecutiveSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Projects */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Projects
          </CardTitle>
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalProjects}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Active in portfolio
          </p>
        </CardContent>
      </Card>

      {/* Average Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Average Progress
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.averageProgress}%</div>
          <Progress value={metrics.averageProgress} className="mt-2 h-2" />
        </CardContent>
      </Card>

      {/* At Risk Projects */}
      <Card className={metrics.projectsAtRisk + metrics.projectsCritical > 0 ? "border-destructive/50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Projects At Risk
          </CardTitle>
          <AlertTriangle className={`h-4 w-4 ${metrics.projectsAtRisk + metrics.projectsCritical > 0 ? "text-destructive" : "text-muted-foreground"}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${metrics.projectsCritical > 0 ? "text-destructive" : ""}`}>
              {metrics.projectsAtRisk + metrics.projectsCritical}
            </span>
            {metrics.projectsCritical > 0 && (
              <Badge variant="destructive" className="text-xs">
                {metrics.projectsCritical} Critical
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Need immediate attention
          </p>
        </CardContent>
      </Card>

      {/* Overdue Items */}
      <Card className={metrics.totalOverdueItems > 0 ? "border-orange-500/50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overdue Items
          </CardTitle>
          <Clock className={`h-4 w-4 ${metrics.totalOverdueItems > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${metrics.totalOverdueItems > 0 ? "text-orange-500" : ""}`}>
              {metrics.totalOverdueItems}
            </span>
            {metrics.totalDueSoonItems > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{metrics.totalDueSoonItems} due soon
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across all projects
          </p>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Team Members
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalTeamMembers}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Across all projects
          </p>
        </CardContent>
      </Card>

      {/* Portfolio Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Portfolio Health
          </CardTitle>
          <CheckCircle2 className={`h-4 w-4 ${metrics.totalHealthScore >= 70 ? "text-green-500" : metrics.totalHealthScore >= 50 ? "text-yellow-500" : "text-destructive"}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalHealthScore}%</div>
          <Progress 
            value={metrics.totalHealthScore} 
            className="mt-2 h-2"
          />
        </CardContent>
      </Card>
    </div>
  );
}
