import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Target,
  TrendingUp,
  Folder
} from "lucide-react";

interface RoadmapItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
}

export function GlobalRoadmapReview() {
  // Fetch all projects
  const { data: projects = [] } = useQuery({
    queryKey: ["all-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, project_number")
        .order("project_number");
      if (error) throw error;
      return data as Project[];
    },
  });

  // Fetch roadmap items across all projects
  const { data: roadmapItems = [], isLoading } = useQuery({
    queryKey: ["global-roadmap-items"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_roadmap")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RoadmapItem[];
    },
  });

  // Calculate global metrics
  const totalItems = roadmapItems.length;
  const completedItems = roadmapItems.filter(item => item.status === "completed").length;
  const inProgressItems = roadmapItems.filter(item => item.status === "in_progress").length;
  const pendingItems = roadmapItems.filter(item => item.status === "pending").length;
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Group by project
  const itemsByProject = roadmapItems.reduce((acc, item) => {
    if (!acc[item.project_id]) {
      acc[item.project_id] = [];
    }
    acc[item.project_id].push(item);
    return acc;
  }, {} as Record<string, RoadmapItem[]>);

  // Priority distribution
  const highPriority = roadmapItems.filter(item => item.priority === "high").length;
  const mediumPriority = roadmapItems.filter(item => item.priority === "medium").length;
  const lowPriority = roadmapItems.filter(item => item.priority === "low").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Global Roadmap Review</h2>
        <p className="text-muted-foreground">
          Track progress across all projects
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalItems}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedItems}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressItems}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingItems}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Rate</span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">High</Badge>
              <span className="font-medium">{highPriority}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">Medium</Badge>
              <span className="font-medium">{mediumPriority}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Low</Badge>
              <span className="font-medium">{lowPriority}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Project Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Progress by Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {projects.map((project) => {
                const projectItems = itemsByProject[project.id] || [];
                const completed = projectItems.filter(i => i.status === "completed").length;
                const total = projectItems.length;
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <div key={project.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{project.project_number}</span>
                        <span className="text-muted-foreground mx-2">-</span>
                        <span className="text-sm">{project.name}</span>
                      </div>
                      <Badge variant="outline">
                        {completed}/{total} items
                      </Badge>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })}
              {projects.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No projects found
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
