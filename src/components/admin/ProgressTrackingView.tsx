import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  XCircle, 
  ListTodo,
  Sparkles,
  Target,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ReviewData {
  overallScore: number;
  summary: string;
  categories?: Record<string, {
    score: number;
    issues: Array<{
      severity: string;
      title: string;
      description: string;
      recommendation: string;
    }>;
    strengths: string[];
  }>;
  quickWins?: Array<{
    title: string;
    effort: string;
    impact: string;
    description: string;
  }>;
  priorityActions?: Array<{
    priority: number;
    title: string;
    description: string;
    estimatedEffort: string;
  }>;
}

interface Review {
  id: string;
  review_date: string;
  overall_score: number;
  review_data: Json;
}

interface ProgressRecord {
  id: string;
  review_id: string;
  recommendation_type: string;
  recommendation_key: string;
  recommendation_title: string;
  status: string;
  notes: string | null;
  updated_at: string;
}

type RecommendationStatus = "pending" | "in_progress" | "implemented" | "ignored";

const statusConfig: Record<RecommendationStatus, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground", label: "Pending" },
  in_progress: { icon: Clock, color: "text-yellow-500", label: "In Progress" },
  implemented: { icon: CheckCircle2, color: "text-green-500", label: "Implemented" },
  ignored: { icon: XCircle, color: "text-red-500", label: "Ignored" },
};

