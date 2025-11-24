import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  Code,
  Shield,
  Zap,
  Target,
  Calendar
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReviewData {
  overallScore: number;
  summary: string;
  categories: {
    [key: string]: {
      score: number;
      issues: Array<{
        severity: 'high' | 'medium' | 'low';
        title: string;
        description: string;
        recommendation: string;
      }>;
      strengths: string[];
    };
  };
  quickWins: Array<{
    title: string;
    effort: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
  priorityActions: Array<{
    priority: number;
    title: string;
    description: string;
    estimatedEffort: string;
  }>;
  longTermRecommendations: string[];
  reviewDate?: string;
}

export function ApplicationReviewDialog() {
  const [open, setOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [includeUI, setIncludeUI] = useState(true);
  const [includePerformance, setIncludePerformance] = useState(true);
  const [includeSecurity, setIncludeSecurity] = useState(true);
  const [includeDatabase, setIncludeDatabase] = useState(true);

  const handleStartReview = async () => {
    setIsReviewing(true);
    try {
      const projectId = localStorage.getItem("selectedProjectId");
      
      const { data, error } = await supabase.functions.invoke('ai-review-application', {
        body: {
          focusAreas: ['all'],
          projectContext: { projectId },
          includeUI,
          includePerformance,
          includeSecurity,
          includeDatabase,
        }
      });

      if (error) throw error;

      if (data) {
        setReviewData(data);
        toast.success("Application review completed!");
      }
    } catch (error: any) {
      console.error("Error generating review:", error);
      toast.error(error.message || "Failed to generate review");
    } finally {
      setIsReviewing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getEffortBadge = (effort: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[effort as keyof typeof colors] || colors.medium;
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      high: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[impact as keyof typeof colors] || colors.medium;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Application Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            AI-Powered Application Review
          </DialogTitle>
          <DialogDescription>
            Comprehensive analysis of your application using Gemini 3 Pro
          </DialogDescription>
        </DialogHeader>

        {!reviewData ? (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-semibold">Review Scope</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="ui" 
                    checked={includeUI} 
                    onCheckedChange={(checked) => setIncludeUI(checked as boolean)}
                  />
                  <Label htmlFor="ui" className="cursor-pointer">User Experience & Interface</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="performance" 
                    checked={includePerformance} 
                    onCheckedChange={(checked) => setIncludePerformance(checked as boolean)}
                  />
                  <Label htmlFor="performance" className="cursor-pointer">Performance Optimization</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="security" 
                    checked={includeSecurity} 
                    onCheckedChange={(checked) => setIncludeSecurity(checked as boolean)}
                  />
                  <Label htmlFor="security" className="cursor-pointer">Security & Data Protection</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="database" 
                    checked={includeDatabase} 
                    onCheckedChange={(checked) => setIncludeDatabase(checked as boolean)}
                  />
                  <Label htmlFor="database" className="cursor-pointer">Database Architecture</Label>
                </div>
              </div>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm">What will be analyzed?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>✓ Application architecture and code quality</p>
                <p>✓ User experience and interface design</p>
                <p>✓ Performance bottlenecks and optimization opportunities</p>
                <p>✓ Security vulnerabilities and best practices</p>
                <p>✓ Database schema and query patterns</p>
                <p>✓ Feature completeness for electrical engineering workflows</p>
                <p>✓ Technical debt and improvement priorities</p>
              </CardContent>
            </Card>

            <Button 
              onClick={handleStartReview} 
              disabled={isReviewing}
              className="w-full h-12"
              size="lg"
            >
              {isReviewing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Application... (This may take 30-60 seconds)
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start AI Review
                </>
              )}
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6 py-4">
              {/* Overall Score */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Overall Application Score</CardTitle>
                      <CardDescription>{reviewData.summary}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-primary">{reviewData.overallScore}/100</div>
                      {reviewData.reviewDate && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(reviewData.reviewDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={reviewData.overallScore} className="h-3" />
                </CardContent>
              </Card>

              {/* Quick Wins */}
              {reviewData.quickWins?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      Quick Wins
                    </CardTitle>
                    <CardDescription>High-impact, low-effort improvements</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reviewData.quickWins.map((win, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold">{win.title}</h4>
                          <div className="flex gap-2">
                            <Badge className={getEffortBadge(win.effort)}>
                              Effort: {win.effort}
                            </Badge>
                            <Badge className={getImpactBadge(win.impact)}>
                              Impact: {win.impact}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{win.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Priority Actions */}
              {reviewData.priorityActions?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-red-500" />
                      Priority Actions
                    </CardTitle>
                    <CardDescription>Recommended implementation order</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reviewData.priorityActions
                      .sort((a, b) => a.priority - b.priority)
                      .map((action, idx) => (
                        <div key={idx} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="rounded-full h-8 w-8 flex items-center justify-center">
                                {action.priority}
                              </Badge>
                              <h4 className="font-semibold">{action.title}</h4>
                            </div>
                            <Badge variant="secondary">{action.estimatedEffort}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground ml-11">{action.description}</p>
                        </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Detailed Categories */}
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All Issues</TabsTrigger>
                  <TabsTrigger value="high">High Priority</TabsTrigger>
                  <TabsTrigger value="medium">Medium</TabsTrigger>
                  <TabsTrigger value="low">Low</TabsTrigger>
                </TabsList>

                {['all', 'high', 'medium', 'low'].map((severity) => (
                  <TabsContent key={severity} value={severity} className="space-y-4">
                    {Object.entries(reviewData.categories || {}).map(([categoryKey, category]: [string, any]) => {
                      const filteredIssues = severity === 'all' 
                        ? category.issues 
                        : category.issues?.filter((issue: any) => issue.severity === severity);

                      if (!filteredIssues || filteredIssues.length === 0) return null;

                      return (
                        <Card key={categoryKey}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="capitalize">{categoryKey.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Progress value={category.score} className="w-24 h-2" />
                                <span className="text-sm font-semibold">{category.score}/100</span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {category.strengths?.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  Strengths
                                </h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                  {category.strengths.map((strength: string, idx: number) => (
                                    <li key={idx}>{strength}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                Issues & Recommendations
                              </h4>
                              {filteredIssues.map((issue: any, idx: number) => (
                                <div key={idx} className="border rounded-lg p-4 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <h5 className="font-semibold">{issue.title}</h5>
                                    <Badge variant={getSeverityColor(issue.severity) as any}>
                                      {issue.severity}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{issue.description}</p>
                                  <div className="bg-primary/5 rounded p-3 mt-2">
                                    <p className="text-sm"><span className="font-semibold">Recommendation:</span> {issue.recommendation}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </TabsContent>
                ))}
              </Tabs>

              {/* Long-term Recommendations */}
              {reviewData.longTermRecommendations?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      Long-term Roadmap
                    </CardTitle>
                    <CardDescription>Strategic improvements for future growth</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {reviewData.longTermRecommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                          </div>
                          <p className="text-sm">{rec}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Button 
                variant="outline" 
                onClick={() => setReviewData(null)}
                className="w-full"
              >
                Start New Review
              </Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
