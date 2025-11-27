import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { format } from "date-fns";
import { ArrowRight, TrendingUp, TrendingDown, Minus, GitCompare } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

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
  created_at: string;
  focus_areas: string[];
  overall_score: number;
  review_data: Json;
  review_date: string;
}

export function ReviewComparisonView() {
  const [leftReviewId, setLeftReviewId] = useState<string>("");
  const [rightReviewId, setRightReviewId] = useState<string>("");

  const { data: reviews } = useQuery({
    queryKey: ["application-reviews-comparison"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_reviews")
        .select("*")
        .order("review_date", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Review[];
    },
  });

  const leftReview = reviews?.find((r) => r.id === leftReviewId);
  const rightReview = reviews?.find((r) => r.id === rightReviewId);

  const leftData = leftReview?.review_data as unknown as ReviewData;
  const rightData = rightReview?.review_data as unknown as ReviewData;

  const getScoreDiff = (oldScore: number, newScore: number) => {
    const diff = newScore - oldScore;
    if (diff > 0) return { icon: TrendingUp, color: "text-green-500", label: `+${diff}` };
    if (diff < 0) return { icon: TrendingDown, color: "text-red-500", label: `${diff}` };
    return { icon: Minus, color: "text-muted-foreground", label: "0" };
  };

  const getCategoryScoreDiff = (category: string) => {
    const leftScore = leftData?.categories?.[category]?.score || 0;
    const rightScore = rightData?.categories?.[category]?.score || 0;
    return getScoreDiff(leftScore, rightScore);
  };

  if (!reviews || reviews.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Reviews
          </CardTitle>
          <CardDescription>Compare two reviews side-by-side</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You need at least 2 reviews to compare. Run more reviews to enable comparison.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Auto-select latest two reviews if not selected
  if (!leftReviewId && !rightReviewId && reviews.length >= 2) {
    setLeftReviewId(reviews[1].id); // Previous
    setRightReviewId(reviews[0].id); // Latest
  }

  const allCategories = new Set([
    ...Object.keys(leftData?.categories || {}),
    ...Object.keys(rightData?.categories || {}),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          Compare Reviews
        </CardTitle>
        <CardDescription>Side-by-side comparison of application health</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Review Selectors */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Previous Review</label>
            <Select value={leftReviewId} onValueChange={setLeftReviewId}>
              <SelectTrigger>
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

          <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Current Review</label>
            <Select value={rightReviewId} onValueChange={setRightReviewId}>
              <SelectTrigger>
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
        </div>

        {/* Overall Score Comparison */}
        {leftReview && rightReview && (
          <>
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Previous</p>
                <p className="text-3xl font-bold">{leftReview.overall_score}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(leftReview.review_date), "MMM dd")}
                </p>
              </div>

              <div className="text-center flex flex-col items-center justify-center">
                {(() => {
                  const diff = getScoreDiff(leftReview.overall_score, rightReview.overall_score);
                  const Icon = diff.icon;
                  return (
                    <>
                      <Icon className={`h-8 w-8 ${diff.color}`} />
                      <span className={`text-lg font-semibold ${diff.color}`}>{diff.label}</span>
                    </>
                  );
                })()}
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Current</p>
                <p className="text-3xl font-bold">{rightReview.overall_score}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(rightReview.review_date), "MMM dd")}
                </p>
              </div>
            </div>

            {/* Category Comparison */}
            {allCategories.size > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Category Breakdown</h4>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {Array.from(allCategories).map((category) => {
                      const leftScore = leftData?.categories?.[category]?.score || 0;
                      const rightScore = rightData?.categories?.[category]?.score || 0;
                      const diff = getCategoryScoreDiff(category);
                      const Icon = diff.icon;

                      return (
                        <div
                          key={category}
                          className="grid grid-cols-4 gap-4 p-3 rounded-lg border items-center"
                        >
                          <div className="font-medium capitalize">
                            {category.replace(/([A-Z])/g, " $1").trim()}
                          </div>
                          <div className="text-center">
                            <Badge variant="outline">{leftScore}/100</Badge>
                          </div>
                          <div className="text-center flex items-center justify-center gap-1">
                            <Icon className={`h-4 w-4 ${diff.color}`} />
                            <span className={`text-sm ${diff.color}`}>{diff.label}</span>
                          </div>
                          <div className="text-center">
                            <Badge variant={rightScore >= leftScore ? "default" : "destructive"}>
                              {rightScore}/100
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Issues Comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-3 text-sm">
                  Previous Issues ({leftData?.categories ? Object.values(leftData.categories).reduce((sum, cat) => sum + (cat.issues?.length || 0), 0) : 0})
                </h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {leftData?.categories && Object.entries(leftData.categories).map(([cat, data]) =>
                      data.issues?.map((issue, idx) => (
                        <div key={`${cat}-${idx}`} className="text-sm p-2 rounded border bg-muted/30">
                          <Badge variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "default" : "secondary"} className="mb-1">
                            {issue.severity}
                          </Badge>
                          <p className="font-medium">{issue.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <h4 className="font-semibold mb-3 text-sm">
                  Current Issues ({rightData?.categories ? Object.values(rightData.categories).reduce((sum, cat) => sum + (cat.issues?.length || 0), 0) : 0})
                </h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {rightData?.categories && Object.entries(rightData.categories).map(([cat, data]) =>
                      data.issues?.map((issue, idx) => (
                        <div key={`${cat}-${idx}`} className="text-sm p-2 rounded border bg-muted/30">
                          <Badge variant={issue.severity === "high" ? "destructive" : issue.severity === "medium" ? "default" : "secondary"} className="mb-1">
                            {issue.severity}
                          </Badge>
                          <p className="font-medium">{issue.title}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
