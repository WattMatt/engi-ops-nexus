import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import { format } from "date-fns";
import { History, TrendingUp, TrendingDown, Minus, Calendar, Eye } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  longTermRecommendations?: string[];
}

interface Review {
  id: string;
  created_at: string;
  focus_areas: string[];
  overall_score: number;
  review_data: Json;
  review_date: string;
}

export function ReviewHistoryDashboard() {
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["application-reviews"],
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

  const chartData = reviews
    ?.slice()
    .reverse()
    .map((review) => ({
      date: format(new Date(review.review_date), "MMM dd"),
      score: review.overall_score,
      fullDate: review.review_date,
    })) || [];

  const getScoreTrend = () => {
    if (!reviews || reviews.length < 2) return { trend: "neutral", change: 0 };
    const latest = reviews[0].overall_score;
    const previous = reviews[1].overall_score;
    const change = latest - previous;
    return {
      trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
      change: Math.abs(change),
    };
  };

  const trend = getScoreTrend();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Review History
          </CardTitle>
          <CardDescription>Track your application's health over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reviews yet. Run your first AI review to start tracking progress.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const latestReview = reviews[0];
  const reviewData = latestReview.review_data as unknown as ReviewData;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Score Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Score</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <span className={`text-4xl font-bold ${getScoreColor(latestReview.overall_score)}`}>
                {latestReview.overall_score}
              </span>
              <span className="text-2xl text-muted-foreground">/100</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {trend.trend === "up" && (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{trend.change} from last review</span>
                </>
              )}
              {trend.trend === "down" && (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">-{trend.change} from last review</span>
                </>
              )}
              {trend.trend === "neutral" && (
                <>
                  <Minus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">No change</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Reviews Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Reviews</CardDescription>
            <CardTitle className="text-4xl font-bold">{reviews.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Last reviewed {format(new Date(latestReview.review_date), "MMM dd, yyyy")}
            </p>
          </CardContent>
        </Card>

        {/* Average Score Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Score</CardDescription>
            <CardTitle className="text-4xl font-bold">
              {Math.round(reviews.reduce((sum, r) => sum + r.overall_score, 0) / reviews.length)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across all {reviews.length} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Score Trend Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Score Trend
            </CardTitle>
            <CardDescription>Application health score over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review History List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Review History
          </CardTitle>
          <CardDescription>Past application reviews</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Badge variant={getScoreBadgeVariant(review.overall_score)}>
                      {review.overall_score}/100
                    </Badge>
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(review.review_date), "MMMM dd, yyyy 'at' HH:mm")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Focus: {review.focus_areas?.join(", ") || "All areas"}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedReview(review)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Review Detail Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Review from {selectedReview && format(new Date(selectedReview.review_date), "MMMM dd, yyyy")}
            </DialogTitle>
            <DialogDescription>
              Score: {selectedReview?.overall_score}/100
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {selectedReview && (
              <div className="space-y-4 pr-4">
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    {(selectedReview.review_data as unknown as ReviewData)?.summary || "No summary available"}
                  </p>
                </div>

                {(selectedReview.review_data as unknown as ReviewData)?.quickWins && (
                  <div>
                    <h4 className="font-semibold mb-2">Quick Wins</h4>
                    <ul className="space-y-2">
                      {(selectedReview.review_data as unknown as ReviewData).quickWins?.map((win, idx) => (
                        <li key={idx} className="text-sm border rounded-lg p-3">
                          <div className="font-medium">{win.title}</div>
                          <p className="text-muted-foreground">{win.description}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">Effort: {win.effort}</Badge>
                            <Badge variant="outline">Impact: {win.impact}</Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(selectedReview.review_data as unknown as ReviewData)?.priorityActions && (
                  <div>
                    <h4 className="font-semibold mb-2">Priority Actions</h4>
                    <ul className="space-y-2">
                      {(selectedReview.review_data as unknown as ReviewData).priorityActions
                        ?.sort((a, b) => a.priority - b.priority)
                        .map((action, idx) => (
                          <li key={idx} className="text-sm border rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Badge>{action.priority}</Badge>
                              <span className="font-medium">{action.title}</span>
                            </div>
                            <p className="text-muted-foreground mt-1">{action.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Estimated effort: {action.estimatedEffort}
                            </p>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
