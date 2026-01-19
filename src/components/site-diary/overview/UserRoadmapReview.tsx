import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, AlertTriangle, CheckCircle2, Clock, 
  BarChart3, List, Activity, Download
} from "lucide-react";
import { format, isPast } from "date-fns";

interface UserRoadmapReviewProps {
  projectId: string;
}

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  target_date: string | null;
  completion_percentage: number | null;
  category: string | null;
  created_at: string;
}

export function UserRoadmapReview({ projectId }: UserRoadmapReviewProps) {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Fetch roadmap items for this project
  const { data: roadmapItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["user-roadmap-items", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_roadmap")
        .select("*")
        .eq("project_id", projectId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as RoadmapItem[];
    },
  });

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["roadmap-project-details", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name, project_number, status")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!roadmapItems || roadmapItems.length === 0) {
      return {
        totalItems: 0,
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        overdue: 0,
        avgCompletion: 0,
        healthScore: 0,
        criticalItems: 0,
        highItems: 0,
      };
    }

    const completed = roadmapItems.filter(i => i.status === "completed").length;
    const inProgress = roadmapItems.filter(i => i.status === "in-progress").length;
    const notStarted = roadmapItems.filter(i => i.status === "not-started" || i.status === "planned").length;
    const overdue = roadmapItems.filter(i => 
      i.target_date && isPast(new Date(i.target_date)) && i.status !== "completed"
    ).length;
    
    const avgCompletion = Math.round(
      roadmapItems.reduce((sum, i) => sum + (i.completion_percentage || 0), 0) / roadmapItems.length
    );

    const criticalItems = roadmapItems.filter(i => i.priority === "critical").length;
    const highItems = roadmapItems.filter(i => i.priority === "high").length;

    // Simple health score calculation
    const completionFactor = completed / roadmapItems.length;
    const overduePenalty = overdue / roadmapItems.length * 0.3;
    const healthScore = Math.max(0, Math.min(100, Math.round((completionFactor - overduePenalty) * 100 + 50)));

    return {
      totalItems: roadmapItems.length,
      completed,
      inProgress,
      notStarted,
      overdue,
      avgCompletion,
      healthScore,
      criticalItems,
      highItems,
    };
  }, [roadmapItems]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    if (!roadmapItems) return {};
    return roadmapItems.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, RoadmapItem[]>);
  }, [roadmapItems]);

  const isLoading = itemsLoading || projectLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!roadmapItems || roadmapItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Roadmap Items</h3>
          <p className="text-muted-foreground">
            This project doesn't have any roadmap items yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">In Progress</Badge>;
      case "not-started":
      case "planned":
        return <Badge variant="secondary">Not Started</Badge>;
      case "blocked":
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Medium</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Roadmap Review</h2>
          <p className="text-muted-foreground">
            {project?.name} • {roadmapItems.length} items
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="items">
            <List className="h-4 w-4 mr-2" />
            All Items
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Health Score</p>
                    <p className="text-3xl font-bold">{metrics.healthScore}%</p>
                  </div>
                  <Activity className={`h-8 w-8 ${
                    metrics.healthScore >= 70 ? "text-green-500" : 
                    metrics.healthScore >= 40 ? "text-yellow-500" : "text-red-500"
                  }`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-3xl font-bold">{metrics.completed}/{metrics.totalItems}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <Progress value={(metrics.completed / metrics.totalItems) * 100} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-3xl font-bold">{metrics.inProgress}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <p className="text-3xl font-bold text-red-600">{metrics.overdue}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Progress by Category</CardTitle>
              <CardDescription>Completion status across different categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(itemsByCategory).map(([category, items]) => {
                  const completed = items.filter(i => i.status === "completed").length;
                  const progress = Math.round((completed / items.length) * 100);
                  
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{category}</span>
                        <span className="text-sm text-muted-foreground">
                          {completed}/{items.length} ({progress}%)
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Priority Distribution</CardTitle>
              <CardDescription>Items by priority level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.criticalItems}</p>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">High</p>
                  <p className="text-2xl font-bold text-orange-600">{metrics.highItems}</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Medium</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {roadmapItems.filter(i => i.priority === "medium").length}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Low</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {roadmapItems.filter(i => i.priority === "low").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Roadmap Items</CardTitle>
              <CardDescription>{roadmapItems.length} total items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roadmapItems.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-lg border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {getStatusBadge(item.status)}
                          {getPriorityBadge(item.priority)}
                          {item.category && (
                            <Badge variant="outline">{item.category}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium">
                          {item.completion_percentage || 0}%
                        </div>
                        {item.target_date && (
                          <div className={`text-xs ${
                            isPast(new Date(item.target_date)) && item.status !== "completed" 
                              ? "text-red-600" 
                              : "text-muted-foreground"
                          }`}>
                            {format(new Date(item.target_date), "MMM d, yyyy")}
                          </div>
                        )}
                        <Progress 
                          value={item.completion_percentage || 0} 
                          className="h-1.5 w-20 mt-2" 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
