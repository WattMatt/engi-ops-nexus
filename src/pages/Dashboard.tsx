import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  DollarSign, 
  Cable, 
  FileCheck, 
  Users,
  Settings,
  Activity,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TenantChangesWidget } from "@/components/dashboard/TenantChangesWidget";
import { BeneficialOccupationWidget } from "@/components/dashboard/BeneficialOccupationWidget";
import { BulkServicesWidget } from "@/components/dashboard/BulkServicesWidget";
import { ProjectCompletionCard } from "@/components/dashboard/ProjectCompletionCard";
import { IssuesIncompleteWidget } from "@/components/dashboard/IssuesIncompleteWidget";
import { ProjectRoadmapWidget } from "@/components/dashboard/roadmap/ProjectRoadmapWidget";


const Dashboard = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(localStorage.getItem("selectedProjectId"));
  const projectName = localStorage.getItem("currentProjectName");

  // Listen for project changes
  useEffect(() => {
    const handleProjectChange = () => {
      setProjectId(localStorage.getItem("selectedProjectId"));
    };
    
    window.addEventListener('projectChanged', handleProjectChange);
    return () => window.removeEventListener('projectChanged', handleProjectChange);
  }, []);

  const { data: costReports = [], isLoading: costReportsLoading } = useQuery({
    queryKey: ["cost-reports", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("cost_reports")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ["budgets", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("electrical_budgets")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: cableSchedules = [], isLoading: cableSchedulesLoading } = useQuery({
    queryKey: ["cable-schedules", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("cable_schedules")
        .select("*")
        .eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const totalDocuments = costReports.length + budgets.length;
  const isLoading = costReportsLoading || budgetsLoading || cableSchedulesLoading;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 px-6 pt-6 pb-6">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-48 mb-6" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-6 space-y-6">
        <div className="pb-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Project Overview</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Selected Project: <span className="font-semibold text-foreground">{projectName || "None"}</span>
          </p>
        </div>

      {/* Project Completion Card - Prominent Position */}
      {projectId && (
        <div>
          <ProjectCompletionCard projectId={projectId} />
        </div>
      )}

      {/* Quick Stats - More Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 border-border/50" onClick={() => navigate("/dashboard/cost-reports")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Reports</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costReports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active reports</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 border-border/50" onClick={() => navigate("/dashboard/budgets/electrical")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budgets</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budgets.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Electrical budgets</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 border-border/50" onClick={() => navigate("/dashboard/cable-schedules")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cable Schedules</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cable className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cableSchedules.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active schedules</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 border-border/50" onClick={() => navigate("/dashboard/project-settings")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Settings</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Configure</div>
            <p className="text-xs text-muted-foreground mt-1">Manage project</p>
          </CardContent>
        </Card>
      </div>

      {/* Issues & Incomplete Items Widget */}
      {projectId && (
        <div>
          <IssuesIncompleteWidget projectId={projectId} />
        </div>
      )}

      {/* Project Roadmap Widget */}
      {projectId && (
        <div>
          <ProjectRoadmapWidget projectId={projectId} />
        </div>
      )}

      {/* Status Widgets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Left column - Tenant Changes */}
        <div className="lg:col-span-1">
          <TenantChangesWidget />
        </div>

        {/* Middle column - Beneficial Occupation Deadlines */}
        {projectId && (
          <div className="lg:col-span-1">
            <BeneficialOccupationWidget projectId={projectId} />
          </div>
        )}

        {/* Bulk Services Status Widget */}
        {projectId && (
          <div className="lg:col-span-1">
            <BulkServicesWidget projectId={projectId} />
          </div>
        )}
      </div>

      {/* Secondary Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Right column with stacked cards */}
        <div className="lg:col-span-1">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                Project Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documentation</span>
                  <span className="font-medium text-foreground">{totalDocuments} items</span>
                </div>
                <Progress value={totalDocuments > 0 ? 65 : 0} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Technical Drawings</span>
                  <span className="font-medium text-foreground">{cableSchedules.length} schedules</span>
                </div>
                <Progress value={cableSchedules.length > 0 ? 45 : 0} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;