export function ProgressTrackingView() {
  const queryClient = useQueryClient();
  const [selectedReviewId, setSelectedReviewId] = useState<string>("");
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const { data: reviews } = useQuery({
    queryKey: ["reviews-for-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_reviews")
        .select("id, review_date, overall_score, review_data")
        .order("review_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Review[];
    },
  });

  const { data: progressRecords } = useQuery({
    queryKey: ["recommendation-progress", selectedReviewId],
    queryFn: async () => {
      if (!selectedReviewId) return [];
      const { data, error } = await supabase
        .from("review_recommendation_progress")
        .select("*")
        .eq("review_id", selectedReviewId);
      if (error) throw error;
      return data as ProgressRecord[];
    },
    enabled: !!selectedReviewId,
  });

  const updateProgress = useMutation({
    mutationFn: async ({
      reviewId,
      type,
      key,
      title,
      status,
      notes,
    }: {
      reviewId: string;
      type: string;
      key: string;
      title: string;
      status: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("review_recommendation_progress")
        .upsert({
          review_id: reviewId,
          recommendation_type: type,
          recommendation_key: key,
          recommendation_title: title,
          status,
          notes: notes || null,
          updated_by: user?.id,
        }, {
          onConflict: "review_id,recommendation_type,recommendation_key",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendation-progress", selectedReviewId] });
      toast.success("Progress updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update progress: " + error.message);
    },
  });

  // Auto-select latest review
  if (!selectedReviewId && reviews && reviews.length > 0) {
    setSelectedReviewId(reviews[0].id);
  }

  const selectedReview = reviews?.find((r) => r.id === selectedReviewId);
  const reviewData = selectedReview?.review_data as unknown as ReviewData;

  const getProgressForItem = (type: string, key: string): RecommendationStatus => {
    const record = progressRecords?.find(
      (p) => p.recommendation_type === type && p.recommendation_key === key
    );
    return (record?.status as RecommendationStatus) || "pending";
  };

  const getNotesForItem = (type: string, key: string): string => {
    const record = progressRecords?.find(
      (p) => p.recommendation_type === type && p.recommendation_key === key
    );
    return record?.notes || "";
  };

  // Calculate progress stats
  const allRecommendations: { type: string; key: string; title: string }[] = [];
  
  reviewData?.quickWins?.forEach((win, idx) => {
    allRecommendations.push({ type: "quickWin", key: `qw-${idx}`, title: win.title });
  });
  
  reviewData?.priorityActions?.forEach((action, idx) => {
    allRecommendations.push({ type: "priorityAction", key: `pa-${idx}`, title: action.title });
  });

  if (reviewData?.categories) {
    Object.entries(reviewData.categories).forEach(([cat, data]) => {
      data.issues?.forEach((issue, idx) => {
        allRecommendations.push({ type: "issue", key: `${cat}-issue-${idx}`, title: issue.title });
      });
    });
  }

  const totalItems = allRecommendations.length;
  const implementedCount = allRecommendations.filter(
    (r) => getProgressForItem(r.type, r.key) === "implemented"
  ).length;
  const inProgressCount = allRecommendations.filter(
    (r) => getProgressForItem(r.type, r.key) === "in_progress"
  ).length;
  const ignoredCount = allRecommendations.filter(
    (r) => getProgressForItem(r.type, r.key) === "ignored"
  ).length;
  const progressPercent = totalItems > 0 ? Math.round((implementedCount / totalItems) * 100) : 0;

  const handleStatusChange = (type: string, key: string, title: string, status: string) => {
    const noteKey = `${type}-${key}`;
    updateProgress.mutate({
      reviewId: selectedReviewId,
      type,
      key,
      title,
      status,
      notes: noteInputs[noteKey],
    });
  };

  const StatusSelector = ({ type, itemKey, title }: { type: string; itemKey: string; title: string }) => {
    const currentStatus = getProgressForItem(type, itemKey);
    const currentNotes = getNotesForItem(type, itemKey);
    const noteKey = `${type}-${itemKey}`;
    const config = statusConfig[currentStatus];
    const Icon = config.icon;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span className="text-xs">{config.label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={currentStatus}
                onValueChange={(value) => handleStatusChange(type, itemKey, title, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([status, cfg]) => {
                    const StatusIcon = cfg.icon;
                    return (
                      <SelectItem key={status} value={status}>
                        <span className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${cfg.color}`} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Add notes..."
                value={noteInputs[noteKey] ?? currentNotes}
                onChange={(e) => setNoteInputs({ ...noteInputs, [noteKey]: e.target.value })}
                className="h-20"
              />
            </div>
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => handleStatusChange(type, itemKey, title, currentStatus)}
            >
              Save Notes
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  if (!reviews || reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Progress Tracking
          </CardTitle>
          <CardDescription>Track implementation of recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reviews yet. Run an AI review to start tracking progress.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Review Selector & Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5" />
                Progress Tracking
              </CardTitle>
              <CardDescription>Track implementation of recommendations</CardDescription>
            </div>
            <Select value={selectedReviewId} onValueChange={setSelectedReviewId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a review" />
              </SelectTrigger>
              <SelectContent>
                {reviews.map((review) => (
                  <SelectItem key={review.id} value={review.id}>
                    {format(new Date(review.review_date), "MMM dd, yyyy")} - Score: {review.overall_score}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Stats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{totalItems - implementedCount - inProgressCount - ignoredCount}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-600">{implementedCount}</div>
                <div className="text-xs text-muted-foreground">Implemented</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <div className="text-2xl font-bold text-red-600">{ignoredCount}</div>
                <div className="text-xs text-muted-foreground">Ignored</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Wins */}
      {reviewData?.quickWins && reviewData.quickWins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Quick Wins ({reviewData.quickWins.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {reviewData.quickWins.map((win, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{win.title}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">Effort: {win.effort}</Badge>
                        <Badge variant="outline" className="text-xs">Impact: {win.impact}</Badge>
                      </div>
                    </div>
                    <StatusSelector type="quickWin" itemKey={`qw-${idx}`} title={win.title} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Priority Actions */}
      {reviewData?.priorityActions && reviewData.priorityActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Priority Actions ({reviewData.priorityActions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {reviewData.priorityActions.sort((a, b) => a.priority - b.priority).map((action, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 flex items-start gap-3">
                      <Badge>{action.priority}</Badge>
                      <div>
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.estimatedEffort}</p>
                      </div>
                    </div>
                    <StatusSelector type="priorityAction" itemKey={`pa-${idx}`} title={action.title} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Issues by Category */}
      {reviewData?.categories && Object.keys(reviewData.categories).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Issues by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {Object.entries(reviewData.categories).map(([category, data]) => (
                  data.issues && data.issues.length > 0 && (
                    <div key={category}>
                      <h4 className="font-medium text-sm mb-2 capitalize">
                        {category.replace(/([A-Z])/g, " $1").trim()}
                      </h4>
                      <div className="space-y-2">
                        {data.issues.map((issue, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {issue.severity}
                                </Badge>
                                <p className="font-medium text-sm">{issue.title}</p>
                              </div>
                            </div>
                            <StatusSelector 
                              type="issue" 
                              itemKey={`${category}-issue-${idx}`} 
                              title={issue.title} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
