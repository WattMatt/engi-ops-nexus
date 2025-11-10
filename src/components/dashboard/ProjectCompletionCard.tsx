import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { useProjectCompletion } from "@/hooks/useProjectCompletion";
import { cn } from "@/lib/utils";

interface ProjectCompletionCardProps {
  projectId: string;
}

export const ProjectCompletionCard = ({ projectId }: ProjectCompletionCardProps) => {
  const { overall, breakdown, isLoading } = useProjectCompletion(projectId);

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 dark:text-green-400";
    if (percentage >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-600";
    if (percentage >= 50) return "bg-amber-600";
    return "bg-red-600";
  };

  const categories = [
    { label: "Tenant Schedules", value: breakdown.tenantSchedule, weight: "30%" },
    { label: "Handover Documents", value: breakdown.handoverDocs, weight: "25%" },
    { label: "Beneficial Occupation", value: breakdown.beneficialOccupation, weight: "20%" },
    { label: "Handover Links", value: breakdown.handoverLinks, weight: "10%" },
    { label: "Bulk Services", value: breakdown.bulkServices, weight: "10%" },
    { label: "Project Documentation", value: breakdown.documentation, weight: "5%" },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Completion</CardTitle>
          <CardDescription>Loading completion data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" />
              Overall Project Completion
            </CardTitle>
            <CardDescription className="mt-1">
              Weighted average across all project areas
            </CardDescription>
          </div>
          <Badge 
            variant={overall >= 80 ? "default" : overall >= 50 ? "secondary" : "destructive"}
            className="text-lg px-4 py-2"
          >
            {overall.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Main Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className={cn("font-semibold text-lg", getCompletionColor(overall))}>
                {overall.toFixed(1)}%
              </span>
            </div>
            <div className="relative">
              <Progress value={overall} className="h-4" />
              <div 
                className={cn("absolute top-0 left-0 h-4 rounded-full transition-all", getProgressColor(overall))}
                style={{ width: `${overall}%` }}
              />
            </div>
          </div>

          {/* Breakdown by Category */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
              <span>View Breakdown by Category</span>
              <ChevronDown className="h-4 w-4 transition-transform ui-expanded:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-3">
              {categories.map((category) => (
                <div key={category.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{category.label}</span>
                      <Badge variant="outline" className="text-xs">
                        Weight: {category.weight}
                      </Badge>
                    </div>
                    <span className={cn("font-medium", getCompletionColor(category.value))}>
                      {category.value.toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={category.value} className="h-2" />
                    <div 
                      className={cn("absolute top-0 left-0 h-2 rounded-full transition-all", getProgressColor(category.value))}
                      style={{ width: `${category.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Status Message */}
          <div className="pt-4 border-t">
            {overall >= 80 ? (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Excellent progress! Project is on track for completion.
              </p>
            ) : overall >= 50 ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Good progress. Focus on completing pending items to reach 80%+.
              </p>
            ) : (
              <p className="text-sm text-red-600 dark:text-red-400">
                Attention needed. Multiple areas require completion to get back on track.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
